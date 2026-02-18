import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock il database per le funzioni async che lo usano
vi.mock('../db', () => ({
  getDb: vi.fn().mockResolvedValue(null),
}));

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-for-tcc-security-32chars!!";
});

describe('TCC Security - QR Signing (HMAC-SHA256)', () => {
  it('should generate a valid QR signature with token, signature, expiry, nonce', async () => {
    const { generateQRSignature } = await import('./tccSecurity');
    const result = generateQRSignature({ vendorId: 42, stallId: 7 });
    expect(result.token).toBeDefined();
    expect(result.signature).toBeDefined();
    expect(result.expiresAt).toBeDefined();
    expect(result.nonce).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.signature.length).toBe(64); // SHA-256 hex = 64 chars
  });

  it('should validate a correct QR signature', async () => {
    const { generateQRSignature, validateQRSignature } = await import('./tccSecurity');
    const { token, signature } = generateQRSignature({ vendorId: 42 });
    const result = validateQRSignature(token, signature);
    expect(result.valid).toBe(true);
    expect(result.payload).toBeDefined();
    expect(result.payload?.vendorId).toBe(42);
  });

  it('should reject a forged QR signature', async () => {
    const { generateQRSignature, validateQRSignature } = await import('./tccSecurity');
    const { token } = generateQRSignature({ vendorId: 42 });
    const result = validateQRSignature(token, 'fake-signature-not-valid');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('non valida');
  });

  it('should reject a tampered token', async () => {
    const { generateQRSignature, validateQRSignature } = await import('./tccSecurity');
    const { signature } = generateQRSignature({ vendorId: 42 });
    const tamperedToken = Buffer.from(JSON.stringify({ vendorId: 999 })).toString('base64url');
    const result = validateQRSignature(tamperedToken, signature);
    expect(result.valid).toBe(false);
  });

  it('should generate unique nonces for each QR', async () => {
    const { generateQRSignature } = await import('./tccSecurity');
    const r1 = generateQRSignature({ id: 1 });
    const r2 = generateQRSignature({ id: 1 });
    expect(r1.nonce).not.toBe(r2.nonce);
    expect(r1.token).not.toBe(r2.token);
  });
});

describe('TCC Security - GPS (Haversine)', () => {
  it('should calculate distance between two nearby points', async () => {
    const { haversineDistance } = await import('./tccSecurity');
    // Bologna Piazza Maggiore -> Bologna Stazione (~1.3 km)
    const distance = haversineDistance(
      44.4937, 11.3430,
      44.5058, 11.3426,
    );
    expect(distance).toBeGreaterThan(1000);
    expect(distance).toBeLessThan(2000);
  });

  it('should return 0 for same coordinates', async () => {
    const { haversineDistance } = await import('./tccSecurity');
    const distance = haversineDistance(44.4937, 11.3430, 44.4937, 11.3430);
    expect(distance).toBe(0);
  });

  it('should calculate long distances correctly', async () => {
    const { haversineDistance } = await import('./tccSecurity');
    // Bologna -> Roma (~300 km)
    const distance = haversineDistance(44.4937, 11.3430, 41.9028, 12.4964);
    expect(distance).toBeGreaterThan(280000);
    expect(distance).toBeLessThan(320000);
  });
});

describe('TCC Security - GPS Plausibility', () => {
  it('should return plausible=true when DB is unavailable (fallback permissivo)', async () => {
    const { checkGPSPlausibility } = await import('./tccSecurity');
    const result = await checkGPSPlausibility(1, 44.49, 11.34, new Date());
    expect(result.plausible).toBe(true);
  });
});
