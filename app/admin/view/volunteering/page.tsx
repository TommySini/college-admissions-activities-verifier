"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";

interface VolunteeringParticipation {
  id: string;
  opportunityId?: string | null;
  studentId: string;
  activityId?: string | null;
  startDate: string;
  endDate?: string | null;
  totalHours?: number | null;
  hoursPerWeek?: number | null;
  status: string;
  isManualLog: boolean;
  organizationName?: string | null;
  activityName?: string | null;
  activityDescription?: string | null;
  serviceSheetUrl?: string | null;
  verified: boolean;
  verifiedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  opportunity?: {
    id: string;
    title: string;
    description: string;
    organization: string;
    postedBy?: {
      id: string;
      name: string;
      email: string;
    } | null;
  } | null;
  student?: {
    id: string;
    name: string;
    email: string;
  } | null;
  activity?: {
    id: string;
    name: string;
    category: string;
  } | null;
  verifier?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export default function AdminVolunteeringViewPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [participations, setParticipations] = useState<VolunteeringParticipation[]>([]);
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
    fetchParticipations();
  }, [session?.user.role]);

  const fetchParticipations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/volunteering-participations");
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to load volunteering data");
        return;
      }

      setParticipations(data.participations || []);
    } catch (err) {
      console.error("Error loading volunteering data:", err);
      setError("Failed to load volunteering data");
    } finally {
      setLoading(false);
    }
  };

  const filteredParticipations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return participations;
    return participations.filter((participation) => {
      const haystack = [
        participation.opportunity?.title,
        participation.opportunity?.organization,
        participation.activityName,
        participation.organizationName,
        participation.student?.name,
        participation.student?.email,
        participation.opportunity?.postedBy?.name,
        participation.opportunity?.postedBy?.email,
        participation.verifier?.name,
        participation.verifier?.email,
        participation.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [participations, searchQuery]);

  if (status === "loading" || loading) {
    return <div className="admin-dark-scope min-h-screen flex items-center justify-center text-slate-600">Loading volunteering…</div>;
  }

  return (
    <div className="admin-dark-scope flex h-screen w-full bg-transparent">
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col px-4 py-4">
        <header className="flex flex-col gap-1 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Volunteering</h1>
              <p className="text-sm text-slate-600 mt-2">
                View all volunteering opportunities and student participation with admin details
              </p>
            </div>
            <Link
              href="/admin/view"
              className="rounded-full border border-slate-200 px-4 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-700"
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
              placeholder="Search volunteering logs, students, organizations…"
              className="w-full rounded-full border border-slate-200 bg-white px-10 py-2 text-sm text-slate-700 placeholder:text-slate-400 transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {filteredParticipations.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-8 text-center">
              <p className="text-slate-600">
                {participations.length === 0
                  ? "There aren't any volunteering participations yet"
                  : "No volunteering entries match your search"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredParticipations.map((participation) => (
                <div
                  key={participation.id}
                  className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {participation.opportunity?.title || participation.activityName || participation.organizationName || "Volunteering Activity"}
                        </h3>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          participation.verified
                            ? "border-green-200 bg-green-50 text-green-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        }`}>
                          {participation.verified ? "Verified" : "Unverified"}
                        </span>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          participation.status === "completed"
                            ? "border-blue-200 bg-blue-50 text-blue-700"
                            : participation.status === "active"
                            ? "border-green-200 bg-green-50 text-green-700"
                            : "border-slate-200 bg-slate-50 text-slate-700"
                        }`}>
                          {participation.status}
                        </span>
                        {participation.isManualLog && (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                            Manual Log
                          </span>
                        )}
                      </div>
                      {participation.opportunity?.description && (
                        <p className="text-sm text-slate-600 mb-3">{participation.opportunity.description}</p>
                      )}
                      {participation.activityDescription && (
                        <p className="text-sm text-slate-600 mb-3">{participation.activityDescription}</p>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {participation.student && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Student</p>
                            <p className="text-slate-900">{participation.student.name}</p>
                            <p className="text-slate-600 text-xs">{participation.student.email}</p>
                          </div>
                        )}
                        {participation.opportunity?.organization && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Organization</p>
                            <p className="text-slate-900">{participation.opportunity.organization}</p>
                          </div>
                        )}
                        {participation.organizationName && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Organization</p>
                            <p className="text-slate-900">{participation.organizationName}</p>
                          </div>
                        )}
                        {participation.totalHours && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Total Hours</p>
                            <p className="text-slate-900">{participation.totalHours}</p>
                          </div>
                        )}
                        {participation.hoursPerWeek && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Hours/Week</p>
                            <p className="text-slate-900">{participation.hoursPerWeek}</p>
                          </div>
                        )}
                        {participation.startDate && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Start Date</p>
                            <p className="text-slate-900">{new Date(participation.startDate).toLocaleDateString()}</p>
                          </div>
                        )}
                        {participation.endDate && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">End Date</p>
                            <p className="text-slate-900">{new Date(participation.endDate).toLocaleDateString()}</p>
                          </div>
                        )}
                        {participation.opportunity?.postedBy && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Posted By</p>
                            <p className="text-slate-900">{participation.opportunity.postedBy.name}</p>
                            <p className="text-slate-600 text-xs">{participation.opportunity.postedBy.email}</p>
                          </div>
                        )}
                        {participation.verifier && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Verifier</p>
                            <p className="text-slate-900">{participation.verifier.name}</p>
                            <p className="text-slate-600 text-xs">{participation.verifier.email}</p>
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

