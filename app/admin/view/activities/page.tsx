"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Activity {
  id: string;
  name: string;
  category: string;
  description: string;
  startDate: string;
  endDate?: string | null;
  hoursPerWeek?: number | null;
  totalHours?: number | null;
  role?: string | null;
  organization?: string | null;
  status: string;
  studentNotes?: string | null;
  supervisorEmail?: string | null;
  student?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export default function AdminActivitiesViewPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin");
      return;
    }

    if (status === "authenticated" && session?.user?.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [status, session?.user?.role, router]);

  useEffect(() => {
    if (session?.user.role !== "admin") return;
    fetchActivities();
  }, [session?.user.role]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/analytics");
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to load activities");
        return;
      }

      // For now, we'll need to create an admin activities endpoint
      // This is a placeholder - you'll need to create /api/admin/activities
      setActivities([]);
    } catch (err) {
      console.error("Error loading activities:", err);
      setError("Failed to load activities");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-600">Loading activities…</div>;
  }

  return (
    <div className="flex h-screen w-full bg-transparent">
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col px-4 py-4">
        <header className="flex flex-col gap-1 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Activities</h1>
              <p className="text-sm text-slate-600 mt-2">
                View all student activities with admin details
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

        {error && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-auto">
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-8 text-center">
            <p className="text-slate-600">Admin activities view coming soon</p>
            <p className="text-sm text-slate-500 mt-2">
              This will show all student activities with admin details like student name, verification status, and supervisor information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

