'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { WebGLShader } from '@/components/ui/web-gl-shader';

function VerifyResponseContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const activity = searchParams.get('activity');
  const student = searchParams.get('student');

  const isAccepted = status === 'verified';

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* WebGL Background */}
      <WebGLShader />

      {/* Content Layer */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="bg-black/5 backdrop-blur-xl rounded-2xl p-8 md:p-12 max-w-2xl w-full shadow-2xl border border-black/10 text-center">
          <div className="mb-6">
            {isAccepted ? (
              <div className="w-20 h-20 bg-green-100/90 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border border-green-200">
                <svg
                  className="w-10 h-10 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            ) : (
              <div className="w-20 h-20 bg-red-100/90 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200">
                <svg
                  className="w-10 h-10 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            )}
          </div>

          <h1 className="text-3xl font-bold text-black mb-4">
            {isAccepted ? 'Activity Verified!' : 'Activity Rejected'}
          </h1>

          <div className="bg-white/50 backdrop-blur-sm rounded-lg p-6 mb-6 text-left border border-black/10">
            <p className="text-black mb-2">
              <span className="font-semibold">Student:</span> {student || 'Unknown'}
            </p>
            <p className="text-black mb-2">
              <span className="font-semibold">Activity:</span> {activity || 'Unknown'}
            </p>
            <p className="text-black/60 text-sm mt-4">
              {isAccepted
                ? "The activity has been verified and added to the student's profile."
                : 'The activity has been rejected. The student will be notified.'}
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/"
              className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md"
            >
              Return to Actify
            </Link>
            <p className="text-sm text-black/50">Thank you for verifying this activity!</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyResponsePage() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen overflow-hidden">
          <WebGLShader />
          <div className="relative z-10 flex items-center justify-center min-h-screen">
            <div className="text-black">Loading...</div>
          </div>
        </div>
      }
    >
      <VerifyResponseContent />
    </Suspense>
  );
}
