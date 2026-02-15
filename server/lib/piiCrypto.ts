/**
 * PII Encryption Utilities (AES-256-GCM)
 *
 * Cifratura e decifratura per dati PII sensibili:
 * - Codice Fiscale, Partita IVA, IBAN
 * - Utilizza AES-256-GCM con IV random per ogni operazione
 * - Formato output: iv:authTag:ciphertext (hex)
 * - Supporta ricerca per hash (SHA-256) su colonne cifrate
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM standard
const AUTH_TAG_LENGTH = 16;
const SEPARATOR = ":";

function getEncryptionKey(): Buffer {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("[PII] JWT_SECRET required for PII encryption");
  return createHash("sha256").update(secret).digest();
}

/**
 * Cifra un valore PII con AES-256-GCM.
 * Ogni chiamata genera un IV random — stesso plaintext produce ciphertext diverso.
 */
export function encryptPII(plaintext: string): string {
  if (!plaintext) return "";
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}${SEPARATOR}${authTag}${SEPARATOR}${encrypted}`;
}

/**
 * Decifra un valore PII cifrato con encryptPII().
 */
export function decryptPII(ciphertext: string): string {
  if (!ciphertext) return "";
  if (!ciphertext.includes(SEPARATOR)) return ciphertext; // plaintext legacy
  const parts = ciphertext.split(SEPARATOR);
  if (parts.length !== 3) return ciphertext; // non cifrato

  const [ivHex, authTagHex, encrypted] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Genera un hash SHA-256 deterministico di un valore PII.
 * Usato per creare indici ricercabili su colonne cifrate.
 * Es: cercare un CF senza decifrare tutte le righe.
 */
export function hashPII(value: string): string {
  if (!value) return "";
  const normalized = value.toUpperCase().trim();
  return createHash("sha256").update(normalized).digest("hex");
}

/**
 * Verifica se un valore e' gia' cifrato (formato iv:authTag:encrypted).
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false;
  const parts = value.split(SEPARATOR);
  if (parts.length !== 3) return false;
  return parts[0].length === IV_LENGTH * 2 && parts[1].length === AUTH_TAG_LENGTH * 2;
}
