import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, startTime, endTime, date, isRecurring } = body;

    if (!title || !description || !startTime || !endTime || !date) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Combine date and time to create DateTime
    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);

    // If recurring, set endDate to null and isOngoing to true
    // Otherwise, use the date as both start and end
    const endDate = isRecurring ? null : new Date(date);
    const isOngoing = isRecurring;

    // Create opportunity with "pending" status
    const opportunity = await prisma.volunteeringOpportunity.create({
      data: {
        title,
        description,
        organization: user.name || "Unknown", // Use user's name as organization for now
        category: "Community Service", // Default category
        startDate: startDateTime,
        endDate: endDate,
        isOngoing,
        status: "pending",
        postedById: user.id,
      },
    });

    return NextResponse.json({ 
      success: true, 
      opportunity 
    });
  } catch (error: any) {
    console.error("Error creating opportunity request:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit opportunity request" },
      { status: 500 }
    );
  }
}

