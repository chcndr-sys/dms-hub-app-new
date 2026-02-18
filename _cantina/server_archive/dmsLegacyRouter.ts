/**
 * DMS Legacy Interoperability Router
 *
 * 23 endpoint per interoperabilita' bidirezionale tra MioHub (cervello) e DMS Legacy (braccio).
 * Prefisso tRPC: dmsLegacy.*
 *
 * EXPORT  (9): Lettura dati dal Legacy DB → formato MioHub
 * SYNC OUT (7): Scrittura dati MioHub → Legacy DB via stored functions _crup
 * SYNC IN  (3): Importazione dati dal Legacy → tabelle MioHub Neon
 * UTILITY  (4): Health, status, sync manuale, cron
 */

import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { eq, sql } from "drizzle-orm";
import * as schema from "../drizzle/schema";

import {
  isLegacyConfigured,
  legacyHealthCheck,
  getLastHealthCheck,
  readLegacyMarkets,
  readLegacyVendors,
  readLegacyConcessions,
  readLegacyStalls,
  readLegacyPresences,
  readLegacySessions,
  readLegacySpuntisti,
  readLegacyDocuments,
  readLegacyStats,
  readLegacyUsers,
  syncOutVendor,
  syncOutMarket,
  syncOutStall,
  syncOutConcession,
  syncOutSpuntista,
  syncOutUser,
  syncOutStartSession,
  syncOutCloseSession,
} from "./services/dmsLegacyService";

import {
  transformVendorToAmb,
  transformMarketToMkt,
  transformStallToPz,
  transformConcessionToConc,
  transformUserToSuser,
  transformSpuntistaToSp,
  transformPreToPresence,
  transformIstToSession,
  transformMktToMarket,
  transformAmbToVendor,
  transformConcToConcession,
  resolveVendorId,
  resolveStallId,
  resolveMarketId,
  resolveSessionId,
} from "./services/dmsLegacyTransformers";

// ============================================
// Sync Engine — Esegue sync reale o simulata
// ============================================

async function executeSyncJob(
  entity: string,
  direction: "push" | "pull" | "bidirectional",
  triggeredBy: string,
): Promise<{
  entity: string;
  jobId: number;
  status: string;
  processed: number;
  success: number;
  errors: number;
  details?: string;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database MioHub non disponibile");

  const startedAt = new Date();

  // Crea job record
  const [job] = await db.insert(schema.syncJobs).values({
    entity: entity as any,
    direction,
    status: "running",
    recordsProcessed: 0,
    recordsSuccess: 0,
    recordsError: 0,
    startedAt,
    triggeredBy,
  }).returning();

  let processed = 0;
  let success = 0;
  let errors = 0;
  let errorMessage: string | null = null;
  const logEntries: { recordId: string; localId: number | null; action: string; status: string; error?: string }[] = [];

  try {
    if (!isLegacyConfigured()) {
      // Modalita' offline — nessuna connessione Legacy
      errorMessage = "DMS_LEGACY_DB_URL non configurato — sync simulata";
      await db.update(schema.syncJobs).set({
        status: "partial",
        errorMessage,
        completedAt: new Date(),
      }).where(eq(schema.syncJobs.id, job.id));
      return { entity, jobId: job.id, status: "partial", processed: 0, success: 0, errors: 0, details: errorMessage };
    }

    // ---- SYNC OUT: MioHub → Legacy ----
    if (direction === "push" || direction === "bidirectional") {
      if (entity === "operatori" || entity === "mercati" || entity === "posteggi" || entity === "concessioni") {
        const result = await syncOutEntity(db, entity, logEntries);
        processed += result.processed;
        success += result.success;
        errors += result.errors;
      }
    }

    // ---- SYNC IN: Legacy → MioHub ----
    if (direction === "pull" || direction === "bidirectional") {
      if (entity === "presenze" || entity === "mercati" || entity === "posteggi") {
        const result = await syncInEntity(db, entity, logEntries);
        processed += result.processed;
        success += result.success;
        errors += result.errors;
      }
    }

    // Salva log dettagliati
    if (logEntries.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < logEntries.length; i += batchSize) {
        const batch = logEntries.slice(i, i + batchSize);
        await db.insert(schema.syncLogs).values(
          batch.map(entry => ({
            jobId: job.id,
            entity: entity as any,
            recordId: entry.recordId,
            localId: entry.localId,
            action: entry.action,
            status: entry.status,
            errorMessage: entry.error || null,
          }))
        );
      }
    }

    // Aggiorna job completato
    const finalStatus = errors > 0 ? (success > 0 ? "partial" : "error") : "success";
    await db.update(schema.syncJobs).set({
      status: finalStatus as any,
      recordsProcessed: processed,
      recordsSuccess: success,
      recordsError: errors,
      completedAt: new Date(),
      errorMessage: errors > 0 ? `${errors} errori durante la sincronizzazione` : null,
      details: JSON.stringify({ logCount: logEntries.length, duration: Date.now() - startedAt.getTime() }),
    }).where(eq(schema.syncJobs.id, job.id));

    return { entity, jobId: job.id, status: finalStatus, processed, success, errors };

  } catch (error: any) {
    await db.update(schema.syncJobs).set({
      status: "error",
      recordsProcessed: processed,
      recordsSuccess: success,
      recordsError: errors + 1,
      completedAt: new Date(),
      errorMessage: error.message,
    }).where(eq(schema.syncJobs.id, job.id));

    return { entity, jobId: job.id, status: "error", processed, success, errors: errors + 1, details: error.message };
  }
}

// ============================================
// SYNC OUT logic per entita'
// ============================================

async function syncOutEntity(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  entity: string,
  logEntries: any[],
): Promise<{ processed: number; success: number; errors: number }> {
  let processed = 0, success = 0, errors = 0;

  if (entity === "operatori") {
    const vendors = await db.select().from(schema.vendors);
    for (const vendor of vendors) {
      processed++;
      try {
        const ambJson = transformVendorToAmb(vendor);
        const result = await syncOutVendor(ambJson);
        // Se il Legacy restituisce un ID, salvalo nella nostra tabella
        const legacyId = result?.amb_id || result?.id;
        if (legacyId && !vendor.legacyAmbId) {
          await db.update(schema.vendors).set({ legacyAmbId: legacyId }).where(eq(schema.vendors.id, vendor.id));
        }
        success++;
        logEntries.push({ recordId: String(vendor.id), localId: vendor.id, action: vendor.legacyAmbId ? "update" : "create", status: "success" });
      } catch (e: any) {
        errors++;
        logEntries.push({ recordId: String(vendor.id), localId: vendor.id, action: "error", status: "error", error: e.message });
      }
    }
  }

  if (entity === "mercati") {
    const markets = await db.select().from(schema.markets);
    for (const market of markets) {
      processed++;
      try {
        const mktJson = transformMarketToMkt(market);
        const result = await syncOutMarket(mktJson);
        const legacyId = result?.mkt_id || result?.id;
        if (legacyId && !market.legacyMktId) {
          await db.update(schema.markets).set({ legacyMktId: legacyId }).where(eq(schema.markets.id, market.id));
        }
        success++;
        logEntries.push({ recordId: String(market.id), localId: market.id, action: market.legacyMktId ? "update" : "create", status: "success" });
      } catch (e: any) {
        errors++;
        logEntries.push({ recordId: String(market.id), localId: market.id, action: "error", status: "error", error: e.message });
      }
    }
  }

  if (entity === "posteggi") {
    const stalls = await db.select().from(schema.stalls);
    for (const stall of stalls) {
      processed++;
      try {
        // Risolvi il legacy_mkt_id dal market
        const [market] = await db.select({ legacyMktId: schema.markets.legacyMktId })
          .from(schema.markets).where(eq(schema.markets.id, stall.marketId)).limit(1);
        const pzJson = transformStallToPz(stall, market?.legacyMktId || null);
        const result = await syncOutStall(pzJson);
        const legacyId = result?.pz_id || result?.id;
        if (legacyId && !stall.legacyPzId) {
          await db.update(schema.stalls).set({ legacyPzId: legacyId }).where(eq(schema.stalls.id, stall.id));
        }
        success++;
        logEntries.push({ recordId: String(stall.id), localId: stall.id, action: stall.legacyPzId ? "update" : "create", status: "success" });
      } catch (e: any) {
        errors++;
        logEntries.push({ recordId: String(stall.id), localId: stall.id, action: "error", status: "error", error: e.message });
      }
    }
  }

  if (entity === "concessioni") {
    const concessions = await db.select().from(schema.concessions);
    for (const conc of concessions) {
      processed++;
      try {
        // Risolvi tutti i legacy ID
        const [vendor] = await db.select({ legacyAmbId: schema.vendors.legacyAmbId })
          .from(schema.vendors).where(eq(schema.vendors.id, conc.vendorId)).limit(1);
        const [market] = await db.select({ legacyMktId: schema.markets.legacyMktId })
          .from(schema.markets).where(eq(schema.markets.id, conc.marketId)).limit(1);
        let legacyPzId = null;
        if (conc.stallId) {
          const [stall] = await db.select({ legacyPzId: schema.stalls.legacyPzId })
            .from(schema.stalls).where(eq(schema.stalls.id, conc.stallId)).limit(1);
          legacyPzId = stall?.legacyPzId || null;
        }
        const concJson = transformConcessionToConc(conc, vendor?.legacyAmbId || null, market?.legacyMktId || null, legacyPzId);
        const result = await syncOutConcession(concJson);
        const legacyId = result?.conc_id || result?.id;
        if (legacyId && !conc.legacyConcId) {
          await db.update(schema.concessions).set({ legacyConcId: legacyId }).where(eq(schema.concessions.id, conc.id));
        }
        success++;
        logEntries.push({ recordId: String(conc.id), localId: conc.id, action: conc.legacyConcId ? "update" : "create", status: "success" });
      } catch (e: any) {
        errors++;
        logEntries.push({ recordId: String(conc.id), localId: conc.id, action: "error", status: "error", error: e.message });
      }
    }
  }

  return { processed, success, errors };
}

// ============================================
// SYNC IN logic per entita'
// ============================================

async function syncInEntity(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  entity: string,
  logEntries: any[],
): Promise<{ processed: number; success: number; errors: number }> {
  let processed = 0, success = 0, errors = 0;

  if (entity === "presenze") {
    // Leggi presenze da tutti i mercati con legacy_mkt_id
    const marketsWithLegacy = await db.select().from(schema.markets)
      .where(sql`legacy_mkt_id IS NOT NULL`);

    for (const market of marketsWithLegacy) {
      try {
        const legacyPresences = await readLegacyPresences(market.legacyMktId!);
        for (const pre of legacyPresences) {
          processed++;
          try {
            const transformed = transformPreToPresence(pre);

            // Risolvi IDs MioHub da Legacy IDs
            const vendorId = transformed.legacyAmbId ? await resolveVendorId(db, transformed.legacyAmbId) : null;
            const stallId = transformed.legacyPzId ? await resolveStallId(db, transformed.legacyPzId) : null;
            const sessionId = transformed.legacyIstId ? await resolveSessionId(db, transformed.legacyIstId) : null;

            if (!vendorId || !stallId) {
              logEntries.push({ recordId: String(pre.pre_id), localId: null, action: "skip", status: "skipped", error: `Vendor o stall non trovato (amb_id=${transformed.legacyAmbId}, pz_id=${transformed.legacyPzId})` });
              continue;
            }

            if (!transformed.checkinTime) {
              logEntries.push({ recordId: String(pre.pre_id), localId: null, action: "skip", status: "skipped", error: "Nessun checkin_time" });
              continue;
            }

            // Upsert: se esiste gia' con lo stesso legacy_pre_id, aggiorna
            const existing = await db.select({ id: schema.vendorPresences.id })
              .from(schema.vendorPresences)
              .where(eq(schema.vendorPresences.legacyPreId, pre.pre_id))
              .limit(1);

            if (existing.length > 0) {
              await db.update(schema.vendorPresences).set({
                checkoutTime: transformed.checkoutTime,
                orarioDepositoRifiuti: transformed.orarioDepositoRifiuti,
                rifiutata: transformed.rifiutata,
                importoAddebitato: transformed.importoAddebitato,
                tipoPresenza: transformed.tipoPresenza,
                notes: transformed.notes,
              }).where(eq(schema.vendorPresences.id, existing[0].id));
              success++;
              logEntries.push({ recordId: String(pre.pre_id), localId: existing[0].id, action: "update", status: "success" });
            } else {
              const [inserted] = await db.insert(schema.vendorPresences).values({
                vendorId,
                stallId,
                sessionId,
                checkinTime: transformed.checkinTime,
                checkoutTime: transformed.checkoutTime,
                legacyPreId: transformed.legacyPreId,
                rifiutata: transformed.rifiutata,
                tipoPresenza: transformed.tipoPresenza,
                orarioDepositoRifiuti: transformed.orarioDepositoRifiuti,
                importoAddebitato: transformed.importoAddebitato,
                notes: transformed.notes,
              }).returning();
              success++;
              logEntries.push({ recordId: String(pre.pre_id), localId: inserted.id, action: "create", status: "success" });
            }
          } catch (e: any) {
            errors++;
            logEntries.push({ recordId: String(pre.pre_id), localId: null, action: "error", status: "error", error: e.message });
          }
        }
      } catch (e: any) {
        errors++;
        logEntries.push({ recordId: `market_${market.id}`, localId: null, action: "error", status: "error", error: e.message });
      }
    }
  }

  if (entity === "mercati") {
    // Importa sessioni (istanze) per tutti i mercati con legacy_mkt_id
    const marketsWithLegacy = await db.select().from(schema.markets)
      .where(sql`legacy_mkt_id IS NOT NULL`);

    for (const market of marketsWithLegacy) {
      try {
        const legacySessions = await readLegacySessions(market.legacyMktId!);
        for (const ist of legacySessions) {
          processed++;
          try {
            const transformed = transformIstToSession(ist);
            if (!transformed.sessionDate) continue;

            const existing = await db.select({ id: schema.marketSessions.id })
              .from(schema.marketSessions)
              .where(eq(schema.marketSessions.legacyIstId, ist.ist_id))
              .limit(1);

            if (existing.length > 0) {
              await db.update(schema.marketSessions).set({
                status: transformed.status,
                openedAt: transformed.openedAt,
                closedAt: transformed.closedAt,
                totalPresences: transformed.totalPresences,
                totalConcessionari: transformed.totalConcessionari,
                totalSpuntisti: transformed.totalSpuntisti,
                updatedAt: new Date(),
              }).where(eq(schema.marketSessions.id, existing[0].id));
              success++;
              logEntries.push({ recordId: String(ist.ist_id), localId: existing[0].id, action: "update", status: "success" });
            } else {
              const [inserted] = await db.insert(schema.marketSessions).values({
                marketId: market.id,
                legacyIstId: transformed.legacyIstId,
                sessionDate: transformed.sessionDate,
                status: transformed.status,
                openedAt: transformed.openedAt,
                closedAt: transformed.closedAt,
                totalPresences: transformed.totalPresences,
                totalConcessionari: transformed.totalConcessionari,
                totalSpuntisti: transformed.totalSpuntisti,
              }).returning();
              success++;
              logEntries.push({ recordId: String(ist.ist_id), localId: inserted.id, action: "create", status: "success" });
            }
          } catch (e: any) {
            errors++;
            logEntries.push({ recordId: String(ist.ist_id), localId: null, action: "error", status: "error", error: e.message });
          }
        }
      } catch (e: any) {
        errors++;
        logEntries.push({ recordId: `market_${market.id}`, localId: null, action: "error", status: "error", error: e.message });
      }
    }
  }

  return { processed, success, errors };
}

// ============================================
// ROUTER tRPC
// ============================================

export const dmsLegacyRouter = router({

  // ============================================
  // EXPORT (9 endpoint) — Lettura dal Legacy DB
  // ============================================

  export: router({
    // 1. GET /markets — Mercati Legacy trasformati formato MioHub
    markets: protectedProcedure.query(async () => {
      if (!isLegacyConfigured()) return { data: [], source: "offline", message: "Legacy DB non configurato" };
      const raw = await readLegacyMarkets();
      return { data: raw.map(transformMktToMarket), source: "legacy", count: raw.length };
    }),

    // 2. GET /vendors — Ambulanti mappati come Imprese
    vendors: protectedProcedure.query(async () => {
      if (!isLegacyConfigured()) return { data: [], source: "offline", message: "Legacy DB non configurato" };
      const raw = await readLegacyVendors();
      return { data: raw.map(transformAmbToVendor), source: "legacy", count: raw.length };
    }),

    // 3. GET /concessions — Concessioni con dati relazionati
    concessions: protectedProcedure.query(async () => {
      if (!isLegacyConfigured()) return { data: [], source: "offline", message: "Legacy DB non configurato" };
      const raw = await readLegacyConcessions();
      return { data: raw.map(transformConcToConcession), source: "legacy", count: raw.length };
    }),

    // 4. GET /presences/:marketId — Presenze per mercato
    presences: protectedProcedure
      .input(z.object({ marketId: z.number() }))
      .query(async ({ input }) => {
        if (!isLegacyConfigured()) return { data: [], source: "offline", message: "Legacy DB non configurato" };
        const raw = await readLegacyPresences(input.marketId);
        return { data: raw.map(transformPreToPresence), source: "legacy", count: raw.length };
      }),

    // 5. GET /market-sessions/:marketId — Giornate mercato con statistiche
    marketSessions: protectedProcedure
      .input(z.object({ marketId: z.number() }))
      .query(async ({ input }) => {
        if (!isLegacyConfigured()) return { data: [], source: "offline", message: "Legacy DB non configurato" };
        const raw = await readLegacySessions(input.marketId);
        return { data: raw.map(transformIstToSession), source: "legacy", count: raw.length };
      }),

    // 6. GET /stalls/:marketId — Piazzole con assegnatario
    stalls: protectedProcedure
      .input(z.object({ marketId: z.number() }))
      .query(async ({ input }) => {
        if (!isLegacyConfigured()) return { data: [], source: "offline", message: "Legacy DB non configurato" };
        const raw = await readLegacyStalls(input.marketId);
        return { data: raw, source: "legacy", count: raw.length };
      }),

    // 7. GET /spuntisti — Operatori di spunta
    spuntisti: protectedProcedure.query(async () => {
      if (!isLegacyConfigured()) return { data: [], source: "offline", message: "Legacy DB non configurato" };
      const raw = await readLegacySpuntisti();
      return { data: raw, source: "legacy", count: raw.length };
    }),

    // 8. GET /documents — Documenti ambulanti
    documents: protectedProcedure.query(async () => {
      if (!isLegacyConfigured()) return { data: [], source: "offline", message: "Legacy DB non configurato" };
      const raw = await readLegacyDocuments();
      return { data: raw, source: "legacy", count: raw.length };
    }),

    // 9. GET /stats — Statistiche generali Legacy
    stats: protectedProcedure.query(async () => {
      if (!isLegacyConfigured()) return { data: null, source: "offline", message: "Legacy DB non configurato" };
      const stats = await readLegacyStats();
      return { data: stats, source: "legacy" };
    }),
  }),

  // ============================================
  // SYNC OUT (7 endpoint) — MioHub → Legacy
  // ============================================

  syncOut: router({
    // 10. POST /sync-out/vendors — Manda imprese al Legacy
    vendors: adminProcedure.mutation(async () => {
      return executeSyncJob("operatori", "push", "manual");
    }),

    // 11. POST /sync-out/markets — Manda mercati al Legacy
    markets: adminProcedure.mutation(async () => {
      return executeSyncJob("mercati", "push", "manual");
    }),

    // 12. POST /sync-out/stalls — Manda piazzole al Legacy
    stalls: adminProcedure.mutation(async () => {
      return executeSyncJob("posteggi", "push", "manual");
    }),

    // 13. POST /sync-out/concessions — Manda concessioni al Legacy
    concessions: adminProcedure.mutation(async () => {
      return executeSyncJob("concessioni", "push", "manual");
    }),

    // 14. POST /sync-out/users — Manda operatori al Legacy
    users: adminProcedure.mutation(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database non disponibile");
      if (!isLegacyConfigured()) return { status: "offline", message: "Legacy DB non configurato" };

      const users = await db.select().from(schema.users);
      let success = 0, errors = 0;
      for (const user of users) {
        try {
          const suserJson = transformUserToSuser(user);
          await syncOutUser(suserJson);
          success++;
        } catch {
          errors++;
        }
      }
      return { status: "completed", processed: users.length, success, errors };
    }),

    // 15. POST /sync-out/spuntisti — Manda autorizzazioni spunta
    spuntisti: adminProcedure.mutation(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database non disponibile");
      if (!isLegacyConfigured()) return { status: "offline", message: "Legacy DB non configurato" };

      const spuntistaList = await db.select().from(schema.spuntisti);
      let success = 0, errors = 0;
      for (const sp of spuntistaList) {
        try {
          const [vendor] = await db.select({ legacyAmbId: schema.vendors.legacyAmbId })
            .from(schema.vendors).where(eq(schema.vendors.id, sp.vendorId)).limit(1);
          const [market] = await db.select({ legacyMktId: schema.markets.legacyMktId })
            .from(schema.markets).where(eq(schema.markets.id, sp.marketId)).limit(1);
          const spJson = transformSpuntistaToSp(sp, vendor?.legacyAmbId || null, market?.legacyMktId || null);
          await syncOutSpuntista(spJson);
          success++;
        } catch {
          errors++;
        }
      }
      return { status: "completed", processed: spuntistaList.length, success, errors };
    }),

    // 16. POST /sync-out/sessions — Gestione sessioni mercato
    sessions: adminProcedure
      .input(z.object({
        action: z.enum(["start", "close"]),
        marketId: z.number().optional(),
        sessionId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        if (!isLegacyConfigured()) return { status: "offline", message: "Legacy DB non configurato" };

        if (input.action === "start" && input.marketId) {
          const db = await getDb();
          if (!db) throw new Error("Database non disponibile");
          const [market] = await db.select({ legacyMktId: schema.markets.legacyMktId })
            .from(schema.markets).where(eq(schema.markets.id, input.marketId)).limit(1);
          if (!market?.legacyMktId) return { status: "error", message: "Mercato non ha legacy_mkt_id" };
          const result = await syncOutStartSession({ mkt_id: market.legacyMktId });
          return { status: "completed", action: "start", result };
        }

        if (input.action === "close" && input.sessionId) {
          const db = await getDb();
          if (!db) throw new Error("Database non disponibile");
          const [session] = await db.select({ legacyIstId: schema.marketSessions.legacyIstId })
            .from(schema.marketSessions).where(eq(schema.marketSessions.id, input.sessionId)).limit(1);
          if (!session?.legacyIstId) return { status: "error", message: "Sessione non ha legacy_ist_id" };
          const result = await syncOutCloseSession({ ist_id: session.legacyIstId });
          return { status: "completed", action: "close", result };
        }

        return { status: "error", message: "Parametri mancanti" };
      }),

    // POST /sync-out/all — Sync completa di tutte le entita'
    all: adminProcedure.mutation(async () => {
      const entities = ["operatori", "mercati", "posteggi", "concessioni"] as const;
      const results = await Promise.all(
        entities.map(entity => executeSyncJob(entity, "push", "manual"))
      );
      return { status: "completed", results };
    }),
  }),

  // ============================================
  // SYNC IN (3 endpoint) — Legacy → MioHub
  // ============================================

  syncIn: router({
    // 17. POST /sync-in/presences — Importa presenze dal campo
    presences: adminProcedure.mutation(async () => {
      return executeSyncJob("presenze", "pull", "manual");
    }),

    // 18. POST /sync-in/sessions — Importa sessioni dal Legacy
    sessions: adminProcedure.mutation(async () => {
      // Le sessioni vengono importate tramite entity "mercati" in pull
      return executeSyncJob("mercati", "pull", "manual");
    }),

    // 19. POST /sync-in/all — Sync completa in ingresso
    all: adminProcedure.mutation(async () => {
      const results = await Promise.all([
        executeSyncJob("presenze", "pull", "manual"),
        executeSyncJob("mercati", "pull", "manual"),
      ]);
      return { status: "completed", results };
    }),
  }),

  // ============================================
  // UTILITY (4 endpoint)
  // ============================================

  // 20. GET /health — Health check connessione DB Legacy
  health: protectedProcedure.query(async () => {
    if (!isLegacyConfigured()) {
      return {
        status: "offline",
        connected: false,
        message: "DMS_LEGACY_DB_URL non configurato. Aggiungere la variabile d'ambiente su Hetzner.",
        lastCheck: getLastHealthCheck(),
      };
    }

    const health = await legacyHealthCheck();
    return {
      status: health.connected ? "online" : "error",
      connected: health.connected,
      latency: health.latency,
      tables: health.tables,
      error: health.error || null,
      lastCheck: getLastHealthCheck(),
    };
  }),

  // 21. GET /status — Stato integrazione completo
  status: protectedProcedure.query(async () => {
    const db = await getDb();
    const configured = isLegacyConfigured();
    let legacyStats = null;
    let legacyHealth = null;

    if (configured) {
      try {
        legacyHealth = await legacyHealthCheck();
        legacyStats = await readLegacyStats();
      } catch {}
    }

    // Contatori MioHub
    let mioHubCounts = { markets: 0, vendors: 0, concessions: 0, stalls: 0, presences: 0, sessions: 0 };
    if (db) {
      const [m] = await db.select({ c: sql<number>`count(*)` }).from(schema.markets);
      const [v] = await db.select({ c: sql<number>`count(*)` }).from(schema.vendors);
      const [c] = await db.select({ c: sql<number>`count(*)` }).from(schema.concessions);
      const [s] = await db.select({ c: sql<number>`count(*)` }).from(schema.stalls);
      const [p] = await db.select({ c: sql<number>`count(*)` }).from(schema.vendorPresences);
      const [ss] = await db.select({ c: sql<number>`count(*)` }).from(schema.marketSessions);
      mioHubCounts = {
        markets: Number(m.c), vendors: Number(v.c), concessions: Number(c.c),
        stalls: Number(s.c), presences: Number(p.c), sessions: Number(ss.c),
      };
    }

    // Contatori con legacy_id
    let linkedCounts = { markets: 0, vendors: 0, concessions: 0, stalls: 0, presences: 0, sessions: 0 };
    if (db) {
      const [lm] = await db.select({ c: sql<number>`count(*)` }).from(schema.markets).where(sql`legacy_mkt_id IS NOT NULL`);
      const [lv] = await db.select({ c: sql<number>`count(*)` }).from(schema.vendors).where(sql`legacy_amb_id IS NOT NULL`);
      const [lc] = await db.select({ c: sql<number>`count(*)` }).from(schema.concessions).where(sql`legacy_conc_id IS NOT NULL`);
      const [ls] = await db.select({ c: sql<number>`count(*)` }).from(schema.stalls).where(sql`legacy_pz_id IS NOT NULL`);
      const [lp] = await db.select({ c: sql<number>`count(*)` }).from(schema.vendorPresences).where(sql`legacy_pre_id IS NOT NULL`);
      const [lss] = await db.select({ c: sql<number>`count(*)` }).from(schema.marketSessions).where(sql`legacy_ist_id IS NOT NULL`);
      linkedCounts = {
        markets: Number(lm.c), vendors: Number(lv.c), concessions: Number(lc.c),
        stalls: Number(ls.c), presences: Number(lp.c), sessions: Number(lss.c),
      };
    }

    return {
      configured,
      legacyConnected: legacyHealth?.connected || false,
      legacyLatency: legacyHealth?.latency || null,
      legacyStats,
      mioHubCounts,
      linkedCounts,
      channels: {
        export: configured ? "active" : "offline",
        syncOut: configured ? "active" : "offline",
        syncIn: configured ? "active" : "offline",
      },
    };
  }),

  // 22. POST /sync — Sync manuale on-demand (bidirezionale)
  sync: adminProcedure
    .input(z.object({
      entity: z.string().optional(),
      direction: z.enum(["push", "pull", "bidirectional"]).default("bidirectional"),
    }).optional())
    .mutation(async ({ input }) => {
      const entity = input?.entity;
      const direction = input?.direction || "bidirectional";

      if (entity) {
        return executeSyncJob(entity, direction, "manual");
      }

      // Sync completa di tutte le entita'
      const entities = ["operatori", "mercati", "posteggi", "concessioni", "presenze"];
      const results = await Promise.all(
        entities.map(e => executeSyncJob(e, direction, "manual"))
      );
      return { status: "completed", results, simulated: !isLegacyConfigured() };
    }),

  // 23. POST /cron-sync — CRON automatico (chiamato dal scheduler)
  cronSync: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) return { status: "error", message: "Database non disponibile" };

    // Leggi config
    const [config] = await db.select().from(schema.syncConfig).limit(1);
    if (!config || config.enabled !== 1) {
      return { status: "skipped", message: "Sync automatica disabilitata" };
    }

    const enabledEntities: string[] = config.entities ? JSON.parse(config.entities) : ["operatori", "mercati", "posteggi", "concessioni", "presenze"];
    const direction = (config.mode || "bidirectional") as "push" | "pull" | "bidirectional";

    const results = await Promise.all(
      enabledEntities.map(e => executeSyncJob(e, direction, "cron"))
    );

    return { status: "completed", results, triggeredBy: "cron", timestamp: new Date().toISOString() };
  }),
});
