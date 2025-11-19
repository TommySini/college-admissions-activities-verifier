import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json({ error: "Key parameter required" }, { status: 400 });
    }

    const setting = await prisma.settings.findUnique({
      where: { key },
    });

    return NextResponse.json({ 
      value: setting?.value || "false",
      exists: !!setting 
    });
  } catch (error) {
    console.error("Error fetching setting:", error);
    return NextResponse.json(
      { error: "Failed to fetch setting" },
      { status: 500 }
    );
  }
}

