'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log critical error
    console.error('CRITICAL: Global error boundary triggered:', error);

    // TODO: Send to Sentry
    // if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    //   Sentry.captureException(error, { level: 'fatal' });
    // }
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-red-50 px-4">
          <div className="max-w-md w-full text-center">
            <div className="mb-8">
              <h1 className="text-6xl font-bold text-red-600 mb-2">500</h1>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Critical Error</h2>
              <p className="text-gray-600 mb-6">
                A critical error occurred. Please refresh the page or contact support.
              </p>
              {process.env.NODE_ENV === 'development' && error && (
                <div className="bg-white p-4 rounded-lg text-left text-sm mb-6 border border-red-200">
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
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
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
      </body>
    </html>
  );
}
