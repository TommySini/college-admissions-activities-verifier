import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    
    // Verify the organization exists and is approved (students can only see approved orgs)
    const organization = await prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Students can only see events for approved organizations
    if (user.role === "student" && organization.status !== "APPROVED") {
      return NextResponse.json({ error: "Organization not available" }, { status: 403 });
    }

    // Get events from Settings table (stored as JSON array)
    const eventsSetting = await prisma.settings.findUnique({
      where: { key: `organization_events_${id}` },
    });

    const events = eventsSetting?.value ? JSON.parse(eventsSetting.value) : [];

    // Separate into upcoming and past
    const now = new Date();
    const upcomingEvents = events.filter((event: any) => {
      const eventDate = new Date(event.date);
      return eventDate >= now;
    }).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const pastEvents = events.filter((event: any) => {
      const eventDate = new Date(event.date);
      return eventDate < now;
    }).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      events: [...upcomingEvents.map((e: any) => ({ ...e, type: "upcoming" })), ...pastEvents.map((e: any) => ({ ...e, type: "past" }))],
      upcoming: upcomingEvents,
      past: pastEvents,
      organization: {
        id: organization.id,
        name: organization.name,
        status: organization.status,
      },
    });
  } catch (error) {
    console.error("[GET /api/organizations/[id]/events] Error:", error);
    return NextResponse.json(
      { error: "Failed to load events" },
      { status: 500 }
    );
  }
}

