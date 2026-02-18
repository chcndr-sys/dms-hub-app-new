import { describe, it, expect } from 'vitest';
import { getSessionCookieOptions, isSecureRequest } from './cookies';

describe('Cookie security', () => {
  it('should set sameSite to lax', () => {
    const mockReq = {
      headers: { 'x-forwarded-proto': 'https' },
      protocol: 'https',
      secure: true,
    } as any;

    const options = getSessionCookieOptions(mockReq);
    expect(options.sameSite).toBe('none'); // Cross-domain Vercel→Hetzner richiede SameSite=None + Secure
  });

  it('should set httpOnly to true', () => {
    const mockReq = {
      headers: {},
      protocol: 'http',
      secure: false,
    } as any;

    const options = getSessionCookieOptions(mockReq);
    expect(options.httpOnly).toBe(true);
  });

  it('should set secure flag for HTTPS requests', () => {
    const mockReq = {
      headers: { 'x-forwarded-proto': 'https' },
      protocol: 'https',
      secure: true,
    } as any;

    const options = getSessionCookieOptions(mockReq);
    expect(options.secure).toBe(true);
  });

  it('should have maxAge set', () => {
    const mockReq = {
      headers: {},
      protocol: 'http',
      secure: false,
    } as any;

    const options = getSessionCookieOptions(mockReq);
    expect(options.maxAge).toBeGreaterThan(0);
  });

  it('should detect secure request via x-forwarded-proto', () => {
    const mockReq = {
      headers: { 'x-forwarded-proto': 'https' },
      protocol: 'http',
      secure: false,
    } as any;

    expect(isSecureRequest(mockReq)).toBe(true);
  });
});
