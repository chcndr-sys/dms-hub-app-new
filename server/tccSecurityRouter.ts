/**
 * TCC Security Router - API anti-frode per Token Commercio Circolare
 *
 * Funzionalita':
 * - Generazione e validazione QR firmati (HMAC-SHA256)
 * - Rate limiting per utente
 * - Check-in con validazione GPS server-side
 * - Limiti giornalieri TCC
 * - Dashboard anti-frode per PA
 * - Audit trail operazioni
 */

import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { eq, desc, and, gte, lt, count, sql } from "drizzle-orm";
import * as schema from "../drizzle/schema";
import {
  generateQRSignature,
  validateQRSignature,
  haversineDistance,
  checkGPSPlausibility,
  checkRateLimit,
  checkDailyLimits,
  checkIdempotency,
  saveIdempotencyKey,
  logFraudEvent,
  saveQRToken,
  useQRToken,
  checkCooldown,
} from "./lib/tccSecurity";

// ============================================
// SCHEMA VALIDAZIONE INPUT
// ============================================

const generateQRSchema = z.object({
  qrType: z.enum(["receive", "spend"]),
  amount: z.number().optional(), // Per spend QR
});

const validateQRSchema = z.object({
  token: z.string(),
  signature: z.string(),
  operatorId: z.number().optional(),
});

const recordCheckinSchema = z.object({
  poiId: z.number().optional(),
  marketId: z.number().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  poiType: z.enum(["culture", "mobility"]),
  transport: z.string().optional(),
  nonce: z.string(), // Anti-replay
  idempotencyKey: z.string().optional(),
});

const fraudEventsSchema = z.object({
  limit: z.number().default(50),
  offset: z.number().default(0),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  resolved: z.boolean().optional(),
});

const resolveFraudSchema = z.object({
  eventId: z.number(),
  resolution: z.enum(["resolved", "ignored"]),
  notes: z.string().optional(),
});

const auditTrailSchema = z.object({
  userId: z.number().optional(),
  email: z.string().optional(),
  limit: z.number().default(50),
  offset: z.number().default(0),
});

const updateConfigSchema = z.object({
  comuneId: z.number().optional(),
  maxDailyTccPerUser: z.number().min(1).optional(),
  maxDailyCheckins: z.number().min(1).optional(),
  maxMonthlyTcc: z.number().min(1).optional(),
  maxSingleTransaction: z.number().min(1).optional(),
  qrExpirySeconds: z.number().min(30).max(3600).optional(),
  gpsRadiusMeters: z.number().min(10).max(1000).optional(),
  cooldownMinutes: z.number().min(1).max(1440).optional(),
  maxDailyReferrals: z.number().min(0).optional(),
  highValueThresholdEur: z.number().min(100).optional(),
});

// ============================================
// ROUTER TCC SECURITY
// ============================================

export const tccSecurityRouter = router({
  // ============================================
  // QR CODE FIRMATI
  // ============================================

  /**
   * Genera un QR code firmato con scadenza per transazioni TCC.
   */
  generateSignedQR: protectedProcedure
    .input(generateQRSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Utente non identificato" });
      }

      // Rate limit: max 20 QR generati per giorno
      const rateCheck = await checkRateLimit(userId, "scan", 20);
      if (!rateCheck.allowed) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Troppi QR generati oggi. Riprova domani.",
        });
      }

      const payload: Record<string, unknown> = {
        userId,
        type: input.qrType,
        email: ctx.user.email,
      };

      if (input.amount && input.qrType === "spend") {
        payload.amount = input.amount;
      }

      const { token, signature, expiresAt, nonce } = generateQRSignature(payload);

      // Salva token nel DB per validazione successiva (uso singolo)
      await saveQRToken(userId, input.qrType, signature, payload, input.amount, expiresAt);

      return {
        qrData: JSON.stringify({ token, signature, nonce }),
        expiresAt,
        type: input.qrType,
      };
    }),

  /**
   * Valida un QR code firmato (firma + scadenza + uso singolo).
   */
  validateSignedQR: protectedProcedure
    .input(validateQRSchema)
    .mutation(async ({ input, ctx }) => {
      // Valida firma crittografica
      const sigCheck = validateQRSignature(input.token, input.signature);
      if (!sigCheck.valid) {
        // Log evento fraud
        await logFraudEvent(
          ctx.user.id || null,
          "invalid_qr",
          "medium",
          { reason: sigCheck.reason, token: input.token.substring(0, 20) + "..." },
          undefined,
          undefined
        );

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: sigCheck.reason || "QR non valido",
        });
      }

      // Verifica uso singolo nel DB
      const useCheck = await useQRToken(input.signature, input.operatorId);
      if (!useCheck.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: useCheck.reason || "QR non utilizzabile",
        });
      }

      return {
        valid: true,
        payload: useCheck.payload,
        amount: useCheck.amount,
      };
    }),

  // ============================================
  // CHECK-IN SICURO
  // ============================================

  /**
   * Registra check-in con validazione GPS server-side,
   * rate limiting, cooldown e rilevamento spoofing.
   */
  recordCheckin: protectedProcedure
    .input(recordCheckinSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Utente non identificato" });
      }

      // 1. Idempotency check
      if (input.idempotencyKey) {
        const idempCheck = await checkIdempotency(input.idempotencyKey, userId);
        if (idempCheck.exists && idempCheck.cachedResponse) {
          return JSON.parse(idempCheck.cachedResponse);
        }
      }

      // 2. Rate limit
      const actionType = input.poiType === "culture" ? "checkin_culture" as const : "checkin_mobility" as const;
      const rateCheck = await checkRateLimit(userId, actionType);
      if (!rateCheck.allowed) {
        await logFraudEvent(userId, "rate_exceeded", "low", {
          actionType,
          remaining: rateCheck.remaining,
        });

        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Limite check-in giornaliero raggiunto. Riprova domani.`,
        });
      }

      // 3. Verifica accuracy GPS
      if (input.accuracy && input.accuracy > 200) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Precisione GPS insufficiente. Spostati in un'area con migliore copertura.",
        });
      }

      // 4. GPS plausibility (impossible travel detection)
      const gpsCheck = await checkGPSPlausibility(userId, input.lat, input.lng, new Date());
      if (!gpsCheck.plausible) {
        await logFraudEvent(userId, "impossible_travel", "high", {
          lat: input.lat,
          lng: input.lng,
          reason: gpsCheck.reason,
          speedKmh: gpsCheck.speedKmh,
        });

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Posizione GPS non plausibile. Riprova tra qualche minuto.",
        });
      }

      // 5. Cooldown per stesso POI/mercato
      if (input.marketId) {
        const cooldownCheck = await checkCooldown(userId, input.marketId);
        if (!cooldownCheck.allowed) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Check-in troppo ravvicinato. Prossimo disponibile: ${cooldownCheck.nextAllowedAt?.toLocaleTimeString("it-IT")}`,
          });
        }
      }

      // 6. Limiti giornalieri TCC
      const tccAmount = input.poiType === "culture" ? 10 : 3; // TCC da assegnare
      const dailyCheck = await checkDailyLimits(userId, tccAmount, "earn");
      if (!dailyCheck.allowed) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: dailyCheck.reason || "Limite giornaliero TCC raggiunto",
        });
      }

      // 7. Registra check-in
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database non disponibile" });
      }

      const [checkin] = await db
        .insert(schema.checkins)
        .values({
          userId,
          marketId: input.marketId || null,
          transport: input.transport || input.poiType,
          lat: input.lat.toFixed(4), // Griglia ~11m per privacy
          lng: input.lng.toFixed(4),
          carbonSaved: input.poiType === "mobility" ? 150 : 50, // grammi CO2
        })
        .returning();

      // 8. Log in audit
      await db.insert(schema.auditLogs).values({
        userEmail: ctx.user.email || `user_id:${userId}`,
        action: `TCC_CHECKIN_${input.poiType.toUpperCase()}`,
        entityType: "checkin",
        entityId: checkin.id,
        newValue: JSON.stringify({
          lat: input.lat.toFixed(4),
          lng: input.lng.toFixed(4),
          tccAmount,
          poiType: input.poiType,
        }),
      });

      const response = {
        success: true,
        checkinId: checkin.id,
        tccEarned: tccAmount,
        remaining: dailyCheck.remaining,
      };

      // 9. Salva idempotency
      if (input.idempotencyKey) {
        await saveIdempotencyKey(
          input.idempotencyKey,
          userId,
          "tccSecurity.recordCheckin",
          JSON.stringify(response)
        );
      }

      return response;
    }),

  // ============================================
  // LIMITI E RATE LIMITING (query utente)
  // ============================================

  /**
   * Ottieni limiti giornalieri correnti per l'utente autenticato.
   */
  getDailyLimits: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    if (!userId) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Utente non identificato" });
    }

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

    return {
      checkinCount: limits?.checkinCount || 0,
      tccEarned: limits?.tccEarned || 0,
      tccSpent: limits?.tccSpent || 0,
      transactionCount: limits?.transactionCount || 0,
      maxCheckins: 10,
      maxTccDaily: 500,
      maxTransactions: 20,
      resetAt: tomorrow.toISOString(),
    };
  }),

  // ============================================
  // ADMIN: DASHBOARD ANTI-FRODE
  // ============================================

  /**
   * Lista eventi frode con filtri (per dashboard PA).
   */
  fraudEvents: adminProcedure
    .input(fraudEventsSchema)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { events: [], total: 0 };

      const conditions = [];
      if (input.severity) {
        conditions.push(eq(schema.tccFraudEvents.severity, input.severity));
      }
      if (input.resolved !== undefined) {
        conditions.push(eq(schema.tccFraudEvents.resolved, input.resolved));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const events = await db
        .select()
        .from(schema.tccFraudEvents)
        .where(whereClause)
        .orderBy(desc(schema.tccFraudEvents.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [totalResult] = await db
        .select({ count: count() })
        .from(schema.tccFraudEvents)
        .where(whereClause);

      return {
        events: events.map((e) => ({
          ...e,
          details: e.details ? JSON.parse(e.details) : null,
        })),
        total: totalResult?.count || 0,
      };
    }),

  /**
   * Statistiche anti-frode per dashboard PA.
   */
  fraudStats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Eventi non risolti
    const [unresolvedCount] = await db
      .select({ count: count() })
      .from(schema.tccFraudEvents)
      .where(eq(schema.tccFraudEvents.resolved, false));

    // Eventi critici non risolti
    const [criticalCount] = await db
      .select({ count: count() })
      .from(schema.tccFraudEvents)
      .where(
        and(
          eq(schema.tccFraudEvents.resolved, false),
          eq(schema.tccFraudEvents.severity, "critical")
        )
      );

    // Eventi oggi
    const [todayCount] = await db
      .select({ count: count() })
      .from(schema.tccFraudEvents)
      .where(gte(schema.tccFraudEvents.createdAt, today));

    // Eventi ultimi 30 giorni
    const [monthCount] = await db
      .select({ count: count() })
      .from(schema.tccFraudEvents)
      .where(gte(schema.tccFraudEvents.createdAt, thirtyDaysAgo));

    return {
      unresolved: unresolvedCount?.count || 0,
      critical: criticalCount?.count || 0,
      today: todayCount?.count || 0,
      last30Days: monthCount?.count || 0,
    };
  }),

  /**
   * Risolvi un evento di frode.
   */
  resolveFraud: adminProcedure
    .input(resolveFraudSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database non disponibile" });

      const [updated] = await db
        .update(schema.tccFraudEvents)
        .set({
          resolved: true,
          resolvedBy: ctx.user.id,
          resolvedAt: new Date(),
          resolutionNotes: input.notes || input.resolution,
        })
        .where(eq(schema.tccFraudEvents.id, input.eventId))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Evento non trovato" });
      }

      // Log audit
      await db.insert(schema.auditLogs).values({
        userEmail: ctx.user.email || "admin",
        action: "TCC_FRAUD_RESOLVED",
        entityType: "tcc_fraud_event",
        entityId: input.eventId,
        newValue: JSON.stringify({ resolution: input.resolution, notes: input.notes }),
      });

      return updated;
    }),

  // ============================================
  // ADMIN: AUDIT TRAIL
  // ============================================

  /**
   * Storico completo operazioni TCC per utente.
   */
  auditTrail: adminProcedure
    .input(auditTrailSchema)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { logs: [], total: 0 };

      const conditions = [];

      if (input.userId) {
        conditions.push(
          sql`${schema.auditLogs.userEmail} LIKE ${'user_id:' + input.userId + '%'}`
        );
      }
      if (input.email) {
        conditions.push(eq(schema.auditLogs.userEmail, input.email));
      }

      // Filtra solo azioni TCC
      conditions.push(
        sql`${schema.auditLogs.action} LIKE 'TCC_%'`
      );

      const whereClause = and(...conditions);

      const logs = await db
        .select()
        .from(schema.auditLogs)
        .where(whereClause)
        .orderBy(desc(schema.auditLogs.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [totalResult] = await db
        .select({ count: count() })
        .from(schema.auditLogs)
        .where(whereClause);

      return {
        logs: logs.map((l) => ({
          ...l,
          oldValue: l.oldValue ? JSON.parse(l.oldValue) : null,
          newValue: l.newValue ? JSON.parse(l.newValue) : null,
        })),
        total: totalResult?.count || 0,
      };
    }),

  // ============================================
  // ADMIN: CONFIGURAZIONE LIMITI
  // ============================================

  /**
   * Ottieni configurazione limiti TCC corrente.
   */
  getConfig: adminProcedure
    .input(z.object({ comuneId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const conditions = [];
      if (input?.comuneId) {
        conditions.push(eq(schema.tccRewardsConfig.comuneId, input.comuneId));
      }

      const [config] = await db
        .select()
        .from(schema.tccRewardsConfig)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .limit(1);

      return config || null;
    }),

  /**
   * Aggiorna configurazione limiti TCC.
   */
  updateConfig: adminProcedure
    .input(updateConfigSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database non disponibile" });

      const conditions = [];
      if (input.comuneId) {
        conditions.push(eq(schema.tccRewardsConfig.comuneId, input.comuneId));
      }

      // Cerca config esistente
      const [existing] = await db
        .select()
        .from(schema.tccRewardsConfig)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .limit(1);

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      const fields = [
        "maxDailyTccPerUser", "maxDailyCheckins", "maxMonthlyTcc",
        "maxSingleTransaction", "qrExpirySeconds", "gpsRadiusMeters",
        "cooldownMinutes", "maxDailyReferrals", "highValueThresholdEur",
      ] as const;

      for (const field of fields) {
        if (input[field] !== undefined) {
          updateData[field] = input[field];
        }
      }

      if (existing) {
        const [updated] = await db
          .update(schema.tccRewardsConfig)
          .set(updateData)
          .where(eq(schema.tccRewardsConfig.id, existing.id))
          .returning();

        // Log audit
        await db.insert(schema.auditLogs).values({
          userEmail: ctx.user.email || "admin",
          action: "TCC_CONFIG_UPDATED",
          entityType: "tcc_rewards_config",
          entityId: existing.id,
          oldValue: JSON.stringify(existing),
          newValue: JSON.stringify(updateData),
        });

        return updated;
      } else {
        // Crea nuova config
        const [created] = await db
          .insert(schema.tccRewardsConfig)
          .values({
            comuneId: input.comuneId || null,
            ...updateData,
          } as typeof schema.tccRewardsConfig.$inferInsert)
          .returning();

        return created;
      }
    }),
});

export type TccSecurityRouter = typeof tccSecurityRouter;
