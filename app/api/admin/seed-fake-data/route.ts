import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "admin" && user.role !== "teacher")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create a fake student
    const fakeStudent = await prisma.user.upsert({
      where: { email: `fake-student-${user.id}@example.com` },
      update: {},
      create: {
        email: `fake-student-${user.id}@example.com`,
        name: "Alex Johnson",
        role: "student",
      },
    });

    // Create a fake organization
    const fakeOrg = await prisma.organization.create({
      data: {
        name: "Debate Club",
        description: "A competitive debate team that participates in local and regional tournaments. We focus on developing critical thinking, public speaking, and research skills.",
        category: "Academic",
        presidentName: "Sarah Chen",
        isSchoolClub: true,
        contactEmail: user.email,
        status: "APPROVED",
        createdById: user.id,
      } as any,
    });

    // Link organization to teacher via Settings
    const teacherOrgsKey = `teacher_organizations_${user.id}`;
    const existingOrgsSetting = await prisma.settings.findUnique({
      where: { key: teacherOrgsKey },
    });

    const orgIds = existingOrgsSetting?.value 
      ? JSON.parse(existingOrgsSetting.value) 
      : [];
    
    if (!orgIds.includes(fakeOrg.id)) {
      orgIds.push(fakeOrg.id);
      await prisma.settings.upsert({
        where: { key: teacherOrgsKey },
        update: { value: JSON.stringify(orgIds) },
        create: { key: teacherOrgsKey, value: JSON.stringify(orgIds) },
      });
    }

    // Add student to advisory via Settings
    const advisoryKey = `advisory_students_${user.id}`;
    const existingAdvisory = await prisma.settings.findUnique({
      where: { key: advisoryKey },
    });

    const studentIds = existingAdvisory?.value 
      ? JSON.parse(existingAdvisory.value) 
      : [];
    
    if (!studentIds.includes(fakeStudent.id)) {
      studentIds.push(fakeStudent.id);
      await prisma.settings.upsert({
        where: { key: advisoryKey },
        update: { value: JSON.stringify(studentIds) },
        create: { key: advisoryKey, value: JSON.stringify(studentIds) },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Fake data created successfully",
      organization: {
        id: fakeOrg.id,
        name: fakeOrg.name,
      },
      student: {
        id: fakeStudent.id,
        name: fakeStudent.name,
        email: fakeStudent.email,
      },
    });
  } catch (error) {
    console.error("[POST /api/admin/seed-fake-data] Error:", error);
    return NextResponse.json(
      { error: "Failed to create fake data" },
      { status: 500 }
    );
  }
}

