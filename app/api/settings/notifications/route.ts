import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const NOTIFICATION_KEYS = {
  studentApprovalRequest: "notif_student_approval_request",
  emailOnSignIn: "notif_email_on_signin",
  weeklyDigest: "notif_weekly_digest",
  organizationUpdates: "notif_org_updates",
};

const DEFAULT_NOTIFICATIONS = {
  studentApprovalRequest: true,
  emailOnSignIn: true,
  weeklyDigest: false,
  organizationUpdates: true,
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await prisma.settings.findMany({
    where: {
      key: {
        in: Object.values(NOTIFICATION_KEYS).map((key) => `${key}_${user.id}`),
      },
    },
  });

  const valueMap = new Map(entries.map((entry) => [entry.key.replace(`_${user.id}`, ""), entry.value === "true"]));

  return NextResponse.json({
    notifications: {
      studentApprovalRequest:
        valueMap.get(NOTIFICATION_KEYS.studentApprovalRequest) ?? DEFAULT_NOTIFICATIONS.studentApprovalRequest,
      emailOnSignIn: valueMap.get(NOTIFICATION_KEYS.emailOnSignIn) ?? DEFAULT_NOTIFICATIONS.emailOnSignIn,
      weeklyDigest: valueMap.get(NOTIFICATION_KEYS.weeklyDigest) ?? DEFAULT_NOTIFICATIONS.weeklyDigest,
      organizationUpdates:
        valueMap.get(NOTIFICATION_KEYS.organizationUpdates) ?? DEFAULT_NOTIFICATIONS.organizationUpdates,
    },
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const updated: Record<string, boolean> = {};

  const booleanKeys: (keyof NotificationSettingsPayload)[] = [
    "studentApprovalRequest",
    "emailOnSignIn",
    "weeklyDigest",
    "organizationUpdates",
  ];

  for (const key of booleanKeys) {
    if (typeof body[key] === "boolean") {
      updated[key] = body[key];
      const settingKey = `${NOTIFICATION_KEYS[key]}_${user.id}`;
      await prisma.settings.upsert({
        where: { key: settingKey },
        update: { value: String(body[key]) },
        create: { key: settingKey, value: String(body[key]) },
      });
    }
  }

  return NextResponse.json({ notifications: updated });
}

type NotificationSettingsPayload = {
  studentApprovalRequest?: boolean;
  emailOnSignIn?: boolean;
  weeklyDigest?: boolean;
  organizationUpdates?: boolean;
};

