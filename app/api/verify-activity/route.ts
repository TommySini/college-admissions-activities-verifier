import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Handle verification response from email link
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

