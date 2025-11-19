import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "admin" && user.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Get advisory students (accepted)
  const advisorySetting = await prisma.settings.findUnique({
    where: { key: `advisory_students_${user.id}` },
  });

  const studentIds = advisorySetting?.value ? JSON.parse(advisorySetting.value) : [];
  
  const students = await prisma.user.findMany({
    where: {
      id: { in: studentIds },
      role: "student",
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  });

  // Get pending requests
  const pendingRequests = await prisma.settings.findMany({
    where: {
      key: {
        startsWith: `advisory_request_${user.id}_`,
      },
    },
  });

  return NextResponse.json({
    students,
    pendingRequests: pendingRequests.map((req) => ({
      email: req.key.replace(`advisory_request_${user.id}_`, ""),
      createdAt: req.createdAt,
    })),
  });
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
  const { email } = body;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  // Check if student exists
  const student = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!student || student.role !== "student") {
    return NextResponse.json(
      { error: "No student found with this email" },
      { status: 404 }
    );
  }

  // Check if already in advisory
  const advisorySetting = await prisma.settings.findUnique({
    where: { key: `advisory_students_${user.id}` },
  });

  const studentIds = advisorySetting?.value ? JSON.parse(advisorySetting.value) : [];
  if (studentIds.includes(student.id)) {
    return NextResponse.json(
      { error: "Student is already in your advisory" },
      { status: 400 }
    );
  }

  // Check if request already exists
  const existingRequest = await prisma.settings.findUnique({
    where: { key: `advisory_request_${user.id}_${email.toLowerCase().trim()}` },
  });

  if (existingRequest) {
    return NextResponse.json(
      { error: "Request already sent to this student" },
      { status: 400 }
    );
  }

  // Create pending request
  await prisma.settings.create({
    data: {
      key: `advisory_request_${user.id}_${email.toLowerCase().trim()}`,
      value: student.id,
    },
  });

  // TODO: Send notification to student to accept/decline

  return NextResponse.json({ success: true, message: "Advisory request sent" });
}

