"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Profile, OrganizationProfile, ApplicantProfile } from "../types";

interface ProfileContextType {
  currentProfile: Profile | null;
  setCurrentProfile: (profile: Profile | null) => void;
  createProfile: (profile: Omit<Profile, "id" | "createdAt" | "updatedAt">) => void;
  switchProfile: (profileId: string) => void;
  allProfiles: Profile[];
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [currentProfile, setCurrentProfileState] = useState<Profile | null>(null);

  // Load profiles from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("profiles");
    const currentId = localStorage.getItem("currentProfileId");
    if (stored) {
      try {
        const profiles = JSON.parse(stored);
        setAllProfiles(profiles);
        if (currentId) {
          const profile = profiles.find((p: Profile) => p.id === currentId);
          if (profile) {
            setCurrentProfileState(profile);
          }
        }
      } catch (e) {
        console.error("Failed to load profiles:", e);
      }
    }
  }, []);

  // Save profiles to localStorage
  useEffect(() => {
    if (allProfiles.length > 0 || localStorage.getItem("profiles")) {
      localStorage.setItem("profiles", JSON.stringify(allProfiles));
    }
    if (currentProfile) {
      localStorage.setItem("currentProfileId", currentProfile.id);
    }
  }, [allProfiles, currentProfile]);

  const createProfile = (profileData: Omit<Profile, "id" | "createdAt" | "updatedAt">) => {
    const newProfile: Profile = {
      ...profileData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...allProfiles, newProfile];
    setAllProfiles(updated);
    setCurrentProfileState(newProfile);
  };

  const setCurrentProfile = (profile: Profile | null) => {
    setCurrentProfileState(profile);
    if (profile) {
      localStorage.setItem("currentProfileId", profile.id);
    } else {
      localStorage.removeItem("currentProfileId");
    }
  };

  const switchProfile = (profileId: string) => {
    const profile = allProfiles.find((p) => p.id === profileId);
    if (profile) {
      setCurrentProfile(profile);
    }
  };

  return (
    <ProfileContext.Provider
      value={{
        currentProfile,
        setCurrentProfile,
        createProfile,
        switchProfile,
        allProfiles,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}

