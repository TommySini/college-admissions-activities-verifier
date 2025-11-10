"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"student" | "admin" | null>(null);
  
  // Get role from URL params if available
  useEffect(() => {
    const urlRole = searchParams.get("role");
    if (urlRole && (urlRole === "student" || urlRole === "admin")) {
      setSelectedRole(urlRole as "student" | "admin");
    }
  }, [searchParams]);

  const handleGoogleSignIn = async (role: "student" | "admin") => {
    setError("");
    setIsLoading(true);
    setSelectedRole(role);

    try {
      // Get role from URL params if available, otherwise use the passed role
      const urlRole = searchParams.get("role");
      const finalRole = urlRole === "student" || urlRole === "admin" ? urlRole : role;
      
      // Store the selected role in a cookie to use in the callback
      document.cookie = `signupRole=${finalRole}; path=/; max-age=300`; // 5 minutes
      
      // Use redirect: true to let NextAuth handle the OAuth flow
      // Redirect admins to admin dashboard, others to regular dashboard
      const callbackUrl = finalRole === "admin" 
        ? `/admin?role=${finalRole}` 
        : `/dashboard?role=${finalRole}`;
      
      await signIn("google", {
        callbackUrl,
        redirect: true,
      });
      // Note: With redirect: true, execution won't continue here
      // The user will be redirected to Google, then back to the callback
    } catch (err: any) {
      console.error("Sign in error:", err);
      setError(`An error occurred: ${err?.message || "Please check the browser console and ensure Google OAuth is configured."}`);
      setIsLoading(false);
      setSelectedRole(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-2">
            Actify
          </h1>
          <h2 className="text-xl text-gray-700 dark:text-gray-300 mb-4">
            Activity Verification Platform
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Choose your role and sign in with Google
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => handleGoogleSignIn("student")}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            {isLoading && selectedRole === "student" ? "Signing in..." : "Sign Up as Student"}
          </button>

          <button
            onClick={() => handleGoogleSignIn("admin")}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            {isLoading && selectedRole === "admin" ? "Signing in..." : "Sign Up as Admin"}
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>Any Google email address can sign in.</p>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-950 flex items-center justify-center">
        <div className="text-blue-600 dark:text-blue-400">Loading...</div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
