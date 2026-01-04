'use server';

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const organizations = await prisma.organization.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    const creatorIds = Array.from(
      new Set(
        organizations
          .map((organization) => (organization as any).createdById as string | undefined)
          .filter(Boolean)
      )
    ) as string[];

    const creators = creatorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: creatorIds } },
          select: { id: true, name: true, email: true },
        })
      : [];

    const creatorMap = new Map(creators.map((creator) => [creator.id, creator]));

    const organizationsWithCreators = organizations.map((organization) => {
      const createdById = (organization as any).createdById as string | undefined;
      return {
        ...organization,
        createdBy: createdById ? (creatorMap.get(createdById) ?? null) : null,
      };
    });

    return NextResponse.json({ organizations: organizationsWithCreators });
  } catch (error) {
    console.error('[GET /api/admin/organizations] Error:', error);
    return NextResponse.json({ error: 'Failed to load organizations' }, { status: 500 });
  }
}
