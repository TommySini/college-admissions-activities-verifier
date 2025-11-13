import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  try {
    // In Next.js 13+ App Router API routes, getServerSession automatically
    // reads cookies from the request context
    const session = await getServerSession(authOptions);
    
    console.log("getCurrentUser - Session:", session ? { email: session.user?.email, hasUser: !!session.user } : "null");
    
    if (!session?.user?.email) {
      console.log("getCurrentUser - No session or email");
      return null;
    }

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    console.log("getCurrentUser - Database user:", user ? { id: user.id, email: user.email, role: user.role } : "null");

    if (!user) {
      return null;
    }

    return user;
  } catch (error) {
    console.error("Error in getCurrentUser:", error);
    return null;
  }
}

export async function requireRole(role: "student" | "admin") {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("Unauthorized");
  }

  if (user.role !== role && user.role !== "admin") {
    throw new Error(`Forbidden: Requires ${role} role`);
  }

  return user;
}
