import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const PREFERENCE_KEYS = {
  weeklyDigest: "pref_weekly_digest",
  notifyOrganizationSubmissions: "pref_org_notifications",
  eventReminders: "pref_event_reminders",
  darkMode: "pref_dark_mode",
};

const DEFAULT_PREFERENCES = {
  weeklyDigest: false,
  notifyOrganizationSubmissions: true,
  eventReminders: true,
  darkMode: false,
};

export async function GET() {
  const entries = await prisma.settings.findMany({
    where: {
      key: {
        in: Object.values(PREFERENCE_KEYS),
      },
    },
  });

  const valueMap = new Map(entries.map((entry) => [entry.key, entry.value === "true"]));

  return NextResponse.json({
    preferences: {
      weeklyDigest: valueMap.get(PREFERENCE_KEYS.weeklyDigest) ?? DEFAULT_PREFERENCES.weeklyDigest,
      notifyOrganizationSubmissions:
        valueMap.get(PREFERENCE_KEYS.notifyOrganizationSubmissions) ??
        DEFAULT_PREFERENCES.notifyOrganizationSubmissions,
      eventReminders: valueMap.get(PREFERENCE_KEYS.eventReminders) ?? DEFAULT_PREFERENCES.eventReminders,
      darkMode: valueMap.get(PREFERENCE_KEYS.darkMode) ?? DEFAULT_PREFERENCES.darkMode,
    },
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const updated: Record<string, boolean> = {};

  const booleanKeys: (keyof PreferenceSettingsPayload)[] = [
    "weeklyDigest",
    "notifyOrganizationSubmissions",
    "eventReminders",
    "darkMode",
  ];

  for (const key of booleanKeys) {
    if (typeof body[key] === "boolean") {
      updated[key] = body[key];
      const settingKey = PREFERENCE_KEYS[key];
      await prisma.settings.upsert({
        where: { key: settingKey },
        update: { value: String(body[key]) },
        create: { key: settingKey, value: String(body[key]) },
      });
    }
  }

  return NextResponse.json({ preferences: updated });
}

type PreferenceSettingsPayload = {
  weeklyDigest?: boolean;
  notifyOrganizationSubmissions?: boolean;
  eventReminders?: boolean;
  darkMode?: boolean;
};


