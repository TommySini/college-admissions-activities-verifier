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

    // Get all organizations to calculate ranking
    const allOrgs = await prisma.organization.findMany({
      where: { status: "APPROVED" },
    });

    // Get member counts for all organizations
    const orgMemberCounts = await Promise.all(
      allOrgs.map(async (org) => {
        const membersSetting = await prisma.settings.findUnique({
          where: { key: `organization_members_${org.id}` },
        });
        const memberIds = membersSetting?.value ? JSON.parse(membersSetting.value) : [];
        return { id: org.id, count: memberIds.length };
      })
    );

    // Get current organization member count first
    const membersSetting = await prisma.settings.findUnique({
      where: { key: `organization_members_${id}` },
    });
    const memberIds = membersSetting?.value ? JSON.parse(membersSetting.value) : [];
    const currentMemberCount = memberIds.length;

    // Sort by member count for comparison
    orgMemberCounts.sort((a, b) => b.count - a.count);
    const memberCountPosition = orgMemberCounts.findIndex((org) => org.id === id) + 1;
    const totalOrgs = orgMemberCounts.length;
    
    // Get clubs with more, same, and fewer members for comparison
    const clubsWithMoreMembers = orgMemberCounts.filter((org) => org.count > currentMemberCount).length;
    const clubsWithSameMembers = orgMemberCounts.filter((org) => org.count === currentMemberCount).length;
    const clubsWithFewerMembers = orgMemberCounts.filter((org) => org.count < currentMemberCount).length;

    // Get member join dates from Settings
    // If join dates aren't tracked, use organization creation date as fallback
    const memberJoinDates: { [memberId: string]: Date } = {};
    const orgCreatedAt = organization.createdAt;
    
    for (const memberId of memberIds) {
      const joinDateSetting = await prisma.settings.findUnique({
        where: { key: `organization_member_join_${id}_${memberId}` },
      });
      if (joinDateSetting) {
        memberJoinDates[memberId] = new Date(joinDateSetting.value);
      } else {
        // If no join date tracked, use organization creation date as fallback
        // This ensures we have some data to work with
        memberJoinDates[memberId] = orgCreatedAt;
      }
    }

    // Calculate new members in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 60); // 60 days for better calculation
    const newMembers30d = Object.values(memberJoinDates).filter(
      (date) => date >= thirtyDaysAgo
    ).length;

    // Calculate growth percent (compare to 60 days ago)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const members60dAgo = Object.values(memberJoinDates).filter(
      (date) => date < sixtyDaysAgo
    ).length;
    const growthPercent = members60dAgo > 0 
      ? Math.round((newMembers30d / members60dAgo) * 100) 
      : newMembers30d > 0 ? 100 : 0;

    // Get events to calculate engagement
    const eventsSetting = await prisma.settings.findUnique({
      where: { key: `organization_events_${id}` },
    });
    const events = eventsSetting?.value ? JSON.parse(eventsSetting.value) : [];
    const now = new Date();
    const pastEvents = events.filter((e: any) => new Date(e.date) < now);
    const upcomingEvents = events.filter((e: any) => new Date(e.date) >= now);

    // Calculate monthly member growth (last 6 months)
    const monthlyMemberGrowth: { month: string; value: number }[] = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const membersInMonth = Object.values(memberJoinDates).filter(
        (joinDate) => joinDate >= monthStart && joinDate <= monthEnd
      ).length;
      
      monthlyMemberGrowth.push({
        month: monthNames[date.getMonth()],
        value: membersInMonth,
      });
    }

    // Calculate monthly event count (last 6 months)
    const monthlyEventCount: { month: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const eventsInMonth = events.filter((e: any) => {
        const eventDate = new Date(e.date);
        return eventDate >= monthStart && eventDate <= monthEnd;
      }).length;
      
      monthlyEventCount.push({
        month: monthNames[date.getMonth()],
        value: eventsInMonth,
      });
    }

    // Calculate engagement score (combination of members, events, activity)
    const monthlyEngagement = monthlyMemberGrowth.map((memberData, index) => {
      const eventData = monthlyEventCount[index];
      // Engagement score: weighted combination of member growth and events
      const score = Math.min(100, (memberData.value * 10) + (eventData.value * 15));
      return {
        month: memberData.month,
        value: score,
      };
    });

    // Calculate average engagement across all months
    const avgEngagement = monthlyEngagement.length > 0
      ? Math.round(monthlyEngagement.reduce((sum, m) => sum + m.value, 0) / monthlyEngagement.length)
      : 0;

    // Get top clubs by member count for comparison (always include current club)
    const sortedClubs = [...orgMemberCounts].sort((a, b) => b.count - a.count);
    const top10Clubs = sortedClubs.slice(0, 10);
    const currentClubInTop10 = top10Clubs.some(org => org.id === id);
    
    // If current club is not in top 10, add it
    let clubsToShow = top10Clubs;
    if (!currentClubInTop10) {
      const currentClub = sortedClubs.find(org => org.id === id);
      if (currentClub) {
        clubsToShow = [...top10Clubs, currentClub].sort((a, b) => b.count - a.count);
      }
    }
    
    const topClubs = clubsToShow.map((org) => ({
      name: allOrgs.find(o => o.id === org.id)?.name || "Unknown",
      members: org.count,
      isCurrent: org.id === id,
    }));

    // Calculate retention rate (members who joined more than 30 days ago and are still active)
    const members30dAgo = Object.values(memberJoinDates).filter(
      (date) => date < thirtyDaysAgo
    ).length;
    const retentionRate = members30dAgo > 0 
      ? Math.round((members30dAgo / Math.max(1, currentMemberCount)) * 100)
      : 100;

    // Calculate event participation rate (simplified - would need attendance tracking)
    const participationRate = pastEvents.length > 0 && currentMemberCount > 0
      ? Math.min(100, Math.round((pastEvents.length / currentMemberCount) * 10))
      : 0;

    const engagementData = {
      totalOrgs,
      currentMemberCount,
      memberCountPosition,
      clubsWithMoreMembers,
      clubsWithSameMembers,
      clubsWithFewerMembers,
      newMembers30d,
      growthPercent,
      monthlyEngagement,
      monthlyMemberGrowth,
      monthlyEventCount,
      avgEngagement,
      topClubs,
      attendanceRate: participationRate,
      participationRate,
      retentionRate,
      totalEvents: events.length,
      pastEvents: pastEvents.length,
      upcomingEvents: upcomingEvents.length,
    };

    return NextResponse.json(engagementData);
  } catch (error) {
    console.error("[GET /api/admin/organizations/[id]/engagement] Error:", error);
    return NextResponse.json(
      { error: "Failed to load engagement data" },
      { status: 500 }
    );
  }
}

