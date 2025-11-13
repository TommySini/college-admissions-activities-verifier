import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const CreatePetitionSchema = z.object({
  title: z.string().min(3).max(200),
  url: z.string().url(),
  description: z.string().max(1000).optional(),
  evidenceUrl: z.string().url().optional(),
});

// List petitions (admin only)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    
    const petitions = await prisma.petition.findMany({
      where: status ? { status: status as any } : undefined,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    
    return NextResponse.json({ petitions });
  } catch (error) {
    console.error("Error fetching petitions:", error);
    return NextResponse.json(
      { error: "Failed to fetch petitions" },
      { status: 500 }
    );
  }
}

// Create petition (student)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const data = CreatePetitionSchema.parse(body);
    
    const petition = await prisma.petition.create({
      data: {
        ...data,
        userId: user.id,
        status: "pending",
      },
    });
    
    return NextResponse.json({ petition }, { status: 201 });
  } catch (error) {
    console.error("Error creating petition:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid petition data", details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to create petition" },
      { status: 500 }
    );
  }
}

