import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { addDays } from "date-fns";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const params = await context.params;
    const { id: editionId } = params;
    
    // Check if edition exists
    const edition = await prisma.edition.findUnique({
      where: { id: editionId },
    });
    
    if (!edition) {
      return NextResponse.json(
        { error: "Edition not found" },
        { status: 404 }
      );
    }
    
    // Toggle follow
    const existing = await prisma.follow.findUnique({
      where: {
        userId_editionId: {
          userId: user.id,
          editionId,
        },
      },
    });
    
    if (existing) {
      // Unfollow: remove follow and associated notifications
      await prisma.$transaction([
        prisma.follow.delete({
          where: { id: existing.id },
        }),
        prisma.notification.deleteMany({
          where: {
            userId: user.id,
            editionId,
            deliveredAt: null, // Only delete undelivered notifications
          },
        }),
        prisma.edition.update({
          where: { id: editionId },
          data: {
            followsCount: {
              decrement: 1,
            },
          },
        }),
      ]);
      
      return NextResponse.json({ followed: false });
    } else {
      // Follow: add follow and create default notifications
      const now = new Date();
      const notifications: any[] = [];
      
      // Create deadline reminders if registration deadline exists
      if (edition.registrationDeadline) {
        const deadline = new Date(edition.registrationDeadline);
        
        // 21 days before
        const remind21 = addDays(deadline, -21);
        if (remind21 > now) {
          notifications.push({
            userId: user.id,
            editionId,
            kind: "deadline_soon",
            scheduledAt: remind21,
            payload: { daysUntil: 21 },
          });
        }
        
        // 7 days before
        const remind7 = addDays(deadline, -7);
        if (remind7 > now) {
          notifications.push({
            userId: user.id,
            editionId,
            kind: "deadline_soon",
            scheduledAt: remind7,
            payload: { daysUntil: 7 },
          });
        }
        
        // 1 day before
        const remind1 = addDays(deadline, -1);
        if (remind1 > now) {
          notifications.push({
            userId: user.id,
            editionId,
            kind: "deadline_soon",
            scheduledAt: remind1,
            payload: { daysUntil: 1 },
          });
        }
      }
      
      // Create notifications in transaction with follow
      await prisma.$transaction([
        prisma.follow.create({
          data: {
            userId: user.id,
            editionId,
          },
        }),
        prisma.edition.update({
          where: { id: editionId },
          data: {
            followsCount: {
              increment: 1,
            },
          },
        }),
        ...(notifications.length > 0
          ? [
              prisma.notification.createMany({
                data: notifications,
              }),
            ]
          : []),
      ]);
      
      return NextResponse.json({
        followed: true,
        notificationsCreated: notifications.length,
      });
    }
  } catch (error) {
    console.error("Error toggling follow:", error);
    return NextResponse.json(
      { error: "Failed to toggle follow" },
      { status: 500 }
    );
  }
}

