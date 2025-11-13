import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const params = await context.params;
    const { id: editionId } = params;
    
    // Check if edition exists
    const edition = await prisma.edition.findUnique({
      where: { id: editionId },
    });
    
    if (!edition) {
      return NextResponse.json(
        { error: "Edition not found" },
        { status: 404 }
      );
    }
    
    // Toggle save
    const existing = await prisma.savedEdition.findUnique({
      where: {
        userId_editionId: {
          userId: user.id,
          editionId,
        },
      },
    });
    
    if (existing) {
      // Remove save
      await prisma.$transaction([
        prisma.savedEdition.delete({
          where: { id: existing.id },
        }),
        prisma.edition.update({
          where: { id: editionId },
          data: {
            savesCount: {
              decrement: 1,
            },
          },
        }),
      ]);
      
      return NextResponse.json({ saved: false });
    } else {
      // Add save
      await prisma.$transaction([
        prisma.savedEdition.create({
          data: {
            userId: user.id,
            editionId,
          },
        }),
        prisma.edition.update({
          where: { id: editionId },
          data: {
            savesCount: {
              increment: 1,
            },
          },
        }),
      ]);
      
      return NextResponse.json({ saved: true });
    }
  } catch (error) {
    console.error("Error toggling save:", error);
    return NextResponse.json(
      { error: "Failed to toggle save" },
      { status: 500 }
    );
  }
}

