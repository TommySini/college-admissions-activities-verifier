"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type ColorSettings = {
  primary: string;
  tertiary: string;
  accent: string;
};

type PreferenceSettings = {
  weeklyDigest: boolean;
  notifyOrganizationSubmissions: boolean;
  eventReminders: boolean;
  darkMode: boolean;
};

const defaultColors: ColorSettings = {
  primary: "#7d95b9",
  tertiary: "#a4c4e0",
  accent: "#c2dcf2",
};

const defaultPreferences: PreferenceSettings = {
  weeklyDigest: false,
  notifyOrganizationSubmissions: true,
  eventReminders: true,
  darkMode: false,
};

export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [profileName, setProfileName] = useState("");
  const [colors, setColors] = useState<ColorSettings>(defaultColors);
  const [preferences, setPreferences] = useState<PreferenceSettings>(defaultPreferences);
  const [savingProfile, setSavingProfile] = useState(false);
  const [loadingColors, setLoadingColors] = useState(false);
  const [loadingPreferences, setLoadingPreferences] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isAdmin = session?.user?.role === "admin";

  useEffect(() => {
    if (status === "authenticated" && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [status, isAdmin, router]);

  useEffect(() => {
    if (session?.user?.name) {
      setProfileName(session.user.name);
    }
  }, [session?.user?.name]);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchColors = async () => {
      const res = await fetch("/api/settings/colors");
      if (!res.ok) return;
      const data = await res.json();
      if (data?.colors) {
        setColors((prev) => ({ ...prev, ...data.colors }));
      }
    };

    const fetchPreferences = async () => {
      const res = await fetch("/api/settings/preferences");
      if (!res.ok) return;
      const data = await res.json();
      if (data?.preferences) {
        setPreferences((prev) => ({ ...prev, ...data.preferences }));
      }
    };

    fetchColors();
    fetchPreferences();
  }, [isAdmin]);

  const handleColorChange = (key: keyof ColorSettings, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
  };

  const handlePreferenceToggle = (key: keyof PreferenceSettings) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveBasics = async () => {
    if (!profileName.trim()) {
      setMessage({ type: "error", text: "Display name cannot be empty" });
      return;
    }
    setSavingProfile(true);
    setMessage(null);
    try {
      const profileResponse = await fetch("/api/settings/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName.trim() }),
      });
      if (!profileResponse.ok) {
        const data = await profileResponse.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to update profile");
      }

      const prefResponse = await fetch("/api/settings/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ darkMode: preferences.darkMode }),
      });
      if (!prefResponse.ok) {
        const data = await prefResponse.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to update theme preference");
      }

      setMessage({ type: "success", text: "Profile settings updated" });
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "Failed to update settings" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveColors = async () => {
    setLoadingColors(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/colors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(colors),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to save colors");
      }
      setMessage({ type: "success", text: "Color palette updated" });
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "Failed to save colors" });
    } finally {
      setLoadingColors(false);
    }
  };

  const handleSavePreferences = async () => {
    setLoadingPreferences(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weeklyDigest: preferences.weeklyDigest,
          notifyOrganizationSubmissions: preferences.notifyOrganizationSubmissions,
          eventReminders: preferences.eventReminders,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to save preferences");
      }
      setMessage({ type: "success", text: "Preferences updated" });
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "Failed to save preferences" });
    } finally {
      setLoadingPreferences(false);
    }
  };

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center text-slate-600">Preparing settings…</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-transparent px-4 py-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">Admin settings</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Control center</h1>
          <p className="mt-2 text-sm text-slate-500">
            Adjust the admin experience. Changes apply instantly across the dashboard.
          </p>
        </div>

        {message && (
          <div
            className={cn(
              "rounded-2xl border px-4 py-3 text-sm",
              message.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            )}
          >
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5">
          <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
            <header className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Basic settings</p>
                <p className="text-xs text-slate-500">Profile, theme, and preferences</p>
              </div>
            </header>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Display name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</label>
                <div className="mt-1 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                  {session?.user?.email ?? "—"}
                </div>
              </div>
              <PreferenceToggle
                label="Dark mode"
                description="Use a darker interface across the admin experience"
                value={preferences.darkMode ?? false}
                onToggle={() => handlePreferenceToggle("darkMode")}
              />
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button onClick={handleSaveBasics} className="w-full sm:flex-1" disabled={savingProfile}>
                {savingProfile ? "Saving…" : "Save basics"}
              </Button>
              <Button
                variant="outline"
                className="w-full sm:flex-1"
                onClick={() => router.push("/signout")}
              >
                Sign out
              </Button>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
              <header className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Color palette</p>
                  <p className="text-xs text-slate-500">Primary surfaces, accents, and tertiary background</p>
                </div>
              </header>
              <div className="space-y-4">
                {(["primary", "tertiary", "accent"] as (keyof ColorSettings)[]).map((key) => (
                  <div
                    key={key}
                    className="rounded-2xl border border-slate-100 p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 capitalize">{key}</p>
                      </div>
                      <input
                        type="color"
                        value={colors[key]}
                        onChange={(event) => handleColorChange(key, event.target.value)}
                        className="h-10 w-16 cursor-pointer rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                    <input
                      type="text"
                      value={colors[key]}
                      onChange={(event) => handleColorChange(key, event.target.value)}
                      className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    />
                  </div>
                ))}
              </div>
              <Button onClick={handleSaveColors} className="mt-5 w-full" disabled={loadingColors}>
                {loadingColors ? "Saving…" : "Save palette"}
              </Button>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
              <header className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Notifications</p>
                  <p className="text-xs text-slate-500">Control admin communication</p>
                </div>
              </header>

              <div className="space-y-3">
                <PreferenceToggle
                  label="Weekly digest email"
                  description="Summary of student activity progress each Monday"
                  value={preferences.weeklyDigest}
                  onToggle={() => handlePreferenceToggle("weeklyDigest")}
                />
                <PreferenceToggle
                  label="Organization submission alerts"
                  description="Email notification whenever a new organization is waiting for review"
                  value={preferences.notifyOrganizationSubmissions}
                  onToggle={() => handlePreferenceToggle("notifyOrganizationSubmissions")}
                />
                <PreferenceToggle
                  label="Event reminders"
                  description="Reminders about upcoming events you manage or joined"
                  value={preferences.eventReminders}
                  onToggle={() => handlePreferenceToggle("eventReminders")}
                />
              </div>

              <Button
                onClick={handleSavePreferences}
                className="mt-5 w-full"
                variant="outline"
                disabled={loadingPreferences}
              >
                {loadingPreferences ? "Updating…" : "Update notifications"}
              </Button>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreferenceToggle({
  label,
  description,
  value,
  onToggle,
}: {
  label: string;
  description: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full rounded-2xl border px-4 py-3 text-left shadow-sm transition",
        value ? "border-blue-200 bg-blue-50/60 text-blue-900" : "border-slate-100 bg-white text-slate-900"
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <span
          className={cn(
            "inline-flex h-6 w-10 items-center rounded-full border px-1 transition",
            value
              ? "border-blue-400 bg-blue-600/80 text-white"
              : "border-slate-200 bg-white text-slate-400"
          )}
        >
          <span
            className={cn(
              "h-4 w-4 rounded-full bg-white shadow transition",
              value ? "translate-x-4" : "translate-x-0"
            )}
          />
        </span>
      </div>
    </button>
  );
}


