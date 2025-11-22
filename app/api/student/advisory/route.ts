import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { parseAdvisoryRequestKey } from "@/lib/advisory";
import {
  loadAdvisorGroups,
  parseAdvisoryRequestValue,
  saveAdvisorGroups,
} from "@/lib/advisory-groups";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "student") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const invites = await prisma.settings.findMany({
      where: {
        key: {
          startsWith: "advisory_request_",
        },
        value: user.id,
      },
      orderBy: { createdAt: "desc" },
    });

    if (invites.length === 0) {
      return NextResponse.json({ invites: [] });
    }

    const parsedInvites = invites
      .map((invite) => {
        const parsed = parseAdvisoryRequestKey(invite.key);
        if (!parsed) return null;
        return {
          ...parsed,
          requestKey: invite.key,
          createdAt: invite.createdAt,
        };
      })
      .filter(Boolean) as {
        advisorId: string;
        studentEmail: string;
        requestKey: string;
        createdAt: Date;
      }[];

    const advisorIds = Array.from(new Set(parsedInvites.map((invite) => invite.advisorId)));

    const advisors = await prisma.user.findMany({
      where: { id: { in: advisorIds } },
      select: { id: true, name: true, email: true },
    });

    const advisorMap = new Map(advisors.map((advisor) => [advisor.id, advisor]));

    const formattedInvites = parsedInvites.map((invite) => {
      const advisor = advisorMap.get(invite.advisorId);
      return {
        requestKey: invite.requestKey,
        advisorId: invite.advisorId,
        advisorName: advisor?.name ?? "Advisor",
        advisorEmail: advisor?.email ?? "",
        studentEmail: invite.studentEmail,
        createdAt: invite.createdAt,
      };
    });

    return NextResponse.json({ invites: formattedInvites });
  } catch (error) {
    console.error("[student advisory] GET error:", error);
    return NextResponse.json(
      { error: "Failed to load advisory invites" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "student") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { requestKey, action } = body as { requestKey?: string; action?: "accept" | "decline" };

    if (!requestKey || (action !== "accept" && action !== "decline")) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const pendingRequest = await prisma.settings.findUnique({
      where: { key: requestKey },
    });

    if (!pendingRequest || pendingRequest.value !== user.id) {
      return NextResponse.json({ error: "Invite no longer available" }, { status: 404 });
    }

    const parsed = parseAdvisoryRequestKey(requestKey);
    if (!parsed) {
      return NextResponse.json({ error: "Invalid advisory request" }, { status: 400 });
    }

    const advisor = await prisma.user.findUnique({
      where: { id: parsed.advisorId },
      select: { id: true, name: true },
    });

    if (!advisor) {
      await prisma.settings.delete({ where: { key: requestKey } });
      return NextResponse.json({ error: "Advisor not found" }, { status: 404 });
    }

    if (action === "accept") {
      const metadata = parseAdvisoryRequestValue(pendingRequest.value);
      await prisma.$transaction(async (tx) => {
        const groups = await loadAdvisorGroups(tx, advisor.id);
        const fallbackGroupId = groups[0]?.id;
        const targetGroupId = metadata.groupId ?? fallbackGroupId;

        if (!targetGroupId) {
          throw new Error("No advisory group available for advisor");
        }

        const updatedGroups = groups.map((group) =>
          group.id === targetGroupId && !group.studentIds.includes(user.id)
            ? {
                ...group,
                studentIds: [...group.studentIds, user.id],
                updatedAt: new Date().toISOString(),
              }
            : group
        );

        await saveAdvisorGroups(tx, advisor.id, updatedGroups);
        await tx.settings.delete({
          where: { key: requestKey },
        });
      });

      return NextResponse.json({
        status: "accepted",
        advisor: { id: advisor.id, name: advisor.name },
      });
    }

    // Decline
    await prisma.settings.delete({
      where: { key: requestKey },
    });

    return NextResponse.json({ status: "declined" });
  } catch (error) {
    console.error("[student advisory] POST error:", error);
    return NextResponse.json(
      { error: "Unable to update advisory invite" },
      { status: 500 }
    );
  }
}

