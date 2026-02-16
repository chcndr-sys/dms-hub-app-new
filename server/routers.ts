import { z } from "zod";
import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { dmsHubRouter } from "./dmsHubRouter";
import { integrationsRouter } from "./integrationsRouter";
import { mioAgentRouter } from "./mioAgentRouter";
import { mihubRouter } from "./mihubRouter";
import { guardianRouter } from "./guardianRouter";
import { walletRouter } from "./walletRouter";
import { tccSecurityRouter } from "./tccSecurityRouter";
import { gdprRouter } from "./gdprRouter";


export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with 
// '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      (ctx.res as any).clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    // Controlla ruoli utente nel Neon DB (user_role_assignments)
    // Schema users: id (auto), openId (NOT NULL UNIQUE), email, name, role enum('user','admin')
    checkRoles: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .query(async ({ input }) => {
        const db = await (await import("./db")).getDb();
        if (!db) return { roles: [], isAdmin: false };
        const { sql } = await import("drizzle-orm");

        // Upsert utente - openId è NOT NULL UNIQUE, usiamo 'firebase_' + email come ID
        const openId = `firebase_${input.email}`;
        try {
          await db.execute(sql`
            INSERT INTO users ("openId", email, name, role)
            VALUES (${openId}, ${input.email}, ${input.email.split('@')[0]}, 'user')
            ON CONFLICT ("openId") DO NOTHING
          `);
        } catch (e) {
          // Se fallisce (es. email duplicata con diverso openId), ignora
          console.warn('[checkRoles] Upsert user fallito (ok se esiste gia):', e);
        }

        const result = await db.execute(sql`
          SELECT ura.role_id, ur.code as role_code, ur.name as role_name, ur.level,
                 ura.territory_type, ura.territory_id
          FROM user_role_assignments ura
          JOIN user_roles ur ON ur.id = ura.role_id
          JOIN users u ON u.id = ura.user_id
          WHERE u.email = ${input.email}
            AND ura.is_active = true
            AND (ura.valid_until IS NULL OR ura.valid_until > NOW())
          ORDER BY ur.level ASC
        `);
        const roles = Array.isArray(result) ? result : [];
        // Admin se ha level=0 (super_admin) OPPURE il campo role nella tabella users è 'admin'
        const isAdmin = roles.some((r: any) => r.level === 0);

        // Fallback: controlla anche il campo role nella tabella users
        if (!isAdmin) {
          const userRole = await db.execute(sql`
            SELECT role FROM users WHERE email = ${input.email} LIMIT 1
          `);
          if (Array.isArray(userRole) && userRole[0] && (userRole[0] as any).role === 'admin') {
            return { roles, isAdmin: true };
          }
        }

        return { roles, isAdmin };
      }),
    // Bootstrap: assegna super_admin al primo utente.
    // Funziona SOLO se non esiste gia' un super_admin (level=0) nel sistema.
    bootstrapAdmin: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const db = await (await import("./db")).getDb();
        if (!db) return { success: false, error: 'DB non disponibile' };
        const { sql } = await import("drizzle-orm");

        // Verifica che non esista gia' un super_admin (level=0)
        const existingAdmins = await db.execute(sql`
          SELECT COUNT(*) as count FROM user_role_assignments ura
          JOIN user_roles ur ON ur.id = ura.role_id
          WHERE ur.level = 0 AND ura.is_active = true
        `);
        const adminCount = Array.isArray(existingAdmins) && existingAdmins[0]
          ? Number((existingAdmins[0] as any).count)
          : 0;
        if (adminCount > 0) {
          return { success: false, error: 'Un super_admin esiste gia nel sistema' };
        }

        // Upsert utente con openId e role='admin'
        const openId = `firebase_${input.email}`;
        try {
          await db.execute(sql`
            INSERT INTO users ("openId", email, name, role)
            VALUES (${openId}, ${input.email}, ${input.email.split('@')[0]}, 'admin')
            ON CONFLICT ("openId") DO UPDATE SET role = 'admin'
          `);
        } catch (e) {
          // Se l'utente esiste con un diverso openId, aggiorna solo il role
          await db.execute(sql`
            UPDATE users SET role = 'admin' WHERE email = ${input.email}
          `);
        }

        // Assicurati che il ruolo super_admin esista nella tabella user_roles
        await db.execute(sql`
          INSERT INTO user_roles (code, name, level, sector, is_active)
          VALUES ('super_admin', 'Super Amministratore', 0, 'sistema', true)
          ON CONFLICT (code) DO NOTHING
        `);

        // Recupera gli ID
        const userRow = await db.execute(sql`SELECT id FROM users WHERE email = ${input.email}`);
        const roleRow = await db.execute(sql`SELECT id FROM user_roles WHERE code = 'super_admin'`);

        if (!Array.isArray(userRow) || !userRow[0] || !Array.isArray(roleRow) || !roleRow[0]) {
          return { success: false, error: 'Utente o ruolo non trovato dopo creazione' };
        }

        const userId = (userRow[0] as any).id;
        const roleId = (roleRow[0] as any).id;

        // Assegna il ruolo, evita duplicati
        await db.execute(sql`
          INSERT INTO user_role_assignments (user_id, role_id, is_active)
          SELECT ${userId}, ${roleId}, true
          WHERE NOT EXISTS (
            SELECT 1 FROM user_role_assignments
            WHERE user_id = ${userId} AND role_id = ${roleId}
          )
        `);

        return { success: true, message: `Super admin assegnato a ${input.email}` };
      }),
  }),

  // Dashboard PA Analytics (richiede autenticazione)
  analytics: router({
    overview: protectedProcedure.query(async () => {
      const { getOverviewStats } = await import("./db");
      return await getOverviewStats();
    }),
    markets: protectedProcedure.query(async () => {
      const { getMarkets } = await import("./db");
      return await getMarkets();
    }),
    shops: protectedProcedure.query(async () => {
      const { getShops } = await import("./db");
      return await getShops();
    }),
    transactions: protectedProcedure.query(async () => {
      const { getTransactions } = await import("./db");
      return await getTransactions();
    }),
    checkins: protectedProcedure.query(async () => {
      const { getCheckins } = await import("./db");
      return await getCheckins();
    }),
    products: protectedProcedure.query(async () => {
      const { getProducts } = await import("./db");
      return await getProducts();
    }),
    productTracking: protectedProcedure.query(async () => {
      const { getProductTracking } = await import("./db");
      return await getProductTracking();
    }),
  }),

  // Carbon Credits Management (richiede autenticazione)
  carbonCredits: router({
    config: protectedProcedure.query(async () => {
      const { getCarbonCreditsConfig } = await import("./db");
      return await getCarbonCreditsConfig();
    }),
    fundTransactions: protectedProcedure.query(async () => {
      const { getFundTransactions } = await import("./db");
      return await getFundTransactions();
    }),
    reimbursements: protectedProcedure.query(async () => {
      const { getReimbursements } = await import("./db");
      return await getReimbursements();
    }),
  }),

  // System Logs (richiede admin) + Client Error Reporting
  logs: router({
    system: adminProcedure.query(async () => {
      const { getSystemLogs } = await import("./db");
      return await getSystemLogs();
    }),
    reportClientError: publicProcedure
      .input(z.object({
        message: z.string(),
        stack: z.string().optional(),
        componentStack: z.string().optional(),
        url: z.string().optional(),
        userAgent: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { addLog } = await import("./services/apiLogsService");
        addLog({
          level: 'error',
          app: 'DMS_HUB',
          type: 'ERROR',
          endpoint: input.url || 'unknown',
          message: `[Client Error] ${input.message}`,
          details: {
            stack: input.stack,
            componentStack: input.componentStack,
            userAgent: input.userAgent,
          },
        });
        return { received: true };
      }),
  }),

  // User Analytics (richiede autenticazione)
  users: router({
    analytics: protectedProcedure.query(async () => {
      const { getUserAnalytics } = await import("./db");
      return await getUserAnalytics();
    }),
  }),

  // Sustainability Metrics (dati pubblici)
  sustainability: router({
    metrics: publicProcedure.query(async () => {
      const { getSustainabilityMetrics } = await import("./db");
      return await getSustainabilityMetrics();
    }),
  }),

  // Business Management (richiede autenticazione)
  businesses: router({
    list: protectedProcedure.query(async () => {
      const { getBusinessAnalytics } = await import("./db");
      return await getBusinessAnalytics();
    }),
  }),

  // Inspections & Violations (richiede autenticazione)
  inspections: router({
    list: protectedProcedure.query(async () => {
      const { getInspections } = await import("./db");
      return await getInspections();
    }),
  }),

  // Notifications (richiede autenticazione)
  notifications: router({
    list: protectedProcedure.query(async () => {
      const { getNotifications } = await import("./db");
      return await getNotifications();
    }),
  }),

  // Civic Reports
  civicReports: router({
    list: publicProcedure.query(async () => {
      const { getCivicReports } = await import("./db");
      return await getCivicReports();
    }),
  }),

  // Mobility Data (TPER Bologna)
  mobility: router({
    list: publicProcedure.query(async () => {
      const { getMobilityData } = await import("./db");
      return await getMobilityData();
    }),
  }),

  // DMS HUB - Sistema Gestione Mercati Completo
  dmsHub: dmsHubRouter,
  
  // Integrazioni - API Keys, Webhook, Monitoring
  integrations: integrationsRouter,
  
  // TPER Integration Endpoints
  tper: router({
      // GET /api/integrations/tper/stops - Lista fermate Bologna
      stops: publicProcedure.query(async () => {
        const { getTPERStops } = await import("./services/tperService");
        return await getTPERStops();
      }),
      
      // GET /api/integrations/tper/sync - Sincronizza dati TPER (solo admin)
      sync: adminProcedure.mutation(async () => {
        try {
          const { syncTPERData, updateTPERRealtimeData } = await import("./services/tperService");
          const { getDb } = await import("./db");
          const schema = await import("../drizzle/schema");

          const data = await syncTPERData();

          // Bulk insert parametrizzato via Drizzle ORM (no SQL injection)
          if (data.length > 0) {
            const db = await getDb();

            if (!db) {
              throw new Error("Errore durante la sincronizzazione TPER: Connessione al database non disponibile.");
            }

            const batchSize = 100;
            for (let i = 0; i < data.length; i += batchSize) {
              const batch = data.slice(i, i + batchSize);
              await db.insert(schema.mobilityData).values(
                batch.map(d => ({
                  marketId: d.marketId,
                  type: d.type,
                  lineNumber: d.lineNumber,
                  lineName: d.lineName,
                  stopName: d.stopName,
                  lat: d.lat,
                  lng: d.lng,
                  status: d.status,
                  occupancy: d.occupancy ?? null,
                  nextArrival: d.nextArrival ?? null,
                }))
              ).onConflictDoNothing();
            }
          }

          // Aggiorna i dati real-time
          await updateTPERRealtimeData();

          return {
            success: true,
            count: data.length,
            message: `Sincronizzati ${data.length} dati mobilità TPER`
          };
        } catch (error: any) {
          console.error("[TPER Router] Errore sincronizzazione:", error.message);
          throw new Error("Errore durante la sincronizzazione TPER: " + error.message);
        }
      }),
  }),

  // MIO Agent - Log e Monitoraggio Agenti
  mioAgent: mioAgentRouter,

  // MIHUB - Multi-Agent System (MIO, Manus, Abacus, Zapier)
  mihub: mihubRouter,

  // GUARDIAN - API Monitoring & Debug
  guardian: guardianRouter,

  // WALLET - Borsellino Elettronico Operatori Mercatali + PagoPA
  wallet: walletRouter,

  // TCC SECURITY - Anti-frode, QR firmati, rate limiting, audit trail
  tccSecurity: tccSecurityRouter,

  // GDPR - Export dati, diritto all'oblio, data retention
  gdpr: gdprRouter,
});

export type AppRouter = typeof appRouter;
