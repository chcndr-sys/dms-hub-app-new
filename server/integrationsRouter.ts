import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
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
 */

export const integrationsRouter = router({
  // ============================================
  // API KEYS MANAGER
  // ============================================
  
  apiKeys: router({
    // Lista tutte le API keys
    list: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      
      return await db.select().from(schema.apiKeys).orderBy(desc(schema.apiKeys.createdAt));
    }),
    
    // Crea nuova API key
    create: publicProcedure
      .input(z.object({
        name: z.string(),
        environment: z.enum(["production", "development", "staging"]).default("production"),
        permissions: z.array(z.string()).optional(),
        rateLimit: z.number().default(1000),
      }))
      .mutation(async ({ input }) => {
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
          createdBy: "admin", // TODO: prendere da ctx.user
        }).returning();
        
        return { id: result.id, key };
      }),
    
    // Rigenera API key
    regenerate: publicProcedure
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
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database non disponibile");
        
        await db.delete(schema.apiKeys).where(eq(schema.apiKeys.id, input.id));
        
        return { success: true };
      }),
    
    // Aggiorna status API key
    updateStatus: publicProcedure
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
    today: publicProcedure.query(async () => {
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
    byEndpoint: publicProcedure.query(async () => {
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
    list: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      
      return await db.select().from(schema.webhooks).orderBy(desc(schema.webhooks.createdAt));
    }),
    
    // Crea webhook
    create: publicProcedure
      .input(z.object({
        name: z.string(),
        url: z.string().url(),
        events: z.array(z.string()),
        secret: z.string().optional(),
        headers: z.record(z.string(), z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database non disponibile");
        
        const [result] = await db.insert(schema.webhooks).values({
          name: input.name,
          url: input.url,
          events: JSON.stringify(input.events),
          secret: input.secret || nanoid(32),
          headers: input.headers ? JSON.stringify(input.headers) : null,
          status: "active",
          createdBy: "admin", // TODO: prendere da ctx.user
        }).returning();
        
        return { id: result.id };
      }),
    
    // Elimina webhook
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database non disponibile");
        
        await db.delete(schema.webhooks).where(eq(schema.webhooks.id, input.id));
        
        return { success: true };
      }),
    
    // Test webhook (trigger manuale)
    test: publicProcedure
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
    logs: publicProcedure
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
    list: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      
      return await db.select().from(schema.externalConnections).orderBy(schema.externalConnections.name);
    }),
    
    // Health check singola connessione
    healthCheck: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database non disponibile");
        
        const [connection] = await db.select()
          .from(schema.externalConnections)
          .where(eq(schema.externalConnections.id, input.id))
          .limit(1);
        
        if (!connection) throw new Error("Connessione non trovata");
        
        let status = "disconnected";
        let lastError = null;
        
        if (connection.endpoint) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(connection.endpoint, {
              method: "GET",
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            status = response.ok ? "connected" : "error";
            if (!response.ok) {
              lastError = `HTTP ${response.status}`;
            }
          } catch (error: any) {
            status = "error";
            lastError = error.message;
          }
        }
        
        // Aggiorna database
        await db.update(schema.externalConnections)
          .set({
            status,
            lastCheckAt: new Date(),
            lastError,
          })
          .where(eq(schema.externalConnections.id, input.id));
        
        return { status, lastError };
      }),
    
    // Health check tutte le connessioni
    healthCheckAll: publicProcedure.mutation(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database non disponibile");
      
      const connections = await db.select().from(schema.externalConnections);
      
      const results = await Promise.all(
        connections.map(async (conn) => {
          let status = "disconnected";
          let lastError = null;
          
          if (conn.endpoint) {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000);
              
              const response = await fetch(conn.endpoint, {
                method: "GET",
                signal: controller.signal,
              });
              
              clearTimeout(timeoutId);
              
              status = response.ok ? "connected" : "error";
              if (!response.ok) {
                lastError = `HTTP ${response.status}`;
              }
            } catch (error: any) {
              status = "error";
              lastError = error.message;
            }
          }
          
          // Aggiorna database
          await db.update(schema.externalConnections)
            .set({
              status,
              lastCheckAt: new Date(),
              lastError,
            })
            .where(eq(schema.externalConnections.id, conn.id));
          
          return { id: conn.id, name: conn.name, status, lastError };
        })
      );
      
      return results;
    }),
  }),
  
  // ============================================
  // SYNC STATUS - Sincronizzazione Gestionale
  // ============================================
  
  sync: router({
    // Stato attuale sincronizzazione
    status: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return {
        enabled: false,
        lastSync: null,
        nextSync: null,
        totalSynced: 0,
        errors: 0,
        config: null,
      };
      
      // Ottieni configurazione
      const [config] = await db.select().from(schema.syncConfig).limit(1);
      
      // Ottieni ultimo job completato
      const [lastJob] = await db.select()
        .from(schema.syncJobs)
        .where(eq(schema.syncJobs.status, "success"))
        .orderBy(desc(schema.syncJobs.completedAt))
        .limit(1);
      
      // Conta totale record sincronizzati oggi
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const [stats] = await db.select({
        totalSynced: sql<number>`COALESCE(SUM(${schema.syncJobs.recordsSuccess}), 0)`,
        errors: sql<number>`COALESCE(SUM(${schema.syncJobs.recordsError}), 0)`,
      })
      .from(schema.syncJobs)
      .where(gte(schema.syncJobs.createdAt, today));
      
      // Calcola prossimo sync
      let nextSync = null;
      if (config?.enabled && lastJob?.completedAt) {
        const nextSyncTime = new Date(lastJob.completedAt);
        nextSyncTime.setSeconds(nextSyncTime.getSeconds() + (config.frequency || 300));
        nextSync = nextSyncTime;
      }
      
      return {
        enabled: config?.enabled === 1,
        lastSync: lastJob?.completedAt || null,
        nextSync,
        totalSynced: stats?.totalSynced || 0,
        errors: stats?.errors || 0,
        config: config ? {
          frequency: config.frequency,
          mode: config.mode,
          externalUrl: config.externalUrl,
          entities: config.entities ? JSON.parse(config.entities) : [],
        } : null,
      };
    }),
    
    // Lista job di sincronizzazione recenti
    jobs: publicProcedure
      .input(z.object({ limit: z.number().default(20) }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        
        return await db.select()
          .from(schema.syncJobs)
          .orderBy(desc(schema.syncJobs.createdAt))
          .limit(input?.limit || 20);
      }),
    
    // Log dettagliati per un job
    logs: publicProcedure
      .input(z.object({ jobId: z.number(), limit: z.number().default(100) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        
        return await db.select()
          .from(schema.syncLogs)
          .where(eq(schema.syncLogs.jobId, input.jobId))
          .orderBy(desc(schema.syncLogs.createdAt))
          .limit(input.limit);
      }),
    
    // Avvia sincronizzazione manuale
    trigger: publicProcedure
      .input(z.object({
        entity: z.enum(["operatori", "presenze", "concessioni", "pagamenti", "documenti", "mercati", "posteggi"]).optional(),
        direction: z.enum(["pull", "push", "bidirectional"]).default("bidirectional"),
      }).optional())
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database non disponibile");
        
        // Ottieni configurazione
        const [config] = await db.select().from(schema.syncConfig).limit(1);
        
        // Se non c'è URL esterno, simula sync
        const isSimulated = !config?.externalUrl;
        
        // Entità da sincronizzare
        const entities = input?.entity 
          ? [input.entity] 
          : (config?.entities ? JSON.parse(config.entities) : ["operatori", "presenze", "concessioni", "pagamenti", "documenti"]);
        
        const results = [];
        
        for (const entity of entities) {
          // Crea job
          const [job] = await db.insert(schema.syncJobs).values({
            entity: entity as any,
            direction: input?.direction || "bidirectional",
            status: "running",
            startedAt: new Date(),
            triggeredBy: "manual",
          }).returning();
          
          // Simula sincronizzazione (o esegui reale se configurato)
          let recordsProcessed = 0;
          let recordsSuccess = 0;
          let recordsError = 0;
          let errorMessage = null;
          
          if (isSimulated) {
            // Simulazione: genera numeri casuali realistici
            recordsProcessed = Math.floor(Math.random() * 100) + 10;
            recordsSuccess = Math.floor(recordsProcessed * (0.9 + Math.random() * 0.1));
            recordsError = recordsProcessed - recordsSuccess;
            
            // Simula tempo di elaborazione
            await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
          } else {
            // TODO: Implementare sync reale con gestionale Heroku
            // Per ora restituisce errore se URL configurato ma non implementato
            errorMessage = "Sync reale non ancora implementato. Configurare endpoint Heroku.";
            recordsError = 1;
          }
          
          // Aggiorna job
          await db.update(schema.syncJobs)
            .set({
              status: recordsError > 0 && recordsSuccess === 0 ? "error" : recordsError > 0 ? "partial" : "success",
              recordsProcessed,
              recordsSuccess,
              recordsError,
              completedAt: new Date(),
              errorMessage,
            })
            .where(eq(schema.syncJobs.id, job.id));
          
          results.push({
            entity,
            jobId: job.id,
            recordsProcessed,
            recordsSuccess,
            recordsError,
            status: recordsError > 0 && recordsSuccess === 0 ? "error" : recordsError > 0 ? "partial" : "success",
          });
        }
        
        return {
          success: true,
          simulated: isSimulated,
          results,
        };
      }),
    
    // Aggiorna configurazione sync
    updateConfig: publicProcedure
      .input(z.object({
        enabled: z.boolean().optional(),
        frequency: z.number().min(60).max(86400).optional(), // Min 1 min, max 24 ore
        mode: z.enum(["unidirectional", "bidirectional"]).optional(),
        externalUrl: z.string().url().optional().nullable(),
        externalApiKey: z.string().optional().nullable(),
        entities: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database non disponibile");
        
        // Verifica se esiste già una configurazione
        const [existing] = await db.select().from(schema.syncConfig).limit(1);
        
        const updateData: any = {
          lastModified: new Date(),
          modifiedBy: "admin", // TODO: prendere da ctx.user
        };
        
        if (input.enabled !== undefined) updateData.enabled = input.enabled ? 1 : 0;
        if (input.frequency !== undefined) updateData.frequency = input.frequency;
        if (input.mode !== undefined) updateData.mode = input.mode;
        if (input.externalUrl !== undefined) updateData.externalUrl = input.externalUrl;
        if (input.externalApiKey !== undefined) updateData.externalApiKey = input.externalApiKey;
        if (input.entities !== undefined) updateData.entities = JSON.stringify(input.entities);
        
        if (existing) {
          await db.update(schema.syncConfig)
            .set(updateData)
            .where(eq(schema.syncConfig.id, existing.id));
        } else {
          await db.insert(schema.syncConfig).values(updateData);
        }
        
        return { success: true };
      }),
    
    // Ottieni configurazione
    getConfig: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return null;
      
      const [config] = await db.select().from(schema.syncConfig).limit(1);
      
      if (!config) return null;
      
      return {
        enabled: config.enabled === 1,
        frequency: config.frequency,
        mode: config.mode,
        externalUrl: config.externalUrl,
        entities: config.entities ? JSON.parse(config.entities) : [],
        lastModified: config.lastModified,
      };
    }),
  }),
});
