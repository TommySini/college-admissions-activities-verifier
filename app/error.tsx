'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console (in production, send to Sentry/error tracking)
    console.error('Application error:', error);

    // TODO: Send to Sentry
    // if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    //   Sentry.captureException(error);
    // }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-red-500 mb-2">Error</h1>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Something went wrong</h2>
          <p className="text-gray-600 mb-6">
            An unexpected error occurred. We've been notified and will look into it.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-gray-100 p-4 rounded-lg text-left text-sm mb-6">
              <p className="font-mono text-red-600 break-all">{error.message}</p>
              {error.digest && (
                <p className="font-mono text-gray-500 mt-2 text-xs">Error ID: {error.digest}</p>
              )}
            </div>
          )}
        </div>
        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="block w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors text-center"
          >
            Go to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
