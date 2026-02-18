import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { addLog } from '../services/apiLogsService';
import { getDb } from '../db';
import * as schema from '../../drizzle/schema';

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;

/**
 * Salva la metrica API nel database per statistiche persistenti
 */
async function saveApiMetric(data: {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    const db = await getDb();
    if (!db) return;
    
    await db.insert(schema.apiMetrics).values({
      endpoint: data.endpoint,
      method: data.method,
      statusCode: data.statusCode,
      responseTime: data.responseTime,
      errorMessage: data.errorMessage || null,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
    });
  } catch (error) {
    // Non bloccare la richiesta se il logging fallisce
    console.error('[API Metrics] Errore salvataggio metrica:', error);
  }
}

// Middleware di logging per tutte le chiamate tRPC
const loggingMiddleware = t.middleware(async (opts) => {
  const { path, type, next } = opts;
  const start = Date.now();
  
  try {
    const result = await next();
    const duration = Date.now() - start;
    
    // Log solo se non è una chiamata a guardian o integrations.apiStats (per evitare loop infiniti)
    if (!path.startsWith('guardian.') && !path.startsWith('integrations.apiStats')) {
      // Log in memoria (per Guardian real-time)
      addLog({
        level: 'info',
        app: 'TRPC',
        type: 'API_CALL',
        endpoint: `/api/trpc/${path}`,
        method: type.toUpperCase(),
        statusCode: 200,
        responseTime: duration,
        message: `${type.toUpperCase()} ${path}`,
        userEmail: opts.ctx.user?.email || 'anonymous',
      });
      
      // Salva nel database (per statistiche persistenti)
      saveApiMetric({
        endpoint: `/api/trpc/${path}`,
        method: type.toUpperCase(),
        statusCode: 200,
        responseTime: duration,
      });
    }
    
    return result;
  } catch (error: any) {
    const duration = Date.now() - start;
    const statusCode = error.code === 'UNAUTHORIZED' ? 401 : 
                       error.code === 'FORBIDDEN' ? 403 :
                       error.code === 'NOT_FOUND' ? 404 : 500;
    
    // Log errori solo se non è una chiamata a guardian
    if (!path.startsWith('guardian.') && !path.startsWith('integrations.apiStats')) {
      // Log in memoria (per Guardian real-time)
      addLog({
        level: 'error',
        app: 'TRPC',
        type: 'ERROR',
        endpoint: `/api/trpc/${path}`,
        method: type.toUpperCase(),
        statusCode,
        responseTime: duration,
        message: `Error in ${type.toUpperCase()} ${path}: ${error.message}`,
        userEmail: opts.ctx.user?.email || 'anonymous',
        details: {
          code: error.code,
          message: error.message,
        },
      });
      
      // Salva nel database (per statistiche persistenti)
      saveApiMetric({
        endpoint: `/api/trpc/${path}`,
        method: type.toUpperCase(),
        statusCode,
        responseTime: duration,
        errorMessage: error.message,
      });
    }
    
    throw error;
  }
});

export const publicProcedure = t.procedure.use(loggingMiddleware);

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(loggingMiddleware).use(requireUser);

const requireAdmin = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user || ctx.user.role !== 'admin') {
    throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const adminProcedure = t.procedure.use(loggingMiddleware).use(requireAdmin);

/**
 * Middleware per permessi granulari RBAC
 * Verifica che l'utente autenticato abbia un permesso specifico (es. "dmsHub.markets.write")
 */
export function requirePermission(permissionCode: string) {
  return t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    // Admin ha tutti i permessi
    if (ctx.user.role === 'admin') {
      return next({ ctx: { ...ctx, user: ctx.user } });
    }

    // Verifica permesso specifico dal DB
    try {
      const db = await getDb();
      if (db) {
        const { sql: sqlFn } = await import("drizzle-orm");
        const result = await db.execute(sqlFn`
          SELECT 1 FROM user_role_assignments ura
          JOIN role_permissions rp ON rp.role_id = ura.role_id
          JOIN permissions p ON p.id = rp.permission_id
          WHERE ura.user_id = ${ctx.user.id}
            AND p.code = ${permissionCode}
          LIMIT 1
        `);
        if (Array.isArray(result) && result.length > 0) {
          return next({ ctx: { ...ctx, user: ctx.user } });
        }
      }
    } catch {
      // Se il check fallisce, nega l'accesso per sicurezza
    }

    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Permesso richiesto: ${permissionCode}`,
    });
  });
}

/**
 * Middleware per validazione API Key nelle richieste esterne
 * Verifica l'header X-API-Key contro la tabella api_keys
 */
export const apiKeyMiddleware = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  const apiKey = ctx.req?.headers?.['x-api-key'] as string | undefined;

  if (!apiKey) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "API Key richiesta nell'header X-API-Key",
    });
  }

  try {
    const db = await getDb();
    if (!db) throw new Error("Database non disponibile");

    const { eq: eqOp, and: andOp } = await import("drizzle-orm");
    const keyRows = await db.select()
      .from(schema.apiKeys)
      .where(andOp(
        eqOp(schema.apiKeys.key, apiKey),
        eqOp(schema.apiKeys.status, "active"),
      ))
      .limit(1);

    if (!keyRows.length) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "API Key non valida o disattivata",
      });
    }

    const validKey = keyRows[0];

    // Aggiorna lastUsedAt
    await db.update(schema.apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eqOp(schema.apiKeys.id, validKey.id));

    return next({
      ctx: {
        ...ctx,
        apiKey: validKey,
      },
    });
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Errore nella validazione API Key",
    });
  }
});

export const apiKeyProcedure = t.procedure.use(loggingMiddleware).use(apiKeyMiddleware);
