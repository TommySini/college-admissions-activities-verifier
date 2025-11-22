"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AdminAlumniViewPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin");
      return;
    }

    if (status === "authenticated" && session?.user?.role !== "admin") {
      router.replace("/dashboard");
      return;
    }

    // Redirect directly to the alumni database
    if (status === "authenticated" && session?.user?.role === "admin") {
      router.replace("/alumni");
    }
  }, [status, session?.user?.role, router]);

  return (
    <div className="admin-dark-scope min-h-screen flex items-center justify-center text-slate-600">
      Loading alumni database…
    </div>
  );
}

