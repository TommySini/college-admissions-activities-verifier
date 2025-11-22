import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const COLLEGE_COUNSELOR_CODE = "ATD8234";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "admin" && user.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const setting = await prisma.settings.findUnique({
    where: { key: `admin_subrole_${user.id}` },
  });

  // Default to "teacher" if not set
  const adminSubRole = setting?.value || "teacher";

  return NextResponse.json({ adminSubRole });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "admin" && user.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { adminSubRole, code } = body;

  if (!adminSubRole || !["teacher", "college_counselor"].includes(adminSubRole)) {
    return NextResponse.json({ error: "Invalid admin sub-role" }, { status: 400 });
  }

  // If changing to college counselor, require code
  if (adminSubRole === "college_counselor") {
    if (!code || code !== COLLEGE_COUNSELOR_CODE) {
      return NextResponse.json(
        { error: "Invalid code. Please contact developers for the College Counselor access code." },
        { status: 403 }
      );
    }
  }

  // Save the admin sub-role
  await prisma.settings.upsert({
    where: { key: `admin_subrole_${user.id}` },
    update: { value: adminSubRole },
    create: { key: `admin_subrole_${user.id}`, value: adminSubRole },
  });

  return NextResponse.json({ adminSubRole, success: true });
}


