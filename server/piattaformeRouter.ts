/**
 * Piattaforme PA Router — PDND, App IO, ANPR, SSO
 *
 * Procedure tRPC aggiuntive per:
 * - Dashboard stato piattaforme
 * - SSO (SPID/CIE/CNS/eIDAS) configurazione e test
 * - Audit trail centralizzato
 */

import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "./_core/trpc";

export const piattaformeRouter = router({
  /**
   * Dashboard riassuntiva di tutte le piattaforme PA.
   */
  overview: adminProcedure.query(async () => {
    const { testConnection } = await import("./services/pdndService");
    const { getStatus: getAppIoStatus } = await import(
      "./services/appIoService"
    );
    const { getStatus: getSsoStatus } = await import(
      "./services/ssoService"
    );

    const [pdndStatus, appIoStatus, ssoStatus] = await Promise.all([
      testConnection(),
      getAppIoStatus(),
      getSsoStatus(),
    ]);

    return {
      pdnd: {
        connected: pdndStatus.connected,
        mode: pdndStatus.mode,
        hasCredentials:
          pdndStatus.hasPurposeId && pdndStatus.hasPrivateKey,
      },
      appIo: {
        connected: appIoStatus.connected,
        mode: appIoStatus.mode,
        hasApiKey: appIoStatus.hasApiKey,
        templatesCount: appIoStatus.templatesCount,
      },
      anpr: {
        connected: pdndStatus.connected, // ANPR va tramite PDND
        mode: pdndStatus.mode,
        viapdnd: true,
      },
      sso: {
        mockMode: ssoStatus.mockMode,
        activeProviders: ssoStatus.providers.filter((p) => p.isActive)
          .length,
        totalProviders: ssoStatus.providers.length,
      },
      timestamp: new Date().toISOString(),
    };
  }),

  // ---- SSO ----

  ssoListProviders: adminProcedure.query(async () => {
    const { listProviders } = await import("./services/ssoService");
    return listProviders();
  }),

  ssoGetStatus: adminProcedure.query(async () => {
    const { getStatus } = await import("./services/ssoService");
    return getStatus();
  }),

  ssoTestProvider: adminProcedure
    .input(
      z.object({
        provider: z.enum(["spid", "cie", "cns", "eidas"]),
      })
    )
    .mutation(async ({ input }) => {
      const { testProvider } = await import("./services/ssoService");
      return await testProvider(input.provider);
    }),

  // ---- Audit Trail ----

  auditList: adminProcedure
    .input(
      z
        .object({
          platform: z
            .enum(["pdnd", "appio", "anpr", "sso"])
            .optional(),
          limit: z.number().min(1).max(200).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) return { items: [], total: 0 };

      const { sql } = await import("drizzle-orm");
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;

      let whereClause = sql`1=1`;
      if (input?.platform) {
        whereClause = sql`platform = ${input.platform}`;
      }

      const [items, countResult] = await Promise.all([
        db.execute(
          sql`SELECT * FROM platform_audit_trail WHERE ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
        ),
        db.execute(
          sql`SELECT COUNT(*) as total FROM platform_audit_trail WHERE ${whereClause}`
        ),
      ]);

      return {
        items: Array.isArray(items) ? items : [],
        total: Array.isArray(countResult) && countResult[0]
          ? Number((countResult[0] as Record<string, unknown>).total) || 0
          : 0,
      };
    }),

  auditStats: adminProcedure.query(async () => {
    const { getDb } = await import("./db");
    const db = await getDb();
    if (!db)
      return {
        byPlatform: [],
        byStatus: [],
        last24h: 0,
        last7d: 0,
      };

    const { sql } = await import("drizzle-orm");

    const [byPlatform, byStatus, last24h, last7d] = await Promise.all([
      db.execute(
        sql`SELECT platform, COUNT(*) as count FROM platform_audit_trail GROUP BY platform ORDER BY count DESC`
      ),
      db.execute(
        sql`SELECT status, COUNT(*) as count FROM platform_audit_trail GROUP BY status ORDER BY count DESC`
      ),
      db.execute(
        sql`SELECT COUNT(*) as count FROM platform_audit_trail WHERE created_at > NOW() - INTERVAL '24 hours'`
      ),
      db.execute(
        sql`SELECT COUNT(*) as count FROM platform_audit_trail WHERE created_at > NOW() - INTERVAL '7 days'`
      ),
    ]);

    return {
      byPlatform: Array.isArray(byPlatform) ? byPlatform : [],
      byStatus: Array.isArray(byStatus) ? byStatus : [],
      last24h: Array.isArray(last24h) && last24h[0]
        ? Number((last24h[0] as Record<string, unknown>).count) || 0
        : 0,
      last7d: Array.isArray(last7d) && last7d[0]
        ? Number((last7d[0] as Record<string, unknown>).count) || 0
        : 0,
    };
  }),
});
