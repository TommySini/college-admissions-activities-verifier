import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { normalizeEdition } from "@/lib/normalize";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const params = await context.params;
    const { slug } = params;
    const user = await getCurrentUser();
    
    // Fetch opportunity with current/next edition
    const opportunity = await prisma.opportunity.findUnique({
      where: { slug },
      include: {
        provider: true,
        location: true,
        domains: {
          include: {
            domain: true,
          },
        },
        editions: {
          where: {
            OR: [
              { status: "open" },
              { status: "upcoming" },
            ],
          },
          orderBy: [
            { status: "asc" }, // open first
            { applicationOpens: "asc" },
          ],
          take: 1,
          include: {
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
        },
      },
    });
    
    if (!opportunity) {
      return NextResponse.json(
        { error: "Opportunity not found" },
        { status: 404 }
      );
    }
    
    // Get the current edition (or null if none active)
    const currentEdition = opportunity.editions[0] 
      ? normalizeEdition(opportunity.editions[0])
      : null;
    
    return NextResponse.json({
      opportunity,
      currentEdition,
    });
  } catch (error) {
    console.error("Error fetching opportunity:", error);
    return NextResponse.json(
      { error: "Failed to fetch opportunity" },
      { status: 500 }
    );
  }
}

