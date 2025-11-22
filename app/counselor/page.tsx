"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { WebGLShader } from "@/components/ui/web-gl-shader";

const COUNSELOR_CODE = "ATD8234";

export default function CounselorAccessPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignIn = useCallback(() => {
    document.cookie = `signupRole=admin; path=/; max-age=300`;
    router.push("/auth/signin?role=admin");
  }, [router]);

  const handleApplyCounselor = useCallback(async () => {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const response = await fetch("/api/settings/admin-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminSubRole: "college_counselor",
          code: COUNSELOR_CODE,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to apply counselor permissions");
      }
      setMessage("Counselor access granted. Refresh the admin dashboard to see the counselor view.");
    } catch (err: any) {
      setError(err?.message || "Failed to update counselor access");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <WebGLShader />
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl space-y-6 rounded-3xl border border-white/20 bg-white/80 p-8 shadow-2xl backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.5em] text-slate-500">Counselor access</p>
            <h1 className="text-3xl font-semibold text-slate-900 mt-2">Test the counselor experience</h1>
            <p className="text-sm text-slate-600 mt-1">
              Use this helper to sign in as an admin and automatically apply the counselor permissions.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Access code</p>
            <p className="mt-1 text-lg font-mono text-slate-900">{COUNSELOR_CODE}</p>
            <p className="text-xs text-slate-500 mt-2">
              This code is required when switching your admin sub-role to college counselor.
            </p>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleSignIn}
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-white font-semibold shadow-lg hover:bg-slate-800 transition"
            >
              {status === "loading" ? "Checking session…" : session ? "Re-sign in as Admin" : "Sign in with Google"}
            </button>

            <button
              type="button"
              onClick={handleApplyCounselor}
              disabled={status !== "authenticated" || loading}
              className="w-full rounded-2xl border border-slate-900 px-4 py-3 text-slate-900 font-semibold hover:bg-slate-900/5 transition disabled:opacity-50"
            >
              {loading ? "Applying counselor role…" : "Apply Counselor Permissions"}
            </button>
          </div>

          <p className="text-xs text-slate-500">
            1) Sign in with the first button to create an admin session. 2) Once signed in, click “Apply Counselor
            Permissions” to switch to the counselor view instantly.
          </p>
        </div>
      </div>
    </div>
  );
}


