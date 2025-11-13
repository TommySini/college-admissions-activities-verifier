import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { normalizeEdition } from "@/lib/normalize";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id } = params;
    const user = await getCurrentUser();
    
    const edition = await prisma.edition.findUnique({
      where: { id },
      include: {
        opportunity: {
          include: {
            provider: true,
            location: true,
            domains: {
              include: {
                domain: true,
              },
            },
          },
        },
        participations: user?.schoolId ? {
          where: {
            schoolId: user.schoolId,
          },
        } : false,
        saves: user ? {
          where: {
            userId: user.id,
          },
        } : false,
        follows: user ? {
          where: {
            userId: user.id,
          },
        } : false,
        _count: {
          select: {
            saves: true,
            follows: true,
            participations: true,
          },
        },
      },
    });
    
    if (!edition) {
      return NextResponse.json(
        { error: "Edition not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ edition: normalizeEdition(edition) });
  } catch (error) {
    console.error("Error fetching edition:", error);
    return NextResponse.json(
      { error: "Failed to fetch edition" },
      { status: 500 }
    );
  }
}

