'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma, OrganizationStatus } from '@prisma/client';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if organization exists first
    const existing = await prisma.organization.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // If already approved, return as-is
    if (existing.status === OrganizationStatus.APPROVED) {
      return NextResponse.json({ organization: existing });
    }

    const organization = await prisma.organization.update({
      where: { id },
      data: { status: OrganizationStatus.APPROVED },
    });

    return NextResponse.json({ organization });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
      }
      console.error('[POST /api/admin/organizations/:id/approve] Prisma error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to approve organization' },
        { status: 500 }
      );
    }

    console.error('[POST /api/admin/organizations/:id/approve] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to approve organization' },
      { status: 500 }
    );
  }
}
