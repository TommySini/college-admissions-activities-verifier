import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizations = await prisma.organization.findMany({
      where: { createdById: user.id },
      orderBy: { createdAt: "desc" },
    } as any);

    return NextResponse.json({ organizations });
  } catch (error) {
    console.error("[GET /api/organizations] Error:", error);
    return NextResponse.json(
      { error: "Failed to load organizations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      category,
      leadership,
      presidentName,
      isSchoolClub,
      contactEmail,
    } = body;

    if (!name || typeof name !== "string" || name.trim().length < 3) {
      return NextResponse.json(
        { error: "Organization name must be at least 3 characters" },
        { status: 400 }
      );
    }

    const isSchoolClubValue =
      typeof isSchoolClub === "string"
        ? ["true", "yes", "on", "1"].includes(isSchoolClub.toLowerCase())
        : Boolean(isSchoolClub);

    const organization = await prisma.organization.create({
      data: {
        name: name.trim(),
        description: description ? String(description).trim() : null,
        category: category ? String(category).trim() : null,
        leadership: leadership ? String(leadership).trim() : null,
        presidentName: presidentName ? String(presidentName).trim() : null,
        isSchoolClub: isSchoolClubValue,
        contactEmail: contactEmail ? String(contactEmail).trim() : user.email,
        createdById: user.id,
      } as any,
    });

    return NextResponse.json({ organization });
  } catch (error) {
    console.error("[POST /api/organizations] Error:", error);
    return NextResponse.json(
      { error: "Failed to submit organization" },
      { status: 500 }
    );
  }
}

