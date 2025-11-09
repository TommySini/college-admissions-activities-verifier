"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  profileType: string;
  bio?: string;
  location?: string;
  description?: string;
  website?: string;
  createdAt: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [verificationCount, setVerificationCount] = useState(0);
  const [activityCount, setActivityCount] = useState(0);

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
      const verificationsRes = await fetch("/api/verifications");
      const verificationsData = await verificationsRes.json();
      setVerificationCount(verificationsData.verifications?.length || 0);

      if (session?.user.profileType === "Applicant") {
        const activitiesRes = await fetch("/api/activities");
        const activitiesData = await activitiesRes.json();
        setActivityCount(activitiesData.activities?.length || 0);
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

  const isOrganization = profile.profileType === "Organization";

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
                {isOrganization ? "Organization Profile" : "Applicant Profile"}
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
            <div>
              <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                {isOrganization ? "Organization Name" : "Name"}
              </label>
              <p className="text-lg text-zinc-900 dark:text-zinc-50">{profile.name}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Email
              </label>
              <p className="text-lg text-zinc-900 dark:text-zinc-50">{profile.email}</p>
            </div>

            {isOrganization ? (
              <>
                {profile.description && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Description
                    </label>
                    <p className="text-zinc-900 dark:text-zinc-50">{profile.description}</p>
                  </div>
                )}
                {profile.website && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Website
                    </label>
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {profile.website}
                    </a>
                  </div>
                )}
              </>
            ) : (
              profile.bio && (
                <div>
                  <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Bio
                  </label>
                  <p className="text-zinc-900 dark:text-zinc-50">{profile.bio}</p>
                </div>
              )
            )}

            {profile.location && (
              <div>
                <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Location
                </label>
                <p className="text-zinc-900 dark:text-zinc-50">{profile.location}</p>
              </div>
            )}

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
              {isOrganization ? "Issued Verifications" : "Verifications"}
            </h3>
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              {verificationCount}
            </p>
          </div>
          {!isOrganization && (
            <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                My Activities
              </h3>
              <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                {activityCount}
              </p>
            </div>
          )}
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
            {isOrganization && (
              <Link
                href="/dashboard"
                className="px-6 py-3 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-lg font-medium hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                Issue Verification Token
              </Link>
            )}
            {!isOrganization && (
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

