import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "admin" && user.role !== "teacher")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    
    // Verify the organization exists
    const organization = await prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
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
    });
  } catch (error) {
    console.error("[GET /api/admin/organizations/[id]/events] Error:", error);
    return NextResponse.json(
      { error: "Failed to load events" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "admin" && user.role !== "teacher")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    
    // Verify the organization exists
    const organization = await prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, date, time, location } = body;

    if (!title || !date || !time) {
      return NextResponse.json(
        { error: "Missing required fields: title, date, time" },
        { status: 400 }
      );
    }

    // Combine date and time to create a full datetime
    const eventDateTime = new Date(`${date}T${time}`);

    // Get existing events
    const eventsSetting = await prisma.settings.findUnique({
      where: { key: `organization_events_${id}` },
    });

    const existingEvents = eventsSetting?.value ? JSON.parse(eventsSetting.value) : [];

    // Create new event
    const newEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      title: title.trim(),
      description: description?.trim() || null,
      date: eventDateTime.toISOString(),
      time: time,
      location: location?.trim() || null,
      createdAt: new Date().toISOString(),
    };

    // Add to existing events
    const updatedEvents = [...existingEvents, newEvent];

    // Save back to Settings
    await prisma.settings.upsert({
      where: { key: `organization_events_${id}` },
      update: {
        value: JSON.stringify(updatedEvents),
      },
      create: {
        key: `organization_events_${id}`,
        value: JSON.stringify(updatedEvents),
      },
    });

    return NextResponse.json({ event: newEvent }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/organizations/[id]/events] Error:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}

