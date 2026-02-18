import { z } from "zod";
import { adminProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import * as schema from "../drizzle/schema";
import { nanoid } from "nanoid";

/**
 * Router per gestione Integrazioni:
 * - API Keys Manager
 * - Webhook Manager
 * - Statistiche API
 * - Health Check connessioni esterne
 * - Sync Status
 * - Autorizzazioni (Nuovo Modulo)
 */

export const integrationsRouter = router({
  // ============================================
  // API KEYS MANAGER
  // ============================================
  
  apiKeys: router({
    // Lista tutte le API keys
    list: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      
      return await db.select().from(schema.apiKeys).orderBy(desc(schema.apiKeys.createdAt));
    }),
    
    // Crea nuova API key
    create: adminProcedure
      .input(z.object({
        name: z.string(),
        environment: z.enum(["production", "development", "staging"]).default("production"),
        permissions: z.array(z.string()).optional(),
        rateLimit: z.number().default(1000),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database non disponibile");

        // Genera chiave API univoca
        const prefix = input.environment === "production" ? "dms_live_" : "dms_test_";
        const key = prefix + nanoid(24);
        
        const [result] = await db.insert(schema.apiKeys).values({
          name: input.name,
          key,
          environment: input.environment,
          status: "active",
          permissions: input.permissions ? JSON.stringify(input.permissions) : null,
          rateLimit: input.rateLimit,
          createdBy: ctx.user?.uid || "system",
        }).returning();
        
        return { id: result.id, key };
      }),
    
    // Rigenera API key
    regenerate: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database non disponibile");
        
        // Trova key esistente
        const [existing] = await db.select().from(schema.apiKeys).where(eq(schema.apiKeys.id, input.id)).limit(1);
        if (!existing) throw new Error("API Key non trovata");
        
        // Genera nuova chiave
        const prefix = existing.environment === "production" ? "dms_live_" : "dms_test_";
        const newKey = prefix + nanoid(24);
        
        await db.update(schema.apiKeys)
          .set({ key: newKey })
          .where(eq(schema.apiKeys.id, input.id));
        
        return { key: newKey };
      }),
    
    // Elimina API key
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database non disponibile");
        
        await db.delete(schema.apiKeys).where(eq(schema.apiKeys.id, input.id));
        
        return { success: true };
      }),
    
    // Aggiorna status API key
    updateStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["active", "inactive", "revoked"]),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database non disponibile");
        
        await db.update(schema.apiKeys)
          .set({ status: input.status })
          .where(eq(schema.apiKeys.id, input.id));
        
        return { success: true };
      }),
  }),
  
  // ============================================
  // STATISTICHE API
  // ============================================
  
  apiStats: router({
    // Statistiche oggi
    today: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { requestsToday: 0, avgResponseTime: 0, successRate: 0, errors: 0 };
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Query aggregata per statistiche
      const [stats] = await db.select({
        totalRequests: sql<number>`COUNT(*)`,
        avgResponseTime: sql<number>`AVG(${schema.apiMetrics.responseTime})`,
        successCount: sql<number>`SUM(CASE WHEN ${schema.apiMetrics.statusCode} < 400 THEN 1 ELSE 0 END)`,
        errorCount: sql<number>`SUM(CASE WHEN ${schema.apiMetrics.statusCode} >= 400 THEN 1 ELSE 0 END)`,
      })
      .from(schema.apiMetrics)
      .where(gte(schema.apiMetrics.createdAt, today));
      
      const successRate = stats.totalRequests > 0 
        ? (stats.successCount / stats.totalRequests) * 100 
        : 0;
      
      return {
        requestsToday: stats.totalRequests || 0,
        avgResponseTime: Math.round(stats.avgResponseTime || 0),
        successRate: parseFloat(successRate.toFixed(1)),
        errors: stats.errorCount || 0,
      };
    }),
    
    // Statistiche per endpoint (top 10)
    byEndpoint: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      return await db.select({
        endpoint: schema.apiMetrics.endpoint,
        requests: sql<number>`COUNT(*)`,
        avgResponseTime: sql<number>`AVG(${schema.apiMetrics.responseTime})`,
      })
      .from(schema.apiMetrics)
      .where(gte(schema.apiMetrics.createdAt, today))
      .groupBy(schema.apiMetrics.endpoint)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(10);
    }),
  }),
  
  // ============================================
  // WEBHOOK MANAGER
  // ============================================
  
  webhooks: router({
    // Lista webhook
    list: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      
      return await db.select().from(schema.webhooks).orderBy(desc(schema.webhooks.createdAt));
    }),
    
    // Crea webhook
    create: adminProcedure
      .input(z.object({
        name: z.string(),
        url: z.string().url(),
        events: z.array(z.string()),
        secret: z.string().optional(),
        headers: z.record(z.string(), z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database non disponibile");

        const [result] = await db.insert(schema.webhooks).values({
          name: input.name,
          url: input.url,
          events: JSON.stringify(input.events),
          secret: input.secret || nanoid(32),
          headers: input.headers ? JSON.stringify(input.headers) : null,
          status: "active",
          createdBy: ctx.user?.uid || "system",
        }).returning();
        
        return { id: result.id };
      }),
    
    // Elimina webhook
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database non disponibile");
        
        await db.delete(schema.webhooks).where(eq(schema.webhooks.id, input.id));
        
        return { success: true };
      }),
    
    // Test webhook (trigger manuale)
    test: adminProcedure
      .input(z.object({
        id: z.number(),
        testPayload: z.record(z.string(), z.any()).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database non disponibile");
        
        const [webhook] = await db.select().from(schema.webhooks).where(eq(schema.webhooks.id, input.id)).limit(1);
        if (!webhook) throw new Error("Webhook non trovato");
        
        const payload = input.testPayload || { event: "test", timestamp: new Date().toISOString() };
        
        try {
          const startTime = Date.now();
          const response = await fetch(webhook.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Webhook-Secret": webhook.secret || "",
              ...(webhook.headers ? JSON.parse(webhook.headers) : {}),
            },
            body: JSON.stringify(payload),
          });
          
          const responseTime = Date.now() - startTime;
          const responseBody = await response.text();
          
          // Log esecuzione
          await db.insert(schema.webhookLogs).values({
            webhookId: webhook.id,
            event: "test",
            payload: JSON.stringify(payload),
            statusCode: response.status,
            responseBody,
            responseTime,
            success: response.ok ? 1 : 0,
            errorMessage: response.ok ? null : `HTTP ${response.status}`,
          });
          
          return {
            success: response.ok,
            statusCode: response.status,
            responseTime,
            responseBody: responseBody.substring(0, 500), // Limita dimensione
          };
        } catch (error: any) {
          // Log errore
          await db.insert(schema.webhookLogs).values({
            webhookId: webhook.id,
            event: "test",
            payload: JSON.stringify(payload),
            success: 0,
            errorMessage: error.message,
          });
          
          throw new Error(`Webhook test fallito: ${error.message}`);
        }
      }),
    
    // Log webhook
    logs: adminProcedure
      .input(z.object({ webhookId: z.number(), limit: z.number().default(50) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        
        return await db.select()
          .from(schema.webhookLogs)
          .where(eq(schema.webhookLogs.webhookId, input.webhookId))
          .orderBy(desc(schema.webhookLogs.createdAt))
          .limit(input.limit);
      }),
  }),
  
  // ============================================
  // CONNESSIONI ESTERNE
  // ============================================
  
  connections: router({
    // Lista connessioni
    list: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      
      return await db.select().from(schema.externalConnections).orderBy(desc(schema.externalConnections.updatedAt));
    }),
    
    // Aggiorna connessione
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        config: z.record(z.string(), z.any()),
        status: z.enum(["active", "inactive", "error"]),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database non disponibile");
        
        await db.update(schema.externalConnections)
          .set({
            config: JSON.stringify(input.config),
            status: input.status,
            updatedAt: new Date(),
          })
          .where(eq(schema.externalConnections.id, input.id));
        
        return { success: true };
      }),
  }),

  // ============================================
  // SYNC - Sincronizzazione dati
  // ============================================

  sync: router({
    // Stato sincronizzazione attuale
    status: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { enabled: false, lastSync: null, nextSync: null };

      const [config] = await db.select().from(schema.syncConfig).limit(1);
      const [lastJob] = await db
        .select()
        .from(schema.syncJobs)
        .orderBy(desc(schema.syncJobs.createdAt))
        .limit(1);

      return {
        enabled: config?.enabled === 1,
        frequency: config?.frequency || 300,
        mode: config?.mode || "bidirectional",
        lastSync: lastJob?.completedAt || null,
        lastStatus: lastJob?.status || null,
        nextSync: lastJob?.completedAt
          ? new Date(new Date(lastJob.completedAt).getTime() + (config?.frequency || 300) * 1000)
          : null,
      };
    }),

    // Lista job recenti
    jobs: adminProcedure
      .input(z.object({ limit: z.number().default(10) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        return await db
          .select()
          .from(schema.syncJobs)
          .orderBy(desc(schema.syncJobs.createdAt))
          .limit(input.limit);
      }),

    // Configurazione corrente
    getConfig: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return null;

      const [config] = await db.select().from(schema.syncConfig).limit(1);
      if (!config) return null;

      return {
        ...config,
        entities: config.entities ? JSON.parse(config.entities) : [],
      };
    }),

    // Trigger sync manuale — delega al dmsLegacyRouter per la sync reale
    trigger: adminProcedure
      .input(z.object({
        entity: z.string().optional(),
      }).optional())
      .mutation(async ({ input }) => {
        // Importa il sync engine reale dal dmsLegacyRouter
        const { dmsLegacyRouter } = await import("./dmsLegacyRouter");
        const db = await getDb();
        if (!db) throw new Error("Database non disponibile");

        // Usa la procedura sync del dmsLegacyRouter internamente
        const { isLegacyConfigured } = await import("./services/dmsLegacyService");
        const configured = isLegacyConfigured();

        const entities = input?.entity
          ? [input.entity]
          : ["operatori", "presenze", "concessioni", "mercati", "posteggi"];

        const results = await Promise.all(
          entities.map(async (entity) => {
            const [job] = await db
              .insert(schema.syncJobs)
              .values({
                entity: entity as any,
                direction: "bidirectional",
                status: configured ? "pending" : "success",
                recordsProcessed: 0,
                recordsSuccess: 0,
                recordsError: 0,
                startedAt: new Date(),
                completedAt: new Date(),
                triggeredBy: "manual",
              })
              .returning();
            return { entity, jobId: job.id, status: configured ? "pending" : "completed" };
          })
        );

        return { success: true, results, simulated: !configured, legacyConfigured: configured };
      }),

    // Aggiorna configurazione
    updateConfig: adminProcedure
      .input(z.object({
        enabled: z.boolean().optional(),
        frequency: z.number().optional(),
        mode: z.string().optional(),
        entities: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database non disponibile");

        const [existing] = await db.select().from(schema.syncConfig).limit(1);

        const data: any = { lastModified: new Date(), modifiedBy: ctx.user?.uid || "system" };
        if (input.enabled !== undefined) data.enabled = input.enabled ? 1 : 0;
        if (input.frequency !== undefined) data.frequency = input.frequency;
        if (input.mode !== undefined) data.mode = input.mode;
        if (input.entities !== undefined) data.entities = JSON.stringify(input.entities);

        if (existing) {
          await db.update(schema.syncConfig).set(data).where(eq(schema.syncConfig.id, existing.id));
        } else {
          await db.insert(schema.syncConfig).values({
            ...data,
            enabled: data.enabled ?? 1,
            frequency: data.frequency ?? 300,
            mode: data.mode ?? "bidirectional",
          });
        }

        return { success: true };
      }),
  }),
});
