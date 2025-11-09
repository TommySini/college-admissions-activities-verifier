import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return null;
  }

  // Verify user exists in database (any email allowed for now)
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return null;
  }

  return user;
}

export async function requireRole(role: "student" | "verifier" | "admin") {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("Unauthorized");
  }

  if (user.role !== role && user.role !== "admin") {
    throw new Error(`Forbidden: Requires ${role} role`);
  }

  return user;
}
