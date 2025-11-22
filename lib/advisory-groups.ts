import { randomUUID } from "crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  DEFAULT_ADVISORY_NAME,
  advisoryGroupsKey,
  advisoryStudentsKey,
} from "./advisory";

type SettingsClient = PrismaClient | Prisma.TransactionClient;

export type AdvisoryGroupRecord = {
  id: string;
  name: string;
  studentIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type AdvisoryRequestMetadata = {
  studentId?: string;
  groupId?: string | null;
};

export function flattenGroupStudentIds(groups: AdvisoryGroupRecord[]) {
  const set = new Set<string>();
  groups.forEach((group) => {
    group.studentIds.forEach((id) => set.add(id));
  });
  return Array.from(set);
}

export async function loadAdvisorGroups(
  db: SettingsClient,
  advisorId: string
): Promise<AdvisoryGroupRecord[]> {
  const key = advisoryGroupsKey(advisorId);
  const setting = await db.settings.findUnique({ where: { key } });

  const parsed = parseGroups(setting?.value);
  if (parsed.length > 0) {
    return parsed;
  }

  const legacySetting = await db.settings.findUnique({
    where: { key: advisoryStudentsKey(advisorId) },
  });

  const legacyStudentIds = parseStudentIds(legacySetting?.value);
  const fallbackGroup: AdvisoryGroupRecord = {
    id: randomUUID(),
    name: DEFAULT_ADVISORY_NAME,
    studentIds: legacyStudentIds,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveAdvisorGroups(db, advisorId, [fallbackGroup]);
  return [fallbackGroup];
}

export async function saveAdvisorGroups(
  db: SettingsClient,
  advisorId: string,
  groups: AdvisoryGroupRecord[]
) {
  const key = advisoryGroupsKey(advisorId);
  await db.settings.upsert({
    where: { key },
    update: { value: JSON.stringify(groups) },
    create: { key, value: JSON.stringify(groups) },
  });

  await syncLegacyStudents(db, advisorId, groups);
}

async function syncLegacyStudents(
  db: SettingsClient,
  advisorId: string,
  groups: AdvisoryGroupRecord[]
) {
  const allStudentIds = flattenGroupStudentIds(groups);
  const key = advisoryStudentsKey(advisorId);

  if (allStudentIds.length === 0) {
    try {
      await db.settings.delete({ where: { key } });
    } catch (error) {
      if (
        !(
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        )
      ) {
        throw error;
      }
    }
    return;
  }

  await db.settings.upsert({
    where: { key },
    update: { value: JSON.stringify(allStudentIds) },
    create: { key, value: JSON.stringify(allStudentIds) },
  });
}

function parseGroups(value: string | null | undefined): AdvisoryGroupRecord[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((group) => ({
        id: typeof group.id === "string" ? group.id : randomUUID(),
        name:
          typeof group.name === "string" && group.name.trim().length > 0
            ? group.name.trim()
            : DEFAULT_ADVISORY_NAME,
        studentIds: Array.isArray(group.studentIds)
          ? (group.studentIds.filter((id: unknown) => typeof id === "string") as string[])
          : [],
        createdAt:
          typeof group.createdAt === "string"
            ? group.createdAt
            : new Date().toISOString(),
        updatedAt:
          typeof group.updatedAt === "string"
            ? group.updatedAt
            : new Date().toISOString(),
      }))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function parseStudentIds(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((id) => typeof id === "string") as string[];
    }
  } catch {
    return [];
  }
  return [];
}

export function parseAdvisoryRequestValue(
  value: string | null | undefined
): AdvisoryRequestMetadata {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object") {
      return {
        studentId:
          typeof parsed.studentId === "string" ? parsed.studentId : undefined,
        groupId:
          typeof parsed.groupId === "string" ? parsed.groupId : undefined,
      };
    }
  } catch {
    // fall back to legacy string values
  }
  if (typeof value === "string" && value.length > 0) {
    return { studentId: value };
  }
  return {};
}



