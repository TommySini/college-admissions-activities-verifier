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
      if (session?.user.role === "verifier" || session?.user.role === "admin") {
        // For verifiers/admins, count all verifications they've issued as activities
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

  const isVerifier = profile.role === "verifier" || profile.role === "admin";
  const roleDisplay = profile.role === "verifier" ? "Verifier" : profile.role === "admin" ? "Administrator" : "Student";

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-black dark:to-zinc-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
                My Profile
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400">
                {roleDisplay} Profile
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/dashboard"
                className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                Dashboard
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* Profile Info */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow-sm mb-6">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
            Profile Information
          </h2>
          <div className="space-y-4">
            {profile.image && (
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={profile.image}
                  alt={profile.name}
                  className="w-20 h-20 rounded-full"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Name
              </label>
              <p className="text-lg text-zinc-900 dark:text-zinc-50">{profile.name}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Email
              </label>
              <p className="text-lg text-zinc-900 dark:text-zinc-50">{profile.email}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Role
              </label>
              <p className="text-lg text-zinc-900 dark:text-zinc-50 capitalize">{profile.role}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Member Since
              </label>
              <p className="text-zinc-900 dark:text-zinc-50">
                {new Date(profile.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              {isVerifier ? "Issued Activities" : "Total Activities"}
            </h3>
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              {totalActivitiesCount}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="px-6 py-3 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-black rounded-lg font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
            >
              Go to Dashboard
            </Link>
            {isVerifier && (
              <Link
                href="/dashboard"
                className="px-6 py-3 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-lg font-medium hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                Verify Activities
              </Link>
            )}
            {!isVerifier && (
              <Link
                href="/dashboard"
                className="px-6 py-3 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-lg font-medium hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                Add Activity
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

