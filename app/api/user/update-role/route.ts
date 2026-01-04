import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyOrigin } from '@/lib/csrf';

// POST - Update user role (admin only)
export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    if (!verifyOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can change roles
    if (currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only admins can change user roles' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, role } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (!role || !['student', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'student' or 'admin'" },
        { status: 400 }
      );
    }

    // Fetch target user
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent admins from demoting themselves (require another admin)
    if (targetUser.id === currentUser.id && role !== 'admin') {
      return NextResponse.json(
        { error: 'Cannot demote yourself. Ask another admin to change your role.' },
        { status: 403 }
      );
    }

    const oldRole = targetUser.role;

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    // Audit log
    console.log(
      JSON.stringify({
        event: 'role_change',
        actor: currentUser.id,
        actorEmail: currentUser.email,
        targetUser: userId,
        targetEmail: targetUser.email,
        oldRole,
        newRole: role,
        timestamp: new Date().toISOString(),
      })
    );

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error('Error updating role:', error);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}
