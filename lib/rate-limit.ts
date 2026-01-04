import { NextRequest } from 'next/server';

/**
 * Simple in-memory rate limiter
 * For production, replace with Redis/Upstash Ratelimit
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Cleanup every minute

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Get client identifier from request
 */
function getClientId(request: NextRequest): string {
  // Try to get IP from various headers (Vercel, Cloudflare, etc.)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  return ip;
}

/**
 * Check rate limit for a request
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  identifier?: string
): RateLimitResult {
  const clientId = identifier || getClientId(request);
  const key = `${clientId}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // Create or reset entry if window expired
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
  }

  // Increment count
  entry.count++;

  const allowed = entry.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);

  return {
    allowed,
    remaining,
    resetAt: entry.resetAt,
  };
}

/**
 * Preset configurations for common endpoints
 */
export const RateLimitPresets = {
  // Strict for expensive operations
  strict: { windowMs: 60000, maxRequests: 10 }, // 10 per minute

  // Normal for API endpoints
  normal: { windowMs: 60000, maxRequests: 60 }, // 60 per minute

  // Relaxed for public reads
  relaxed: { windowMs: 60000, maxRequests: 120 }, // 120 per minute

  // Very strict for auth/email
  auth: { windowMs: 60000, maxRequests: 5 }, // 5 per minute

  // OpenAI/Assistant calls
  ai: { windowMs: 60000, maxRequests: 20 }, // 20 per minute
};

/**
 * Middleware helper to apply rate limiting
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<Response>,
  config: RateLimitConfig = RateLimitPresets.normal
) {
  return async (request: NextRequest) => {
    const result = checkRateLimit(request, config);

    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Too many requests',
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
            'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Add rate limit headers to response
    const response = await handler(request);
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(result.resetAt).toISOString());

    return response;
  };
}
