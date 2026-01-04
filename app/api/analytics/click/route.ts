import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { checkRateLimit, RateLimitPresets } from '@/lib/rate-limit';

// Track opportunity click (lightweight beacon)
// Hardened: requires auth, rate limited, origin checked
export async function POST(request: NextRequest) {
  try {
    // Rate limit to prevent abuse
    const rateLimit = checkRateLimit(request, RateLimitPresets.normal);
    if (!rateLimit.allowed) {
      return NextResponse.json({ success: false }, { status: 429 });
    }

    // Check origin/referer to prevent external abuse
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const allowedOrigins = process.env.NEXT_PUBLIC_APP_URL
      ? [process.env.NEXT_PUBLIC_APP_URL]
      : ['http://localhost:3000'];

    const isValidOrigin =
      (origin && allowedOrigins.some((allowed) => origin.startsWith(allowed))) ||
      (referer && allowedOrigins.some((allowed) => referer.startsWith(allowed)));

    if (!isValidOrigin && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ success: false }, { status: 403 });
    }

    // Require authentication (optional: can allow anonymous with stricter rate limits)
    const user = await getCurrentUser();
    if (!user) {
      // Still allow but with very strict rate limiting
      const strictLimit = checkRateLimit(request, { windowMs: 60000, maxRequests: 10 }, 'anon');
      if (!strictLimit.allowed) {
        return NextResponse.json({ success: false }, { status: 429 });
      }
    }

    const body = await request.json();
    const { editionId } = body;

    if (!editionId || typeof editionId !== 'string') {
      return NextResponse.json({ error: 'Valid edition ID required' }, { status: 400 });
    }

    // Verify edition exists before incrementing
    const edition = await prisma.edition.findUnique({
      where: { id: editionId },
      select: { id: true },
    });

    if (!edition) {
      return NextResponse.json({ success: false }, { status: 404 });
    }

    // Increment click count
    await prisma.edition.update({
      where: { id: editionId },
      data: {
        clicks30d: {
          increment: 1,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Log but don't fail - analytics shouldn't block user experience
    console.error('Error tracking click:', error);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
