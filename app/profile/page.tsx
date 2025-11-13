"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  image?: string;
  createdAt: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalActivitiesCount, setTotalActivitiesCount] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (session) {
      fetchProfile();
      fetchStats();
    }
  }, [session, status, router]);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/profile");
      const data = await response.json();
      setProfile(data.profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      if (session?.user.role === "admin") {
        // For admins, count total verifications issued
        const verificationsRes = await fetch("/api/verifications");
        const verificationsData = await verificationsRes.json();
        setTotalActivitiesCount(verificationsData.verifications?.length || 0);
      } else {
        // For students, count verified activities + regular activities
        const verificationsRes = await fetch("/api/verifications");
        const verificationsData = await verificationsRes.json();
        const verifiedActivities = verificationsData.verifications?.filter(
          (v: any) => v.status === "verified"
        ) || [];
        
        const activitiesRes = await fetch("/api/activities");
        const activitiesData = await activitiesRes.json();
        const activities = activitiesData.activities || [];
        
        // Total = verified activities + regular activities
        setTotalActivitiesCount(verifiedActivities.length + activities.length);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-black dark:to-zinc-900 flex items-center justify-center">
        <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!session || !profile) {
    return null;
  }

  const isAdmin = profile.role === "admin";
  const roleDisplay = isAdmin ? "Administrator" : "Student";

  const isStudent = profile.role === "student";
  const isVerifier = profile.role === "verifier";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">My Profile</h1>
            <p className="text-gray-600">
              Review your account details and see a snapshot of your activity progress.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                {isAdmin ? "Total Verifications" : "Total Activities"}
              </p>
              <p className="text-2xl font-bold text-gray-900">{totalActivitiesCount}</p>
              <p className="text-xs text-gray-500 mt-2">
                {isAdmin
                  ? "Completed verifications issued across the platform."
                  : "Combined total of activities you have created and verified."}
              </p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                Role
              </p>
              <p className="text-2xl font-bold text-gray-900">{roleDisplay}</p>
              <p className="text-xs text-gray-500 mt-2">
                Access tailored to your current role. Contact support to request changes.
              </p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                Member Since
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {new Date(profile.createdAt).toLocaleDateString()}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Thanks for being part of Actify. Keep your profile up-to-date for seamless verifications.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Details */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Profile Details</h2>
              <p className="text-sm text-gray-500 mt-1">
                Personal information connected to your Actify account.
              </p>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                {profile.image ? (
                  <img
                    src={profile.image}
                    alt={profile.name}
                    className="w-20 h-20 rounded-full border-2 border-gray-200 object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-semibold">
                    {profile.name?.[0] || "U"}
                  </div>
                )}
                <div>
                  <p className="text-lg font-semibold text-gray-900">{profile.name}</p>
                  <p className="text-sm text-gray-500">{roleDisplay}</p>
                </div>
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Name
                  </dt>
                  <dd className="text-base text-gray-900">{profile.name}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Email
                  </dt>
                  <dd className="text-base text-gray-900">{profile.email}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Role
                  </dt>
                  <dd className="text-base text-gray-900 capitalize">{profile.role}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Account Created
                  </dt>
                  <dd className="text-base text-gray-900">
                    {new Date(profile.createdAt).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Jump back into managing your activities and verifications.
                </p>
              </div>
              <div className="p-6 space-y-3">
                <Link
                  href={isAdmin ? "/admin" : "/dashboard"}
                  className="block w-full text-center px-5 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                  {isAdmin ? "Go to Admin Dashboard" : "Open Dashboard"}
                </Link>
                {!isAdmin && (
                  <Link
                    href="/dashboard?show=add-activity"
                    className="block w-full text-center px-5 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Add New Activity
                  </Link>
                )}
                {isStudent && (
                  <Link
                    href="/organizations"
                    className="block w-full text-center px-5 py-3 border border-green-200 text-green-700 rounded-lg font-medium hover:bg-green-50 transition-colors"
                  >
                    Browse Organizations
                  </Link>
                )}
                <button
                  onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                  className="block w-full text-center px-5 py-3 border border-red-200 text-red-700 rounded-lg font-medium hover:bg-red-50 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Verification Tips</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Keep your account ready for the next application season.
                </p>
              </div>
              <div className="p-6 space-y-3 text-sm text-gray-600">
                <p>• Ensure your name and contact information match your official documents.</p>
                <p>
                  • For faster approvals, add supporting evidence when submitting new activities.
                </p>
                <p>
                  • Need help? Reach out to your counselor or organization verifier directly from the activity view.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

