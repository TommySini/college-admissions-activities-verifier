"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useAdminRole } from "@/app/context/AdminRoleContext";
import { Loader2, Search, X } from "lucide-react";

type StudentMetric = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  createdAt: string;
  activityCount: number;
  verifiedActivityCount: number;
  pendingActivityCount: number;
  totalActivityHours: number;
  volunteeringHours: number;
  verifiedVolunteeringHours: number;
  volunteeringEntries: number;
  goalsActive: number;
  goalsCompleted: number;
  organizationsStarted: number;
  alumniSubmissions: number;
  alumniSuccesses: number;
  lastSubmissionAt?: string;
};

type CounselorStudentsResponse = {
  summary: {
    totalStudents: number;
    totalActivityParticipants: number;
    activityParticipationRate: number;
    totalActivities: number;
    totalVolunteeringHours: number;
    averageActivitiesPerStudent: number;
  };
  students: StudentMetric[];
};

export default function CounselorStudentsPage() {
  const { data: session, status } = useSession();
  const { adminSubRole, loading: adminRoleLoading } = useAdminRole();
  const router = useRouter();
  const [data, setData] = useState<CounselorStudentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentMetric | null>(null);

  const isCounselor = session?.user?.role === "admin" && adminSubRole === "college_counselor";

  useEffect(() => {
    if (status === "loading" || adminRoleLoading) {
      return;
    }

    if (!session?.user || session.user.role !== "admin") {
      router.replace("/dashboard");
      return;
    }

    if (adminSubRole !== "college_counselor") {
      router.replace("/admin");
      return;
    }
  }, [session, status, adminSubRole, adminRoleLoading, router]);

  useEffect(() => {
    if (!isCounselor) return;
    let cancelled = false;
    const fetchStudents = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/admin/counselor/students");
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load students");
        }
        const payload: CounselorStudentsResponse = await response.json();
        if (!cancelled) {
          setData(payload);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to load students");
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    fetchStudents();
    return () => {
      cancelled = true;
    };
  }, [isCounselor]);

  const filteredStudents = useMemo(() => {
    if (!data?.students) return [];
    if (!search.trim()) return data.students;
    const query = search.toLowerCase();
    return data.students.filter(
      (student) =>
        student.name.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query)
    );
  }, [data, search]);

  if (status === "loading" || adminRoleLoading || (session?.user?.role === "admin" && adminSubRole !== "college_counselor" && !adminRoleLoading)) {
    return (
      <div className="admin-dark-scope min-h-screen flex items-center justify-center text-slate-600">
        Loading counselor workspace…
      </div>
    );
  }

  if (!isCounselor) {
    return null;
  }

  return (
    <div className="admin-dark-scope flex h-screen w-full bg-transparent">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col px-6 py-6 overflow-y-auto">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">Counselor</p>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Student Engagement</h1>
              <p className="text-slate-500 mt-1">
                Monitor every student in your school and guide them toward stronger extracurricular impact.
              </p>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}

        {data && (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <SummaryCard
              label="Students"
              value={data.summary.totalStudents.toLocaleString()}
              helper="with accounts at your school"
            />
            <SummaryCard
              label="Participation"
              value={`${data.summary.activityParticipationRate}%`}
              helper={`${data.summary.totalActivityParticipants.toLocaleString()} active this year`}
              tone={data.summary.activityParticipationRate >= 70 ? "good" : data.summary.activityParticipationRate >= 40 ? "warn" : "bad"}
            />
            <SummaryCard
              label="Volunteer Hours"
              value={Math.round(data.summary.totalVolunteeringHours).toLocaleString()}
              helper="recorded all-time"
            />
            <SummaryCard
              label="Avg Activities"
              value={data.summary.averageActivitiesPerStudent.toFixed(1)}
              helper="per student"
            />
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white/95 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Student Directory</h2>
              <p className="text-sm text-slate-500">Click any student for a full breakdown of their progress.</p>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or email"
                className="w-full rounded-full border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3">Student</th>
                  <th className="px-6 py-3">Activities</th>
                  <th className="px-6 py-3">Volunteering Hours</th>
                  <th className="px-6 py-3">Goals</th>
                  <th className="px-6 py-3">Clubs</th>
                  <th className="px-6 py-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-400" />
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                      No students match this search.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr
                      key={student.id}
                      className="cursor-pointer border-t border-slate-100/60 transition hover:bg-slate-50/60"
                      onClick={() => setSelectedStudent(student)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-slate-800/10 text-slate-700 flex items-center justify-center font-semibold">
                            {student.name?.charAt(0) || "S"}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{student.name}</p>
                            <p className="text-xs text-slate-500">{student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-900 font-semibold">{student.activityCount}</div>
                        <p className="text-xs text-slate-500">{student.verifiedActivityCount} verified</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-900 font-semibold">{Math.round(student.volunteeringHours)}</div>
                        <p className="text-xs text-slate-500">hrs logged</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-900 font-semibold">{student.goalsActive} active</div>
                        <p className="text-xs text-slate-500">{student.goalsCompleted} completed</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-900 font-semibold">{student.organizationsStarted}</div>
                        <p className="text-xs text-slate-500">clubs launched</p>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {student.lastSubmissionAt
                          ? new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
                              Math.round(
                                (new Date(student.lastSubmissionAt).getTime() - Date.now()) /
                                  (1000 * 60 * 60 * 24)
                              ),
                              "day"
                            )
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {selectedStudent && (
        <StudentDrawer student={selectedStudent} onClose={() => setSelectedStudent(null)} />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: "good" | "warn" | "bad";
}) {
  const toneClasses =
    tone === "good"
      ? "text-emerald-600 bg-emerald-600/10"
      : tone === "warn"
        ? "text-amber-600 bg-amber-600/10"
        : tone === "bad"
          ? "text-rose-600 bg-rose-600/10"
          : "text-slate-600 bg-slate-600/10";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-lg backdrop-blur">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      {helper && <p className="text-sm text-slate-500 mt-1">{helper}</p>}
      {tone && (
        <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${toneClasses}`}>
          {tone === "good" ? "On Track" : tone === "warn" ? "Monitor" : "Needs Attention"}
        </span>
      )}
    </div>
  );
}

function StudentDrawer({ student, onClose }: { student: StudentMetric; onClose: () => void }) {
  const rows: { label: string; value: string }[] = [
    { label: "Email", value: student.email },
    { label: "Activities", value: `${student.verifiedActivityCount}/${student.activityCount} verified` },
    { label: "Activity Hours", value: `${Math.round(student.totalActivityHours)} hrs` },
    { label: "Volunteering", value: `${Math.round(student.volunteeringHours)} hrs (${Math.round(student.verifiedVolunteeringHours)} verified)` },
    { label: "Goals", value: `${student.goalsActive} active / ${student.goalsCompleted} completed` },
    { label: "Clubs Started", value: student.organizationsStarted.toString() },
    { label: "Alumni Submissions", value: `${student.alumniSubmissions} (${student.alumniSuccesses} parsed)` },
    {
      label: "Last Submission",
      value: student.lastSubmissionAt
        ? new Date(student.lastSubmissionAt).toLocaleDateString()
        : "No data yet",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-slate-900/50 backdrop-blur-sm">
      <div className="h-full w-full max-w-md rounded-l-3xl border border-slate-200 bg-white/98 shadow-2xl p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">{student.name}</h3>
            <p className="text-sm text-slate-500">Comprehensive student profile</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {rows.map((row) => (
            <div
              key={row.label}
              className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm"
            >
              <p className="text-xs uppercase tracking-wide text-slate-500">{row.label}</p>
              <p className="text-slate-900 font-medium">{row.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


