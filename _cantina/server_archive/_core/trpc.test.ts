import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock database prima di importare il modulo
vi.mock('../db', () => ({
  getDb: vi.fn().mockResolvedValue(null),
}));
vi.mock('../services/apiLogsService', () => ({
  addLog: vi.fn(),
}));

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-for-trpc-tests-32chars!!";
  process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
});

describe('tRPC middleware e procedure types', () => {
  it('should export router, publicProcedure, protectedProcedure, adminProcedure', async () => {
    const trpc = await import('./trpc');
    expect(trpc.router).toBeDefined();
    expect(trpc.publicProcedure).toBeDefined();
    expect(trpc.protectedProcedure).toBeDefined();
    expect(trpc.adminProcedure).toBeDefined();
  });

  it('should create a valid router with public procedure', async () => {
    const { router, publicProcedure } = await import('./trpc');
    const testRouter = router({
      hello: publicProcedure.query(() => 'world'),
    });
    expect(testRouter).toBeDefined();
    expect(testRouter._def).toBeDefined();
  });

  it('should create a valid router with protected procedure', async () => {
    const { router, protectedProcedure } = await import('./trpc');
    const testRouter = router({
      secured: protectedProcedure.query(() => 'protected'),
    });
    expect(testRouter).toBeDefined();
  });

  it('should create a valid router with admin procedure', async () => {
    const { router, adminProcedure } = await import('./trpc');
    const testRouter = router({
      admin: adminProcedure.query(() => 'admin-only'),
    });
    expect(testRouter).toBeDefined();
  });
});
