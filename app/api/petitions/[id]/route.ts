import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const ReviewPetitionSchema = z.object({
  status: z.enum(["approved", "rejected", "needs_review"]),
  reviewNotes: z.string().optional(),
});

// Get single petition
export async function GET(
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
    const { id } = params;
    
    const petition = await prisma.petition.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
    
    if (!petition) {
      return NextResponse.json(
        { error: "Petition not found" },
        { status: 404 }
      );
    }
    
    // Students can only see their own petitions
    if (user.role !== "admin" && petition.userId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }
    
    return NextResponse.json({ petition });
  } catch (error) {
    console.error("Error fetching petition:", error);
    return NextResponse.json(
      { error: "Failed to fetch petition" },
      { status: 500 }
    );
  }
}

// Review petition (admin only)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const params = await context.params;
    const { id } = params;
    const body = await request.json();
    const data = ReviewPetitionSchema.parse(body);
    
    const petition = await prisma.petition.update({
      where: { id },
      data: {
        status: data.status,
        reviewNotes: data.reviewNotes,
        reviewedAt: new Date(),
        reviewedBy: user.id,
      },
    });
    
    // If approved, create draft opportunity (admin can edit before publishing)
    if (data.status === "approved" && petition.aiExtracted) {
      // Extract AI data if available
      const aiData = petition.aiExtracted as any;
      
      // Create opportunity and edition (admin will review/edit)
      // This is a simplified version - in production, you'd have a more sophisticated flow
      try {
        const slug = petition.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        
        await prisma.opportunity.create({
          data: {
            slug: `${slug}-${Date.now()}`,
            name: petition.title,
            type: aiData.type || "program",
            modality: aiData.modality || "online",
            structure: aiData.structure || "either",
            geography: aiData.geography || "global",
            website: petition.url,
            description: petition.description || aiData.description,
            editions: {
              create: {
                cycle: new Date().getFullYear().toString(),
                status: "unknown",
                // Admin will fill in dates
              },
            },
          },
        });
      } catch (err) {
        console.error("Error creating opportunity from petition:", err);
        // Don't fail the petition approval if opportunity creation fails
      }
    }
    
    return NextResponse.json({ petition });
  } catch (error) {
    console.error("Error reviewing petition:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid review data", details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to review petition" },
      { status: 500 }
    );
  }
}

