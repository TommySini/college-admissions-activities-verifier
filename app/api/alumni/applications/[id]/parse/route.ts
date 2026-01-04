import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseApplicationFile } from '@/lib/alumni/parse';
import { join } from 'path';

/**
 * POST /api/alumni/applications/[id]/parse
 * Trigger or retry parsing (owner or admin only)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const application = await prisma.alumniApplication.findUnique({
      where: { id },
      include: { alumniProfile: true },
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Check ownership or admin
    const isOwner = application.alumniProfile.userId === user.id;
    const isAdmin = user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Reset parse status
    await prisma.alumniApplication.update({
      where: { id },
      data: {
        parseStatus: 'pending',
        parseError: null,
      },
    });

    // Trigger parsing
    const filepath = join(process.cwd(), 'public', application.sourceFileUrl);
    parseApplicationFile(id, filepath, application.sourceFileMime).catch((error) => {
      console.error(`[POST /api/alumni/applications/:id/parse] Parse error:`, error);
    });

    return NextResponse.json({ success: true, message: 'Parsing started' });
  } catch (error) {
    console.error('[POST /api/alumni/applications/:id/parse] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to trigger parsing' },
      { status: 500 }
    );
  }
}
