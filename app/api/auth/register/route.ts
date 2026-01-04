import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Note: This app uses OAuth authentication.
 * This route is deprecated but kept for API compatibility.
 * Users should register via OAuth providers.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, role = 'student' } = body;

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: email and name' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // Create user (OAuth-style, no password)
    const user = await prisma.user.create({
      data: {
        email,
        name,
        role: role === 'admin' ? 'admin' : 'student',
      },
    });

    return NextResponse.json(
      {
        message: 'User created successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
