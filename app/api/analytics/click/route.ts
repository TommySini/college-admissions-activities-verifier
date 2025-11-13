import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Track opportunity click (lightweight beacon)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { editionId } = body;
    
    if (!editionId) {
      return NextResponse.json(
        { error: "Edition ID required" },
        { status: 400 }
      );
    }
    
    // Increment click count (async, fire-and-forget style in production)
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
    console.error("Error tracking click:", error);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}

