"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building07, BookOpen01, HeartHand, GraduationHat01 } from "@untitledui/icons";

export default function AdminViewPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

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
    return <div className="min-h-screen flex items-center justify-center text-slate-600">Loading view tool…</div>;
  }

  return (
    <div className="flex h-screen w-full bg-transparent">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col px-6 py-6">
        <header className="flex flex-col gap-1 mb-8">
          <h1 className="text-3xl font-semibold text-slate-900">View Tool</h1>
          <p className="text-base text-slate-600 mt-2 max-w-3xl">
            See the organizations, activities, volunteering, and alumni databases from the student perspective with enhanced admin details.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Link
            href="/admin/view/organizations"
            className="group flex flex-col rounded-2xl border border-slate-200 bg-white/95 p-8 shadow-lg hover:border-slate-300 hover:shadow-xl transition-all duration-200"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 shrink-0">
                <Building07 className="w-6 h-6 text-slate-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Organizations</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Browse and explore all student organizations and clubs with admin details including creator information and approval status.
                </p>
              </div>
            </div>
            <div className="mt-auto pt-4 border-t border-slate-100">
              <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                View Organizations →
              </span>
            </div>
          </Link>

          <Link
            href="/admin/view/activities"
            className="group flex flex-col rounded-2xl border border-slate-200 bg-white/95 p-8 shadow-lg hover:border-slate-300 hover:shadow-xl transition-all duration-200"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 shrink-0">
                <BookOpen01 className="w-6 h-6 text-slate-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Activities</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  View student activities and their verification status with admin details including student information and verification history.
                </p>
              </div>
            </div>
            <div className="mt-auto pt-4 border-t border-slate-100">
              <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                View Activities →
              </span>
            </div>
          </Link>

          <Link
            href="/admin/view/volunteering"
            className="group flex flex-col rounded-2xl border border-slate-200 bg-white/95 p-8 shadow-lg hover:border-slate-300 hover:shadow-xl transition-all duration-200"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 shrink-0">
                <HeartHand className="w-6 h-6 text-slate-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Volunteering</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  See volunteering opportunities and student participation with admin details including organizer information and participation metrics.
                </p>
              </div>
            </div>
            <div className="mt-auto pt-4 border-t border-slate-100">
              <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                View Volunteering →
              </span>
            </div>
          </Link>

          <Link
            href="/admin/view/alumni"
            className="group flex flex-col rounded-2xl border border-slate-200 bg-white/95 p-8 shadow-lg hover:border-slate-300 hover:shadow-xl transition-all duration-200"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 shrink-0">
                <GraduationHat01 className="w-6 h-6 text-slate-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Alumni Database</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Explore alumni profiles and college application data to understand admission patterns and student success stories.
                </p>
              </div>
            </div>
            <div className="mt-auto pt-4 border-t border-slate-100">
              <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                View Alumni Database →
              </span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

