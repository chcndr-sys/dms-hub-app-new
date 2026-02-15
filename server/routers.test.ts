import { describe, it, expect, vi, beforeAll } from 'vitest';

vi.mock('./db', () => ({
  getDb: vi.fn().mockResolvedValue(null),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
}));
vi.mock('./services/apiLogsService', () => ({
  addLog: vi.fn(),
  getLogs: vi.fn().mockReturnValue([]),
  clearAllLogs: vi.fn(),
}));

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-for-routers-test-32chars!!";
  process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
});

describe('Router registration', () => {
  it('should export appRouter with all registered routers and GDPR endpoints', async () => {
    const { appRouter } = await import('./routers');
    expect(appRouter).toBeDefined();
    expect(appRouter._def).toBeDefined();

    const procedures = appRouter._def.procedures;
    const paths = Object.keys(procedures);

    // Auth
    expect(paths).toContain('auth.me');
    expect(paths).toContain('auth.logout');

    // System
    expect(paths.some((p: string) => p.startsWith('system.'))).toBe(true);

    // Analytics
    expect(paths).toContain('analytics.overview');
    expect(paths).toContain('analytics.markets');

    // DMS Hub
    expect(paths.some((p: string) => p.startsWith('dmsHub.'))).toBe(true);

    // Wallet
    expect(paths.some((p: string) => p.startsWith('wallet.'))).toBe(true);

    // GDPR
    expect(paths).toContain('gdpr.exportMyData');
    expect(paths).toContain('gdpr.deleteMyAccount');
    expect(paths).toContain('gdpr.retentionStatus');
    expect(paths).toContain('gdpr.runRetentionCleanup');
    expect(paths).toContain('gdpr.myConsents');

    // TCC Security
    expect(paths.some((p: string) => p.startsWith('tccSecurity.'))).toBe(true);

    // Guardian
    expect(paths.some((p: string) => p.startsWith('guardian.'))).toBe(true);

    // Total: should have many endpoints
    expect(paths.length).toBeGreaterThan(50);
  });
});
