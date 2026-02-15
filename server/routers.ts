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

  // System Logs (richiede admin)
  logs: router({
    system: adminProcedure.query(async () => {
      const { getSystemLogs } = await import("./db");
      return await getSystemLogs();
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
});

export type AppRouter = typeof appRouter;
