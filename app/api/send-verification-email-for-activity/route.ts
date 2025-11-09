import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST - Send verification email for an existing activity
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { activityId, verifierEmail } = body;

    if (!activityId || !verifierEmail) {
      return NextResponse.json(
        { error: "Missing required fields" },
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

    // Verify the user owns this activity
    if (activity.studentId !== user.id && user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Update activity with verifier email if not set
    if (!activity.supervisorEmail) {
      await prisma.activity.update({
        where: { id: activityId },
        data: { supervisorEmail: verifierEmail },
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    // Send the verification email
    const emailResponse = await fetch(`${baseUrl}/api/send-verification-request-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: verifierEmail,
        studentName: activity.student.name,
        studentEmail: activity.student.email,
        activityName: activity.name,
        activityDescription: activity.description,
        activityCategory: activity.category,
        activityOrganization: activity.organization,
        activityStartDate: activity.startDate,
        activityEndDate: activity.endDate,
        activityId: activity.id,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      return NextResponse.json(
        { error: emailData.error || "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification email sent successfully",
    });
  } catch (error) {
    console.error("Error sending verification email:", error);
    return NextResponse.json(
      { error: "Failed to send verification email" },
      { status: 500 }
    );
  }
}

