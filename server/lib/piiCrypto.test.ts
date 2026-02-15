import { describe, it, expect, beforeAll } from "vitest";

// Set JWT_SECRET before importing module
beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-key-for-pii-encryption-32chars!!";
});

describe("PII Crypto (AES-256-GCM)", () => {
  it("should encrypt and decrypt a codice fiscale", async () => {
    const { encryptPII, decryptPII } = await import("./piiCrypto");
    const cf = "RSSMRA85M01H501Z";
    const encrypted = encryptPII(cf);
    expect(encrypted).not.toBe(cf);
    expect(encrypted).toContain(":");
    const decrypted = decryptPII(encrypted);
    expect(decrypted).toBe(cf);
  });

  it("should encrypt and decrypt a partita IVA", async () => {
    const { encryptPII, decryptPII } = await import("./piiCrypto");
    const piva = "12345678901";
    const encrypted = encryptPII(piva);
    const decrypted = decryptPII(encrypted);
    expect(decrypted).toBe(piva);
  });

  it("should encrypt and decrypt an IBAN", async () => {
    const { encryptPII, decryptPII } = await import("./piiCrypto");
    const iban = "IT60X0542811101000000123456";
    const encrypted = encryptPII(iban);
    const decrypted = decryptPII(encrypted);
    expect(decrypted).toBe(iban);
  });

  it("should produce different ciphertext for same plaintext (random IV)", async () => {
    const { encryptPII } = await import("./piiCrypto");
    const cf = "RSSMRA85M01H501Z";
    const enc1 = encryptPII(cf);
    const enc2 = encryptPII(cf);
    expect(enc1).not.toBe(enc2);
  });

  it("should handle empty strings gracefully", async () => {
    const { encryptPII, decryptPII } = await import("./piiCrypto");
    expect(encryptPII("")).toBe("");
    expect(decryptPII("")).toBe("");
  });

  it("should passthrough plaintext (legacy data) without errors", async () => {
    const { decryptPII } = await import("./piiCrypto");
    expect(decryptPII("RSSMRA85M01H501Z")).toBe("RSSMRA85M01H501Z");
  });

  it("should generate deterministic hash for search index", async () => {
    const { hashPII } = await import("./piiCrypto");
    const cf = "rssmra85m01h501z";
    const hash1 = hashPII(cf);
    const hash2 = hashPII("RSSMRA85M01H501Z");
    expect(hash1).toBe(hash2); // case insensitive
    expect(hash1.length).toBe(64); // SHA-256 hex
  });

  it("should detect encrypted vs plaintext values", async () => {
    const { encryptPII, isEncrypted } = await import("./piiCrypto");
    expect(isEncrypted("RSSMRA85M01H501Z")).toBe(false);
    expect(isEncrypted("")).toBe(false);
    const encrypted = encryptPII("RSSMRA85M01H501Z");
    expect(isEncrypted(encrypted)).toBe(true);
  });

  it("should handle special characters (accented names, unicode)", async () => {
    const { encryptPII, decryptPII } = await import("./piiCrypto");
    const name = "Giuseppe D'Ambrósio — Via Università 15/A";
    const encrypted = encryptPII(name);
    expect(decryptPII(encrypted)).toBe(name);
  });
});
