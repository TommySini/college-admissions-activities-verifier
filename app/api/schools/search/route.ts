import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Search schools for autocomplete
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get("q");
    
    if (!q || q.length < 2) {
      return NextResponse.json({ schools: [] });
    }
    
    const schools = await prisma.school.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { city: { contains: q, mode: "insensitive" } },
          { state: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        country: true,
      },
      take: 10,
      orderBy: {
        name: "asc",
      },
    });
    
    return NextResponse.json({ schools });
  } catch (error) {
    console.error("Error searching schools:", error);
    return NextResponse.json(
      { error: "Failed to search schools" },
      { status: 500 }
    );
  }
}

