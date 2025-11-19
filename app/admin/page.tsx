"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building07, BookOpen01, HeartHand, GraduationHat01 } from "@untitledui/icons";
import { X, ArrowRight, Users, Clock } from "lucide-react";
import { cn } from "@/lib/cn";

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = session?.user?.role ?? null;

  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [advisoryStudentsCount, setAdvisoryStudentsCount] = useState(0);
  const [pendingAdvisoryRequests, setPendingAdvisoryRequests] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [welcomeDismissed, setWelcomeDismissed] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showViewToolModal, setShowViewToolModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const firstName = useMemo(() => {
    if (!session?.user?.name) return "Admin";
    return session.user.name.split(" ")[0];
  }, [session?.user?.name]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin");
      return;
    }

    if (status === "authenticated" && role !== "admin" && role !== "teacher") {
      router.replace("/dashboard");
    }
  }, [status, role, router]);

  useEffect(() => {
    if (session?.user.role !== "admin" && session?.user.role !== "teacher") return;

    const load = async () => {
      setError(null);
      try {
        // Check if welcome notification was dismissed
        const welcomeKey = session?.user?.id ? `admin_welcome_dismissed_${session.user.id}` : null;
        let welcomeDismissedValue = false; // Default to showing welcome (first time)
        if (welcomeKey) {
          try {
            const welcomeRes = await fetch(`/api/settings?key=${welcomeKey}`);
            if (welcomeRes.ok) {
              const data = await welcomeRes.json();
              welcomeDismissedValue = data.exists && data.value === "true";
            }
          } catch (err) {
            // If error, show welcome (first time)
            welcomeDismissedValue = false;
          }
        }
        setWelcomeDismissed(welcomeDismissedValue);

        const [analyticsRes, orgRes, petitionsRes, verificationsRes] = await Promise.all([
          fetch("/api/admin/analytics"),
          fetch("/api/admin/organizations"),
          fetch("/api/petitions?status=pending"),
          fetch("/api/pending-verification-requests"),
        ]);

        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          setAnalytics(analyticsData);
        } else {
          console.error("Failed to load analytics", analyticsRes.statusText);
        }

        let loadedOrganizations: OrganizationSummary[] = [];
        if (orgRes.ok) {
          const orgData = await orgRes.json();
          loadedOrganizations = Array.isArray(orgData.organizations) ? orgData.organizations : [];
          setOrganizations(loadedOrganizations);
        } else {
          console.error("Failed to load organizations", orgRes.statusText);
        }

        // Build notifications from actual data
        const notificationsList: NotificationItem[] = [];
        
        // Pending organizations
        const pendingOrgs = loadedOrganizations.filter((org) => org.status === "PENDING");
        if (pendingOrgs.length > 0) {
          notificationsList.push({
            id: "pending-orgs",
            title: `${pendingOrgs.length} organization${pendingOrgs.length > 1 ? "s" : ""} pending approval`,
            type: "organization",
            timestamp: new Date().toISOString(),
          });
        }

        // Pending petitions
        if (petitionsRes.ok) {
          const petitionsData = await petitionsRes.json();
          const pendingPetitions = Array.isArray(petitionsData.petitions) ? petitionsData.petitions : [];
          if (pendingPetitions.length > 0) {
            notificationsList.push({
              id: "pending-petitions",
              title: `${pendingPetitions.length} petition${pendingPetitions.length > 1 ? "s" : ""} awaiting review`,
              type: "petition",
              timestamp: new Date().toISOString(),
            });
          }
        }

        // Pending verifications
        if (verificationsRes.ok) {
          const verificationsData = await verificationsRes.json();
          const pendingVerifications = Array.isArray(verificationsData.activities) ? verificationsData.activities : [];
          if (pendingVerifications.length > 0) {
            notificationsList.push({
              id: "pending-verifications",
              title: `${pendingVerifications.length} activit${pendingVerifications.length > 1 ? "ies" : "y"} awaiting verification`,
              type: "verification",
              timestamp: new Date().toISOString(),
            });
          }
        }

        // Add welcome notification at the beginning if not dismissed
        if (!welcomeDismissedValue) {
          notificationsList.unshift({
            id: "welcome",
            title: "Welcome to Actify!",
            type: "welcome",
            timestamp: new Date().toISOString(),
            dismissible: true,
          });
        }

        setNotifications(notificationsList);

        // Load advisory data
        try {
          const advisoryRes = await fetch("/api/advisory");
          if (advisoryRes.ok) {
            const advisoryData = await advisoryRes.json();
            setAdvisoryStudentsCount(advisoryData.students?.length || 0);
            setPendingAdvisoryRequests(advisoryData.pendingRequests?.length || 0);
          }
        } catch (err) {
          console.error("Error fetching advisory data:", err);
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

  const handleSeedFakeData = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/seed-fake-data", {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        // Reload the page to see the new data
        window.location.reload();
      } else {
        const errorData = await res.json();
        setError(errorData.error || "Failed to seed fake data");
      }
    } catch (err) {
      console.error("Error seeding fake data:", err);
      setError("Failed to seed fake data");
    } finally {
      setSeeding(false);
    }
  };

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

        {/* Temporary seed button - remove after testing */}
        {(organizations.length === 0 || advisoryStudentsCount === 0) && (
          <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-blue-800">
                Need test data? Create a fake club and student for testing.
              </p>
              <button
                onClick={handleSeedFakeData}
                disabled={seeding}
                className="rounded-xl border border-blue-300 bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 transition hover:bg-blue-200 disabled:opacity-50"
              >
                {seeding ? "Creating..." : "Create Test Data"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 flex-1 overflow-hidden">
          <div className="grid h-full grid-cols-1 gap-3 lg:grid-cols-3 lg:grid-rows-[repeat(2,minmax(0,1fr))]">
            <section
              id="insights"
              onClick={() => router.push("/admin#insights")}
              className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur lg:col-span-2 cursor-pointer transition hover:border-slate-300"
            >
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Insights</h2>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push("/admin#insights");
                  }}
                  className="rounded-full bg-slate-100 border border-slate-200 p-2 text-slate-700 shadow-sm transition hover:bg-slate-200 hover:border-slate-300"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
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
              id="notifications"
              onClick={() => setShowNotificationsModal(true)}
              className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur lg:col-span-1 cursor-pointer transition hover:border-slate-300"
            >
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
                {notifications.length > 0 && (
                  <span className="flex h-8 w-8 rounded-full bg-red-500 shadow-sm"></span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto min-h-0">
                {notifications.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-slate-500">No new notifications</p>
                  </div>
                ) : (
                  <ul className="space-y-2 text-sm text-slate-700">
                    {notifications.slice(0, 3).map((note) => (
                      <li key={note.id} className="rounded-xl border border-slate-100 px-3 py-2.5">
                        {note.id === "welcome" ? (
                          <div>
                            <p className="font-medium text-slate-900 mb-1">{note.title}</p>
                            <p className="text-xs text-slate-600 line-clamp-2">
                              Welcome to Actify! This is your admin dashboard where you can manage organizations, view student activities, and oversee the platform.
                            </p>
                          </div>
                        ) : (
                          <p className="font-medium text-slate-900">{note.title}</p>
                        )}
                      </li>
                    ))}
                    {notifications.length > 3 && (
                      <li className="text-xs text-slate-500 text-center pt-1">
                        +{notifications.length - 3} more
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </section>

            <section
              id="organizations"
              onClick={() => router.push("/admin/organizations")}
              className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur lg:col-span-2 lg:row-start-2 cursor-pointer transition hover:border-slate-300"
            >
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">My Organizations</h2>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push("/admin/organizations");
                  }}
                  className="rounded-full bg-slate-100 border border-slate-200 p-2 text-slate-700 shadow-sm transition hover:bg-slate-200 hover:border-slate-300"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-xl border border-slate-100 px-3 py-2.5 bg-slate-50">
                  <div className="flex items-center gap-2 mb-1">
                    <Building07 className="w-4 h-4 text-slate-600" />
                    <p className="text-xs uppercase text-slate-500">Clubs</p>
                  </div>
                  <p className="text-xl font-bold text-slate-900">{organizations.length}</p>
                </div>
                <div className="rounded-xl border border-slate-100 px-3 py-2.5 bg-slate-50">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-slate-600" />
                    <p className="text-xs uppercase text-slate-500">Advisory</p>
                  </div>
                  <p className="text-xl font-bold text-slate-900">{advisoryStudentsCount}</p>
                </div>
              </div>

              {/* Recent Updates */}
              <div className="flex-1 space-y-2.5 min-h-0">
                {organizationsToDisplay.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Recent Clubs</p>
                    {organizationsToDisplay.slice(0, 3).map((org) => (
                      <div
                        key={org.id}
                        className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5 mb-2"
                      >
                        <p className="text-sm font-semibold text-slate-900 truncate flex-1">{org.name}</p>
                        <span className={cn(
                          "rounded-full border px-2 py-0.5 text-xs font-semibold shrink-0 ml-2",
                          org.status === "APPROVED"
                            ? "border-green-200 bg-green-50 text-green-800"
                            : org.status === "PENDING"
                            ? "border-amber-200 bg-amber-50 text-amber-800"
                            : "border-red-200 bg-red-50 text-red-800"
                        )}>
                          {org.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                
                {pendingAdvisoryRequests > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-700" />
                    <p className="text-sm text-amber-800">
                      <span className="font-semibold">{pendingAdvisoryRequests}</span> pending advisory request{pendingAdvisoryRequests > 1 ? "s" : ""}
                    </p>
                  </div>
                )}

                {organizationsToDisplay.length === 0 && advisoryStudentsCount === 0 && (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-slate-500">No organizations or advisory students yet</p>
                  </div>
                )}
              </div>
            </section>

            <section
              id="view"
              onClick={() => setShowViewToolModal(true)}
              className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur lg:col-span-1 lg:row-start-2 cursor-pointer transition hover:border-slate-300"
            >
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">View Tool</h2>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowViewToolModal(true);
                  }}
                  className="rounded-full bg-slate-100 border border-slate-200 p-2 text-slate-700 shadow-sm transition hover:bg-slate-200 hover:border-slate-300"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="rounded-xl border border-slate-100 px-3 py-2.5">
                <p className="text-sm text-slate-700">
                  See the organizations, activities, volunteering, and alumni databases from the student perspective.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* View Tool Modal */}
      {showViewToolModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-[backdropFadeIn_0.3s_ease-out] backdrop-blur-[2px]"
          onClick={() => setShowViewToolModal(false)}
        >
          <div
            className="relative w-full max-w-4xl mx-4 rounded-2xl border border-slate-200 bg-white shadow-xl animate-[modalFadeIn_0.3s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">View Tool</h2>
                <p className="text-sm text-slate-600 mt-1">
                  See the organizations, activities, volunteering, and alumni databases from the student perspective.
                </p>
              </div>
              <button
                onClick={() => setShowViewToolModal(false)}
                className="rounded-full p-2 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  href="/admin/view/organizations"
                  onClick={() => setShowViewToolModal(false)}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm hover:border-slate-300 hover:shadow-md transition"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="rounded-xl border border-slate-100 p-2">
                      <Building07 className="w-5 h-5 text-slate-700" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">Organizations</h3>
                  </div>
                  <p className="text-sm text-slate-600">Browse and explore all student organizations and clubs with admin details</p>
                </Link>

                <Link
                  href="/admin/view/activities"
                  onClick={() => setShowViewToolModal(false)}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm hover:border-slate-300 hover:shadow-md transition"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="rounded-xl border border-slate-100 p-2">
                      <BookOpen01 className="w-5 h-5 text-slate-700" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">Activities</h3>
                  </div>
                  <p className="text-sm text-slate-600">View student activities and their verification status with admin details</p>
                </Link>

                <Link
                  href="/admin/view/volunteering"
                  onClick={() => setShowViewToolModal(false)}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm hover:border-slate-300 hover:shadow-md transition"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="rounded-xl border border-slate-100 p-2">
                      <HeartHand className="w-5 h-5 text-slate-700" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">Volunteering</h3>
                  </div>
                  <p className="text-sm text-slate-600">See volunteering opportunities and student participation with admin details</p>
                </Link>

                <Link
                  href="/admin/view/alumni"
                  onClick={() => setShowViewToolModal(false)}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm hover:border-slate-300 hover:shadow-md transition"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="rounded-xl border border-slate-100 p-2">
                      <GraduationHat01 className="w-5 h-5 text-slate-700" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">Alumni Database</h3>
                  </div>
                  <p className="text-sm text-slate-600">Explore alumni profiles and college application data</p>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      {showNotificationsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-[backdropFadeIn_0.3s_ease-out] backdrop-blur-[2px]"
          onClick={() => setShowNotificationsModal(false)}
        >
          <div
            className="relative w-full max-w-2xl mx-4 rounded-2xl border border-slate-200 bg-white shadow-xl animate-[modalFadeIn_0.3s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-2xl font-semibold text-slate-900">Notifications</h2>
              <button
                onClick={() => setShowNotificationsModal(false)}
                className="rounded-full p-2 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-sm text-slate-500">No new notifications</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {notifications.map((note) => (
                    <li key={note.id} className="rounded-xl border border-slate-200 px-4 py-3 relative group bg-white">
                      {note.id === "welcome" ? (
                        <div className="pr-8">
                          <p className="font-semibold text-slate-900 mb-1">{note.title}</p>
                          <p className="text-sm text-slate-600">
                            Welcome to Actify! This is your admin dashboard where you can manage organizations, view student activities, and oversee the platform. Explore the widgets below to get started with managing your school's activity verification system.
                          </p>
                        </div>
                      ) : (
                        <p className="font-medium text-slate-900 pr-8">{note.title}</p>
                      )}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (note.id === "welcome") {
                            try {
                              const res = await fetch("/api/admin/dismiss-welcome", {
                                method: "POST",
                              });
                              if (res.ok) {
                                setWelcomeDismissed(true);
                                setNotifications((prev) => prev.filter((n) => n.id !== "welcome"));
                              }
                            } catch (err) {
                              console.error("Error dismissing welcome:", err);
                            }
                          } else {
                            // For other notifications, just remove from list
                            setNotifications((prev) => prev.filter((n) => n.id !== note.id));
                          }
                        }}
                        className="absolute top-3 right-3 rounded-full p-1.5 hover:bg-slate-100 transition text-slate-500 hover:text-slate-700"
                        aria-label="Dismiss notification"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
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

type NotificationItem = {
  id: string;
  title: string;
  type: "welcome" | "organization" | "petition" | "verification" | "activity";
  timestamp: string;
  dismissible?: boolean;
};
