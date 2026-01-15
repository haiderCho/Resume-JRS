import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter } from '../lib/rate-limiter';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter(3, 1); // 3 requests per minute
  });

  it('should allow requests within limit', () => {
    const result1 = limiter.check('user1');
    const result2 = limiter.check('user1');
    const result3 = limiter.check('user1');

    expect(result1.allowed).toBe(true);
    expect(result2.allowed).toBe(true);
    expect(result3.allowed).toBe(true);
  });

  it('should block requests exceeding limit', () => {
    limiter.check('user1');
    limiter.check('user1');
    limiter.check('user1');
    const result = limiter.check('user1');

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should track remaining requests correctly', () => {
    const result1 = limiter.check('user1');
    const result2 = limiter.check('user1');

    expect(result1.remaining).toBe(2);
    expect(result2.remaining).toBe(1);
  });

  it('should track separate limits for different users', () => {
    limiter.check('user1');
    limiter.check('user1');
    limiter.check('user1');
    
    const user1Result = limiter.check('user1');
    const user2Result = limiter.check('user2');

    expect(user1Result.allowed).toBe(false);
    expect(user2Result.allowed).toBe(true);
  });

  it('should provide reset time in seconds', () => {
    const result = limiter.check('user1');
    
    expect(result.resetInSeconds).toBeLessThanOrEqual(60);
    expect(result.resetInSeconds).toBeGreaterThan(0);
  });
});
