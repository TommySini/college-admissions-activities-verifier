"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { useDarkMode } from "@/app/context/DarkModeContext";

function getAvatarUrl(email: string, name?: string): string {
  // Use Gravatar or similar service, or generate initials
  const encodedEmail = encodeURIComponent(email);
  return `https://www.gravatar.com/avatar/${encodedEmail}?d=identicon&s=128`;
}

function getRoleDisplayName(adminSubRole: string): string {
  if (adminSubRole === "college_counselor") return "College Counselor";
  return "Teacher / Advisor";
}

export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const { darkMode, setDarkMode } = useDarkMode();
  const [displayName, setDisplayName] = useState("");
  const [adminSubRole, setAdminSubRole] = useState<"teacher" | "college_counselor">("teacher");
  const [counselorCode, setCounselorCode] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [notifications, setNotifications] = useState({
    studentApprovalRequest: true,
    emailOnSignIn: true,
    weeklyDigest: false,
    organizationUpdates: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
    if (session?.user?.name) {
      setDisplayName(session.user.name);
    }
  }, [session?.user?.name]);

  useEffect(() => {
    if (!isAdmin) return;

    const loadSettings = async () => {
      try {
        // Load admin sub-role
        const roleRes = await fetch("/api/settings/admin-role");
        if (roleRes.ok) {
          const roleData = await roleRes.json();
          if (roleData.adminSubRole) {
            setAdminSubRole(roleData.adminSubRole);
          }
        }

        // Load notifications
        const notifRes = await fetch("/api/settings/notifications");
        if (notifRes.ok) {
          const notifData = await notifRes.json();
          if (notifData.notifications) {
            setNotifications(notifData.notifications);
          }
        }

        // Dark mode is handled by DarkModeProvider
      } catch (err) {
        console.error("Error loading settings:", err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [isAdmin]);

  const handleSaveDisplayName = async () => {
    if (!displayName.trim()) {
      setMessage({ type: "error", text: "Display name cannot be empty" });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: displayName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to update display name");
      }
      setMessage({ type: "success", text: "Display name updated" });
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "Failed to update display name" });
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationToggle = async (key: keyof typeof notifications) => {
    const newValue = !notifications[key];
    setNotifications((prev) => ({ ...prev, [key]: newValue }));

    try {
      const res = await fetch("/api/settings/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: newValue }),
      });
      if (!res.ok) {
        // Revert on error
        setNotifications((prev) => ({ ...prev, [key]: !newValue }));
        throw new Error("Failed to update notification setting");
      }
    } catch (error) {
      console.error("Error updating notification:", error);
      setMessage({ type: "error", text: "Failed to update notification setting" });
    }
  };

  const handleDarkModeToggle = () => {
    setDarkMode(!darkMode);
  };

  const handleRoleChange = (newRole: "teacher" | "college_counselor") => {
    if (newRole === adminSubRole) {
      // Already selected, do nothing
      return;
    }
    
    if (newRole === "college_counselor") {
      // Show code input when switching to college counselor
      setShowCodeInput(true);
      setCounselorCode("");
    } else {
      // Switch to teacher immediately (no code needed)
      setShowCodeInput(false);
      setCounselorCode("");
      handleSaveRole(newRole, "");
    }
  };

  const handleSaveRole = async (role?: "teacher" | "college_counselor", code?: string) => {
    const roleToSave = role || adminSubRole;
    const codeToUse = code !== undefined ? code : counselorCode;

    setSavingRole(true);
    setMessage(null);

    try {
      const res = await fetch("/api/settings/admin-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminSubRole: roleToSave,
          code: roleToSave === "college_counselor" ? codeToUse : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to update role");
      }

      setAdminSubRole(roleToSave);
      setShowCodeInput(false);
      setCounselorCode("");
      setMessage({ type: "success", text: "Role updated successfully" });
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "Failed to update role" });
    } finally {
      setSavingRole(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600">
        Loading settings…
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const avatarUrl = session?.user?.image || (session?.user?.email ? getAvatarUrl(session.user.email, session.user.name) : "");
  const roleDisplayName = getRoleDisplayName(adminSubRole);

  return (
    <div className="flex h-screen w-full bg-transparent">
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col px-6 py-6 overflow-y-auto">
        <header className="flex flex-col gap-1 mb-8">
          <h1 className={cn(
            "text-3xl font-semibold",
            darkMode ? "text-slate-100" : "text-slate-900"
          )}>Settings</h1>
          <p className={cn(
            "text-base mt-2 max-w-3xl",
            darkMode ? "text-slate-400" : "text-slate-600"
          )}>
            Manage your account settings and preferences.
          </p>
        </header>

        {message && (
          <div
            className={cn(
              "mb-6 rounded-2xl border px-4 py-3 text-sm",
              message.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            )}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-6">
          {/* Profile Section */}
          <section className={cn(
            "rounded-2xl border p-6 shadow-lg backdrop-blur",
            darkMode
              ? "border-slate-700 bg-slate-900/95"
              : "border-slate-200 bg-white/95"
          )}>
            <h2 className={cn(
              "text-lg font-semibold mb-4",
              darkMode ? "text-slate-100" : "text-slate-900"
            )}>Profile</h2>
            <div className="flex items-start gap-4 mb-6">
              <img
                src={avatarUrl}
                alt={session?.user?.name || "Profile"}
                className={cn(
                  "w-16 h-16 rounded-full border-2",
                  darkMode ? "border-slate-700" : "border-slate-200"
                )}
              />
              <div className="flex-1">
                <h3 className={cn(
                  "text-base font-semibold",
                  darkMode ? "text-slate-100" : "text-slate-900"
                )}>
                  {session?.user?.name || "Admin"}
                </h3>
                <p className={cn(
                  "text-sm mt-0.5",
                  darkMode ? "text-slate-400" : "text-slate-600"
                )}>{session?.user?.email}</p>
                <p className={cn(
                  "text-xs mt-1",
                  darkMode ? "text-slate-500" : "text-slate-500"
                )}>Role: {roleDisplayName}</p>
              </div>
            </div>
            <div className="mb-6">
              <label className={cn(
                "text-xs font-semibold uppercase tracking-wide block mb-2",
                darkMode ? "text-slate-400" : "text-slate-500"
              )}>
                Admin Role
              </label>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <button
                    onClick={() => handleRoleChange("teacher")}
                    disabled={savingRole}
                    className={cn(
                      "flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition",
                      adminSubRole === "teacher"
                        ? darkMode
                          ? "border-slate-600 bg-slate-800 text-white"
                          : "border-slate-300 bg-slate-100 text-slate-900"
                        : darkMode
                          ? "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                      savingRole && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    Teacher / Advisor
                  </button>
                  <button
                    onClick={() => handleRoleChange("college_counselor")}
                    disabled={savingRole}
                    className={cn(
                      "flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition",
                      adminSubRole === "college_counselor"
                        ? darkMode
                          ? "border-slate-600 bg-slate-800 text-white"
                          : "border-slate-300 bg-slate-100 text-slate-900"
                        : darkMode
                          ? "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                      savingRole && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    College Counselor
                  </button>
                </div>
                {showCodeInput && adminSubRole !== "college_counselor" && (
                  <div className="space-y-2">
                    <label className={cn(
                      "text-xs font-semibold uppercase tracking-wide block",
                      darkMode ? "text-slate-400" : "text-slate-500"
                    )}>
                      Access Code
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={counselorCode}
                        onChange={(e) => setCounselorCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && counselorCode.trim() && !savingRole) {
                            handleSaveRole();
                          }
                        }}
                        placeholder="Enter code"
                        className={cn(
                          "flex-1 rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 uppercase",
                          darkMode
                            ? "border-slate-700 bg-slate-800 text-slate-100 focus:ring-slate-600"
                            : "border-slate-200 bg-white text-slate-900 focus:ring-slate-400"
                        )}
                      />
                      <button
                        onClick={() => handleSaveRole()}
                        disabled={savingRole || !counselorCode.trim()}
                        className={cn(
                          "rounded-xl border px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm",
                          darkMode
                            ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:border-slate-600"
                            : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:border-slate-300"
                        )}
                      >
                        {savingRole ? "Saving…" : "Verify"}
                      </button>
                    </div>
                    <p className={cn(
                      "text-xs",
                      darkMode ? "text-slate-500" : "text-slate-500"
                    )}>
                      Contact developers for the College Counselor access code.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className={cn(
                "text-xs font-semibold uppercase tracking-wide block mb-2",
                darkMode ? "text-slate-400" : "text-slate-500"
              )}>
                Display Name
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2",
                    darkMode
                      ? "border-slate-700 bg-slate-800 text-slate-100 focus:ring-slate-600"
                      : "border-slate-200 bg-white text-slate-900 focus:ring-slate-400"
                  )}
                />
                <button
                  onClick={handleSaveDisplayName}
                  disabled={saving}
                  className={cn(
                    "rounded-xl border px-4 py-2 text-sm font-medium transition disabled:opacity-50 shadow-sm",
                    darkMode
                      ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:border-slate-600"
                      : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:border-slate-300"
                  )}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </section>

          {/* Notification Settings */}
          <section className={cn(
            "rounded-2xl border p-6 shadow-lg backdrop-blur",
            darkMode
              ? "border-slate-700 bg-slate-900/95"
              : "border-slate-200 bg-white/95"
          )}>
            <h2 className={cn(
              "text-lg font-semibold mb-4",
              darkMode ? "text-slate-100" : "text-slate-900"
            )}>Notification Settings</h2>
            <div className="space-y-3">
              <ToggleSetting
                label="Student approval requests"
                description="Receive an email when a student specifically asks you to approve something"
                value={notifications.studentApprovalRequest}
                onToggle={() => handleNotificationToggle("studentApprovalRequest")}
                darkMode={darkMode}
              />
              <ToggleSetting
                label="Email on sign in"
                description="Receive a security email notification each time you sign in"
                value={notifications.emailOnSignIn}
                onToggle={() => handleNotificationToggle("emailOnSignIn")}
                darkMode={darkMode}
              />
              <ToggleSetting
                label="Weekly digest"
                description="Receive a weekly summary email of platform activity"
                value={notifications.weeklyDigest}
                onToggle={() => handleNotificationToggle("weeklyDigest")}
                darkMode={darkMode}
              />
              <ToggleSetting
                label="Organization updates"
                description="Get notified about new organizations and updates to existing ones"
                value={notifications.organizationUpdates}
                onToggle={() => handleNotificationToggle("organizationUpdates")}
                darkMode={darkMode}
              />
            </div>
          </section>

          {/* General Settings */}
          <section className={cn(
            "rounded-2xl border p-6 shadow-lg backdrop-blur",
            darkMode
              ? "border-slate-700 bg-slate-900/95"
              : "border-slate-200 bg-white/95"
          )}>
            <h2 className={cn(
              "text-lg font-semibold mb-4",
              darkMode ? "text-slate-100" : "text-slate-900"
            )}>General Settings</h2>
            <div className="space-y-3">
              <ToggleSetting
                label="Dark mode"
                description="Use a darker interface theme"
                value={darkMode}
                onToggle={handleDarkModeToggle}
                darkMode={darkMode}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ToggleSetting({
  label,
  description,
  value,
  onToggle,
  darkMode = false,
}: {
  label: string;
  description: string;
  value: boolean;
  onToggle: () => void;
  darkMode?: boolean;
}) {
  if (darkMode) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "w-full rounded-xl border px-4 py-3 text-left shadow-sm transition",
          value
            ? "border-slate-600 bg-slate-800 text-slate-100"
            : "border-slate-700 bg-slate-900 text-slate-100"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-semibold">{label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{description}</p>
          </div>
          <span
            className={cn(
              "inline-flex h-6 w-10 items-center rounded-full border px-1 transition ml-4",
              value
                ? "border-slate-500 bg-slate-600"
                : "border-slate-600 bg-slate-700"
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

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full rounded-xl border px-4 py-3 text-left shadow-sm transition",
        value
          ? "border-slate-200 bg-slate-50 text-slate-900"
          : "border-slate-100 bg-white text-slate-900"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
        <span
          className={cn(
            "inline-flex h-6 w-10 items-center rounded-full border px-1 transition ml-4",
            value
              ? "border-slate-300 bg-slate-600"
              : "border-slate-200 bg-slate-200"
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
