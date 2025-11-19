import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Store dismissal in settings with user-specific key
    const settingKey = `admin_welcome_dismissed_${user.id}`;
    await prisma.settings.upsert({
      where: { key: settingKey },
      update: { value: "true" },
      create: { key: settingKey, value: "true" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error dismissing welcome notification:", error);
    return NextResponse.json(
      { error: "Failed to dismiss notification" },
      { status: 500 }
    );
  }
}

