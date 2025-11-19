import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH - Update an event
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "admin" && user.role !== "teacher")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, eventId } = await params;
    
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

    // Get existing events
    const eventsSetting = await prisma.settings.findUnique({
      where: { key: `organization_events_${id}` },
    });

    const events = eventsSetting?.value ? JSON.parse(eventsSetting.value) : [];
    const eventIndex = events.findIndex((e: any) => e.id === eventId);

    if (eventIndex === -1) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Combine date and time to create a full datetime
    const eventDateTime = new Date(`${date}T${time}`);

    // Update the event
    events[eventIndex] = {
      ...events[eventIndex],
      title: title.trim(),
      description: description?.trim() || null,
      date: eventDateTime.toISOString(),
      time: time,
      location: location?.trim() || null,
    };

    // Save back to Settings
    await prisma.settings.upsert({
      where: { key: `organization_events_${id}` },
      update: {
        value: JSON.stringify(events),
      },
      create: {
        key: `organization_events_${id}`,
        value: JSON.stringify(events),
      },
    });

    return NextResponse.json({ event: events[eventIndex] });
  } catch (error) {
    console.error("[PATCH /api/admin/organizations/[id]/events/[eventId]] Error:", error);
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }
}

// DELETE - Delete an event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "admin" && user.role !== "teacher")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, eventId } = await params;
    
    // Verify the organization exists
    const organization = await prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Get existing events
    const eventsSetting = await prisma.settings.findUnique({
      where: { key: `organization_events_${id}` },
    });

    const events = eventsSetting?.value ? JSON.parse(eventsSetting.value) : [];
    const filteredEvents = events.filter((e: any) => e.id !== eventId);

    if (events.length === filteredEvents.length) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Save back to Settings
    await prisma.settings.upsert({
      where: { key: `organization_events_${id}` },
      update: {
        value: JSON.stringify(filteredEvents),
      },
      create: {
        key: `organization_events_${id}`,
        value: JSON.stringify(filteredEvents),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/organizations/[id]/events/[eventId]] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}

