import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Cache color settings for 10 minutes (rarely change)
export const revalidate = 600;

// GET - Get color settings
export async function GET() {
  try {
    const primary = await prisma.settings.findUnique({
      where: { key: 'color_primary' },
    });
    const tertiary = await prisma.settings.findUnique({
      where: { key: 'color_tertiary' },
    });
    const accent = await prisma.settings.findUnique({
      where: { key: 'color_accent' },
    });

    return NextResponse.json({
      colors: {
        primary: primary?.value || '#7d95b9',
        tertiary: tertiary?.value || '#a4c4e0',
        accent: accent?.value || '#c2dcf2',
      },
    });
  } catch (error) {
    console.error('Error fetching colors:', error);
    return NextResponse.json(
      {
        colors: {
          primary: '#7d95b9',
          tertiary: '#a4c4e0',
          accent: '#c2dcf2',
        },
      },
      { status: 200 }
    );
  }
}

// POST - Update color settings (admin only)
export async function POST(request: NextRequest) {
  try {
    const { getCurrentUser } = await import('@/lib/auth');
    const user = await getCurrentUser();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { primary, tertiary, accent } = body;

    // Validate HEX colors
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (primary && !hexRegex.test(primary)) {
      return NextResponse.json(
        { error: 'Invalid primary color format. Use HEX format (e.g., #7d95b9)' },
        { status: 400 }
      );
    }
    if (tertiary && !hexRegex.test(tertiary)) {
      return NextResponse.json(
        { error: 'Invalid tertiary color format. Use HEX format (e.g., #a4c4e0)' },
        { status: 400 }
      );
    }
    if (accent && !hexRegex.test(accent)) {
      return NextResponse.json(
        { error: 'Invalid accent color format. Use HEX format (e.g., #c2dcf2)' },
        { status: 400 }
      );
    }

    // Update or create settings
    if (primary) {
      await prisma.settings.upsert({
        where: { key: 'color_primary' },
        update: { value: primary },
        create: { key: 'color_primary', value: primary },
      });
    }

    if (tertiary) {
      await prisma.settings.upsert({
        where: { key: 'color_tertiary' },
        update: { value: tertiary },
        create: { key: 'color_tertiary', value: tertiary },
      });
    }

    if (accent) {
      await prisma.settings.upsert({
        where: { key: 'color_accent' },
        update: { value: accent },
        create: { key: 'color_accent', value: accent },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating colors:', error);
    return NextResponse.json({ error: 'Failed to update colors' }, { status: 500 });
  }
}
