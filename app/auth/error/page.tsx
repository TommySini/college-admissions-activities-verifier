"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "AccessDenied":
        return "Access denied. Please check that your email is valid and try again.";
      case "Configuration":
        return "There is a problem with the server configuration. Please contact support.";
      case "Verification":
        return "The verification token has expired or has already been used.";
      default:
        return "An error occurred during authentication. Please try again.";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full shadow-xl text-center">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-2">
            Authentication Error
          </h1>
          <div className="w-24 h-1 bg-yellow-500 mx-auto mb-4"></div>
        </div>

        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 rounded-lg">
          <p className="text-red-800 dark:text-red-200 font-medium">
            {getErrorMessage(error)}
          </p>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2">
              Error code: {error}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <Link
            href="/auth/signin"
            className="block w-full px-6 py-3 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-800 transition-colors"
          >
            Try Again
          </Link>
          <Link
            href="/"
            className="block w-full px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-950 flex items-center justify-center">
        <div className="text-blue-600 dark:text-blue-400">Loading...</div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  );
}

