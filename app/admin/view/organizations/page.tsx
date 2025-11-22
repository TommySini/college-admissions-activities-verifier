"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X } from "lucide-react";

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

interface OrganizationMember {
  id: string;
  name: string | null;
  email: string | null;
  image?: string | null;
  roles?: string[];
}

export default function AdminOrganizationsViewPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "APPROVED" | "PENDING" | "REJECTED">("all");
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [showOrganizationModal, setShowOrganizationModal] = useState(false);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
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

  const filteredOrganizations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return organizations.filter((org) => {
      const matchesStatus = filter === "all" ? true : org.status === filter;
      if (!matchesStatus) return false;
      if (!query) return true;
      const haystack = [
        org.name,
        org.description,
        org.category,
        org.leadership,
        org.presidentName,
        org.contactEmail,
        org.createdBy?.name,
        org.createdBy?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [organizations, filter, searchQuery]);

  if (status === "loading" || loading) {
    return <div className="admin-dark-scope min-h-screen flex items-center justify-center text-slate-600">Loading organizations…</div>;
  }

  const handleOrganizationClick = async (org: Organization) => {
    setSelectedOrganization(org);
    setShowOrganizationModal(true);
    setMembers([]);
    setMembersError(null);
    setMembersLoading(true);

    try {
      const response = await fetch(`/api/admin/organizations/${org.id}/members`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load members");
      }

      setMembers(data.members || []);
    } catch (err) {
      console.error("Error loading members:", err);
      setMembersError(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setMembersLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowOrganizationModal(false);
    setSelectedOrganization(null);
    setMembers([]);
    setMembersError(null);
  };

  return (
    <div className="admin-dark-scope flex h-screen w-full bg-transparent">
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
              className="rounded-full border border-slate-200 px-4 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
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

        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:flex-wrap">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name, description, or people"
              className="w-full rounded-full border border-slate-200 bg-white px-10 py-2 text-sm text-slate-700 placeholder:text-slate-400 transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <button
            onClick={() => setFilter("all")}
            className={`rounded-full border px-4 py-1 text-xs font-semibold transition ${
              filter === "all"
                ? "border-slate-300 bg-slate-100 text-slate-900 shadow-sm"
                : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            All ({organizations.length})
          </button>
          <button
            onClick={() => setFilter("APPROVED")}
            className={`rounded-full border px-4 py-1 text-xs font-semibold transition ${
              filter === "APPROVED"
                ? "border-slate-300 bg-white text-slate-900 shadow-sm"
                : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            Approved ({organizations.filter(o => o.status === "APPROVED").length})
          </button>
          <button
            onClick={() => setFilter("PENDING")}
            className={`rounded-full border px-4 py-1 text-xs font-semibold transition ${
              filter === "PENDING"
                ? "border-slate-300 bg-white text-slate-900 shadow-sm"
                : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            Pending ({organizations.filter(o => o.status === "PENDING").length})
          </button>
          <button
            onClick={() => setFilter("REJECTED")}
            className={`rounded-full border px-4 py-1 text-xs font-semibold transition ${
              filter === "REJECTED"
                ? "border-slate-300 bg-white text-slate-900 shadow-sm"
                : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            Rejected ({organizations.filter(o => o.status === "REJECTED").length})
          </button>

          <p className="text-xs text-slate-500 md:ml-auto">
            Showing {filteredOrganizations.length} of {organizations.length} organizations
          </p>
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
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOrganizationClick(org)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleOrganizationClick(org);
                    }
                  }}
                  className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900">{org.name}</h3>
                        {org.isSchoolClub && (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
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
                      <p className="text-xs text-slate-500 mt-3">
                        Updated {new Date(org.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showOrganizationModal && selectedOrganization && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] animate-[backdropFadeIn_0.3s_ease-out]"
          onClick={handleCloseModal}
        >
          <div
            className="relative w-full max-w-3xl mx-4 rounded-2xl border border-slate-200 bg-white shadow-2xl animate-[modalFadeIn_0.3s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-6 border-b border-slate-200">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Organization details</p>
                <h2 className="text-2xl font-semibold text-slate-900 mt-2">{selectedOrganization.name}</h2>
                {selectedOrganization.description && (
                  <p className="text-sm text-slate-600 mt-2">{selectedOrganization.description}</p>
                )}
              </div>
              <button
                onClick={handleCloseModal}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 transition"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <p className="text-xs uppercase text-slate-500 mb-2">Snapshot</p>
                  <dl className="space-y-2 text-sm text-slate-700">
                    <div className="flex justify-between">
                      <dt>Status</dt>
                      <dd className="capitalize text-slate-900">{selectedOrganization.status.toLowerCase()}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Category</dt>
                      <dd className="text-right">{selectedOrganization.category ?? "—"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Leadership</dt>
                      <dd className="text-right">{selectedOrganization.leadership ?? "—"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>President</dt>
                      <dd className="text-right">{selectedOrganization.presidentName ?? "—"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Last updated</dt>
                      <dd>{new Date(selectedOrganization.updatedAt).toLocaleDateString()}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Created</dt>
                      <dd>{new Date(selectedOrganization.createdAt).toLocaleDateString()}</dd>
                    </div>
                  </dl>
                </div>
                <div className="rounded-xl border border-slate-100 p-4">
                  <p className="text-xs uppercase text-slate-500 mb-2">Contact</p>
                  <dl className="space-y-2 text-sm text-slate-700">
                    <div>
                      <dt className="text-xs text-slate-500 uppercase tracking-wide">Email</dt>
                      <dd className="text-slate-900">{selectedOrganization.contactEmail ?? "Not provided"}</dd>
                    </div>
                    {selectedOrganization.createdBy && (
                      <div>
                        <dt className="text-xs text-slate-500 uppercase tracking-wide">Created by</dt>
                        <dd className="text-slate-900">
                          {selectedOrganization.createdBy.name} ({selectedOrganization.createdBy.email})
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-xs text-slate-500 uppercase tracking-wide">School club</dt>
                      <dd className="text-slate-900">{selectedOrganization.isSchoolClub ? "Yes" : "No"}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs uppercase text-slate-500">Student roster</p>
                  <span className="text-xs text-slate-500">
                    {membersLoading ? "Loading…" : `${members.length} students`}
                  </span>
                </div>
                {membersLoading && (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, index) => (
                      <div key={index} className="h-10 animate-pulse rounded-lg bg-slate-100" />
                    ))}
                  </div>
                )}
                {!membersLoading && membersError && (
                  <p className="text-sm text-amber-600">{membersError}</p>
                )}
                {!membersLoading && !membersError && members.length === 0 && (
                  <p className="text-sm text-slate-500">No students linked to this organization yet.</p>
                )}
                {!membersLoading && !membersError && members.length > 0 && (
                  <ul className="divide-y divide-slate-100">
                    {members.map((member) => (
                      <li key={member.id} className="py-3 flex flex-col gap-1 text-sm text-slate-700">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-slate-900">{member.name ?? "Unnamed student"}</p>
                          <p className="text-xs text-slate-500">{member.email ?? "No email on file"}</p>
                        </div>
                        {member.roles && member.roles.length > 0 && (
                          <p className="text-xs text-slate-500">
                            Roles: {member.roles.join(", ")}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

