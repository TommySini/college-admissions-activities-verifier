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

    // Allow updating status or other fields
    const updateData: any = {};
    
    if (body.status && ["accepted", "rejected", "pending"].includes(body.status)) {
      updateData.status = body.status;
    }
    
    // Check authorization
    const isApplicant = 
      (verification.applicantId && verification.applicantId === user.id) ||
      verification.applicantEmail.toLowerCase() === user.email.toLowerCase();
    const isOrganization = user.profileType === "Organization" && verification.organizationId === user.id;
    
    if (!isApplicant && !isOrganization) {
      return NextResponse.json(
        { error: "Unauthorized - You can only update your own verifications" },
        { status: 403 }
      );
    }
    
    // Allow organizations to update verification details
    if (isOrganization) {
      if (body.title !== undefined) updateData.title = body.title;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.startDate !== undefined) updateData.startDate = body.startDate;
      if (body.endDate !== undefined) updateData.endDate = body.endDate;
      if (body.position !== undefined) updateData.position = body.position;
      if (body.category !== undefined) updateData.category = body.category;
    }
    
    // Only allow status updates for applicants
    if (isApplicant && !body.status) {
      return NextResponse.json(
        { error: "Applicants can only update verification status" },
        { status: 403 }
      );
    }
    
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // If applicant is updating status, link the applicantId
    if (isApplicant && updateData.status) {
      updateData.applicantId = user.id;
    }

    // Update verification
    const updated = await prisma.verification.update({
      where: { id },
      data: updateData,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

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
    // Organizations can delete verifications they sent
    // Applicants can delete verifications they received
    const isAuthorized =
      (user.profileType === "Organization" && verification.organizationId === user.id) ||
      (verification.applicantId === user.id) ||
      (verification.applicantEmail.toLowerCase() === user.email.toLowerCase());

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

