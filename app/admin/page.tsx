"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = session?.user?.role ?? null;

  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const firstName = useMemo(() => {
    if (!session?.user?.name) return "Admin";
    return session.user.name.split(" ")[0];
  }, [session?.user?.name]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin");
      return;
    }

    if (status === "authenticated" && role !== "admin") {
      router.replace("/dashboard");
    }
  }, [status, role, router]);

  useEffect(() => {
    if (session?.user.role !== "admin") return;

    const load = async () => {
      setError(null);
      try {
        const [analyticsRes, orgRes] = await Promise.all([
          fetch("/api/admin/analytics"),
          fetch("/api/admin/organizations"),
        ]);

        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          setAnalytics(analyticsData);
        } else {
          console.error("Failed to load analytics", analyticsRes.statusText);
        }

        if (orgRes.ok) {
          const orgData = await orgRes.json();
          setOrganizations(Array.isArray(orgData.organizations) ? orgData.organizations : []);
        } else {
          console.error("Failed to load organizations", orgRes.statusText);
        }
      } catch (err) {
        console.error("Error fetching admin data", err);
        setError("Some dashboard data could not be loaded. Please refresh.");
      } finally {
        /* no-op */
      }
    };

    load();
  }, [session?.user.role]);

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center text-slate-600">Loading admin tools…</div>;
  }

  const organizationsToDisplay = organizations.slice(0, 4);

  const insights = [
    {
      label: "Students",
      value: analytics?.totalStudents?.toLocaleString() ?? "—",
    },
    {
      label: "Activities",
      value: analytics?.totalActivities?.toLocaleString() ?? "—",
    },
    {
      label: "Organizations",
      value: analytics?.totalOrganizations?.toLocaleString() ?? organizations.length.toString(),
    },
  ];

  const notifications = [
    {
      id: "pending-orgs",
      title: `${organizations.filter((org) => org.status === "PENDING").length} organization approvals pending`,
    },
    {
      id: "approved-orgs",
      title: `${organizations.filter((org) => org.status === "APPROVED").length} organizations live`,
    },
    {
      id: "total-activities",
      title: `${analytics?.totalActivities?.toLocaleString() ?? "0"} total student activities logged`,
    },
  ];

  return (
    <div className="flex h-screen w-full bg-transparent">
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col px-4 py-4">
        <header className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">Admin dashboard</p>
          <h1 className="text-3xl font-semibold text-slate-900">Welcome back, {firstName}</h1>
        </header>

        {error && (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            {error}
          </div>
        )}

        <div className="mt-4 flex-1 overflow-hidden">
          <div className="grid h-full grid-cols-1 gap-3 lg:grid-cols-3 lg:grid-rows-[repeat(2,minmax(0,1fr))]">
            <section
              id="insights"
              className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur lg:col-span-2"
            >
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Insights</h2>
              </div>
              <div className="grid flex-1 grid-cols-3 gap-3 text-sm text-slate-700">
                {insights.map((item) => (
                  <div key={item.label} className="rounded-xl border border-slate-100 px-3 py-2.5">
                    <p className="text-xs uppercase text-slate-500">{item.label}</p>
                    <p className="text-2xl font-semibold text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section
              id="organizations"
              className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur lg:col-span-1"
            >
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">My Organizations</h2>
                <button className="rounded-full border border-slate-200 px-4 py-1 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-600">
                  Manage
                </button>
              </div>
              <div className="flex-1 space-y-2.5">
                {organizationsToDisplay.map((org) => (
                  <div
                    key={org.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5"
                  >
                    <p className="text-sm font-semibold text-slate-900">{org.name}</p>
                    <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                      {org.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section
              id="notifications"
              className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur lg:row-start-2"
            >
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
                <button className="rounded-full border border-slate-200 px-4 py-1 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-600">
                  View all
                </button>
              </div>
              <ul className="space-y-2 text-sm text-slate-700">
                {notifications.map((note) => (
                  <li key={note.id} className="rounded-xl border border-slate-100 px-3 py-2.5">
                    <p className="font-medium text-slate-900">{note.title}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section
              id="view"
              className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur lg:row-start-2"
            >
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">View</h2>
              </div>
              <div className="space-y-3 text-sm text-slate-700">
                <ViewLink label="Student dashboard" href="/dashboard" />
                <ViewLink label="Activities" href="/activities" />
                <ViewLink label="Opportunities" href="/opportunities" />
              </div>
            </section>

            <section
              id="settings"
              className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur lg:row-start-2"
            >
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Settings</h2>
                <button className="rounded-full border border-slate-200 px-4 py-1 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-600">
                  Open
                </button>
              </div>
              <div className="flex-1 rounded-2xl border border-dashed border-slate-200" />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function ViewLink({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50/50"
    >
      <span className="text-sm font-semibold text-slate-900">{label}</span>
      <span className="text-xs text-slate-500">↗</span>
    </a>
  );
}

type AnalyticsSummary = {
  totalStudents: number;
  totalActivities: number;
  totalOrganizations: number;
  verificationByStatus?: { status: string; count: number }[];
};

type OrganizationSummary = {
  id: string;
  name: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  updatedAt?: string;
  createdAt?: string;
};
