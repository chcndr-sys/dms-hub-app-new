import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Dashboard PA Analytics Helpers
import { count, sql, desc, eq, gte, lt, and, or, sum } from "drizzle-orm";
import * as schema from "../drizzle/schema";

export async function getOverviewStats() {
  const db = await getDb();
  if (!db) return null;

  // Conteggi totali
  const [usersCount] = await db.select({ count: count() }).from(schema.users);
  const [marketsCount] = await db.select({ count: count() }).from(schema.markets);
  const [shopsCount] = await db.select({ count: count() }).from(schema.shops);
  const [transactionsCount] = await db.select({ count: count() }).from(schema.transactions);

  // Mercati attivi (con geometria configurata)
  const [activeMarketsCount] = await db
    .select({ count: count() })
    .from(schema.marketGeometry)
    .where(sql`container_geojson IS NOT NULL`);

  // Transazioni oggi
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [todayTransactions] = await db
    .select({ count: count() })
    .from(schema.transactions)
    .where(gte(schema.transactions.createdAt, today));

  // Transazioni ieri per calcolo crescita
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const [yesterdayTransactions] = await db
    .select({ count: count() })
    .from(schema.transactions)
    .where(and(
      gte(schema.transactions.createdAt, yesterday),
      lt(schema.transactions.createdAt, today)
    ));

  // Calcolo crescita transazioni
  const transactionGrowth = yesterdayTransactions.count > 0
    ? ((todayTransactions.count - yesterdayTransactions.count) / yesterdayTransactions.count) * 100
    : 0;

  // Utenti attivi oggi (con transazioni o check-in)
  const activeUsersToday = await db
    .selectDistinct({ userId: schema.transactions.userId })
    .from(schema.transactions)
    .where(gte(schema.transactions.createdAt, today));

  // Crescita utenti (ultimi 7 giorni vs 7 giorni precedenti)
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const [usersLastWeek] = await db
    .select({ count: count() })
    .from(schema.users)
    .where(gte(schema.users.createdAt, sevenDaysAgo));

  const [usersPrevWeek] = await db
    .select({ count: count() })
    .from(schema.users)
    .where(and(
      gte(schema.users.createdAt, fourteenDaysAgo),
      lt(schema.users.createdAt, sevenDaysAgo)
    ));

  const userGrowth = usersPrevWeek.count > 0
    ? ((usersLastWeek.count - usersPrevWeek.count) / usersPrevWeek.count) * 100
    : 0;

  // TCC distribuiti (somma ecocredits)
  const [tccSum] = await db
    .select({ total: sum(schema.ecocredits.tccConverted) })
    .from(schema.ecocredits);

  // CO₂ risparmiata (mock per ora, da calcolare da transazioni sostenibili)
  const co2Saved = Math.round((Number(tccSum.total) || 0) * 0.5); // 1 TCC = 0.5 kg CO₂

  // Rating sostenibilità (percentuale prodotti BIO/KM0)
  const [bioProducts] = await db
    .select({ count: count() })
    .from(schema.products)
    .where(or(
      eq(schema.products.certifications, 'BIO'),
      eq(schema.products.certifications, 'KM0')
    ));

  const sustainabilityRating = shopsCount.count > 0
    ? (bioProducts.count / shopsCount.count) * 10
    : 0;

  return {
    totalUsers: usersCount.count,
    userGrowth: Math.round(userGrowth * 10) / 10,
    activeMarkets: activeMarketsCount.count || marketsCount.count,
    totalShops: shopsCount.count,
    totalTransactions: transactionsCount.count,
    transactionGrowth: Math.round(transactionGrowth * 10) / 10,
    sustainabilityRating: Math.round(sustainabilityRating * 10) / 10,
    co2Saved,
    todayTransactions: todayTransactions.count,
    activeUsersToday: activeUsersToday.length || 0,
    tccDistributed: tccSum.total || 0,
  };
}

export async function getMarkets() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(schema.markets).where(eq(schema.markets.active, 1));
}

export async function getShops() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(schema.shops);
}

export async function getTransactions(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(schema.transactions).orderBy(desc(schema.transactions.createdAt)).limit(limit);
}

export async function getCheckins(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(schema.checkins).orderBy(desc(schema.checkins.createdAt)).limit(limit);
}

export async function getCarbonCreditsConfig() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(schema.carbonCreditsConfig).limit(1);
  return result[0] || null;
}

export async function getFundTransactions(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(schema.fundTransactions).orderBy(desc(schema.fundTransactions.createdAt)).limit(limit);
}

export async function getReimbursements(status?: string) {
  const db = await getDb();
  if (!db) return [];
  
  if (status) {
    return await db.select().from(schema.reimbursements).where(eq(schema.reimbursements.status, status));
  }
  return await db.select().from(schema.reimbursements).orderBy(desc(schema.reimbursements.createdAt));
}

export async function getSystemLogs(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(schema.systemLogs).orderBy(desc(schema.systemLogs.createdAt)).limit(limit);
}

export async function getProducts() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(schema.products);
}

export async function getProductTracking() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(schema.productTracking);
}

export async function getUserAnalytics() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(schema.userAnalytics);
}

export async function getSustainabilityMetrics() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(schema.sustainabilityMetrics).orderBy(desc(schema.sustainabilityMetrics.date));
}

export async function getBusinessAnalytics() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(schema.businessAnalytics).orderBy(desc(schema.businessAnalytics.totalRevenue));
}

export async function getInspections() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(schema.inspections).orderBy(desc(schema.inspections.scheduledDate));
}

export async function getNotifications() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(schema.notifications).orderBy(desc(schema.notifications.createdAt));
}

export async function getCivicReports() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(schema.civicReports).orderBy(desc(schema.civicReports.createdAt));
}

export async function getMobilityData() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(schema.mobilityData).orderBy(desc(schema.mobilityData.updatedAt));
}
