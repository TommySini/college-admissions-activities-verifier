"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
    }
  }, [status, session?.user?.role, router]);

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center text-slate-600">Loading alumni database…</div>;
  }

  return (
    <div className="flex h-screen w-full bg-transparent">
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col px-4 py-4">
        <header className="flex flex-col gap-1 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Alumni Database</h1>
              <p className="text-sm text-slate-600 mt-2">
                View alumni profiles and college application data
              </p>
            </div>
            <Link
              href="/admin/view"
              className="rounded-full border border-slate-200 px-4 py-1 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
            >
              ← Back to View Tool
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-8 text-center">
            <p className="text-slate-600">Alumni database view</p>
            <p className="text-sm text-slate-500 mt-2">
              This shows the same alumni database that students see, with all profiles and application data.
            </p>
            <Link
              href="/alumni"
              className="mt-4 inline-block rounded-full border border-slate-200 px-4 py-1 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
            >
              View Alumni Database →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

