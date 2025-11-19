"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type OrganizationStatus = "PENDING" | "APPROVED" | "REJECTED";

interface Organization {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  leadership?: string | null;
  presidentName?: string | null;
  isSchoolClub: boolean;
  contactEmail?: string | null;
  status: OrganizationStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

const statusStyles: Record<OrganizationStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700 border border-amber-200",
  APPROVED: "bg-green-100 text-green-700 border border-green-200",
  REJECTED: "bg-red-100 text-red-700 border border-red-200",
};

export default function AdminOrganizationsViewPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "APPROVED" | "PENDING" | "REJECTED">("all");

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
    fetchOrganizations();
  }, [session?.user.role]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/organizations");
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to load organizations");
        return;
      }

      setOrganizations(data.organizations || []);
    } catch (err) {
      console.error("Error loading organizations:", err);
      setError("Failed to load organizations");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-600">Loading organizations…</div>;
  }

  const filteredOrganizations = filter === "all" 
    ? organizations 
    : organizations.filter(org => org.status === filter);

  return (
    <div className="flex h-screen w-full bg-transparent">
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col px-4 py-4">
        <header className="flex flex-col gap-1 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Organizations</h1>
              <p className="text-sm text-slate-600 mt-2">
                View all organizations as students see them, with admin details
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

        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-full border px-4 py-1 text-xs font-semibold transition ${
              filter === "all"
                ? "border-slate-300 bg-slate-100 text-slate-900"
                : "border-slate-200 text-slate-600 hover:border-blue-200 hover:text-blue-600"
            }`}
          >
            All ({organizations.length})
          </button>
          <button
            onClick={() => setFilter("APPROVED")}
            className={`rounded-full border px-4 py-1 text-xs font-semibold transition ${
              filter === "APPROVED"
                ? "border-green-300 bg-green-100 text-green-900"
                : "border-slate-200 text-slate-600 hover:border-green-200 hover:text-green-600"
            }`}
          >
            Approved ({organizations.filter(o => o.status === "APPROVED").length})
          </button>
          <button
            onClick={() => setFilter("PENDING")}
            className={`rounded-full border px-4 py-1 text-xs font-semibold transition ${
              filter === "PENDING"
                ? "border-amber-300 bg-amber-100 text-amber-900"
                : "border-slate-200 text-slate-600 hover:border-amber-200 hover:text-amber-600"
            }`}
          >
            Pending ({organizations.filter(o => o.status === "PENDING").length})
          </button>
          <button
            onClick={() => setFilter("REJECTED")}
            className={`rounded-full border px-4 py-1 text-xs font-semibold transition ${
              filter === "REJECTED"
                ? "border-red-300 bg-red-100 text-red-900"
                : "border-slate-200 text-slate-600 hover:border-red-200 hover:text-red-600"
            }`}
          >
            Rejected ({organizations.filter(o => o.status === "REJECTED").length})
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="space-y-3">
            {filteredOrganizations.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white/95 p-8 text-center">
                <p className="text-slate-600">No organizations found</p>
              </div>
            ) : (
              filteredOrganizations.map((org) => (
                <div
                  key={org.id}
                  className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900">{org.name}</h3>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[org.status]}`}>
                          {org.status}
                        </span>
                        {org.isSchoolClub && (
                          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                            School Club
                          </span>
                        )}
                      </div>
                      {org.description && (
                        <p className="text-sm text-slate-600 mb-2">{org.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                        {org.category && (
                          <span><strong>Category:</strong> {org.category}</span>
                        )}
                        {org.presidentName && (
                          <span><strong>President:</strong> {org.presidentName}</span>
                        )}
                        {org.leadership && (
                          <span><strong>Leadership:</strong> {org.leadership}</span>
                        )}
                        {org.contactEmail && (
                          <span><strong>Contact:</strong> {org.contactEmail}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {org.createdBy && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-xs text-slate-500">
                        <strong>Admin Info:</strong> Created by {org.createdBy.name} ({org.createdBy.email})
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

