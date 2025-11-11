import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AlumniPrivacy } from "@prisma/client";

/**
 * Apply privacy filtering to profile data
 */
function applyPrivacyFilter(profile: any) {
  const filtered = {
    id: profile.id,
    privacy: profile.privacy,
    intendedMajor: profile.intendedMajor,
    careerInterestTags: profile.careerInterestTags ? JSON.parse(profile.careerInterestTags) : [],
    displayName: null as string | null,
    contactEmail: null as string | null,
  };

  if (profile.privacy === "PSEUDONYM" || profile.privacy === "FULL") {
    filtered.displayName = profile.displayName;
  }

  if (profile.privacy === "FULL") {
    filtered.contactEmail = profile.contactEmail;
  }

  return filtered;
}

/**
 * GET /api/alumni/profiles
 * List alumni profiles with privacy-aware filtering
 * Query params: major, tags (comma-separated), rankBucket, decision, search
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const major = searchParams.get("major");
    const tags = searchParams.get("tags");
    const rankBucket = searchParams.get("rankBucket");
    const decision = searchParams.get("decision");
    const search = searchParams.get("search");

    // Build where clause
    const where: any = {};

    if (major) {
      where.intendedMajor = { contains: major, mode: "insensitive" };
    }

    if (tags) {
      const tagList = tags.split(",").map((t) => t.trim());
      where.careerInterestTags = {
        contains: tagList[0], // Simple search for first tag (SQLite limitation)
      };
    }

    // Fetch profiles with applications and results
    const profiles = await prisma.alumniProfile.findMany({
      where,
      include: {
        applications: {
          include: {
            admissionResults: true,
            extractedActivities: true,
            extractedEssays: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Filter by admission criteria if specified
    let filteredProfiles = profiles;

    if (rankBucket || decision) {
      filteredProfiles = profiles.filter((profile) => {
        return profile.applications.some((app) => {
          return app.admissionResults.some((result) => {
            const matchesRank = rankBucket ? result.rankBucket === rankBucket : true;
            const matchesDecision = decision ? result.decision === decision : true;
            return matchesRank && matchesDecision;
          });
        });
      });
    }

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filteredProfiles = filteredProfiles.filter((profile) => {
        const majorMatch = profile.intendedMajor?.toLowerCase().includes(searchLower);
        const tagsMatch = profile.careerInterestTags?.toLowerCase().includes(searchLower);
        const displayNameMatch = profile.displayName?.toLowerCase().includes(searchLower);
        return majorMatch || tagsMatch || displayNameMatch;
      });
    }

    // Apply privacy filtering
    const publicProfiles = filteredProfiles.map((profile) => ({
      ...applyPrivacyFilter(profile),
      applications: profile.applications.map((app) => ({
        id: app.id,
        parseStatus: app.parseStatus,
        createdAt: app.createdAt,
        activitiesCount: app.extractedActivities.length,
        essaysCount: app.extractedEssays.length,
        resultsCount: app.admissionResults.length,
        results: app.admissionResults.map((r) => ({
          collegeName: r.collegeName,
          decision: r.decision,
          decisionRound: r.decisionRound,
          rankBucket: r.rankBucket,
        })),
      })),
    }));

    return NextResponse.json({ profiles: publicProfiles });
  } catch (error) {
    console.error("[GET /api/alumni/profiles] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch profiles" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/alumni/profiles
 * Create or update current user's alumni profile
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { privacy, displayName, contactEmail, intendedMajor, careerInterestTags } = body;

    // Validate privacy
    if (privacy && !["ANONYMOUS", "PSEUDONYM", "FULL"].includes(privacy)) {
      return NextResponse.json({ error: "Invalid privacy setting" }, { status: 400 });
    }

    // Check if profile exists
    const existing = await prisma.alumniProfile.findUnique({
      where: { userId: user.id },
    });

    const data: any = {};
    if (privacy) data.privacy = privacy as AlumniPrivacy;
    if (displayName !== undefined) data.displayName = displayName;
    if (contactEmail !== undefined) data.contactEmail = contactEmail;
    if (intendedMajor !== undefined) data.intendedMajor = intendedMajor;
    if (careerInterestTags !== undefined) {
      data.careerInterestTags = Array.isArray(careerInterestTags)
        ? JSON.stringify(careerInterestTags)
        : careerInterestTags;
    }

    let profile;
    if (existing) {
      profile = await prisma.alumniProfile.update({
        where: { userId: user.id },
        data,
      });
    } else {
      profile = await prisma.alumniProfile.create({
        data: {
          userId: user.id,
          ...data,
        },
      });
    }

    return NextResponse.json({ profile: applyPrivacyFilter(profile) });
  } catch (error) {
    console.error("[POST /api/alumni/profiles] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save profile" },
      { status: 500 }
    );
  }
}

