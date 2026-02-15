import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof postgres> | null = null;
let _connectAttempts = 0;

// Lazily create the drizzle instance with connection pooling and retry logic.
// Neon serverless: cold start after 5 min inactivity needs retry.
export async function getDb() {
  if (_db) return _db;

  if (!process.env.DATABASE_URL) return null;

  const maxRetries = 3;
  const baseDelay = 1000; // 1s, 2s, 4s

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      _client = postgres(process.env.DATABASE_URL, {
        max: 20,              // Max connections in pool
        idle_timeout: 30,     // Close idle connections after 30s
        connect_timeout: 10,  // Fail connection after 10s
        max_lifetime: 60 * 5, // Recycle connections every 5 min (Neon limit)
      });
      _db = drizzle(_client);
      _connectAttempts = 0;
      return _db;
    } catch (error) {
      _db = null;
      _client = null;
      _connectAttempts++;
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`[Database] Connection attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error("[Database] All connection attempts failed:", error);
      }
    }
  }
  return null;
}

// Force reconnect (call after connection errors to reset stale pool)
export async function reconnectDb() {
  if (_client) {
    try { await (_client as any).end(); } catch {}
  }
  _db = null;
  _client = null;
  return getDb();
}

// Graceful shutdown — close pool cleanly
export async function closeDb() {
  if (_client) {
    try { await (_client as any).end(); } catch {}
  }
  _db = null;
  _client = null;
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

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
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

export async function getReimbursements(status?: string, limit = 200) {
  const db = await getDb();
  if (!db) return [];

  if (status) {
    return await db.select().from(schema.reimbursements).where(eq(schema.reimbursements.status, status)).limit(limit);
  }
  return await db.select().from(schema.reimbursements).orderBy(desc(schema.reimbursements.createdAt)).limit(limit);
}

export async function getSystemLogs(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(schema.systemLogs).orderBy(desc(schema.systemLogs.createdAt)).limit(limit);
}

export async function getProducts(limit = 500) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(schema.products).limit(limit);
}

export async function getProductTracking(limit = 500) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(schema.productTracking).limit(limit);
}

export async function getUserAnalytics(limit = 500) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(schema.userAnalytics).limit(limit);
}

export async function getSustainabilityMetrics(limit = 200) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(schema.sustainabilityMetrics).orderBy(desc(schema.sustainabilityMetrics.date)).limit(limit);
}

export async function getBusinessAnalytics(limit = 200) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(schema.businessAnalytics).orderBy(desc(schema.businessAnalytics.totalRevenue)).limit(limit);
}

export async function getInspections(limit = 200) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(schema.inspections).orderBy(desc(schema.inspections.scheduledDate)).limit(limit);
}

export async function getNotifications(limit = 200) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(schema.notifications).orderBy(desc(schema.notifications.createdAt)).limit(limit);
}

export async function getCivicReports(limit = 200) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(schema.civicReports).orderBy(desc(schema.civicReports.createdAt)).limit(limit);
}

export async function getMobilityData(limit = 500) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(schema.mobilityData).orderBy(desc(schema.mobilityData.updatedAt)).limit(limit);
}


// ============================================
// MIO Agent Logs
// ============================================

export async function createMioAgentLog(log: {
  agent: string;
  action: string;
  status: "success" | "error" | "warning" | "info";
  message?: string;
  details?: Record<string, any>;
}) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create MIO Agent log: database not available");
    return null;
  }

  try {
    const result = await db.insert(schema.mioAgentLogs).values({
      agent: log.agent,
      action: log.action,
      status: log.status,
      message: log.message || null,
      details: log.details ? JSON.stringify(log.details) : null,
      timestamp: new Date(),
    }).returning();

    return {
      success: true,
      id: result[0].id,
      message: "Log created successfully",
    };
  } catch (error) {
    console.error("[Database] Error creating MIO Agent log:", error);
    throw new Error("Failed to create log");
  }
}

export async function getMioAgentLogs(limit = 200, offset = 0) {
  const db = await getDb();
  if (!db) return [];

  try {
    const logs = await db
      .select()
      .from(schema.mioAgentLogs)
      .orderBy(desc(schema.mioAgentLogs.timestamp))
      .limit(limit)
      .offset(offset);

    return logs.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
    }));
  } catch (error) {
    console.error("[Database] Error fetching MIO Agent logs:", error);
    return [];
  }
}

export async function getMioAgentLogById(id: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const logs = await db
      .select()
      .from(schema.mioAgentLogs)
      .where(eq(schema.mioAgentLogs.id, id))
      .limit(1);

    if (logs.length === 0) return null;

    const log = logs[0];
    return {
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
    };
  } catch (error) {
    console.error("[Database] Error fetching MIO Agent log by ID:", error);
    return null;
  }
}


export async function initMioAgentLogsTable() {
  const db = await getDb();
  if (!db) {
    return { success: false, message: "Database not available" };
  }

  try {
    // Table is managed by Drizzle schema — just verify it exists
    const testResult = await db.select({ count: count() }).from(schema.mioAgentLogs);
    return {
      success: true,
      message: "Table mio_agent_logs exists",
      status: "existing",
      rowCount: testResult[0]?.count ?? 0,
    };
  } catch (error) {
    console.error("[Database] Error checking mio_agent_logs table:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
      status: "error",
    };
  }
}


// ============================================
// Database Diagnostics
// ============================================

export async function testDatabaseConnection() {
  const databaseUrl = process.env.DATABASE_URL;
  const db = await getDb();

  if (!db) {
    return {
      success: false,
      message: "Database not available",
      details: { databaseUrlExists: !!databaseUrl, error: "getDb() returned null" },
    };
  }

  try {
    // Test with a simple count query via Drizzle ORM
    const [logCount] = await db.select({ count: count() }).from(schema.mioAgentLogs);

    return {
      success: true,
      message: "Database connection successful",
      details: {
        databaseUrlExists: !!databaseUrl,
        connectionEstablished: true,
        mioAgentLogsCount: logCount?.count ?? 0,
      },
    };
  } catch (error) {
    console.error("[Database] Connection test failed:", error);
    return {
      success: false,
      message: "Database test failed",
      details: {
        databaseUrlExists: !!databaseUrl,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}


// ============================================
// TCC Security Query Helpers
// ============================================

export async function getTccFraudEvents(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(schema.tccFraudEvents)
    .orderBy(desc(schema.tccFraudEvents.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getTccDailyLimits(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [limits] = await db
    .select()
    .from(schema.tccDailyLimits)
    .where(
      and(
        eq(schema.tccDailyLimits.userId, userId),
        gte(schema.tccDailyLimits.date, today),
        lt(schema.tccDailyLimits.date, tomorrow)
      )
    )
    .limit(1);

  return limits || null;
}

export async function getTccRewardsConfig(comuneId?: number) {
  const db = await getDb();
  if (!db) return null;

  if (comuneId) {
    const [config] = await db
      .select()
      .from(schema.tccRewardsConfig)
      .where(eq(schema.tccRewardsConfig.comuneId, comuneId))
      .limit(1);
    return config || null;
  }

  const [config] = await db
    .select()
    .from(schema.tccRewardsConfig)
    .limit(1);
  return config || null;
}

export async function cleanupExpiredTccTokens() {
  const db = await getDb();
  if (!db) return { success: false, message: "Database not available" };

  try {
    const deleted = await db
      .delete(schema.tccQrTokens)
      .where(lt(schema.tccQrTokens.expiresAt, new Date()))
      .returning({ id: schema.tccQrTokens.id });

    const keysDeleted = await db
      .delete(schema.tccIdempotencyKeys)
      .where(lt(schema.tccIdempotencyKeys.expiresAt, new Date()))
      .returning({ id: schema.tccIdempotencyKeys.id });

    return {
      success: true,
      tokensDeleted: deleted.length,
      keysDeleted: keysDeleted.length,
    };
  } catch (error) {
    console.error("[TCC Cleanup] Errore:", error);
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ============================================
// Data Retention / Cleanup
// ============================================

/**
 * Delete old api_metrics and mio_agent_logs rows.
 * Call periodically (e.g., daily cron or on-demand from Guardian).
 */
export async function cleanupOldData(retentionDays = 30) {
  const db = await getDb();
  if (!db) return { success: false, message: "Database not available" };

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);

  try {
    const metricsDeleted = await db
      .delete(schema.apiMetrics)
      .where(lt(schema.apiMetrics.createdAt, cutoff))
      .returning({ id: schema.apiMetrics.id });

    const logsDeleted = await db
      .delete(schema.mioAgentLogs)
      .where(lt(schema.mioAgentLogs.createdAt, cutoff))
      .returning({ id: schema.mioAgentLogs.id });

    return {
      success: true,
      message: `Cleanup completed: ${metricsDeleted.length} api_metrics + ${logsDeleted.length} mio_agent_logs deleted (older than ${retentionDays} days)`,
      metricsDeleted: metricsDeleted.length,
      logsDeleted: logsDeleted.length,
    };
  } catch (error) {
    console.error("[Database] Cleanup failed:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
