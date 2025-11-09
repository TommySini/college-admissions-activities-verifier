import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH - Update verification status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Check if verification exists first
    const verification = await prisma.verification.findUnique({
      where: { id },
    });

    if (!verification) {
      return NextResponse.json(
        { error: "Verification not found" },
        { status: 404 }
      );
    }

    // Get full verification with relations
    const fullVerification = await prisma.verification.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        verifier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        activity: {
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            organization: true,
          },
        },
      },
    });

    if (!fullVerification) {
      return NextResponse.json(
        { error: "Verification not found" },
        { status: 404 }
      );
    }

    // Allow updating status or other fields
    const updateData: any = {};
    const oldStatus = verification.status;
    
    // Map status values: "accepted" -> "verified", "rejected" -> "denied"
    if (body.status) {
      if (body.status === "accepted") {
        updateData.status = "verified";
      } else if (body.status === "rejected") {
        updateData.status = "denied";
      } else if (["pending", "verified", "denied"].includes(body.status)) {
        updateData.status = body.status;
      }
    }
    
    // Check authorization - students can accept/reject verifications sent to them
    // Verifiers can update verifications they issued
    const isStudent = verification.studentId === user.id;
    const isVerifier = verification.verifierId === user.id || (user.role === "verifier" || user.role === "admin");
    
    if (!isStudent && !isVerifier) {
      return NextResponse.json(
        { error: "Unauthorized - You can only update your own verifications" },
        { status: 403 }
      );
    }
    
    // Students can only update status (accept/reject)
    if (isStudent && !body.status) {
      return NextResponse.json(
        { error: "Students can only update verification status" },
        { status: 403 }
      );
    }
    
    // Verifiers can update notes
    if (isVerifier && body.verifierNotes !== undefined) {
      updateData.verifierNotes = body.verifierNotes;
    }
    
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Update verification
    const updated = await prisma.verification.update({
      where: { id },
      data: updateData,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        verifier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        activity: {
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            organization: true,
          },
        },
      },
    });

    // Update activity status if verification status changed
    if (updateData.status && updateData.status !== oldStatus) {
      await prisma.activity.update({
        where: { id: verification.activityId },
        data: {
          status: updateData.status === "verified" ? "verified" : "denied",
        },
      });

      // Send notification email to student when verifier changes status
      if (isVerifier && updateData.status !== "pending") {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
            (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
          
          await fetch(`${baseUrl}/api/send-student-notification-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: fullVerification.student.email,
              studentName: fullVerification.student.name,
              activityName: fullVerification.activity.name,
              activityDescription: fullVerification.activity.description,
              activityCategory: fullVerification.activity.category,
              activityOrganization: fullVerification.activity.organization,
              verifierName: fullVerification.verifier.name,
              status: updateData.status,
              dashboardUrl: `${baseUrl}/dashboard`,
            }),
          });
        } catch (emailError) {
          console.error("Error sending notification email:", emailError);
          // Don't fail the update if email fails
        }
      }
    }

    return NextResponse.json({ verification: updated });
  } catch (error) {
    console.error("Error updating verification:", error);
    return NextResponse.json(
      { error: "Failed to update verification" },
      { status: 500 }
    );
  }
}

// DELETE - Delete verification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if verification exists
    const verification = await prisma.verification.findUnique({
      where: { id },
    });

    if (!verification) {
      return NextResponse.json(
        { error: "Verification not found" },
        { status: 404 }
      );
    }

    // Check if user is authorized to delete
    // Verifiers can delete verifications they issued
    // Students can delete verifications sent to them
    const isAuthorized =
      verification.verifierId === user.id ||
      verification.studentId === user.id ||
      (user.role === "admin");

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized - You can only delete your own verifications" },
        { status: 403 }
      );
    }

    await prisma.verification.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Verification deleted" });
  } catch (error) {
    console.error("Error deleting verification:", error);
    return NextResponse.json(
      { error: "Failed to delete verification" },
      { status: 500 }
    );
  }
}

