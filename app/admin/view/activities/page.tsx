"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";

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
  verification?: {
    id: string;
    status: string;
    verifier?: {
      name: string;
      email: string;
    } | null;
  } | null;
}

export default function AdminActivitiesViewPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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
      setError(null);
      const response = await fetch("/api/admin/activities");
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to load activities");
        return;
      }

      setActivities(data.activities || []);
    } catch (err) {
      console.error("Error loading activities:", err);
      setError("Failed to load activities");
    } finally {
      setLoading(false);
    }
  };

  const filteredActivities = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return activities;
    return activities.filter((activity) => {
      const haystack = [
        activity.name,
        activity.category,
        activity.description,
        activity.organization,
        activity.role,
        activity.student?.name,
        activity.student?.email,
        activity.supervisorEmail,
        activity.verification?.verifier?.name,
        activity.verification?.verifier?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [activities, searchQuery]);

  if (status === "loading" || loading) {
    return <div className="admin-dark-scope min-h-screen flex items-center justify-center text-slate-600">Loading activities…</div>;
  }

  return (
    <div className="admin-dark-scope flex h-screen w-full bg-transparent">
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
          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
            {error}
          </div>
        )}

        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:flex-wrap">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search activities, students, supervisors…"
              className="w-full rounded-full border border-slate-200 bg-white px-10 py-2 text-sm text-slate-700 placeholder:text-slate-400 transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {filteredActivities.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-8 text-center">
              <p className="text-slate-600">
                {activities.length === 0
                  ? "There aren't any activities yet"
                  : "No activities match your search"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900">{activity.name}</h3>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                          {activity.category}
                        </span>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          activity.status === "verified" || activity.verification?.status === "verified" || activity.verification?.status === "accepted"
                            ? "border-green-200 bg-green-50 text-green-700"
                            : activity.status === "pending" || activity.verification?.status === "pending"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-slate-200 bg-slate-50 text-slate-700"
                        }`}>
                          {activity.verification?.status || activity.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mb-3">{activity.description}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {activity.student && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Student</p>
                            <p className="text-slate-900">{activity.student.name}</p>
                            <p className="text-slate-600 text-xs">{activity.student.email}</p>
                          </div>
                        )}
                        {activity.organization && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Organization</p>
                            <p className="text-slate-900">{activity.organization}</p>
                          </div>
                        )}
                        {activity.role && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Role</p>
                            <p className="text-slate-900">{activity.role}</p>
                          </div>
                        )}
                        {activity.totalHours && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Total Hours</p>
                            <p className="text-slate-900">{activity.totalHours}</p>
                          </div>
                        )}
                        {activity.startDate && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Start Date</p>
                            <p className="text-slate-900">{new Date(activity.startDate).toLocaleDateString()}</p>
                          </div>
                        )}
                        {activity.endDate && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">End Date</p>
                            <p className="text-slate-900">{new Date(activity.endDate).toLocaleDateString()}</p>
                          </div>
                        )}
                        {activity.supervisorEmail && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Supervisor</p>
                            <p className="text-slate-900">{activity.supervisorEmail}</p>
                          </div>
                        )}
                        {activity.verification?.verifier && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Verifier</p>
                            <p className="text-slate-900">{activity.verification.verifier.name}</p>
                            <p className="text-slate-600 text-xs">{activity.verification.verifier.email}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

