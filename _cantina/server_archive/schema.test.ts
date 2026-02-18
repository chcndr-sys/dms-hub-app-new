import { describe, it, expect } from 'vitest';

describe('Database Schema - Core Tables', () => {
  it('should export core user and market tables', async () => {
    const schema = await import('../drizzle/schema');

    // Core tables (primi export dello schema)
    expect(schema.users).toBeDefined();
    expect(schema.extendedUsers).toBeDefined();
    expect(schema.markets).toBeDefined();
    expect(schema.shops).toBeDefined();
    expect(schema.transactions).toBeDefined();
    expect(schema.checkins).toBeDefined();

    // Type inference
    expect(typeof schema.users).toBe('object');
    expect(typeof schema.markets).toBe('object');
  });

  it('should export audit and system tables', async () => {
    const schema = await import('../drizzle/schema');
    expect(schema.auditLogs).toBeDefined();
    expect(schema.systemLogs).toBeDefined();
    expect(schema.notifications).toBeDefined();
    expect(schema.inspections).toBeDefined();
  });

  it('should export product tracking tables', async () => {
    const schema = await import('../drizzle/schema');
    expect(schema.products).toBeDefined();
    expect(schema.productTracking).toBeDefined();
    expect(schema.carbonFootprint).toBeDefined();
  });
});
