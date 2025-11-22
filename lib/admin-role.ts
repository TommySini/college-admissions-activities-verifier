import { prisma } from "./prisma";

export type AdminSubRole = "teacher" | "college_counselor";

export async function getAdminSubRole(userId: string): Promise<AdminSubRole> {
  const setting = await prisma.settings.findUnique({
    where: { key: `admin_subrole_${userId}` },
  });

  return setting?.value === "college_counselor" ? "college_counselor" : "teacher";
}


