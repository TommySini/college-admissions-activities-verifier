import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Handle verification response from email link (for users without accounts)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const activityId = searchParams.get("activityId");
    const action = searchParams.get("action"); // "accept" or "reject"

    if (!activityId || !action) {
      return NextResponse.redirect(new URL("/?error=missing_params", request.url));
    }

    if (action !== "accept" && action !== "reject") {
      return NextResponse.redirect(new URL("/?error=invalid_action", request.url));
    }

    // Find the activity
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        student: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!activity) {
      return NextResponse.redirect(new URL("/?error=activity_not_found", request.url));
    }

    // Check if verification already exists
    let verification = await prisma.verification.findUnique({
      where: { activityId },
    });

    if (verification && verification.status !== "pending") {
      // Already verified/rejected
      return NextResponse.redirect(
        new URL(`/?message=already_${verification.status}`, request.url)
      );
    }

    // Find or create verifier user by email
    // For now, we'll use the supervisorEmail to find/create a verifier
    let verifier = null;
    if (activity.supervisorEmail) {
      verifier = await prisma.user.findUnique({
        where: { email: activity.supervisorEmail },
      });

      // If verifier doesn't exist, create a temporary verifier account
      // In production, you might want to require them to sign up first
      if (!verifier) {
        verifier = await prisma.user.create({
          data: {
            email: activity.supervisorEmail,
            name: activity.supervisorEmail.split("@")[0], // Use email prefix as name
            role: "verifier",
          },
        });
      }
    }

    if (!verifier) {
      return NextResponse.redirect(new URL("/?error=verifier_not_found", request.url));
    }

    const status = action === "accept" ? "verified" : "denied";

    // Create or update verification
    if (verification) {
      verification = await prisma.verification.update({
        where: { id: verification.id },
        data: {
          status,
        },
      });
    } else {
      verification = await prisma.verification.create({
        data: {
          activityId: activity.id,
          verifierId: verifier.id,
          studentId: activity.studentId,
          status,
          verifierNotes: action === "accept" 
            ? "Verified via email link" 
            : "Rejected via email link",
        },
      });
    }

    // Update activity status
    await prisma.activity.update({
      where: { id: activity.id },
      data: {
        status: status === "verified" ? "verified" : "denied",
      },
    });

    // Send notification email to student
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
      
      await fetch(`${baseUrl}/api/send-student-notification-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: activity.student.email,
          studentName: activity.student.name,
          activityName: activity.name,
          activityDescription: activity.description,
          activityCategory: activity.category,
          activityOrganization: activity.organization,
          verifierName: verifier.name,
          status: status,
          dashboardUrl: `${baseUrl}/activities`,
        }),
      });
    } catch (emailError) {
      console.error("Error sending notification email:", emailError);
      // Don't fail the verification if email fails
    }

    // Redirect to a success page
    return NextResponse.redirect(
      new URL(
        `/verify-response?status=${status}&activity=${activity.name}&student=${activity.student.name}`,
        request.url
      )
    );
  } catch (error) {
    console.error("Error processing verification:", error);
    return NextResponse.redirect(new URL("/?error=verification_failed", request.url));
  }
}

// POST - Handle verification from logged-in verifier (from dashboard)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "verifier" && user.role !== "admin") {
      return NextResponse.json(
        { error: "Only verifiers can verify activities" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { activityId, action } = body;

    if (!activityId || !action) {
      return NextResponse.json(
        { error: "Missing activityId or action" },
        { status: 400 }
      );
    }

    if (action !== "accept" && action !== "reject") {
      return NextResponse.json(
        { error: "Invalid action. Must be 'accept' or 'reject'" },
        { status: 400 }
      );
    }

    // Find the activity
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        student: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!activity) {
      return NextResponse.json(
        { error: "Activity not found" },
        { status: 404 }
      );
    }

    // Verify that the logged-in user's email matches the supervisorEmail
    if (activity.supervisorEmail !== user.email) {
      return NextResponse.json(
        { error: "You are not authorized to verify this activity" },
        { status: 403 }
      );
    }

    // Check if verification already exists
    let verification = await prisma.verification.findUnique({
      where: { activityId },
    });

    const status = action === "accept" ? "verified" : "denied";

    // Create or update verification
    if (verification) {
      verification = await prisma.verification.update({
        where: { id: verification.id },
        data: {
          status,
          verifierNotes: action === "accept" 
            ? "Verified via dashboard" 
            : "Rejected via dashboard",
        },
      });
    } else {
      verification = await prisma.verification.create({
        data: {
          activityId: activity.id,
          verifierId: user.id,
          studentId: activity.studentId,
          status,
          verifierNotes: action === "accept" 
            ? "Verified via dashboard" 
            : "Rejected via dashboard",
        },
      });
    }

    // Update activity status
    await prisma.activity.update({
      where: { id: activity.id },
      data: {
        status: status === "verified" ? "verified" : "denied",
      },
    });

    // Send notification email to student
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
      
      await fetch(`${baseUrl}/api/send-student-notification-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: activity.student.email,
          studentName: activity.student.name,
          activityName: activity.name,
          activityDescription: activity.description,
          activityCategory: activity.category,
          activityOrganization: activity.organization,
          verifierName: user.name,
          status: status,
          dashboardUrl: `${baseUrl}/activities`,
        }),
      });
    } catch (emailError) {
      console.error("Error sending notification email:", emailError);
      // Don't fail the verification if email fails
    }

    return NextResponse.json({
      success: true,
      message: `Activity ${status === "verified" ? "verified" : "rejected"} successfully`,
      verification,
    });
  } catch (error) {
    console.error("Error processing verification:", error);
    return NextResponse.json(
      { error: "Failed to process verification" },
      { status: 500 }
    );
  }
}
