import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { parseApplicationFile } from "@/lib/alumni/parse";

/**
 * GET /api/alumni/applications
 * List applications with filters
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const alumniId = searchParams.get("alumniId");

    const where: any = {};
    if (alumniId) {
      where.alumniId = alumniId;
    }

    const applications = await prisma.alumniApplication.findMany({
      where,
      include: {
        alumniProfile: {
          select: {
            id: true,
            privacy: true,
            displayName: true,
            intendedMajor: true,
          },
        },
        extractedActivities: true,
        extractedEssays: true,
        admissionResults: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ applications });
  } catch (error) {
    console.error("[GET /api/alumni/applications] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch applications" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/alumni/applications
 * Create application and upload file
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure user has an alumni profile
    let profile = await prisma.alumniProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      // Create default profile
      profile = await prisma.alumniProfile.create({
        data: {
          userId: user.id,
          privacy: "ANONYMOUS",
        },
      });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size (10MB limit)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    // Validate mime type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload PDF, DOCX, or TXT." },
        { status: 400 }
      );
    }

    // Save file to disk
    const uploadsDir = join(process.cwd(), "public", "uploads", "alumni");
    await mkdir(uploadsDir, { recursive: true });

    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filepath = join(uploadsDir, filename);
    const fileUrl = `/uploads/alumni/${filename}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Create application record
    const application = await prisma.alumniApplication.create({
      data: {
        alumniId: profile.id,
        sourceFileUrl: fileUrl,
        sourceFileMime: file.type,
        parseStatus: "pending",
      },
    });

    // Trigger parsing asynchronously (don't await)
    parseApplicationFile(application.id, filepath, file.type).catch((error) => {
      console.error(`[POST /api/alumni/applications] Parse error for ${application.id}:`, error);
    });

    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/alumni/applications] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create application" },
      { status: 500 }
    );
  }
}

