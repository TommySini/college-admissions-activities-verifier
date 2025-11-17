"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { WebGLShader } from "@/components/ui/web-gl-shader";

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
    <div className="relative min-h-screen overflow-hidden">
      {/* WebGL Background */}
      <WebGLShader />
      
      {/* Content Layer */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="bg-black/5 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full shadow-2xl border border-black/10 text-center">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-black mb-2">
              Authentication Error
            </h1>
            <div className="w-24 h-1 bg-yellow-500 mx-auto mb-4"></div>
          </div>

          <div className="mb-6 p-4 bg-red-100/90 backdrop-blur-sm rounded-lg border border-red-200">
            <p className="text-red-800 font-medium">
              {getErrorMessage(error)}
            </p>
            {error && (
              <p className="text-sm text-red-600 mt-2">
                Error code: {error}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Link
              href="/auth/signin"
              className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md"
            >
              Try Again
            </Link>
            <Link
              href="/"
              className="block w-full px-6 py-2 border border-black/10 bg-white/50 backdrop-blur-sm text-black rounded-lg font-medium hover:bg-white/70 transition-colors"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="relative min-h-screen overflow-hidden">
        <WebGLShader />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-black">Loading...</div>
        </div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  );
}

