"use client";

import { useState } from "react";
import { useProfile } from "../context/ProfileContext";
import { ProfileType, OrganizationProfile, ApplicantProfile } from "../types";

export default function ProfileSelector() {
  const { currentProfile, allProfiles, createProfile, setCurrentProfile, switchProfile } =
    useProfile();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    profileType: "Applicant" as ProfileType,
    description: "",
    website: "",
    location: "",
    bio: "",
  });

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.profileType === "Organization") {
      createProfile({
        name: formData.name,
        email: formData.email,
        profileType: "Organization",
        description: formData.description || undefined,
        website: formData.website || undefined,
        location: formData.location || undefined,
      } as Omit<OrganizationProfile, "id" | "createdAt" | "updatedAt">);
    } else {
      createProfile({
        name: formData.name,
        email: formData.email,
        profileType: "Applicant",
        bio: formData.bio || undefined,
        location: formData.location || undefined,
      } as Omit<ApplicantProfile, "id" | "createdAt" | "updatedAt">);
    }
    setShowCreateForm(false);
    setFormData({
      name: "",
      email: "",
      profileType: "Applicant",
      description: "",
      website: "",
      location: "",
      bio: "",
    });
  };

  if (currentProfile) {
    return null; // Don't show selector if profile is selected
  }

  if (showCreateForm) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 max-w-md w-full shadow-xl">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
            Create Profile
          </h2>
          <form onSubmit={handleCreateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Profile Type *
              </label>
              <select
                required
                value={formData.profileType}
                onChange={(e) =>
                  setFormData({ ...formData, profileType: e.target.value as ProfileType })
                }
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              >
                <option value="Applicant">Applicant</option>
                <option value="Organization">Organization</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                {formData.profileType === "Organization" ? "Organization Name" : "Your Name"} *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
            </div>

            {formData.profileType === "Organization" ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Bio
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                  />
                </div>
              </>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 px-6 py-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-black rounded-lg font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
              >
                Create Profile
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-6 py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-lg font-medium hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-black dark:to-zinc-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-800 rounded-lg p-8 max-w-md w-full shadow-xl">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          College Admissions Activities Verifier
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          Get started by creating or selecting a profile
        </p>

        {allProfiles.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
              Existing Profiles
            </h2>
            <div className="space-y-2">
              {allProfiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => switchProfile(profile.id)}
                  className="w-full text-left px-4 py-3 bg-zinc-100 dark:bg-zinc-700 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                >
                  <div className="font-medium text-zinc-900 dark:text-zinc-50">
                    {profile.name}
                  </div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    {profile.profileType} • {profile.email}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => setShowCreateForm(true)}
          className="w-full px-6 py-3 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-black rounded-lg font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
        >
          + Create New Profile
        </button>
      </div>
    </div>
  );
}

