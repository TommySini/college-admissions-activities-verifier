import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string; // "student" | "admin"
      image?: string;
      schoolId?: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    image?: string;
    schoolId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    email: string;
    schoolId?: string | null;
  }
}
