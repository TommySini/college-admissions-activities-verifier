import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Get verifications for current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let verifications;

    if (user.profileType === "Organization") {
      verifications = await prisma.verification.findMany({
        where: { organizationId: user.id },
        include: {
          applicant: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      verifications = await prisma.verification.findMany({
        where: {
          OR: [
            { applicantId: user.id },
            { applicantEmail: user.email },
          ],
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json({ verifications });
  } catch (error) {
    console.error("Error fetching verifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch verifications" },
      { status: 500 }
    );
  }
}

// POST - Create new verification
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.profileType !== "Organization") {
      return NextResponse.json(
        { error: "Only organizations can create verifications" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { applicantEmail, title, description, startDate, endDate, position, category } = body;

    if (!applicantEmail || !title || !startDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Try to find applicant by email
    const applicant = await prisma.user.findUnique({
      where: { email: applicantEmail },
    });

    const verification = await prisma.verification.create({
      data: {
        organizationId: user.id,
        applicantId: applicant?.id,
        applicantEmail,
        title,
        description,
        startDate,
        endDate,
        position,
        category,
        status: "pending",
      },
      include: {
        applicant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ verification }, { status: 201 });
  } catch (error) {
    console.error("Error creating verification:", error);
    return NextResponse.json(
      { error: "Failed to create verification" },
      { status: 500 }
    );
  }
}

