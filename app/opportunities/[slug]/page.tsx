import { Suspense } from "react";
import { OpportunityDetail } from "./OpportunityDetail";

export const metadata = {
  title: "Opportunity Details | Actify",
  description: "View detailed information about this opportunity",
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function OpportunityDetailPage({ params }: PageProps) {
  const { slug } = await params;
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <OpportunityDetail slug={slug} />
    </Suspense>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-2/3"></div>
          <div className="h-64 bg-slate-200 rounded-2xl"></div>
          <div className="h-96 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    </div>
  );
}

