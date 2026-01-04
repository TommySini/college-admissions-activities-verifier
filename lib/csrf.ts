import { NextRequest } from 'next/server';

/**
 * Verify origin/referer for state-changing requests (CSRF protection)
 */
export function verifyOrigin(request: NextRequest): boolean {
  // GET, HEAD, OPTIONS are safe (no state change)
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return true;
  }

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // Allow configured origins
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter(Boolean) as string[];

  // Check origin header
  if (origin) {
    const originUrl = new URL(origin);
    return allowedOrigins.some((allowed) => {
      try {
        const allowedUrl = new URL(allowed);
        return originUrl.protocol === allowedUrl.protocol && originUrl.host === allowedUrl.host;
      } catch {
        return origin.startsWith(allowed);
      }
    });
  }

  // Fallback to referer
  if (referer) {
    return allowedOrigins.some((allowed) => referer.startsWith(allowed));
  }

  // No origin/referer in production is suspicious
  if (process.env.NODE_ENV === 'production') {
    console.warn(`[CSRF] Missing origin/referer for ${request.method} ${request.url}`);
    return false;
  }

  // Allow in development
  return true;
}

/**
 * Middleware wrapper to check origin
 */
export function withOriginCheck(handler: (req: NextRequest) => Promise<Response>) {
  return async (request: NextRequest) => {
    if (!verifyOrigin(request)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid origin. CSRF protection triggered.',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return handler(request);
  };
}
