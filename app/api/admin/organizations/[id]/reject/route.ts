"use server";

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrganizationStatus } from "@prisma/client";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Check if organization exists first
    const existing = await prisma.organization.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // If already rejected, return as-is
    if (existing.status === OrganizationStatus.REJECTED) {
      return NextResponse.json({ organization: existing });
    }

    const organization = await prisma.organization.update({
      where: { id },
      data: { status: OrganizationStatus.REJECTED },
    });

    return NextResponse.json({ organization });
  } catch (error) {
    console.error("[POST /api/admin/organizations/:id/reject] Error:", error);
    return NextResponse.json(
      { error: "Failed to reject organization" },
      { status: 500 }
    );
  }
}

