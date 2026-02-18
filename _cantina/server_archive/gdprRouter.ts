/**
 * GDPR Router — Conformita' GDPR per DMS Hub
 *
 * Endpoint per:
 * - Export dati personali (Art. 20 — Portabilita')
 * - Cancellazione account / Anonimizzazione (Art. 17 — Diritto all'oblio)
 * - Data Retention — Pulizia automatica dati scaduti
 * - Stato consenso utente
 */

import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { eq, lt, desc } from "drizzle-orm";

export const gdprRouter = router({
  /**
   * Art. 20 GDPR — Export di tutti i dati personali dell'utente
   */
  exportMyData: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.user;
    if (!user) throw new Error("Utente non autenticato");

    const { getDb } = await import("./db");
    const schema = await import("../drizzle/schema");
    const db = await getDb();
    if (!db) throw new Error("Database non disponibile");

    const userId = user.id;

    const [
      userData,
      extendedData,
      vendorData,
      transactionData,
      checkinData,
      complianceData,
    ] = await Promise.all([
      db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1),
      db.select().from(schema.extendedUsers).where(eq(schema.extendedUsers.userId, userId)),
      db.select().from(schema.vendors).where(eq(schema.vendors.userId, userId)),
      db.select().from(schema.transactions).where(eq(schema.transactions.userId, userId))
        .orderBy(desc(schema.transactions.createdAt)),
      db.select().from(schema.checkins).where(eq(schema.checkins.userId, userId))
        .orderBy(desc(schema.checkins.createdAt)),
      db.select().from(schema.complianceCertificates)
        .where(eq(schema.complianceCertificates.userId, userId)),
    ]);

    let concessionData: any[] = [];
    let documentData: any[] = [];
    let presenceData: any[] = [];

    if (vendorData.length > 0) {
      const vendorId = vendorData[0].id;
      [concessionData, documentData, presenceData] = await Promise.all([
        db.select().from(schema.concessions).where(eq(schema.concessions.vendorId, vendorId)),
        db.select().from(schema.vendorDocuments).where(eq(schema.vendorDocuments.vendorId, vendorId)),
        db.select().from(schema.vendorPresences).where(eq(schema.vendorPresences.vendorId, vendorId))
          .orderBy(desc(schema.vendorPresences.checkinTime)).limit(365),
      ]);
    }

    return {
      exportDate: new Date().toISOString(),
      format: "GDPR Art. 20 — Portabilita' dei dati",
      user: {
        profile: userData[0] ? {
          name: userData[0].name,
          email: userData[0].email,
          role: userData[0].role,
          loginMethod: userData[0].loginMethod,
          createdAt: userData[0].createdAt,
          lastSignedIn: userData[0].lastSignedIn,
        } : null,
        extended: extendedData[0] ? {
          walletBalance: extendedData[0].walletBalance,
          sustainabilityRating: extendedData[0].sustainabilityRating,
          transportPreference: extendedData[0].transportPreference,
          phone: extendedData[0].phone,
        } : null,
      },
      vendor: vendorData[0] ? {
        businessName: vendorData[0].businessName,
        firstName: vendorData[0].firstName,
        lastName: vendorData[0].lastName,
        fiscalCode: vendorData[0].fiscalCode,
        vatNumber: vendorData[0].vatNumber,
        email: vendorData[0].email,
        phone: vendorData[0].phone,
        address: vendorData[0].address,
        status: vendorData[0].status,
        createdAt: vendorData[0].createdAt,
      } : null,
      transactions: transactionData.map(t => ({
        type: t.type,
        amount: t.amount,
        euroValue: t.euroValue,
        description: t.description,
        createdAt: t.createdAt,
      })),
      checkins: checkinData.map(c => ({
        transport: c.transport,
        carbonSaved: c.carbonSaved,
        createdAt: c.createdAt,
      })),
      concessions: concessionData.map((c: any) => ({
        stallId: c.stallId,
        type: c.type,
        startDate: c.startDate,
        endDate: c.endDate,
        status: c.status,
        annualFee: c.annualFee,
      })),
      documents: documentData.map((d: any) => ({
        type: d.type,
        name: d.name,
        status: d.status,
        uploadedAt: d.uploadedAt,
      })),
      presences: presenceData.map((p: any) => ({
        stallId: p.stallId,
        checkinTime: p.checkinTime,
        checkoutTime: p.checkoutTime,
        duration: p.duration,
      })),
      consents: complianceData.map(c => ({
        type: c.certificateType,
        version: c.version,
        acceptedAt: c.acceptedAt,
        createdAt: c.createdAt,
      })),
    };
  }),

  /**
   * Art. 17 GDPR — Diritto all'oblio (Anonimizzazione)
   */
  deleteMyAccount: protectedProcedure
    .input(z.object({
      confirmEmail: z.string().email(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) throw new Error("Utente non autenticato");
      if (user.email !== input.confirmEmail) {
        throw new Error("Email di conferma non corrisponde all'account");
      }

      const { getDb } = await import("./db");
      const schema = await import("../drizzle/schema");
      const db = await getDb();
      if (!db) throw new Error("Database non disponibile");

      const userId = user.id;
      const anonymizedLabel = `[GDPR-DELETED-${userId}]`;
      const now = new Date();

      await db.update(schema.users).set({
        name: anonymizedLabel,
        email: `deleted-${userId}@anonimizzato.gdpr`,
        updatedAt: now,
      }).where(eq(schema.users.id, userId));

      await db.update(schema.extendedUsers).set({
        phone: null,
        updatedAt: now,
      }).where(eq(schema.extendedUsers.userId, userId));

      const vendorRows = await db.select({ id: schema.vendors.id })
        .from(schema.vendors).where(eq(schema.vendors.userId, userId));

      if (vendorRows.length > 0) {
        const vendorId = vendorRows[0].id;
        await db.update(schema.vendors).set({
          firstName: anonymizedLabel,
          lastName: anonymizedLabel,
          fiscalCode: null,
          vatNumber: null,
          email: null,
          phone: null,
          address: null,
          bankAccount: null,
          businessName: anonymizedLabel,
          status: "deleted",
          updatedAt: now,
        }).where(eq(schema.vendors.id, vendorId));
      }

      await db.insert(schema.auditLogs).values({
        action: "gdpr_account_deletion",
        entityType: "user",
        entityId: userId,
        newValue: JSON.stringify({
          reason: input.reason || "Richiesta diritto all'oblio Art. 17 GDPR",
          timestamp: now.toISOString(),
        }),
        userEmail: anonymizedLabel,
      });

      await db.insert(schema.complianceCertificates).values({
        userId,
        certificateType: "gdpr_deletion",
        version: "1.0",
        metadata: JSON.stringify({
          reason: input.reason || "Diritto all'oblio",
          processedAt: now.toISOString(),
          dataAnonymized: ["users", "extended_users", "vendors"],
        }),
      });

      return {
        success: true,
        message: "Account anonimizzato con successo. I dati finanziari sono mantenuti in forma anonima per obblighi di legge.",
        deletedAt: now.toISOString(),
      };
    }),

  /**
   * Data Retention — Statistiche e stato pulizia dati
   */
  retentionStatus: adminProcedure.query(async () => {
    const { getDb } = await import("./db");
    const schema = await import("../drizzle/schema");
    const { sql } = await import("drizzle-orm");
    const db = await getDb();
    if (!db) return null;

    const now = new Date();
    const days90Ago = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const days365Ago = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const [apiMetricsExpired, systemLogsExpired, loginAttemptsExpired] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` })
        .from(schema.apiMetrics)
        .where(lt(schema.apiMetrics.createdAt, days90Ago)),
      db.select({ count: sql<number>`count(*)::int` })
        .from(schema.systemLogs)
        .where(lt(schema.systemLogs.createdAt, days365Ago)),
      db.select({ count: sql<number>`count(*)::int` })
        .from(schema.loginAttempts)
        .where(lt(schema.loginAttempts.createdAt, days90Ago)),
    ]);

    return {
      policy: {
        apiMetrics: "90 giorni",
        systemLogs: "365 giorni",
        loginAttempts: "90 giorni",
        auditLogs: "5 anni (obbligo legale)",
        transazioniFinanziarie: "10 anni (obbligo fiscale)",
      },
      expiredRecords: {
        apiMetrics: apiMetricsExpired[0]?.count ?? 0,
        systemLogs: systemLogsExpired[0]?.count ?? 0,
        loginAttempts: loginAttemptsExpired[0]?.count ?? 0,
      },
      lastCheck: now.toISOString(),
    };
  }),

  /**
   * Data Retention — Esegui pulizia dei dati scaduti
   */
  runRetentionCleanup: adminProcedure.mutation(async () => {
    const { getDb } = await import("./db");
    const schema = await import("../drizzle/schema");
    const db = await getDb();
    if (!db) throw new Error("Database non disponibile");

    const now = new Date();
    const days90Ago = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const days365Ago = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    await Promise.all([
      db.delete(schema.apiMetrics).where(lt(schema.apiMetrics.createdAt, days90Ago)),
      db.delete(schema.systemLogs).where(lt(schema.systemLogs.createdAt, days365Ago)),
      db.delete(schema.loginAttempts).where(lt(schema.loginAttempts.createdAt, days90Ago)),
    ]);

    await db.insert(schema.auditLogs).values({
      action: "gdpr_data_retention_cleanup",
      entityType: "system",
      newValue: JSON.stringify({
        apiMetrics: { deletedBefore: days90Ago.toISOString() },
        systemLogs: { deletedBefore: days365Ago.toISOString() },
        loginAttempts: { deletedBefore: days90Ago.toISOString() },
        executedAt: now.toISOString(),
      }),
      userEmail: "system@retention",
    });

    return {
      success: true,
      cleaned: {
        apiMetrics: { policy: "90 giorni" },
        systemLogs: { policy: "365 giorni" },
        loginAttempts: { policy: "90 giorni" },
      },
      executedAt: now.toISOString(),
    };
  }),

  /**
   * Registra l'accettazione del consenso GDPR
   */
  acceptConsent: protectedProcedure
    .input(z.object({
      certificateType: z.enum(["gdpr_consent", "privacy_policy", "terms_accepted"]),
      version: z.string().default("1.0"),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) throw new Error("Utente non autenticato");

      const { getDb } = await import("./db");
      const schema = await import("../drizzle/schema");
      const db = await getDb();
      if (!db) throw new Error("Database non disponibile");

      await db.insert(schema.complianceCertificates).values({
        userId: user.id,
        certificateType: input.certificateType,
        version: input.version,
        metadata: JSON.stringify({
          acceptedVia: "web_app",
          timestamp: new Date().toISOString(),
        }),
      });

      return { success: true, certificateType: input.certificateType };
    }),

  /**
   * Stato consenso utente corrente
   */
  myConsents: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.user;
    if (!user) throw new Error("Utente non autenticato");

    const { getDb } = await import("./db");
    const schema = await import("../drizzle/schema");
    const db = await getDb();
    if (!db) return [];

    return await db.select().from(schema.complianceCertificates)
      .where(eq(schema.complianceCertificates.userId, user.id))
      .orderBy(desc(schema.complianceCertificates.createdAt));
  }),
});
