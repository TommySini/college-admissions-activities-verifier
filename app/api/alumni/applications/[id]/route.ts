import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Apply privacy filtering to application detail
 */
function applyPrivacyFilter(application: any) {
  const profile = application.alumniProfile;
  
  const filtered: any = {
    id: application.id,
    parseStatus: application.parseStatus,
    parseError: application.parseError,
    createdAt: application.createdAt,
    profile: {
      id: profile.id,
      privacy: profile.privacy,
      intendedMajor: profile.intendedMajor,
      careerInterestTags: profile.careerInterestTags ? JSON.parse(profile.careerInterestTags) : [],
      displayName: null as string | null,
      contactEmail: null as string | null,
    },
    activities: application.extractedActivities,
    essays: application.extractedEssays.map((essay: any) => ({
      ...essay,
      tags: essay.tags ? JSON.parse(essay.tags) : [],
    })),
    awards: application.extractedAwards,
    results: application.admissionResults,
  };

  if (profile.privacy === "PSEUDONYM" || profile.privacy === "FULL") {
    filtered.profile.displayName = profile.displayName;
  }

  if (profile.privacy === "FULL") {
    filtered.profile.contactEmail = profile.contactEmail;
  }

  return filtered;
}

/**
 * GET /api/alumni/applications/[id]
 * Fetch application detail with privacy filtering
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const application = await prisma.alumniApplication.findUnique({
      where: { id },
      include: {
        alumniProfile: true,
        extractedActivities: true,
        extractedEssays: true,
        extractedAwards: true,
        admissionResults: true,
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Apply privacy filtering
    const filtered = applyPrivacyFilter(application);

    return NextResponse.json({ application: filtered });
  } catch (error) {
    console.error("[GET /api/alumni/applications/:id] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch application" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/alumni/applications/[id]
 * Delete application (owner or admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const application = await prisma.alumniApplication.findUnique({
      where: { id },
      include: { alumniProfile: true },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Check ownership or admin
    const isOwner = application.alumniProfile.userId === user.id;
    const isAdmin = user.role === "admin";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.alumniApplication.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/alumni/applications/:id] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete application" },
      { status: 500 }
    );
  }
}

