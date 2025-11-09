import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

// List of verifier emails (teachers/club advisors)
// In production, this could be stored in the database or environment variables
const VERIFIER_EMAILS = process.env.VERIFIER_EMAILS?.split(",") || [];

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // Allow any email for now (remove domain restriction for testing)
        if (!user.email) {
          console.error("SignIn: No email provided", { user });
          return false;
        }

        console.log("SignIn: Processing user", { email: user.email, name: user.name });

        // Try to read the selected role from cookies
        // Note: In Next.js 13+ App Router, we need to use a different approach
        // The cookie is set client-side, so we'll handle role update in the dashboard
        // For now, we'll set a default role and let the dashboard update it
        
        // Check existing user first
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });
        
        let role = "student"; // Default role for new users
        
        if (existingUser) {
          // For existing users, preserve their current role
          // The role will be updated in the dashboard if they selected a different role
          role = existingUser.role;
          console.log("SignIn: Existing user, preserving role", { email: user.email, role });
        } else {
          // New user - assign role based on email patterns
          if (user.email.endsWith("@stanford.edu")) {
            role = "verifier";
          } else if (VERIFIER_EMAILS.includes(user.email.toLowerCase())) {
            role = "verifier";
          }
          // Otherwise defaults to "student"
          console.log("SignIn: New user, assigning default role", { email: user.email, role });
        }

        console.log("SignIn: Creating/updating user with role", { email: user.email, role });

        // Create or update user in database
        await prisma.user.upsert({
          where: { email: user.email },
          update: {
            name: user.name || "",
            image: user.image || null,
            role: role, // Update role if changed
          },
          create: {
            email: user.email,
            name: user.name || "",
            image: user.image || null,
            role: role,
          },
        });

        console.log("SignIn: User created/updated successfully", { email: user.email });
        return true;
      } catch (error: any) {
        console.error("Error in signIn callback:", error);
        console.error("Error details:", {
          message: error?.message,
          code: error?.code,
          meta: error?.meta,
          stack: error?.stack,
        });
        // Log the full error for debugging
        console.error("Full error object:", JSON.stringify(error, null, 2));
        // Return false to prevent sign in if database operation fails
        // This will trigger AccessDenied error
        return false;
      }
    },
    async jwt({ token, user, account, profile }) {
      if (user) {
        // Fetch user from database to get role
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.email = dbUser.email;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
