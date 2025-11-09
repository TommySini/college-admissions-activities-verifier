"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function VerifyResponseContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const activity = searchParams.get("activity");
  const student = searchParams.get("student");

  const isAccepted = status === "verified";

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 md:p-12 max-w-2xl w-full shadow-xl border border-gray-100 text-center">
        <div className="mb-6">
          {isAccepted ? (
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : (
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {isAccepted ? "Activity Verified!" : "Activity Rejected"}
        </h1>

        <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
          <p className="text-gray-700 mb-2">
            <span className="font-semibold">Student:</span> {student || "Unknown"}
          </p>
          <p className="text-gray-700 mb-2">
            <span className="font-semibold">Activity:</span> {activity || "Unknown"}
          </p>
          <p className="text-gray-600 text-sm mt-4">
            {isAccepted
              ? "The activity has been verified and added to the student's profile."
              : "The activity has been rejected. The student will be notified."}
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Return to Actify
          </Link>
          <p className="text-sm text-gray-500">
            Thank you for verifying this activity!
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyResponsePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-blue-600">Loading...</div>
      </div>
    }>
      <VerifyResponseContent />
    </Suspense>
  );
}

