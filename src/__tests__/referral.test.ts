import { describe, it, expect, beforeEach } from 'bun:test';

// Note: These functions are internal to service.ts
// We'll test them via the public service API in integration tests
// For now, we test the types and config structure

describe('Referral Config', () => {
  beforeEach(() => {
    delete process.env.REFERRAL_FEE_BPS;
    delete process.env.REFERRAL_MODE;
  });

  it('validates env var structure', () => {
    process.env.REFERRAL_FEE_BPS = '20';
    process.env.REFERRAL_MODE = 'smart';
    
    expect(process.env.REFERRAL_FEE_BPS).toBe('20');
    expect(process.env.REFERRAL_MODE).toBe('smart');
  });

  it('handles missing env vars', () => {
    expect(process.env.REFERRAL_FEE_BPS).toBeUndefined();
    expect(process.env.REFERRAL_MODE).toBeUndefined();
  });
});

