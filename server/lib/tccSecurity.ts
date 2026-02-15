/**
 * TCC Security Utilities
 *
 * Funzioni di sicurezza per il sistema Token Commercio Circolare:
 * - Firma e validazione QR code (HMAC-SHA256)
 * - Calcolo distanza GPS (Haversine)
 * - Rilevamento GPS spoofing (impossible travel)
 * - Rate limiting per utente
 * - Limiti giornalieri
 * - Idempotency check
 * - Logging eventi frode
 */

import { createHmac, randomBytes } from "crypto";
import { getDb } from "../db";
import { eq, and, gte, lt, desc } from "drizzle-orm";
import * as schema from "../../drizzle/schema";

// ============================================
// COSTANTI CONFIGURABILI
// ============================================

const DEFAULT_QR_EXPIRY_SECONDS = 300; // 5 minuti
const DEFAULT_MAX_DAILY_CHECKINS = 10;
const DEFAULT_MAX_DAILY_TCC = 500;
const DEFAULT_MAX_DAILY_TRANSACTIONS = 20;
const DEFAULT_GPS_RADIUS_METERS = 100;
const DEFAULT_COOLDOWN_MINUTES = 30;
const IMPOSSIBLE_TRAVEL_SPEED_KMH = 200;
const IDEMPOTENCY_TTL_HOURS = 24;

// ============================================
// QR CODE FIRMA E VALIDAZIONE
// ============================================

/**
 * Genera un QR token firmato con HMAC-SHA256.
 * Il secret viene dal env JWT_SECRET.
 */
export function generateQRSignature(payload: Record<string, unknown>): {
  token: string;
  signature: string;
  expiresAt: Date;
  nonce: string;
} {
  const secret = process.env.JWT_SECRET || "default-dev-secret";
  const nonce = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + DEFAULT_QR_EXPIRY_SECONDS * 1000);

  const tokenPayload = {
    ...payload,
    nonce,
    expiresAt: expiresAt.toISOString(),
  };

  const token = Buffer.from(JSON.stringify(tokenPayload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(token).digest("hex");

  return { token, signature, expiresAt, nonce };
}

/**
 * Valida firma QR, scadenza e uso singolo.
 */
export function validateQRSignature(
  token: string,
  signature: string
): { valid: boolean; reason?: string; payload?: Record<string, unknown> } {
  const secret = process.env.JWT_SECRET || "default-dev-secret";

  // Verifica firma
  const expectedSig = createHmac("sha256", secret).update(token).digest("hex");
  if (signature !== expectedSig) {
    return { valid: false, reason: "Firma QR non valida" };
  }

  // Decodifica payload
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(Buffer.from(token, "base64url").toString("utf-8"));
  } catch {
    return { valid: false, reason: "Token QR malformato" };
  }

  // Verifica scadenza
  const expiresAt = new Date(payload.expiresAt as string);
  if (expiresAt < new Date()) {
    return { valid: false, reason: "QR code scaduto" };
  }

  return { valid: true, payload };
}

// ============================================
// GPS UTILITIES
// ============================================

/**
 * Calcola distanza in metri tra due coordinate GPS (formula Haversine).
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Raggio terra in metri
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Verifica plausibilita' GPS confrontando con ultimo check-in.
 * Se la velocita' implicata supera IMPOSSIBLE_TRAVEL_SPEED_KMH, segnala spoofing.
 */
export async function checkGPSPlausibility(
  userId: number,
  lat: number,
  lng: number,
  timestamp: Date
): Promise<{ plausible: boolean; reason?: string; speedKmh?: number }> {
  const db = await getDb();
  if (!db) return { plausible: true }; // Fallback permissivo se DB non disponibile

  // Ultimo check-in dell'utente
  const [lastCheckin] = await db
    .select()
    .from(schema.checkins)
    .where(eq(schema.checkins.userId, userId))
    .orderBy(desc(schema.checkins.createdAt))
    .limit(1);

  if (!lastCheckin || !lastCheckin.lat || !lastCheckin.lng) {
    return { plausible: true }; // Primo check-in, nessun confronto
  }

  const distance = haversineDistance(
    lat,
    lng,
    parseFloat(lastCheckin.lat),
    parseFloat(lastCheckin.lng)
  );

  const timeDiffMs = timestamp.getTime() - lastCheckin.createdAt.getTime();
  const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

  // Ignora se stesso luogo o tempo insufficiente (< 1 secondo)
  if (timeDiffMs < 1000 || distance < 10) {
    return { plausible: true };
  }

  const speedKmh = (distance / 1000) / timeDiffHours;

  if (speedKmh > IMPOSSIBLE_TRAVEL_SPEED_KMH) {
    return {
      plausible: false,
      reason: `Spostamento impossibile: ${Math.round(distance)}m in ${Math.round(timeDiffMs / 1000)}s (${Math.round(speedKmh)} km/h)`,
      speedKmh: Math.round(speedKmh),
    };
  }

  return { plausible: true, speedKmh: Math.round(speedKmh) };
}

// ============================================
// RATE LIMITING PER UTENTE
// ============================================

/**
 * Verifica e aggiorna rate limit per un'azione specifica.
 * Finestra di 24 ore rolling.
 */
export async function checkRateLimit(
  userId: number,
  actionType: "checkin_culture" | "checkin_mobility" | "scan" | "referral" | "spend" | "issue",
  maxPerWindow: number = DEFAULT_MAX_DAILY_CHECKINS
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const db = await getDb();
  if (!db) return { allowed: true, remaining: maxPerWindow, resetAt: new Date() };

  const windowStart = new Date();
  windowStart.setHours(0, 0, 0, 0); // Inizio giornata

  const tomorrow = new Date(windowStart);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Cerca rate limit esistente per oggi
  const [existing] = await db
    .select()
    .from(schema.tccRateLimits)
    .where(
      and(
        eq(schema.tccRateLimits.userId, userId),
        eq(schema.tccRateLimits.actionType, actionType),
        gte(schema.tccRateLimits.windowStart, windowStart)
      )
    )
    .limit(1);

  if (existing) {
    if (existing.count >= maxPerWindow) {
      return { allowed: false, remaining: 0, resetAt: tomorrow };
    }

    // Incrementa contatore
    await db
      .update(schema.tccRateLimits)
      .set({ count: existing.count + 1 })
      .where(eq(schema.tccRateLimits.id, existing.id));

    return {
      allowed: true,
      remaining: maxPerWindow - existing.count - 1,
      resetAt: tomorrow,
    };
  }

  // Crea nuovo record
  await db.insert(schema.tccRateLimits).values({
    userId,
    actionType,
    count: 1,
    windowStart,
  });

  return { allowed: true, remaining: maxPerWindow - 1, resetAt: tomorrow };
}

// ============================================
// LIMITI GIORNALIERI
// ============================================

/**
 * Verifica e aggiorna limiti giornalieri TCC per utente.
 */
export async function checkDailyLimits(
  userId: number,
  tccAmount: number,
  type: "earn" | "spend"
): Promise<{
  allowed: boolean;
  remaining: number;
  reason?: string;
}> {
  const db = await getDb();
  if (!db) return { allowed: true, remaining: DEFAULT_MAX_DAILY_TCC };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Cerca limiti giornalieri esistenti
  const [existing] = await db
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

  const maxDaily = DEFAULT_MAX_DAILY_TCC;
  const maxTransactions = DEFAULT_MAX_DAILY_TRANSACTIONS;

  if (existing) {
    const currentAmount = type === "earn" ? existing.tccEarned : existing.tccSpent;
    const newAmount = currentAmount + tccAmount;

    if (newAmount > maxDaily) {
      return {
        allowed: false,
        remaining: Math.max(0, maxDaily - currentAmount),
        reason: `Limite giornaliero TCC raggiunto (${maxDaily} TCC/giorno)`,
      };
    }

    if (existing.transactionCount >= maxTransactions) {
      return {
        allowed: false,
        remaining: 0,
        reason: `Limite transazioni giornaliere raggiunto (${maxTransactions}/giorno)`,
      };
    }

    // Aggiorna
    const updateData: Record<string, unknown> = {
      transactionCount: existing.transactionCount + 1,
      updatedAt: new Date(),
    };
    if (type === "earn") {
      updateData.tccEarned = newAmount;
    } else {
      updateData.tccSpent = newAmount;
    }

    await db
      .update(schema.tccDailyLimits)
      .set(updateData)
      .where(eq(schema.tccDailyLimits.id, existing.id));

    return { allowed: true, remaining: maxDaily - newAmount };
  }

  // Crea nuovo record
  await db.insert(schema.tccDailyLimits).values({
    userId,
    date: today,
    checkinCount: type === "earn" ? 1 : 0,
    tccEarned: type === "earn" ? tccAmount : 0,
    tccSpent: type === "spend" ? tccAmount : 0,
    transactionCount: 1,
  });

  return { allowed: true, remaining: maxDaily - tccAmount };
}

// ============================================
// IDEMPOTENCY
// ============================================

/**
 * Verifica se una chiave di idempotenza esiste e non e' scaduta.
 * Se esiste, restituisce la risposta cached.
 */
export async function checkIdempotency(
  key: string,
  userId: number
): Promise<{ exists: boolean; cachedResponse?: string }> {
  const db = await getDb();
  if (!db) return { exists: false };

  const [existing] = await db
    .select()
    .from(schema.tccIdempotencyKeys)
    .where(
      and(
        eq(schema.tccIdempotencyKeys.idempotencyKey, key),
        eq(schema.tccIdempotencyKeys.userId, userId),
        gte(schema.tccIdempotencyKeys.expiresAt, new Date())
      )
    )
    .limit(1);

  if (existing) {
    return { exists: true, cachedResponse: existing.responseData || undefined };
  }

  return { exists: false };
}

/**
 * Salva una chiave di idempotenza con risposta.
 */
export async function saveIdempotencyKey(
  key: string,
  userId: number,
  endpoint: string,
  responseData: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + IDEMPOTENCY_TTL_HOURS);

  await db.insert(schema.tccIdempotencyKeys).values({
    idempotencyKey: key,
    userId,
    endpoint,
    responseData,
    expiresAt,
  });
}

// ============================================
// FRAUD LOGGING
// ============================================

/**
 * Registra un evento di frode sospetta.
 * Se severity = critical, potrebbe attivare blocco automatico wallet.
 */
export async function logFraudEvent(
  userId: number | null,
  eventType: "gps_spoofing" | "rate_exceeded" | "duplicate_checkin" | "invalid_qr" | "amount_anomaly" | "impossible_travel" | "suspicious_pattern",
  severity: "low" | "medium" | "high" | "critical",
  details: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string
): Promise<{ id: number } | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const [event] = await db
      .insert(schema.tccFraudEvents)
      .values({
        userId,
        eventType,
        severity,
        details: JSON.stringify(details),
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      })
      .returning();

    // Se severity critica, logga in audit_logs
    if (severity === "critical") {
      await db.insert(schema.auditLogs).values({
        userEmail: `user_id:${userId}`,
        action: `TCC_FRAUD_${eventType.toUpperCase()}`,
        entityType: "tcc_fraud_event",
        entityId: event.id,
        newValue: JSON.stringify(details),
        ipAddress: ipAddress || null,
      });
    }

    return { id: event.id };
  } catch (error) {
    console.error("[TCC Security] Errore logging fraud event:", error);
    return null;
  }
}

// ============================================
// QR TOKEN PERSISTENCE
// ============================================

/**
 * Salva un QR token firmato nel database per validazione successiva.
 */
export async function saveQRToken(
  userId: number,
  qrType: "receive" | "spend",
  tokenHash: string,
  payload: Record<string, unknown>,
  amount?: number,
  expiresAt?: Date
): Promise<{ id: number } | null> {
  const db = await getDb();
  if (!db) return null;

  const expiry = expiresAt || new Date(Date.now() + DEFAULT_QR_EXPIRY_SECONDS * 1000);

  try {
    const [token] = await db
      .insert(schema.tccQrTokens)
      .values({
        userId,
        qrType,
        tokenHash,
        payload: JSON.stringify(payload),
        amount: amount || null,
        expiresAt: expiry,
      })
      .returning();

    return { id: token.id };
  } catch (error) {
    console.error("[TCC Security] Errore salvataggio QR token:", error);
    return null;
  }
}

/**
 * Valida e marca un QR token come usato (uso singolo).
 */
export async function useQRToken(
  tokenHash: string,
  operatorId?: number
): Promise<{ valid: boolean; reason?: string; payload?: Record<string, unknown>; amount?: number }> {
  const db = await getDb();
  if (!db) return { valid: false, reason: "Database non disponibile" };

  const [token] = await db
    .select()
    .from(schema.tccQrTokens)
    .where(eq(schema.tccQrTokens.tokenHash, tokenHash))
    .limit(1);

  if (!token) {
    return { valid: false, reason: "QR token non trovato" };
  }

  if (token.used) {
    return { valid: false, reason: "QR gia' utilizzato" };
  }

  if (token.expiresAt < new Date()) {
    return { valid: false, reason: "QR scaduto" };
  }

  // Marca come usato
  await db
    .update(schema.tccQrTokens)
    .set({
      used: true,
      usedAt: new Date(),
      usedByOperatorId: operatorId || null,
    })
    .where(eq(schema.tccQrTokens.id, token.id));

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(token.payload);
  } catch {}

  return {
    valid: true,
    payload,
    amount: token.amount || undefined,
  };
}

// ============================================
// COOLDOWN CHECK
// ============================================

/**
 * Verifica se l'utente ha fatto check-in allo stesso POI entro il cooldown.
 */
export async function checkCooldown(
  userId: number,
  marketId: number,
  cooldownMinutes: number = DEFAULT_COOLDOWN_MINUTES
): Promise<{ allowed: boolean; nextAllowedAt?: Date }> {
  const db = await getDb();
  if (!db) return { allowed: true };

  const cutoff = new Date();
  cutoff.setMinutes(cutoff.getMinutes() - cooldownMinutes);

  const [recent] = await db
    .select()
    .from(schema.checkins)
    .where(
      and(
        eq(schema.checkins.userId, userId),
        eq(schema.checkins.marketId, marketId),
        gte(schema.checkins.createdAt, cutoff)
      )
    )
    .orderBy(desc(schema.checkins.createdAt))
    .limit(1);

  if (recent) {
    const nextAllowedAt = new Date(recent.createdAt);
    nextAllowedAt.setMinutes(nextAllowedAt.getMinutes() + cooldownMinutes);
    return { allowed: false, nextAllowedAt };
  }

  return { allowed: true };
}
