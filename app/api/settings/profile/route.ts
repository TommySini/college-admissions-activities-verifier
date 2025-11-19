import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user || (user.role !== "admin" && user.role !== "teacher")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (name.length > 80) {
    return NextResponse.json({ error: "Name must be under 80 characters" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { name },
  });

  return NextResponse.json({ success: true, name });
}


