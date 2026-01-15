/**
 * Rate Limiting Module
 * Protects the API from abuse with sliding window rate limiting.
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

export class RateLimiter {
  private requests: Map<string, RateLimitEntry>;
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 10, windowMinutes: number = 1) {
    this.requests = new Map();
    this.maxRequests = maxRequests;
    this.windowMs = windowMinutes * 60 * 1000;
  }

  /**
   * Checks if a request should be allowed based on the identifier.
   * Returns { allowed: boolean, remaining: number, resetIn: number }
   */
  check(identifier: string): {
    allowed: boolean;
    remaining: number;
    resetInSeconds: number;
  } {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    // No previous requests from this identifier
    if (!entry) {
      this.requests.set(identifier, { count: 1, windowStart: now });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetInSeconds: Math.ceil(this.windowMs / 1000)
      };
    }

    // Window has expired, reset
    if (now - entry.windowStart >= this.windowMs) {
      this.requests.set(identifier, { count: 1, windowStart: now });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetInSeconds: Math.ceil(this.windowMs / 1000)
      };
    }

    // Within window
    const remaining = this.maxRequests - entry.count - 1;
    const resetInSeconds = Math.ceil((entry.windowStart + this.windowMs - now) / 1000);

    if (entry.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetInSeconds
      };
    }

    // Increment count
    entry.count++;
    this.requests.set(identifier, entry);

    return {
      allowed: true,
      remaining: Math.max(0, remaining),
      resetInSeconds
    };
  }

  /**
   * Clears expired entries to prevent memory leaks.
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.requests) {
      if (now - entry.windowStart >= this.windowMs) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * Gets the identifier from a request (IP-based).
   */
  static getIdentifier(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    return forwarded?.split(',')[0]?.trim() || realIp || 'anonymous';
  }
}

// Singleton rate limiter instance
// 10 requests per minute per IP
export const apiRateLimiter = new RateLimiter(10, 1);

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => apiRateLimiter.cleanup(), 5 * 60 * 1000);
}

/**
 * Helper to create rate limit response headers.
 */
export function rateLimitHeaders(result: ReturnType<RateLimiter['check']>): Headers {
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', '10');
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.resetInSeconds.toString());
  return headers;
}
