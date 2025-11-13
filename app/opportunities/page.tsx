import { Suspense } from "react";
import { OpportunitiesListing } from "./OpportunitiesListing";

export const metadata = {
  title: "Discover Opportunities | Actify",
  description: "Find competitions, programs, scholarships, and more for high school students",
};

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <OpportunitiesListing />
    </Suspense>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-slate-200 rounded w-1/3"></div>
          <div className="h-24 bg-slate-200 rounded"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-96 bg-slate-200 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

