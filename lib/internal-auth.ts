import { NextRequest } from 'next/server';
import { getCurrentUser } from './auth';

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || 'change-me-in-production';

/**
 * Verify internal API secret for service-to-service calls
 */
export function verifyInternalSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('x-internal-secret');
  return authHeader === INTERNAL_SECRET;
}

/**
 * Require admin or internal secret for sensitive endpoints
 */
export async function requireAdminOrInternal(
  request: NextRequest
): Promise<{ authorized: boolean; isAdmin: boolean; user?: any }> {
  // Check internal secret first
  if (verifyInternalSecret(request)) {
    return { authorized: true, isAdmin: false };
  }

  // Check for admin user
  const user = await getCurrentUser();
  if (user && user.role === 'admin') {
    return { authorized: true, isAdmin: true, user };
  }

  return { authorized: false, isAdmin: false };
}
