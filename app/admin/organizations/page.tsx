"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Users, Calendar, Award, TrendingUp, UserPlus, UserMinus, Crown, Mail, UserCheck, Clock, X, Plus, Trash2, Settings } from "lucide-react";
import { cn } from "@/lib/cn";
import { useDarkMode } from "@/app/context/DarkModeContext";

interface Organization {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  leadership?: string | null;
  presidentName: string | null;
  contactEmail?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  memberCount?: number;
  eventCount?: number;
  createdAt: string;
}

interface AdvisoryStudent {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

interface PendingRequest {
  email: string;
  createdAt: string;
}

export default function MyOrganizationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { darkMode } = useDarkMode();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [advisoryStudents, setAdvisoryStudents] = useState<AdvisoryStudent[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [advisoryEmail, setAdvisoryEmail] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);

  const isAdmin = session?.user?.role === "admin" || session?.user?.role === "teacher";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin");
      return;
    }
    if (status === "authenticated" && !isAdmin) {
      router.replace("/dashboard");
      return;
    }
  }, [status, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;

    const loadData = async () => {
      try {
        // Load organizations
        const orgRes = await fetch("/api/admin/organizations");
        if (orgRes.ok) {
          const orgData = await orgRes.json();
          setOrganizations(orgData.organizations || []);
        }

        // Load advisory
        const advisoryRes = await fetch("/api/advisory");
        if (advisoryRes.ok) {
          const advisoryData = await advisoryRes.json();
          setAdvisoryStudents(advisoryData.students || []);
          setPendingRequests(advisoryData.pendingRequests || []);
        }
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isAdmin]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600">
        Loading organizations…
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="flex h-screen w-full bg-transparent">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col px-6 py-6 overflow-y-auto">
        <header className="flex flex-col gap-1 mb-8">
          <h1 className={cn(
            "text-3xl font-semibold",
            darkMode ? "text-slate-100" : "text-slate-900"
          )}>My Organizations</h1>
          <p className={cn(
            "text-base mt-2 max-w-3xl",
            darkMode ? "text-slate-400" : "text-slate-600"
          )}>
            Manage clubs, view insights, manage members, create events, and award service hours.
          </p>
        </header>

        {error && (
          <div className={cn(
            "mb-6 rounded-2xl border px-4 py-3 text-sm",
            darkMode
              ? "border-red-800 bg-red-900/20 text-red-300"
              : "border-red-200 bg-red-50 text-red-800"
          )}>
            {error}
          </div>
        )}

        <div className="space-y-8">
          {/* Clubs Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className={cn(
                "text-xl font-semibold",
                darkMode ? "text-slate-100" : "text-slate-900"
              )}>Clubs</h2>
            </div>
            {organizations.length === 0 ? (
              <div className={cn(
                "rounded-2xl border p-8 text-center",
                darkMode
                  ? "border-slate-700 bg-slate-900/95"
                  : "border-slate-200 bg-white/95"
              )}>
                <Building2 className={cn(
                  "w-10 h-10 mx-auto mb-3",
                  darkMode ? "text-slate-600" : "text-slate-400"
                )} />
                <h3 className={cn(
                  "text-base font-semibold mb-1",
                  darkMode ? "text-slate-200" : "text-slate-900"
                )}>No clubs yet</h3>
                <p className={cn(
                  "text-sm",
                  darkMode ? "text-slate-400" : "text-slate-600"
                )}>
                  You haven't been linked to any clubs yet. Contact an administrator to be assigned as an advisor.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {organizations.map((org) => (
                  <OrganizationCard 
                    key={org.id} 
                    organization={org} 
                    darkMode={darkMode}
                    onUpdate={async () => {
                      // Refresh organizations list
                      const orgRes = await fetch("/api/admin/organizations");
                      if (orgRes.ok) {
                        const orgData = await orgRes.json();
                        setOrganizations(orgData.organizations || []);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Advisory Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className={cn(
                "text-xl font-semibold",
                darkMode ? "text-slate-100" : "text-slate-900"
              )}>Advisory</h2>
            </div>
            <AdvisorySection
              students={advisoryStudents}
              pendingRequests={pendingRequests}
              darkMode={darkMode}
              onAddStudent={async (email: string) => {
                setSendingRequest(true);
                try {
                  const res = await fetch("/api/advisory", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email }),
                  });
                  if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || "Failed to send request");
                  }
                  setAdvisoryEmail("");
                  // Reload advisory data
                  const advisoryRes = await fetch("/api/advisory");
                  if (advisoryRes.ok) {
                    const advisoryData = await advisoryRes.json();
                    setAdvisoryStudents(advisoryData.students || []);
                    setPendingRequests(advisoryData.pendingRequests || []);
                  }
                } catch (err: any) {
                  setError(err.message || "Failed to send advisory request");
                } finally {
                  setSendingRequest(false);
                }
              }}
              email={advisoryEmail}
              setEmail={setAdvisoryEmail}
              sendingRequest={sendingRequest}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

function OrganizationCard({ 
  organization, 
  darkMode,
  onUpdate 
}: { 
  organization: Organization; 
  darkMode: boolean;
  onUpdate?: () => void;
}) {
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showEventsModal, setShowEventsModal] = useState(false);
  const [showEngagementModal, setShowEngagementModal] = useState(false);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [showAwardHoursModal, setShowAwardHoursModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [showEventDetailModal, setShowEventDetailModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [engagementData, setEngagementData] = useState<any>(null);
  const [memberCount, setMemberCount] = useState(organization.memberCount ?? 0);
  const [eventCount, setEventCount] = useState(organization.eventCount ?? 0);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingEngagement, setLoadingEngagement] = useState(false);
  const [eventStats, setEventStats] = useState({
    upcoming: 0,
    thisMonth: 0,
    nextEventDate: null as string | null,
  });
  const [memberStats, setMemberStats] = useState({
    active: 0,
    newThisMonth: 0,
    withRoles: 0,
  });

  // Load member and event counts on mount
  useEffect(() => {
    // Load members and calculate stats
    fetch(`/api/admin/organizations/${organization.id}/members`)
      .then((res) => res.json())
      .then((data) => {
        if (data.members) {
          setMembers(data.members);
          setMemberCount(data.members.length);
          
          // Calculate member stats
          const now = new Date();
          const thisMonth = now.getMonth();
          const thisYear = now.getFullYear();
          
          // Note: We don't have join dates, so we'll use all members as active
          // and calculate new members based on a heuristic (could be improved with actual join dates)
          const active = data.members.length;
          const withRoles = data.members.filter((m: any) => m.roles && m.roles.length > 0).length;
          
          // For now, we'll estimate new members (this would ideally come from member join dates)
          // Since we don't have that data, we'll show 0 for now
          const newThisMonth = 0;
          
          setMemberStats({
            active,
            newThisMonth,
            withRoles,
          });
        }
      })
      .catch((err) => {
        console.error("Error loading member count:", err);
      });

    // Load events and calculate stats
    fetch(`/api/admin/organizations/${organization.id}/events`)
      .then((res) => res.json())
      .then((data) => {
        if (data.events) {
          setEvents(data.events);
          setEventCount(data.events.length);
          
          // Calculate event stats
          const now = new Date();
          const thisMonth = now.getMonth();
          const thisYear = now.getFullYear();
          
          const upcoming = data.upcoming || [];
          const thisMonthEvents = data.events.filter((e: any) => {
            const eventDate = new Date(e.date);
            return eventDate.getMonth() === thisMonth && eventDate.getFullYear() === thisYear;
          });
          
          const nextEvent = upcoming.length > 0 ? upcoming[0] : null;
          
          setEventStats({
            upcoming: upcoming.length,
            thisMonth: thisMonthEvents.length,
            nextEventDate: nextEvent ? nextEvent.date : null,
          });
        }
      })
      .catch((err) => {
        console.error("Error loading event count:", err);
      });
  }, [organization.id]);

  // Load members when modal opens
  useEffect(() => {
    if (showMembersModal && members.length === 0 && !loadingMembers) {
      setLoadingMembers(true);
      fetch(`/api/admin/organizations/${organization.id}/members`)
        .then((res) => res.json())
        .then((data) => {
          if (data.members) {
            setMembers(data.members);
            setMemberCount(data.members.length);
            
            // Recalculate member stats
            const active = data.members.length;
            const withRoles = data.members.filter((m: any) => m.roles && m.roles.length > 0).length;
            setMemberStats({
              active,
              newThisMonth: 0, // Would need join dates to calculate
              withRoles,
            });
          }
        })
        .catch((err) => {
          console.error("Error loading members:", err);
        })
        .finally(() => {
          setLoadingMembers(false);
        });
    }
  }, [showMembersModal, organization.id]);

  // Load events when modal opens
  useEffect(() => {
    if (showEventsModal && events.length === 0 && !loadingEvents) {
      setLoadingEvents(true);
      fetch(`/api/admin/organizations/${organization.id}/events`)
        .then((res) => res.json())
        .then((data) => {
          if (data.events) {
            setEvents(data.events);
            setEventCount(data.events.length);
            
            // Recalculate stats
            const now = new Date();
            const thisMonth = now.getMonth();
            const thisYear = now.getFullYear();
            const upcoming = data.upcoming || [];
            const thisMonthEvents = data.events.filter((e: any) => {
              const eventDate = new Date(e.date);
              return eventDate.getMonth() === thisMonth && eventDate.getFullYear() === thisYear;
            });
            const nextEvent = upcoming.length > 0 ? upcoming[0] : null;
            setEventStats({
              upcoming: upcoming.length,
              thisMonth: thisMonthEvents.length,
              nextEventDate: nextEvent ? nextEvent.date : null,
            });
          }
        })
        .catch((err) => {
          console.error("Error loading events:", err);
        })
        .finally(() => {
          setLoadingEvents(false);
        });
    }
  }, [showEventsModal, organization.id]);

  // Load members when Award Hours modal opens
  useEffect(() => {
    if (showAwardHoursModal && members.length === 0 && !loadingMembers) {
      setLoadingMembers(true);
      fetch(`/api/admin/organizations/${organization.id}/members`)
        .then((res) => res.json())
        .then((data) => {
          if (data.members) {
            setMembers(data.members);
            setMemberCount(data.members.length);
          }
        })
        .catch((err) => {
          console.error("Error loading members:", err);
        })
        .finally(() => {
          setLoadingMembers(false);
        });
    }
  }, [showAwardHoursModal, organization.id]);

  return (
    <>
      <div className={cn(
        "rounded-2xl border p-6 shadow-2xl backdrop-blur transition hover:shadow-[0_20px_50px_rgba(15,23,42,0.35)]",
        darkMode
          ? "border-slate-700 bg-slate-900/95 hover:border-slate-600"
          : "border-slate-200 bg-white/95 hover:border-slate-300"
      )}>
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h3 className={cn(
              "text-2xl font-semibold mb-2",
              darkMode ? "text-slate-100" : "text-slate-900"
            )}>
              {organization.name}
            </h3>
            {organization.description && (
              <p className={cn(
                "text-sm",
                darkMode ? "text-slate-400" : "text-slate-600"
              )}>
                {organization.description}
              </p>
            )}
          </div>
          <button
            onClick={() => setShowSettingsModal(true)}
            className={cn(
              "rounded-lg border p-2 transition-colors",
              darkMode
                ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:border-slate-600"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-400"
            )}
            title="Edit club settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Three Main Sections */}
        <div className="grid grid-cols-3 gap-4">
          {/* Members Section */}
          <div
            onClick={() => setShowMembersModal(true)}
            className={cn(
              "rounded-xl border p-5 cursor-pointer transition-all shadow-xl hover:shadow-[0_18px_35px_rgba(15,23,42,0.3)] hover:scale-[1.02]",
              darkMode
                ? "border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800"
                : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
            )}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                "rounded-xl p-2.5 shadow-sm",
                darkMode ? "bg-slate-700" : "bg-white border border-slate-200"
              )}>
                <Users className={cn(
                  "w-5 h-5",
                  darkMode ? "text-slate-300" : "text-slate-700"
                )} />
              </div>
              <h4 className={cn(
                "text-base font-semibold",
                darkMode ? "text-slate-100" : "text-slate-900"
              )}>
                Members
              </h4>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <p className={cn(
                  "text-3xl font-bold",
                  darkMode ? "text-slate-100" : "text-slate-900"
                )}>
                  {memberStats.active}
                </p>
                {memberStats.newThisMonth > 0 && (
                  <span className={cn(
                    "text-xs font-semibold px-1.5 py-0.5 rounded",
                    darkMode ? "bg-green-900/30 text-green-300" : "bg-green-100 text-green-700"
                  )}>
                    +{memberStats.newThisMonth}
                  </span>
                )}
              </div>
              <div className="space-y-0.5">
                <p className={cn(
                  "text-xs font-medium",
                  darkMode ? "text-slate-400" : "text-slate-500"
                )}>
                  Active members
                </p>
                {memberStats.withRoles > 0 && (
                  <p className={cn(
                    "text-xs",
                    darkMode ? "text-slate-500" : "text-slate-500"
                  )}>
                    {memberStats.withRoles} with roles
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Events Section */}
          <div
            onClick={() => setShowEventsModal(true)}
            className={cn(
              "rounded-xl border p-5 cursor-pointer transition-all shadow-xl hover:shadow-[0_18px_35px_rgba(15,23,42,0.3)] hover:scale-[1.02]",
              darkMode
                ? "border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800"
                : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
            )}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                "rounded-xl p-2.5 shadow-sm",
                darkMode ? "bg-slate-700" : "bg-white border border-slate-200"
              )}>
                <Calendar className={cn(
                  "w-5 h-5",
                  darkMode ? "text-slate-300" : "text-slate-700"
                )} />
              </div>
              <h4 className={cn(
                "text-base font-semibold",
                darkMode ? "text-slate-100" : "text-slate-900"
              )}>
                Events
              </h4>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <p className={cn(
                  "text-3xl font-bold",
                  darkMode ? "text-slate-100" : "text-slate-900"
                )}>
                  {eventStats.upcoming}
                </p>
                {eventStats.thisMonth > 0 && (
                  <span className={cn(
                    "text-xs font-semibold px-1.5 py-0.5 rounded",
                    darkMode ? "bg-slate-700/50 text-slate-300" : "bg-slate-200 text-slate-700"
                  )}>
                    {eventStats.thisMonth} this month
                  </span>
                )}
              </div>
              <div className="space-y-0.5">
                <p className={cn(
                  "text-xs font-medium",
                  darkMode ? "text-slate-400" : "text-slate-500"
                )}>
                  Upcoming events
                </p>
                {eventStats.nextEventDate && (
                  <p className={cn(
                    "text-xs",
                    darkMode ? "text-slate-500" : "text-slate-500"
                  )}>
                    Next: {new Date(eventStats.nextEventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Engagement Section */}
          <div
            onClick={() => setShowEngagementModal(true)}
            className={cn(
              "rounded-xl border p-5 cursor-pointer transition-all shadow-xl hover:shadow-[0_18px_35px_rgba(15,23,42,0.3)] hover:scale-[1.02]",
              darkMode
                ? "border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800"
                : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
            )}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                "rounded-xl p-2.5 shadow-sm",
                darkMode ? "bg-slate-700" : "bg-white border border-slate-200"
              )}>
                <TrendingUp className={cn(
                  "w-5 h-5",
                  darkMode ? "text-slate-300" : "text-slate-700"
                )} />
              </div>
              <h4 className={cn(
                "text-base font-semibold",
                darkMode ? "text-slate-100" : "text-slate-900"
              )}>
                Engagement
              </h4>
            </div>
            <EngagementChart darkMode={darkMode} organizationId={organization.id} />
          </div>
        </div>
      </div>

      {/* Members Modal */}
      {showMembersModal && (
        <MembersModal
          organization={organization}
          members={members}
          loading={loadingMembers}
          darkMode={darkMode}
          onClose={() => setShowMembersModal(false)}
          onRemoveMember={(memberId: string) => {
            setMembers(members.filter(m => m.id !== memberId));
          }}
          onAppointRole={(memberId: string, roleName: string) => {
            setMembers(members.map(m => {
              if (m.id === memberId) {
                const currentRoles = m.roles || [];
                if (!currentRoles.includes(roleName)) {
                  return { ...m, roles: [...currentRoles, roleName] };
                }
              }
              return m;
            }));
          }}
          onRemoveRole={(memberId: string, roleName: string) => {
            setMembers(members.map(m => {
              if (m.id === memberId) {
                return { ...m, roles: (m.roles || []).filter((r: string) => r !== roleName) };
              }
              return m;
            }));
          }}
        />
      )}

      {/* Events Modal */}
      {showEventsModal && (
        <EventsModal
          organization={organization}
          events={events}
          loading={loadingEvents}
          darkMode={darkMode}
          onClose={() => setShowEventsModal(false)}
          onCreateEvent={() => {
            setShowCreateEventModal(true);
          }}
          onAwardHours={() => {
            setShowAwardHoursModal(true);
          }}
          onEventClick={(event) => {
            setSelectedEvent(event);
            setShowEventDetailModal(true);
          }}
        />
      )}

      {/* Event Detail/Edit Modal */}
      {showEventDetailModal && selectedEvent && (
        <EventDetailModal
          organization={organization}
          event={selectedEvent}
          darkMode={darkMode}
          onClose={() => {
            setShowEventDetailModal(false);
            setSelectedEvent(null);
          }}
          onUpdate={() => {
            // Reload events
            setLoadingEvents(true);
            fetch(`/api/admin/organizations/${organization.id}/events`)
              .then((res) => res.json())
              .then((data) => {
                if (data.events) {
                  setEvents(data.events);
                  setEventCount(data.events.length);
                  
                  // Recalculate stats
                  const now = new Date();
                  const thisMonth = now.getMonth();
                  const thisYear = now.getFullYear();
                  const upcoming = data.upcoming || [];
                  const thisMonthEvents = data.events.filter((e: any) => {
                    const eventDate = new Date(e.date);
                    return eventDate.getMonth() === thisMonth && eventDate.getFullYear() === thisYear;
                  });
                  const nextEvent = upcoming.length > 0 ? upcoming[0] : null;
                  setEventStats({
                    upcoming: upcoming.length,
                    thisMonth: thisMonthEvents.length,
                    nextEventDate: nextEvent ? nextEvent.date : null,
                  });
                }
              })
              .catch((err) => {
                console.error("Error loading events:", err);
              })
              .finally(() => {
                setLoadingEvents(false);
              });
          }}
          onDelete={() => {
            setShowEventDetailModal(false);
            setSelectedEvent(null);
            // Reload events
            setLoadingEvents(true);
            fetch(`/api/admin/organizations/${organization.id}/events`)
              .then((res) => res.json())
              .then((data) => {
                if (data.events) {
                  setEvents(data.events);
                  setEventCount(data.events.length);
                  
                  // Recalculate stats
                  const now = new Date();
                  const thisMonth = now.getMonth();
                  const thisYear = now.getFullYear();
                  const upcoming = data.upcoming || [];
                  const thisMonthEvents = data.events.filter((e: any) => {
                    const eventDate = new Date(e.date);
                    return eventDate.getMonth() === thisMonth && eventDate.getFullYear() === thisYear;
                  });
                  const nextEvent = upcoming.length > 0 ? upcoming[0] : null;
                  setEventStats({
                    upcoming: upcoming.length,
                    thisMonth: thisMonthEvents.length,
                    nextEventDate: nextEvent ? nextEvent.date : null,
                  });
                }
              })
              .catch((err) => {
                console.error("Error loading events:", err);
              })
              .finally(() => {
                setLoadingEvents(false);
              });
          }}
        />
      )}

      {/* Create Event Modal */}
      {showCreateEventModal && (
        <CreateEventModal
          organization={organization}
          darkMode={darkMode}
          onClose={() => setShowCreateEventModal(false)}
          onSuccess={() => {
            setShowCreateEventModal(false);
            // Reload events
            setLoadingEvents(true);
            fetch(`/api/admin/organizations/${organization.id}/events`)
              .then((res) => res.json())
              .then((data) => {
                if (data.events) {
                  setEvents(data.events);
                  setEventCount(data.events.length);
                  
                  // Recalculate stats
                  const now = new Date();
                  const thisMonth = now.getMonth();
                  const thisYear = now.getFullYear();
                  const upcoming = data.upcoming || [];
                  const thisMonthEvents = data.events.filter((e: any) => {
                    const eventDate = new Date(e.date);
                    return eventDate.getMonth() === thisMonth && eventDate.getFullYear() === thisYear;
                  });
                  const nextEvent = upcoming.length > 0 ? upcoming[0] : null;
                  setEventStats({
                    upcoming: upcoming.length,
                    thisMonth: thisMonthEvents.length,
                    nextEventDate: nextEvent ? nextEvent.date : null,
                  });
                }
              })
              .catch((err) => {
                console.error("Error loading events:", err);
              })
              .finally(() => {
                setLoadingEvents(false);
              });
          }}
        />
      )}

      {/* Award Hours Modal */}
      {showAwardHoursModal && (
        <AwardHoursModal
          organization={organization}
          members={members}
          darkMode={darkMode}
          onClose={() => setShowAwardHoursModal(false)}
          onSuccess={() => {
            setShowAwardHoursModal(false);
          }}
        />
      )}

      {/* Engagement Modal */}
      {showEngagementModal && (
        <EngagementModal
          organization={organization}
          darkMode={darkMode}
          onClose={() => setShowEngagementModal(false)}
          engagementData={engagementData}
          setEngagementData={setEngagementData}
          loadingEngagement={loadingEngagement}
          setLoadingEngagement={setLoadingEngagement}
        />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          organization={organization}
          darkMode={darkMode}
          onClose={() => setShowSettingsModal(false)}
          onUpdate={async (updatedOrg) => {
            setShowSettingsModal(false);
            if (onUpdate) {
              await onUpdate();
            }
          }}
        />
      )}
    </>
  );
}

function SettingsModal({
  organization,
  darkMode,
  onClose,
  onUpdate,
}: {
  organization: Organization;
  darkMode: boolean;
  onClose: () => void;
  onUpdate: (updatedOrg: Organization) => void;
}) {
  const [formData, setFormData] = useState({
    name: organization.name || "",
    description: organization.description || "",
    category: organization.category || "",
    leadership: organization.leadership || "",
    presidentName: organization.presidentName || "",
    contactEmail: organization.contactEmail || "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch(`/api/admin/organizations/${organization.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update organization");
      }

      const data = await response.json();
      onUpdate(data.organization);
    } catch (err: any) {
      console.error("Error updating organization:", err);
      setError(err.message || "Failed to update organization. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 animate-[backdropFadeIn_0.3s_ease-out] backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className={cn(
          "relative w-full max-w-2xl mx-4 rounded-2xl border shadow-xl animate-[modalFadeIn_0.3s_ease-out] max-h-[90vh] overflow-hidden flex flex-col",
          darkMode
            ? "border-slate-700 bg-slate-900"
            : "border-slate-200 bg-white"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn(
          "flex items-center justify-between p-6 border-b",
          darkMode ? "border-slate-700" : "border-slate-200"
        )}>
          <div>
            <h2 className={cn(
              "text-2xl font-semibold",
              darkMode ? "text-slate-100" : "text-slate-900"
            )}>
              Club Settings
            </h2>
            <p className={cn(
              "text-sm mt-1",
              darkMode ? "text-slate-400" : "text-slate-600"
            )}>
              Edit your club's information
            </p>
          </div>
          <button
            onClick={onClose}
            className={cn(
              "rounded-full p-2 transition-colors",
              darkMode
                ? "hover:bg-slate-800 text-slate-300"
                : "hover:bg-slate-100 text-slate-600"
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className={cn(
              "mb-4 rounded-xl border px-4 py-3 text-sm",
              darkMode
                ? "border-red-800 bg-red-900/20 text-red-300"
                : "border-red-200 bg-red-50 text-red-800"
            )}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={cn(
                "block text-sm font-semibold mb-2",
                darkMode ? "text-slate-200" : "text-slate-800"
              )}>
                Club Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2",
                  darkMode
                    ? "border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus:ring-slate-500 focus:border-slate-500"
                    : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-slate-500 focus:border-slate-500"
                )}
                placeholder="Enter club name"
              />
            </div>

            <div>
              <label className={cn(
                "block text-sm font-semibold mb-2",
                darkMode ? "text-slate-200" : "text-slate-800"
              )}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                rows={4}
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 resize-none",
                  darkMode
                    ? "border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus:ring-slate-500 focus:border-slate-500"
                    : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-slate-500 focus:border-slate-500"
                )}
                placeholder="Describe your club's purpose and activities"
              />
            </div>

            <div>
              <label className={cn(
                "block text-sm font-semibold mb-2",
                darkMode ? "text-slate-200" : "text-slate-800"
              )}>
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2",
                  darkMode
                    ? "border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus:ring-slate-500 focus:border-slate-500"
                    : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-slate-500 focus:border-slate-500"
                )}
                placeholder="e.g., Academic, Arts, Sports, Service"
              />
            </div>

            <div>
              <label className={cn(
                "block text-sm font-semibold mb-2",
                darkMode ? "text-slate-200" : "text-slate-800"
              )}>
                Leadership & Advisor
              </label>
              <input
                type="text"
                value={formData.leadership}
                onChange={(e) => setFormData((prev) => ({ ...prev, leadership: e.target.value }))}
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2",
                  darkMode
                    ? "border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus:ring-slate-500 focus:border-slate-500"
                    : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-slate-500 focus:border-slate-500"
                )}
                placeholder="e.g., Mr. Smith (Advisor), Jane Doe (President)"
              />
            </div>

            <div>
              <label className={cn(
                "block text-sm font-semibold mb-2",
                darkMode ? "text-slate-200" : "text-slate-800"
              )}>
                President / Lead
              </label>
              <input
                type="text"
                value={formData.presidentName}
                onChange={(e) => setFormData((prev) => ({ ...prev, presidentName: e.target.value }))}
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2",
                  darkMode
                    ? "border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus:ring-slate-500 focus:border-slate-500"
                    : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-slate-500 focus:border-slate-500"
                )}
                placeholder="Name of club president or lead"
              />
            </div>

            <div>
              <label className={cn(
                "block text-sm font-semibold mb-2",
                darkMode ? "text-slate-200" : "text-slate-800"
              )}>
                Contact Email
              </label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData((prev) => ({ ...prev, contactEmail: e.target.value }))}
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2",
                  darkMode
                    ? "border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus:ring-slate-500 focus:border-slate-500"
                    : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-slate-500 focus:border-slate-500"
                )}
                placeholder="club@example.com"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  "flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm",
                  darkMode
                    ? "border-slate-600 bg-slate-600 text-white hover:bg-slate-700 hover:border-slate-700"
                    : "border-slate-600 bg-slate-600 text-white hover:bg-slate-700 hover:border-slate-700"
                )}
              >
                {submitting ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  "rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors",
                  darkMode
                    ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:border-slate-600"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400"
                )}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  darkMode,
}: {
  icon: any;
  label: string;
  value: string | number;
  darkMode: boolean;
}) {
  return (
    <div className={cn(
      "rounded-xl border p-3 text-center",
      darkMode
        ? "border-slate-700 bg-slate-800/50"
        : "border-slate-200 bg-slate-50"
    )}>
      <Icon className={cn(
        "w-5 h-5 mx-auto mb-1",
        darkMode ? "text-slate-400" : "text-slate-600"
      )} />
      <p className={cn(
        "text-lg font-bold",
        darkMode ? "text-slate-100" : "text-slate-900"
      )}>
        {value}
      </p>
      <p className={cn(
        "text-xs mt-0.5",
        darkMode ? "text-slate-500" : "text-slate-500"
      )}>
        {label}
      </p>
    </div>
  );
}

function FeatureBadge({
  icon: Icon,
  label,
  darkMode,
}: {
  icon: any;
  label: string;
  darkMode: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs",
      darkMode
        ? "border-slate-700 bg-slate-800 text-slate-300"
        : "border-slate-200 bg-white text-slate-700"
    )}>
      <Icon className="w-3 h-3" />
      <span>{label}</span>
    </div>
  );
}

function AdvisorySection({
  students,
  pendingRequests,
  darkMode,
  onAddStudent,
  email,
  setEmail,
  sendingRequest,
}: {
  students: AdvisoryStudent[];
  pendingRequests: PendingRequest[];
  darkMode: boolean;
  onAddStudent: (email: string) => Promise<void>;
  email: string;
  setEmail: (email: string) => void;
  sendingRequest: boolean;
}) {
  return (
    <div className={cn(
      "rounded-2xl border p-6 shadow-lg backdrop-blur",
      darkMode
        ? "border-slate-700 bg-slate-900/95"
        : "border-slate-200 bg-white/95"
    )}>
      {/* Add Student Form */}
      <div className="mb-6">
        <label className={cn(
          "text-xs font-semibold uppercase tracking-wide block mb-2",
          darkMode ? "text-slate-400" : "text-slate-500"
        )}>
          Add Student to Advisory
        </label>
        <div className="flex gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@example.com"
            className={cn(
              "flex-1 rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2",
              darkMode
                ? "border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus:ring-slate-600"
                : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-slate-400"
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter" && email.trim() && !sendingRequest) {
                onAddStudent(email.trim());
              }
            }}
          />
          <button
            onClick={() => onAddStudent(email.trim())}
            disabled={!email.trim() || sendingRequest}
            className={cn(
              "rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm",
              darkMode
                ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:border-slate-600"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400"
            )}
          >
            {sendingRequest ? "Sending…" : "Send Request"}
          </button>
        </div>
        <p className={cn(
          "text-xs mt-2",
          darkMode ? "text-slate-500" : "text-slate-500"
        )}>
          The student will receive a request to join your advisory. They must accept to be added.
        </p>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="mb-6">
          <div className={cn(
            "flex items-center gap-2 mb-3",
            darkMode ? "text-slate-300" : "text-slate-700"
          )}>
            <Clock className="w-4 h-4" />
            <h3 className="text-sm font-semibold">Pending Requests</h3>
          </div>
          <div className="space-y-2">
            {pendingRequests.map((request, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-center justify-between rounded-xl border px-3 py-2",
                  darkMode
                    ? "border-slate-700 bg-slate-800/50"
                    : "border-slate-200 bg-slate-50"
                )}
              >
                <div className="flex items-center gap-2">
                  <Mail className={cn(
                    "w-4 h-4",
                    darkMode ? "text-slate-400" : "text-slate-600"
                  )} />
                  <span className={cn(
                    "text-sm",
                    darkMode ? "text-slate-300" : "text-slate-700"
                  )}>
                    {request.email}
                  </span>
                </div>
                <span className={cn(
                  "text-xs",
                  darkMode ? "text-slate-500" : "text-slate-500"
                )}>
                  Awaiting response
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Students List */}
      {students.length === 0 ? (
        <div className={cn(
          "rounded-xl border p-8 text-center",
          darkMode
            ? "border-slate-700 bg-slate-800/50"
            : "border-slate-200 bg-slate-50"
        )}>
          <Users className={cn(
            "w-10 h-10 mx-auto mb-3",
            darkMode ? "text-slate-600" : "text-slate-400"
          )} />
          <h3 className={cn(
            "text-base font-semibold mb-1",
            darkMode ? "text-slate-200" : "text-slate-900"
          )}>No students in advisory</h3>
          <p className={cn(
            "text-sm",
            darkMode ? "text-slate-400" : "text-slate-600"
          )}>
            Add students by email above. They'll need to accept your request to join.
          </p>
        </div>
      ) : (
        <div>
          <div className={cn(
            "flex items-center gap-2 mb-3",
            darkMode ? "text-slate-300" : "text-slate-700"
          )}>
            <UserCheck className="w-4 h-4" />
            <h3 className="text-sm font-semibold">Students ({students.length})</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {students.map((student) => (
              <Link
                key={student.id}
                href={`/admin/advisory/${student.id}`}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 transition",
                  darkMode
                    ? "border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600"
                    : "border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300"
                )}
              >
                {student.image ? (
                  <img
                    src={student.image}
                    alt={student.name}
                    className="w-10 h-10 rounded-full border-2"
                  />
                ) : (
                  <div className={cn(
                    "w-10 h-10 rounded-full border-2 flex items-center justify-center font-semibold text-sm",
                    darkMode
                      ? "border-slate-600 bg-slate-700 text-slate-300"
                      : "border-slate-300 bg-slate-200 text-slate-700"
                  )}>
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-semibold truncate",
                    darkMode ? "text-slate-100" : "text-slate-900"
                  )}>
                    {student.name}
                  </p>
                  <p className={cn(
                    "text-xs truncate",
                    darkMode ? "text-slate-400" : "text-slate-600"
                  )}>
                    {student.email}
                  </p>
                </div>
                <TrendingUp className={cn(
                  "w-4 h-4 shrink-0",
                  darkMode ? "text-slate-400" : "text-slate-600"
                )} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Members Modal Component
function MembersModal({
  organization,
  members,
  loading,
  darkMode,
  onClose,
  onRemoveMember,
  onAppointRole,
  onRemoveRole,
}: {
  organization: Organization;
  members: any[];
  loading: boolean;
  darkMode: boolean;
  onClose: () => void;
  onRemoveMember: (memberId: string) => void;
  onAppointRole: (memberId: string, roleName: string) => void;
  onRemoveRole: (memberId: string, roleName: string) => void;
}) {
  const [appointingForMember, setAppointingForMember] = useState<string | null>(null);
  const [roleInput, setRoleInput] = useState("");

  const handleAppointRole = (memberId: string) => {
    if (roleInput.trim()) {
      onAppointRole(memberId, roleInput.trim());
      setRoleInput("");
      setAppointingForMember(null);
    }
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-[backdropFadeIn_0.3s_ease-out] backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className={cn(
          "relative w-full max-w-4xl mx-4 rounded-2xl border shadow-xl animate-[modalFadeIn_0.3s_ease-out] max-h-[80vh] overflow-hidden flex flex-col",
          darkMode
            ? "border-slate-700 bg-slate-900"
            : "border-slate-200 bg-white"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn(
          "flex items-center justify-between p-6 border-b",
          darkMode ? "border-slate-700" : "border-slate-200"
        )}>
          <div>
            <h2 className={cn(
              "text-2xl font-semibold",
              darkMode ? "text-slate-100" : "text-slate-900"
            )}>
              Members - {organization.name}
            </h2>
            <p className={cn(
              "text-sm mt-1",
              darkMode ? "text-slate-400" : "text-slate-600"
            )}>
              Manage club members, remove members, and appoint leaders
            </p>
          </div>
          <button
            onClick={onClose}
            className={cn(
              "rounded-full p-2 transition-colors",
              darkMode
                ? "hover:bg-slate-800 text-slate-300"
                : "hover:bg-slate-100 text-slate-600"
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className={cn(
                "text-sm",
                darkMode ? "text-slate-400" : "text-slate-600"
              )}>
                Loading members...
              </p>
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className={cn(
                "w-12 h-12 mb-3",
                darkMode ? "text-slate-600" : "text-slate-400"
              )} />
              <p className={cn(
                "text-sm",
                darkMode ? "text-slate-400" : "text-slate-600"
              )}>
                No members yet
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className={cn(
                    "flex items-center justify-between rounded-xl border p-4",
                    darkMode
                      ? "border-slate-700 bg-slate-800/50"
                      : "border-slate-200 bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={cn(
                      "w-10 h-10 rounded-full border-2 flex items-center justify-center font-semibold text-sm",
                      darkMode
                        ? "border-slate-600 bg-slate-700 text-slate-300"
                        : "border-slate-300 bg-slate-200 text-slate-700"
                    )}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={cn(
                          "text-sm font-semibold",
                          darkMode ? "text-slate-100" : "text-slate-900"
                        )}>
                          {member.name}
                        </p>
                        {(member.roles || []).map((role: string) => (
                          <span
                            key={role}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                              darkMode
                                ? "border-amber-700 bg-amber-900/30 text-amber-300"
                                : "border-amber-200 bg-amber-50 text-amber-800"
                            )}
                          >
                            <Crown className="w-3 h-3" />
                            {role}
                            <button
                              onClick={() => onRemoveRole(member.id, role)}
                              className="ml-1 hover:opacity-70"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <p className={cn(
                        "text-xs mt-0.5",
                        darkMode ? "text-slate-400" : "text-slate-600"
                      )}>
                        {member.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAppointingForMember(member.id)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                        darkMode
                          ? "border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      <Crown className="w-3 h-3 inline mr-1" />
                      Appoint Role
                    </button>
                    <button
                      onClick={() => onRemoveMember(member.id)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                        darkMode
                          ? "border-red-700 bg-red-900/30 text-red-300 hover:bg-red-900/50"
                          : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                      )}
                    >
                      <Trash2 className="w-3 h-3 inline mr-1" />
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Role Input Modal */}
          {appointingForMember && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 animate-[backdropFadeIn_0.3s_ease-out] backdrop-blur-[2px]">
              <div
                className={cn(
                  "relative w-full max-w-md mx-4 rounded-2xl border shadow-xl animate-[modalFadeIn_0.3s_ease-out]",
                  darkMode
                    ? "border-slate-700 bg-slate-900"
                    : "border-slate-200 bg-white"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={cn(
                  "flex items-center justify-between p-4 border-b",
                  darkMode ? "border-slate-700" : "border-slate-200"
                )}>
                  <h3 className={cn(
                    "text-lg font-semibold",
                    darkMode ? "text-slate-100" : "text-slate-900"
                  )}>
                    Appoint Role
                  </h3>
                  <button
                    onClick={() => {
                      setAppointingForMember(null);
                      setRoleInput("");
                    }}
                    className={cn(
                      "rounded-full p-1 transition",
                      darkMode
                        ? "hover:bg-slate-800 text-slate-300"
                        : "hover:bg-slate-100 text-slate-600"
                    )}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4">
                  <label className={cn(
                    "text-xs font-semibold uppercase tracking-wide block mb-2",
                    darkMode ? "text-slate-400" : "text-slate-500"
                  )}>
                    Role Name
                  </label>
                  <input
                    type="text"
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && roleInput.trim()) {
                        handleAppointRole(appointingForMember);
                      }
                    }}
                    placeholder="e.g., President, Secretary, Treasurer"
                    className={cn(
                      "w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2",
                      darkMode
                        ? "border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus:ring-slate-600"
                        : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-slate-400"
                    )}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleAppointRole(appointingForMember)}
                      disabled={!roleInput.trim()}
                      className={cn(
                        "flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm",
                        darkMode
                          ? "border-slate-600 bg-slate-700 text-white hover:bg-slate-600 hover:border-slate-600 disabled:hover:bg-slate-700"
                          : "border-slate-600 bg-slate-600 text-white hover:bg-slate-700 hover:border-slate-700 disabled:hover:bg-slate-600"
                      )}
                    >
                      Appoint
                    </button>
                    <button
                      onClick={() => {
                        setAppointingForMember(null);
                        setRoleInput("");
                      }}
                      className={cn(
                        "rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors",
                        darkMode
                          ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:border-slate-600"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400"
                      )}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Events Modal Component
function EventsModal({
  organization,
  events,
  loading,
  darkMode,
  onClose,
  onCreateEvent,
  onAwardHours,
  onEventClick,
}: {
  organization: Organization;
  events: any[];
  loading: boolean;
  darkMode: boolean;
  onClose: () => void;
  onCreateEvent: () => void;
  onAwardHours: () => void;
  onEventClick: (event: any) => void;
}) {
  const upcomingEvents = events.filter(e => e.type === "upcoming");
  const pastEvents = events.filter(e => e.type === "past");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-[backdropFadeIn_0.3s_ease-out] backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className={cn(
          "relative w-full max-w-5xl mx-4 rounded-2xl border shadow-xl animate-[modalFadeIn_0.3s_ease-out] max-h-[80vh] overflow-hidden flex flex-col",
          darkMode
            ? "border-slate-700 bg-slate-900"
            : "border-slate-200 bg-white"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn(
          "flex items-center justify-between p-6 border-b",
          darkMode ? "border-slate-700" : "border-slate-200"
        )}>
          <div>
            <h2 className={cn(
              "text-2xl font-semibold",
              darkMode ? "text-slate-100" : "text-slate-900"
            )}>
              Events - {organization.name}
            </h2>
            <p className={cn(
              "text-sm mt-1",
              darkMode ? "text-slate-400" : "text-slate-600"
            )}>
              View past and upcoming events, create new events, and award service hours
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onAwardHours}
              className={cn(
                "rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors shadow-sm",
                darkMode
                  ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:border-slate-600"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400"
              )}
            >
              <Award className="w-4 h-4 inline mr-2" />
              Award Hours
            </button>
            <button
              onClick={onCreateEvent}
              className={cn(
                "rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors shadow-sm",
                darkMode
                  ? "border-slate-600 bg-slate-700 text-white hover:bg-slate-600 hover:border-slate-600"
                  : "border-slate-600 bg-slate-600 text-white hover:bg-slate-700 hover:border-slate-700"
              )}
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Create Event
            </button>
            <button
              onClick={onClose}
              className={cn(
                "rounded-full p-2 transition-colors",
                darkMode
                  ? "hover:bg-slate-800 text-slate-300"
                  : "hover:bg-slate-100 text-slate-600"
              )}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className={cn(
                "text-sm",
                darkMode ? "text-slate-400" : "text-slate-600"
              )}>
                Loading events...
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Upcoming Events */}
              <div>
                <h3 className={cn(
                  "text-lg font-semibold mb-3",
                  darkMode ? "text-slate-100" : "text-slate-900"
                )}>
                  Upcoming Events
                </h3>
                {upcomingEvents.length === 0 ? (
                  <p className={cn(
                    "text-sm py-4",
                    darkMode ? "text-slate-400" : "text-slate-600"
                  )}>
                    No upcoming events
                  </p>
                ) : (
                  <div className="space-y-2">
                    {upcomingEvents.map((event) => (
                      <div
                        key={event.id}
                        onClick={() => onEventClick(event)}
                        className={cn(
                          "flex items-center justify-between rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md",
                          darkMode
                            ? "border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600"
                            : "border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300"
                        )}
                      >
                        <div className="flex-1">
                          <p className={cn(
                            "text-sm font-semibold",
                            darkMode ? "text-slate-100" : "text-slate-900"
                          )}>
                            {event.title}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <p className={cn(
                              "text-xs",
                              darkMode ? "text-slate-400" : "text-slate-600"
                            )}>
                              {new Date(event.date).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                            {event.time && (
                              <p className={cn(
                                "text-xs",
                                darkMode ? "text-slate-500" : "text-slate-500"
                              )}>
                                {event.time}
                              </p>
                            )}
                            {event.location && (
                              <p className={cn(
                                "text-xs",
                                darkMode ? "text-slate-500" : "text-slate-500"
                              )}>
                                • {event.location}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className={cn(
                          "ml-3 text-xs font-semibold px-3 py-1 rounded-full border",
                          darkMode ? "border-slate-600 text-slate-200 bg-slate-800/60" : "border-slate-300 text-slate-600 bg-white"
                        )}>
                          Edit
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Past Events */}
              <div>
                <h3 className={cn(
                  "text-lg font-semibold mb-3",
                  darkMode ? "text-slate-100" : "text-slate-900"
                )}>
                  Past Events
                </h3>
                {pastEvents.length === 0 ? (
                  <p className={cn(
                    "text-sm py-4",
                    darkMode ? "text-slate-400" : "text-slate-600"
                  )}>
                    No past events
                  </p>
                ) : (
                  <div className="space-y-2">
                    {pastEvents.map((event) => (
                      <div
                        key={event.id}
                        onClick={() => onEventClick(event)}
                        className={cn(
                          "flex items-center justify-between rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md",
                          darkMode
                            ? "border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600"
                            : "border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300"
                        )}
                      >
                        <div className="flex-1">
                          <p className={cn(
                            "text-sm font-semibold",
                            darkMode ? "text-slate-100" : "text-slate-900"
                          )}>
                            {event.title}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <p className={cn(
                              "text-xs",
                              darkMode ? "text-slate-400" : "text-slate-600"
                            )}>
                              {new Date(event.date).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                            {event.time && (
                              <p className={cn(
                                "text-xs",
                                darkMode ? "text-slate-500" : "text-slate-500"
                              )}>
                                {event.time}
                              </p>
                            )}
                            {event.location && (
                              <p className={cn(
                                "text-xs",
                                darkMode ? "text-slate-500" : "text-slate-500"
                              )}>
                                • {event.location}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className={cn(
                          "ml-3 text-xs font-semibold px-3 py-1 rounded-full border",
                          darkMode ? "border-slate-600 text-slate-200 bg-slate-800/60" : "border-slate-300 text-slate-600 bg-white"
                        )}>
                          Edit
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Engagement Chart Component
function EngagementChart({ darkMode, organizationId }: { darkMode: boolean; organizationId: string }) {
  const [engagementData, setEngagementData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/organizations/${organizationId}/engagement`)
      .then((res) => res.json())
      .then((data) => {
        setEngagementData(data);
      })
      .catch((err) => {
        console.error("Error loading engagement:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [organizationId]);

  if (loading || !engagementData) {
    return (
      <div className="mt-2 flex items-center justify-center h-[60px]">
        <p className={cn(
          "text-xs",
          darkMode ? "text-slate-400" : "text-slate-500"
        )}>
          Loading...
        </p>
      </div>
    );
  }

  // Use monthly engagement if available, otherwise use member growth as a proxy
  const chartData = engagementData.monthlyEngagement && engagementData.monthlyEngagement.length > 0
    ? engagementData.monthlyEngagement
    : engagementData.monthlyMemberGrowth && engagementData.monthlyMemberGrowth.length > 0
    ? engagementData.monthlyMemberGrowth.map((d: { month: string; value: number }) => ({ month: d.month, value: d.value * 10 }))
    : [
        { month: "Jan", value: 0 },
        { month: "Feb", value: 0 },
        { month: "Mar", value: 0 },
        { month: "Apr", value: 0 },
        { month: "May", value: 0 },
        { month: "Jun", value: 0 },
      ];

  const maxValue = Math.max(...chartData.map((d: any) => d.value), 100);
  const chartHeight = 60;

  return (
    <div className="mt-2">
      <div className="flex items-end justify-between gap-1 h-[60px]">
        {chartData.map((data: any, index: number) => {
          const barHeight = (data.value / maxValue) * chartHeight;
          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div
                className={cn(
                  "w-full rounded-t transition-all hover:opacity-80",
                  darkMode ? "bg-slate-600" : "bg-slate-400"
                )}
                style={{ height: `${barHeight}px` }}
                title={`${data.month}: ${data.value}%`}
              />
              <span className={cn(
                "text-[10px] mt-1",
                darkMode ? "text-slate-400" : "text-slate-500"
              )}>
                {data.month.slice(0, 3)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-2">
        <p className={cn(
          "text-xs",
          darkMode ? "text-slate-400" : "text-slate-500"
        )}>
          Engagement trend
        </p>
        <p className={cn(
          "text-xs font-semibold",
          darkMode ? "text-slate-300" : "text-slate-700"
        )}>
          {engagementData.currentMemberCount || 0} members
        </p>
      </div>
    </div>
  );
}

// Engagement Modal Component
function EngagementModal({
  organization,
  darkMode,
  onClose,
  engagementData,
  setEngagementData,
  loadingEngagement,
  setLoadingEngagement,
}: {
  organization: Organization;
  darkMode: boolean;
  onClose: () => void;
  engagementData: any;
  setEngagementData: (data: any) => void;
  loadingEngagement: boolean;
  setLoadingEngagement: (loading: boolean) => void;
}) {
  useEffect(() => {
    if (!engagementData && !loadingEngagement) {
      setLoadingEngagement(true);
      fetch(`/api/admin/organizations/${organization.id}/engagement`)
        .then((res) => res.json())
        .then((data) => {
          setEngagementData(data);
        })
        .catch((err) => {
          console.error("Error loading engagement:", err);
        })
        .finally(() => {
          setLoadingEngagement(false);
        });
    }
  }, [organization.id, engagementData, loadingEngagement, setEngagementData, setLoadingEngagement]);

  if (loadingEngagement || !engagementData) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-[backdropFadeIn_0.3s_ease-out] backdrop-blur-[2px]"
        onClick={onClose}
      >
        <div
          className={cn(
            "relative w-full max-w-4xl mx-4 rounded-2xl border shadow-xl animate-[modalFadeIn_0.3s_ease-out] max-h-[80vh] overflow-hidden flex flex-col",
            darkMode
              ? "border-slate-700 bg-slate-900"
              : "border-slate-200 bg-white"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-center py-12">
            <p className={cn(
              "text-sm",
              darkMode ? "text-slate-400" : "text-slate-600"
            )}>
              Loading engagement data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-[backdropFadeIn_0.3s_ease-out] backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className={cn(
          "relative w-full max-w-4xl mx-4 rounded-2xl border shadow-xl animate-[modalFadeIn_0.3s_ease-out] max-h-[80vh] overflow-hidden flex flex-col",
          darkMode
            ? "border-slate-700 bg-slate-900"
            : "border-slate-200 bg-white"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn(
          "flex items-center justify-between p-6 border-b",
          darkMode ? "border-slate-700" : "border-slate-200"
        )}>
          <div>
            <h2 className={cn(
              "text-2xl font-semibold",
              darkMode ? "text-slate-100" : "text-slate-900"
            )}>
              Engagement - {organization.name}
            </h2>
            <p className={cn(
              "text-sm mt-1",
              darkMode ? "text-slate-400" : "text-slate-600"
            )}>
              View club performance metrics, member comparisons, and growth data
            </p>
          </div>
          <button
            onClick={onClose}
            className={cn(
              "rounded-full p-2 transition-colors",
              darkMode
                ? "hover:bg-slate-800 text-slate-300"
                : "hover:bg-slate-100 text-slate-600"
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className={cn(
              "rounded-xl border p-4",
              darkMode
                ? "border-slate-700 bg-slate-800/50"
                : "border-slate-200 bg-slate-50"
            )}>
              <p className={cn(
                "text-xs uppercase tracking-wide mb-2",
                darkMode ? "text-slate-400" : "text-slate-500"
              )}>
                Member Count
              </p>
              <p className={cn(
                "text-3xl font-bold",
                darkMode ? "text-slate-100" : "text-slate-900"
              )}>
                {engagementData.currentMemberCount || 0}
              </p>
              <p className={cn(
                "text-xs mt-1",
                darkMode ? "text-slate-400" : "text-slate-600"
              )}>
                {engagementData.clubsWithMoreMembers || 0} clubs have more members
              </p>
            </div>
            <div className={cn(
              "rounded-xl border p-4",
              darkMode
                ? "border-slate-700 bg-slate-800/50"
                : "border-slate-200 bg-slate-50"
            )}>
              <p className={cn(
                "text-xs uppercase tracking-wide mb-2",
                darkMode ? "text-slate-400" : "text-slate-500"
              )}>
                New Members (60 days)
              </p>
              <p className={cn(
                "text-3xl font-bold",
                darkMode ? "text-slate-100" : "text-slate-900"
              )}>
                +{engagementData.newMembers30d || 0}
              </p>
              <p className={cn(
                "text-xs mt-1",
                darkMode ? "text-slate-400" : "text-slate-600"
              )}>
                {engagementData.growthPercent || 0}% growth
              </p>
            </div>
          </div>

          {/* Engagement Score Chart */}
          <div className={cn(
            "rounded-xl border p-4",
            darkMode
              ? "border-slate-700 bg-slate-800/50"
              : "border-slate-200 bg-slate-50"
          )}>
            <p className={cn(
              "text-sm font-semibold mb-3",
              darkMode ? "text-slate-100" : "text-slate-900"
            )}>
              Engagement Score Trend
            </p>
            <EngagementLineChart 
              data={engagementData.monthlyEngagement || []} 
              darkMode={darkMode} 
            />
          </div>

          {/* Member Growth Chart */}
          <div className={cn(
            "rounded-xl border p-4",
            darkMode
              ? "border-slate-700 bg-slate-800/50"
              : "border-slate-200 bg-slate-50"
          )}>
            <p className={cn(
              "text-sm font-semibold mb-3",
              darkMode ? "text-slate-100" : "text-slate-900"
            )}>
              Member Growth (Last 6 Months)
            </p>
            <BarChart 
              data={engagementData.monthlyMemberGrowth || []} 
              darkMode={darkMode}
              color={darkMode ? "bg-slate-500" : "bg-slate-400"}
            />
          </div>

          {/* Event Activity Chart */}
          <div className={cn(
            "rounded-xl border p-4",
            darkMode
              ? "border-slate-700 bg-slate-800/50"
              : "border-slate-200 bg-slate-50"
          )}>
            <p className={cn(
              "text-sm font-semibold mb-3",
              darkMode ? "text-slate-100" : "text-slate-900"
            )}>
              Event Activity (Last 6 Months)
            </p>
            <BarChart 
              data={engagementData.monthlyEventCount || []} 
              darkMode={darkMode}
              color={darkMode ? "bg-green-500" : "bg-green-400"}
            />
          </div>

          {/* Top Clubs Comparison */}
          {engagementData.topClubs && engagementData.topClubs.length > 0 && (
            <div className={cn(
              "rounded-xl border p-4",
              darkMode
                ? "border-slate-700 bg-slate-800/50"
                : "border-slate-200 bg-slate-50"
            )}>
              <p className={cn(
                "text-sm font-semibold mb-3",
                darkMode ? "text-slate-100" : "text-slate-900"
              )}>
                Member Count Comparison
              </p>
              <p className={cn(
                "text-xs mb-3",
                darkMode ? "text-slate-400" : "text-slate-600"
              )}>
                See how your club compares to others in the database
              </p>
              <ComparisonBarChart 
                data={engagementData.topClubs}
                currentOrgName={organization.name}
                darkMode={darkMode}
              />
            </div>
          )}

          {/* Engagement Metrics */}
          <div className={cn(
            "rounded-xl border p-4",
            darkMode
              ? "border-slate-700 bg-slate-800/50"
              : "border-slate-200 bg-slate-50"
          )}>
            <p className={cn(
              "text-sm font-semibold mb-3",
              darkMode ? "text-slate-100" : "text-slate-900"
            )}>
              Key Metrics
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className={cn(
                  "text-xs uppercase tracking-wide mb-1",
                  darkMode ? "text-slate-400" : "text-slate-500"
                )}>
                  Average Engagement
                </p>
                <p className={cn(
                  "text-2xl font-bold",
                  darkMode ? "text-slate-100" : "text-slate-900"
                )}>
                  {engagementData.avgEngagement || 0}%
                </p>
              </div>
              <div>
                <p className={cn(
                  "text-xs uppercase tracking-wide mb-1",
                  darkMode ? "text-slate-400" : "text-slate-500"
                )}>
                  Total Events
                </p>
                <p className={cn(
                  "text-2xl font-bold",
                  darkMode ? "text-slate-100" : "text-slate-900"
                )}>
                  {engagementData.totalEvents || 0}
                </p>
              </div>
              <div>
                <p className={cn(
                  "text-xs uppercase tracking-wide mb-1",
                  darkMode ? "text-slate-400" : "text-slate-500"
                )}>
                  Event Participation
                </p>
                <p className={cn(
                  "text-2xl font-bold",
                  darkMode ? "text-slate-100" : "text-slate-900"
                )}>
                  {engagementData.participationRate || 0}%
                </p>
              </div>
              <div>
                <p className={cn(
                  "text-xs uppercase tracking-wide mb-1",
                  darkMode ? "text-slate-400" : "text-slate-500"
                )}>
                  Member Retention
                </p>
                <p className={cn(
                  "text-2xl font-bold",
                  darkMode ? "text-slate-100" : "text-slate-900"
                )}>
                  {engagementData.retentionRate || 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Engagement Line Chart Component
function EngagementLineChart({ data, darkMode }: { data: { month: string; value: number }[]; darkMode: boolean }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center">
        <p className={cn(
          "text-xs",
          darkMode ? "text-slate-400" : "text-slate-500"
        )}>
          No data available
        </p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 100);
  const chartHeight = 120;
  const chartWidth = 100;
  const points = data.map((d, index) => {
    const x = (index / (data.length - 1 || 1)) * chartWidth;
    const y = chartHeight - (d.value / maxValue) * chartHeight;
    return { x, y, value: d.value, month: d.month };
  });

  return (
    <div className="relative h-32">
      <svg className="w-full h-full" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((val) => {
          const y = chartHeight - (val / maxValue) * chartHeight;
          return (
            <line
              key={val}
              x1="0"
              y1={y}
              x2={chartWidth}
              y2={y}
              stroke={darkMode ? "#475569" : "#cbd5e1"}
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />
          );
        })}
        
        {/* Line path */}
        <polyline
          points={points.map(p => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke={darkMode ? "#60a5fa" : "#3b82f6"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Data points */}
        {points.map((point, index) => (
          <g key={index}>
            <circle
              cx={point.x}
              cy={point.y}
              r="2"
              fill={darkMode ? "#60a5fa" : "#3b82f6"}
            />
            <title>{`${point.month}: ${point.value}%`}</title>
          </g>
        ))}
      </svg>
      
      {/* X-axis labels */}
      <div className="flex justify-between mt-2">
        {data.map((d, index) => (
          <span
            key={index}
            className={cn(
              "text-[10px]",
              darkMode ? "text-slate-400" : "text-slate-500"
            )}
          >
            {d.month}
          </span>
        ))}
      </div>
    </div>
  );
}

// Bar Chart Component
function BarChart({ data, darkMode, color }: { data: { month: string; value: number }[]; darkMode: boolean; color: string }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center">
        <p className={cn(
          "text-xs",
          darkMode ? "text-slate-400" : "text-slate-500"
        )}>
          No data available
        </p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const chartHeight = 100;

  return (
    <div className="h-32">
      <div className="flex items-end justify-between gap-1 h-full">
        {data.map((d, index) => {
          const barHeight = (d.value / maxValue) * chartHeight;
          return (
            <div key={index} className="flex-1 flex flex-col items-center h-full">
              <div
                className={cn(
                  "w-full rounded-t transition-all hover:opacity-80",
                  color
                )}
                style={{ height: `${barHeight}px` }}
                title={`${d.month}: ${d.value}`}
              />
              <span className={cn(
                "text-[10px] mt-1",
                darkMode ? "text-slate-400" : "text-slate-500"
              )}>
                {d.month}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Comparison Bar Chart Component
function ComparisonBarChart({ data, currentOrgName, darkMode }: { data: { name: string; members: number; isCurrent?: boolean }[]; currentOrgName: string; darkMode: boolean }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center">
        <p className={cn(
          "text-xs",
          darkMode ? "text-slate-400" : "text-slate-500"
        )}>
          No comparison data available
        </p>
      </div>
    );
  }

  const maxMembers = Math.max(...data.map(d => d.members), 1);

  return (
    <div className="space-y-2">
      {data.map((club, index) => {
        const isCurrent = club.isCurrent || club.name === currentOrgName;
        const barWidth = (club.members / maxMembers) * 100;
        return (
          <div key={index} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {isCurrent && (
                  <span className={cn(
                    "text-xs font-semibold px-1.5 py-0.5 rounded",
                    darkMode ? "bg-slate-500/20 text-slate-300" : "bg-slate-100 text-slate-700"
                  )}>
                    You
                  </span>
                )}
                <span className={cn(
                  "text-xs truncate flex-1",
                  isCurrent 
                          ? darkMode ? "text-slate-300 font-semibold" : "text-slate-700 font-semibold"
                    : darkMode ? "text-slate-300" : "text-slate-700"
                )}>
                  {club.name}
                </span>
              </div>
              <span className={cn(
                "text-xs font-semibold ml-2 shrink-0",
                darkMode ? "text-slate-300" : "text-slate-700"
              )}>
                {club.members} {club.members === 1 ? "member" : "members"}
              </span>
            </div>
            <div className={cn(
              "relative h-2.5 rounded-full overflow-hidden",
              darkMode ? "bg-slate-700" : "bg-slate-200"
            )}>
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  isCurrent
                    ? darkMode ? "bg-slate-500" : "bg-slate-500"
                    : darkMode ? "bg-slate-600" : "bg-slate-400"
                )}
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Create Event Modal Component
function CreateEventModal({
  organization,
  darkMode,
  onClose,
  onSuccess,
}: {
  organization: Organization;
  darkMode: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim() || !formData.date || !formData.time) {
      setError("Please fill in all required fields (title, date, time)");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/organizations/${organization.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          date: formData.date,
          time: formData.time,
          location: formData.location.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create event");
        setSubmitting(false);
        return;
      }

      onSuccess();
    } catch (err: any) {
      console.error("Error creating event:", err);
      setError("Failed to create event. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 animate-[backdropFadeIn_0.3s_ease-out] backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className={cn(
          "relative w-full max-w-2xl mx-4 rounded-2xl border shadow-xl animate-[modalFadeIn_0.3s_ease-out] max-h-[90vh] overflow-hidden flex flex-col",
          darkMode
            ? "border-slate-700 bg-slate-900"
            : "border-slate-200 bg-white"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn(
          "flex items-center justify-between p-6 border-b",
          darkMode ? "border-slate-700" : "border-slate-200"
        )}>
          <div>
            <h2 className={cn(
              "text-2xl font-semibold",
              darkMode ? "text-slate-100" : "text-slate-900"
            )}>
              Create Event
            </h2>
            <p className={cn(
              "text-sm mt-1",
              darkMode ? "text-slate-400" : "text-slate-600"
            )}>
              {organization.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className={cn(
              "rounded-full p-2 transition-colors",
              darkMode
                ? "hover:bg-slate-800 text-slate-300"
                : "hover:bg-slate-100 text-slate-600"
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className={cn(
              "mb-4 rounded-lg border px-4 py-3 text-sm",
              darkMode
                ? "border-red-800 bg-red-900/20 text-red-300"
                : "border-red-200 bg-red-50 text-red-800"
            )}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={cn(
                "block text-sm font-semibold mb-1.5",
                darkMode ? "text-slate-200" : "text-slate-800"
              )}>
                Event Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                required
                placeholder="e.g., Club Meeting, Fundraiser, Workshop"
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2",
                  darkMode
                    ? "border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus:ring-slate-500 focus:border-slate-500"
                    : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-slate-500 focus:border-slate-500"
                )}
              />
            </div>
            <div>
              <label className={cn(
                "block text-sm font-semibold mb-1.5",
                darkMode ? "text-slate-200" : "text-slate-800"
              )}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                rows={4}
                placeholder="Event description, agenda, or additional details..."
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 resize-none",
                  darkMode
                    ? "border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus:ring-slate-500 focus:border-slate-500"
                    : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-slate-500 focus:border-slate-500"
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={cn(
                  "block text-sm font-semibold mb-1.5",
                  darkMode ? "text-slate-200" : "text-slate-800"
                )}>
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                  required
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2",
                    darkMode
                      ? "border-slate-700 bg-slate-800 text-slate-100 focus:ring-slate-500 focus:border-slate-500"
                      : "border-slate-300 bg-white text-slate-900 focus:ring-slate-500 focus:border-slate-500"
                  )}
                />
              </div>
              <div>
                <label className={cn(
                  "block text-sm font-semibold mb-1.5",
                  darkMode ? "text-slate-200" : "text-slate-800"
                )}>
                  Time *
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData((prev) => ({ ...prev, time: e.target.value }))}
                  required
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2",
                    darkMode
                      ? "border-slate-700 bg-slate-800 text-slate-100 focus:ring-slate-500 focus:border-slate-500"
                      : "border-slate-300 bg-white text-slate-900 focus:ring-slate-500 focus:border-slate-500"
                  )}
                />
              </div>
            </div>
            <div>
              <label className={cn(
                "block text-sm font-semibold mb-1.5",
                darkMode ? "text-slate-200" : "text-slate-800"
              )}>
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., Room 101, Main Hall, Online"
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2",
                  darkMode
                    ? "border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus:ring-slate-500 focus:border-slate-500"
                    : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-slate-500 focus:border-slate-500"
                )}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  "flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm",
                  darkMode
                    ? "border-slate-600 bg-slate-700 text-white hover:bg-slate-600 hover:border-slate-600 disabled:hover:bg-slate-700"
                    : "border-slate-600 bg-slate-600 text-white hover:bg-slate-700 hover:border-slate-700 disabled:hover:bg-slate-600"
                )}
              >
                {submitting ? "Creating..." : "Create Event"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  "rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors",
                  darkMode
                    ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:border-slate-600"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400"
                )}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Award Hours Modal Component
function AwardHoursModal({
  organization,
  members,
  darkMode,
  onClose,
  onSuccess,
}: {
  organization: Organization;
  members: any[];
  darkMode: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    hours: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersList, setMembersList] = useState<any[]>([]);

  // Load members once when modal opens
  useEffect(() => {
    // If members are already provided, use them immediately
    if (members && members.length > 0) {
      setMembersList(members);
      setLoadingMembers(false);
      return;
    }

    // Otherwise, fetch members
    setLoadingMembers(true);
    fetch(`/api/admin/organizations/${organization.id}/members`)
      .then((res) => res.json())
      .then((data) => {
        if (data.members) {
          setMembersList(data.members);
        }
      })
      .catch((err) => {
        console.error("Error loading members:", err);
      })
      .finally(() => {
        setLoadingMembers(false);
      });
  }, [organization.id, members]); // Include members to use if provided

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedMembers.length === 0) {
      setError("Please select at least one member");
      return;
    }

    if (!formData.hours || parseFloat(formData.hours) <= 0) {
      setError("Please enter a valid number of hours");
      return;
    }

    if (!formData.date) {
      setError("Please select a date");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/organizations/${organization.id}/award-hours`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberIds: selectedMembers,
          hours: parseFloat(formData.hours),
          date: formData.date,
          description: formData.description.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to award hours");
        setSubmitting(false);
        return;
      }

      onSuccess();
    } catch (err: any) {
      console.error("Error awarding hours:", err);
      setError("Failed to award hours. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 animate-[backdropFadeIn_0.3s_ease-out] backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className={cn(
          "relative w-full max-w-3xl mx-4 rounded-2xl border shadow-xl animate-[modalFadeIn_0.3s_ease-out] max-h-[90vh] overflow-hidden flex flex-col",
          darkMode
            ? "border-slate-700 bg-slate-900"
            : "border-slate-200 bg-white"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn(
          "flex items-center justify-between p-6 border-b",
          darkMode ? "border-slate-700" : "border-slate-200"
        )}>
          <div>
            <h2 className={cn(
              "text-2xl font-semibold",
              darkMode ? "text-slate-100" : "text-slate-900"
            )}>
              Award Service Hours
            </h2>
            <p className={cn(
              "text-sm mt-1",
              darkMode ? "text-slate-400" : "text-slate-600"
            )}>
              {organization.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className={cn(
              "rounded-full p-2 transition-colors",
              darkMode
                ? "hover:bg-slate-800 text-slate-300"
                : "hover:bg-slate-100 text-slate-600"
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className={cn(
              "mb-4 rounded-lg border px-4 py-3 text-sm",
              darkMode
                ? "border-red-800 bg-red-900/20 text-red-300"
                : "border-red-200 bg-red-50 text-red-800"
            )}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Member Selection */}
            <div>
              <label className={cn(
                "block text-sm font-semibold mb-3",
                darkMode ? "text-slate-200" : "text-slate-800"
              )}>
                Select Members * ({selectedMembers.length} selected)
              </label>
              {loadingMembers ? (
                <div className={cn(
                  "flex items-center justify-center py-8 rounded-xl border",
                  darkMode ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-slate-50"
                )}>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-4 h-4 border-2 rounded-full animate-spin",
                      darkMode ? "border-slate-600 border-t-slate-400" : "border-slate-400 border-t-slate-600"
                    )} />
                    <p className={cn(
                      "text-sm",
                      darkMode ? "text-slate-400" : "text-slate-600"
                    )}>
                      Loading members...
                    </p>
                  </div>
                </div>
              ) : membersList.length === 0 ? (
                <div className={cn(
                  "rounded-xl border p-8 text-center",
                  darkMode ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-slate-50"
                )}>
                  <Users className={cn(
                    "w-8 h-8 mx-auto mb-2",
                    darkMode ? "text-slate-600" : "text-slate-400"
                  )} />
                  <p className={cn(
                    "text-sm",
                    darkMode ? "text-slate-400" : "text-slate-600"
                  )}>
                    No members in this organization yet.
                  </p>
                </div>
              ) : (
                <div className={cn(
                  "rounded-xl border max-h-60 overflow-y-auto",
                  darkMode ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-slate-50"
                )}>
                  {membersList.map((member) => (
                    <label
                      key={member.id}
                      className={cn(
                        "flex items-center gap-3 p-3 cursor-pointer transition-colors",
                        selectedMembers.includes(member.id)
                          ? darkMode
                            ? "bg-slate-700/80"
                            : "bg-slate-50 border-l-2 border-slate-500"
                          : darkMode
                            ? "hover:bg-slate-800/50"
                            : "hover:bg-slate-100"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(member.id)}
                        onChange={() => toggleMember(member.id)}
                        className={cn(
                          "w-4 h-4 rounded border-2 cursor-pointer transition-colors",
                          darkMode
                            ? "border-slate-600 bg-slate-800 checked:bg-slate-500 checked:border-slate-500"
                            : "border-slate-300 bg-white checked:bg-slate-600 checked:border-slate-600"
                        )}
                      />
                      <div className={cn(
                        "w-9 h-9 rounded-full border-2 flex items-center justify-center font-semibold text-sm shrink-0",
                        darkMode
                          ? "border-slate-600 bg-slate-700 text-slate-200"
                          : "border-slate-300 bg-slate-200 text-slate-700"
                      )}>
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-semibold truncate",
                          darkMode ? "text-slate-100" : "text-slate-900"
                        )}>
                          {member.name}
                        </p>
                        <p className={cn(
                          "text-xs truncate",
                          darkMode ? "text-slate-400" : "text-slate-600"
                        )}>
                          {member.email}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Hours and Date */}
            <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={cn(
                "block text-sm font-semibold mb-1.5",
                darkMode ? "text-slate-200" : "text-slate-800"
              )}>
                Hours *
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={formData.hours}
                onChange={(e) => setFormData((prev) => ({ ...prev, hours: e.target.value }))}
                required
                placeholder="0.0"
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2",
                  darkMode
                    ? "border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus:ring-slate-500 focus:border-slate-500"
                    : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-slate-500 focus:border-slate-500"
                )}
              />
            </div>
            <div>
              <label className={cn(
                "block text-sm font-semibold mb-1.5",
                darkMode ? "text-slate-200" : "text-slate-800"
              )}>
                Date *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                required
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2",
                  darkMode
                    ? "border-slate-700 bg-slate-800 text-slate-100 focus:ring-slate-500 focus:border-slate-500"
                    : "border-slate-300 bg-white text-slate-900 focus:ring-slate-500 focus:border-slate-500"
                )}
              />
            </div>
            </div>

            {/* Description */}
            <div>
              <label className={cn(
                "block text-sm font-semibold mb-1.5",
                darkMode ? "text-slate-200" : "text-slate-800"
              )}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                placeholder="Optional: Describe the activity or event for which hours are being awarded..."
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 resize-none",
                  darkMode
                    ? "border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus:ring-slate-500 focus:border-slate-500"
                    : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-slate-500 focus:border-slate-500"
                )}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting || selectedMembers.length === 0}
                className={cn(
                  "flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm",
                  darkMode
                    ? "border-slate-600 bg-slate-700 text-white hover:bg-slate-600 hover:border-slate-600 disabled:hover:bg-slate-700"
                    : "border-slate-600 bg-slate-600 text-white hover:bg-slate-700 hover:border-slate-700 disabled:hover:bg-slate-600"
                )}
              >
                {submitting ? "Awarding..." : `Award Hours to ${selectedMembers.length} Member${selectedMembers.length !== 1 ? "s" : ""}`}
              </button>
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  "rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors",
                  darkMode
                    ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:border-slate-600"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400"
                )}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


// Event Detail/Edit Modal Component
function EventDetailModal({
  organization,
  event,
  darkMode,
  onClose,
  onUpdate,
  onDelete,
}: {
  organization: Organization;
  event: any;
  darkMode: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: event.title || "",
    description: event.description || "",
    date: event.date ? new Date(event.date).toISOString().split("T")[0] : "",
    time: event.time || "",
    location: event.location || "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPast = new Date(event.date) < new Date();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch(`/api/admin/organizations/${organization.id}/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update event");
      }

      setIsEditing(false);
      onUpdate();
    } catch (err: any) {
      console.error("Error updating event:", err);
      setError(err.message || "Failed to update event. Please try again.");
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
      return;
    }

    setError(null);
    setDeleting(true);

    try {
      const response = await fetch(`/api/admin/organizations/${organization.id}/events/${event.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete event");
      }

      onDelete();
    } catch (err: any) {
      console.error("Error deleting event:", err);
      setError(err.message || "Failed to delete event. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 animate-[backdropFadeIn_0.3s_ease-out] backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className={cn(
          "relative w-full max-w-2xl mx-4 rounded-2xl border shadow-xl animate-[modalFadeIn_0.3s_ease-out] max-h-[90vh] overflow-hidden flex flex-col",
          darkMode
            ? "border-slate-700 bg-slate-900"
            : "border-slate-200 bg-white"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn(
          "flex items-center justify-between p-6 border-b",
          darkMode ? "border-slate-700" : "border-slate-200"
        )}>
          <div>
            <h2 className={cn(
              "text-2xl font-semibold",
              darkMode ? "text-slate-100" : "text-slate-900"
            )}>
              {isEditing ? "Edit Event" : "Event Details"}
            </h2>
            <p className={cn(
              "text-sm mt-1",
              darkMode ? "text-slate-400" : "text-slate-600"
            )}>
              {organization.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className={cn(
                    "rounded-lg border px-4 py-2 text-sm font-semibold transition-colors",
                    darkMode
                      ? "border-slate-600 bg-slate-700 text-white hover:bg-slate-600"
                      : "border-slate-600 bg-slate-600 text-white hover:bg-slate-700"
                  )}
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className={cn(
                    "rounded-lg border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50",
                    darkMode
                      ? "border-red-800 bg-red-900/20 text-red-300 hover:bg-red-900/30"
                      : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                  )}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className={cn(
                "rounded-full p-2 transition-colors",
                darkMode
                  ? "hover:bg-slate-800 text-slate-300"
                  : "hover:bg-slate-100 text-slate-600"
              )}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className={cn(
              "mb-4 rounded-lg border px-4 py-3 text-sm",
              darkMode
                ? "border-red-800 bg-red-900/20 text-red-300"
                : "border-red-200 bg-red-50 text-red-800"
            )}>
              {error}
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={cn(
                  "block text-sm font-semibold mb-1.5",
                  darkMode ? "text-slate-200" : "text-slate-800"
                )}>
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  required
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2",
                    darkMode
                      ? "border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus:ring-slate-500 focus:border-slate-500"
                      : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-slate-500 focus:border-slate-500"
                  )}
                />
              </div>

              <div>
                <label className={cn(
                  "block text-sm font-semibold mb-1.5",
                  darkMode ? "text-slate-200" : "text-slate-800"
                )}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 resize-none",
                    darkMode
                      ? "border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus:ring-slate-500 focus:border-slate-500"
                      : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-slate-500 focus:border-slate-500"
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={cn(
                    "block text-sm font-semibold mb-1.5",
                    darkMode ? "text-slate-200" : "text-slate-800"
                  )}>
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                    required
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2",
                      darkMode
                        ? "border-slate-700 bg-slate-800 text-slate-100 focus:ring-slate-500 focus:border-slate-500"
                        : "border-slate-300 bg-white text-slate-900 focus:ring-slate-500 focus:border-slate-500"
                    )}
                  />
                </div>
                <div>
                  <label className={cn(
                    "block text-sm font-semibold mb-1.5",
                    darkMode ? "text-slate-200" : "text-slate-800"
                  )}>
                    Time *
                  </label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData((prev) => ({ ...prev, time: e.target.value }))}
                    required
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2",
                      darkMode
                        ? "border-slate-700 bg-slate-800 text-slate-100 focus:ring-slate-500 focus:border-slate-500"
                        : "border-slate-300 bg-white text-slate-900 focus:ring-slate-500 focus:border-slate-500"
                    )}
                  />
                </div>
              </div>

              <div>
                <label className={cn(
                  "block text-sm font-semibold mb-1.5",
                  darkMode ? "text-slate-200" : "text-slate-800"
                )}>
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2",
                    darkMode
                      ? "border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus:ring-slate-500 focus:border-slate-500"
                      : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-slate-500 focus:border-slate-500"
                  )}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className={cn(
                    "flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm",
                    darkMode
                      ? "border-slate-600 bg-slate-600 text-white hover:bg-slate-700 hover:border-slate-700"
                      : "border-slate-600 bg-slate-600 text-white hover:bg-slate-700 hover:border-slate-700"
                  )}
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      title: event.title || "",
                      description: event.description || "",
                      date: event.date ? new Date(event.date).toISOString().split("T")[0] : "",
                      time: event.time || "",
                      location: event.location || "",
                    });
                    setError(null);
                  }}
                  className={cn(
                    "rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors",
                    darkMode
                      ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  )}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className={cn(
                  "text-xl font-semibold mb-2",
                  darkMode ? "text-slate-100" : "text-slate-900"
                )}>
                  {event.title}
                </h3>
                {isPast && (
                  <span className={cn(
                    "inline-flex items-center px-2 py-1 rounded text-xs font-medium",
                    darkMode ? "bg-slate-700 text-slate-300" : "bg-slate-200 text-slate-700"
                  )}>
                    Past Event
                  </span>
                )}
              </div>

              {event.description && (
                <div>
                  <p className={cn(
                    "text-sm font-semibold mb-1",
                    darkMode ? "text-slate-300" : "text-slate-700"
                  )}>
                    Description
                  </p>
                  <p className={cn(
                    "text-sm",
                    darkMode ? "text-slate-400" : "text-slate-600"
                  )}>
                    {event.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className={cn(
                    "text-sm font-semibold mb-1",
                    darkMode ? "text-slate-300" : "text-slate-700"
                  )}>
                    Date
                  </p>
                  <p className={cn(
                    "text-sm",
                    darkMode ? "text-slate-400" : "text-slate-600"
                  )}>
                    {new Date(event.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                {event.time && (
                  <div>
                    <p className={cn(
                      "text-sm font-semibold mb-1",
                      darkMode ? "text-slate-300" : "text-slate-700"
                    )}>
                      Time
                    </p>
                    <p className={cn(
                      "text-sm",
                      darkMode ? "text-slate-400" : "text-slate-600"
                    )}>
                      {event.time}
                    </p>
                  </div>
                )}
              </div>

              {event.location && (
                <div>
                  <p className={cn(
                    "text-sm font-semibold mb-1",
                    darkMode ? "text-slate-300" : "text-slate-700"
                  )}>
                    Location
                  </p>
                  <p className={cn(
                    "text-sm",
                    darkMode ? "text-slate-400" : "text-slate-600"
                  )}>
                    {event.location}
                  </p>
                </div>
              )}

              <div>
                <p className={cn(
                  "text-sm font-semibold mb-1",
                  darkMode ? "text-slate-300" : "text-slate-700"
                )}>
                  Created
                </p>
                <p className={cn(
                  "text-sm",
                  darkMode ? "text-slate-400" : "text-slate-600"
                )}>
                  {event.createdAt ? new Date(event.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  }) : "Unknown"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
