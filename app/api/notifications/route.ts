import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// Get user notifications
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const searchParams = request.nextUrl.searchParams;
    const unreadOnly = searchParams.get("unread") === "true";
    
    const notifications = await prisma.notification.findMany({
      where: {
        userId: user.id,
        ...(unreadOnly && { deliveredAt: null }),
      },
      include: {
        edition: {
          include: {
            opportunity: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: {
        scheduledAt: "desc",
      },
      take: 50,
    });
    
    const unreadCount = await prisma.notification.count({
      where: {
        userId: user.id,
        deliveredAt: null,
        scheduledAt: {
          lte: new Date(),
        },
      },
    });
    
    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

