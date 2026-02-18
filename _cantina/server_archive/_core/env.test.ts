import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('ENV validation', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset modules so ENV is re-evaluated
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should throw if JWT_SECRET is missing', async () => {
    delete process.env.JWT_SECRET;
    delete process.env.DATABASE_URL;

    await expect(async () => {
      // Dynamic import to re-evaluate the module
      const mod = await import('./env.ts?test1=' + Date.now());
      return mod;
    }).rejects.toThrow(/JWT_SECRET/);
  });

  it('should throw if DATABASE_URL is missing', async () => {
    process.env.JWT_SECRET = 'test-secret';
    delete process.env.DATABASE_URL;

    await expect(async () => {
      const mod = await import('./env.ts?test2=' + Date.now());
      return mod;
    }).rejects.toThrow(/DATABASE_URL/);
  });

  it('should load successfully when required vars are set', async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.DATABASE_URL = 'postgresql://test:test@localhost/test';

    const { ENV } = await import('./env.ts?test3=' + Date.now());
    expect(ENV.cookieSecret).toBe('test-secret');
    expect(ENV.databaseUrl).toBe('postgresql://test:test@localhost/test');
  });

  it('should use empty string for optional vars when not set', async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.DATABASE_URL = 'postgresql://test:test@localhost/test';
    delete process.env.VITE_APP_ID;

    const { ENV } = await import('./env.ts?test4=' + Date.now());
    expect(ENV.appId).toBe('');
  });

  it('should detect production environment', async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.DATABASE_URL = 'postgresql://test:test@localhost/test';
    process.env.NODE_ENV = 'production';

    const { ENV } = await import('./env.ts?test5=' + Date.now());
    expect(ENV.isProduction).toBe(true);
  });
});
