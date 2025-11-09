import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Export all student data as CSV
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can access this endpoint" },
        { status: 403 }
      );
    }

    // Get all students with their activities
    const students = await prisma.user.findMany({
      where: {
        role: "student",
      },
      include: {
        activities: {
          include: {
            verification: {
              include: {
                verifier: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Build CSV content
    const csvRows: string[] = [];

    // Header row
    csvRows.push(
      "Student Name,Student Email,Activity Name,Category,Description,Start Date,End Date,Status,Verification Status,Verifier Name,Verifier Email,Verified Date"
    );

    // Data rows
    students.forEach((student) => {
      if (student.activities.length === 0) {
        // Include students with no activities
        csvRows.push(
          `"${student.name}","${student.email}","","","","","","","","","",""`
        );
      } else {
        student.activities.forEach((activity) => {
          const verificationStatus =
            activity.verification?.status || activity.status || "pending";
          const verifierName =
            activity.verification?.verifier?.name || "";
          const verifierEmail =
            activity.verification?.verifier?.email || "";
          const verifiedDate = activity.verification?.updatedAt
            ? new Date(activity.verification.updatedAt).toISOString()
            : "";

          csvRows.push(
            `"${student.name}","${student.email}","${activity.name}","${activity.category}","${(activity.description || "").replace(/"/g, '""')}","${activity.startDate}","${activity.endDate || ""}","${activity.status}","${verificationStatus}","${verifierName}","${verifierEmail}","${verifiedDate}"`
          );
        });
      }
    });

    const csvContent = csvRows.join("\n");

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="actify-student-data-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting data:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}

