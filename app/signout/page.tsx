"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignOutPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "signing-out" | "signed-out">("idle");

  const handleSignOut = async () => {
    setStatus("signing-out");
    
    // Clear all NextAuth cookies manually
    const cookies = [
      "next-auth.session-token",
      "__Secure-next-auth.session-token",
      "next-auth.csrf-token",
      "__Host-next-auth.csrf-token",
      "next-auth.callback-url",
      "__Secure-next-auth.callback-url",
    ];

    cookies.forEach((cookieName) => {
      document.cookie = `${cookieName}=; path=/; max-age=0;`;
      document.cookie = `${cookieName}=; path=/; domain=${window.location.hostname}; max-age=0;`;
    });

    // Use NextAuth signOut
    await signOut({ 
      callbackUrl: "/signout",
      redirect: false 
    });
    
    setStatus("signed-out");
  };

  useEffect(() => {
    // Auto sign out on mount
    if (status === "idle") {
      handleSignOut();
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {status === "signing-out" && "Signing Out..."}
            {status === "signed-out" && "Signed Out"}
          </h1>
          <p className="text-slate-600">
            {status === "signing-out" && "Clearing your session..."}
            {status === "signed-out" && "You've been signed out successfully. Choose your role to sign in:"}
          </p>
        </div>

        {status === "signed-out" && (
          <div className="space-y-4">
            <Link
              href="/auth/signin?role=student"
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-md"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              Sign In as Student
            </Link>

            <Link
              href="/auth/signin?role=admin"
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors shadow-md"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              Sign In as Admin
            </Link>

            <div className="pt-4 border-t border-slate-200">
              <Link
                href="/auth/signin"
                className="block text-center text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                Or go to sign-in page →
              </Link>
            </div>
          </div>
        )}

        {status === "signing-out" && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>
    </div>
  );
}



