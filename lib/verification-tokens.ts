import crypto from 'crypto';

const SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-change-in-production';
const TOKEN_EXPIRY_HOURS = 72; // 3 days

export interface VerificationTokenPayload {
  activityId: string;
  action: 'accept' | 'reject';
  exp: number;
}

/**
 * Generate a signed, expiring verification token
 */
export function generateVerificationToken(activityId: string, action: 'accept' | 'reject'): string {
  const exp = Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;
  const payload: VerificationTokenPayload = {
    activityId,
    action,
    exp,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET).update(payloadBase64).digest('base64url');

  return `${payloadBase64}.${signature}`;
}

/**
 * Verify and parse a verification token
 * Returns null if invalid or expired
 */
export function verifyVerificationToken(token: string): VerificationTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) {
      return null;
    }

    const [payloadBase64, signature] = parts;

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', SECRET)
      .update(payloadBase64)
      .digest('base64url');

    if (signature !== expectedSignature) {
      console.warn('[verifyVerificationToken] Invalid signature');
      return null;
    }

    // Parse payload
    const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
    const payload: VerificationTokenPayload = JSON.parse(payloadJson);

    // Check expiry
    if (Date.now() > payload.exp) {
      console.warn('[verifyVerificationToken] Token expired');
      return null;
    }

    // Validate structure
    if (!payload.activityId || !payload.action || !['accept', 'reject'].includes(payload.action)) {
      console.warn('[verifyVerificationToken] Invalid payload structure');
      return null;
    }

    return payload;
  } catch (error) {
    console.error('[verifyVerificationToken] Error:', error);
    return null;
  }
}

/**
 * Mark a token as used (store in DB or cache)
 * For now, we'll use a simple in-memory set (not production-ready)
 * In production, use Redis or a DB table with expiry
 */
const usedTokens = new Set<string>();

export function markTokenAsUsed(token: string): void {
  usedTokens.add(token);
}

export function isTokenUsed(token: string): boolean {
  return usedTokens.has(token);
}
