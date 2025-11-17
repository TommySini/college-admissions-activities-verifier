"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useColors } from "@/app/context/ColorContext";

interface PendingOpportunity {
  id: string;
  title: string;
  description: string;
  organization: string;
  startDate: string;
  endDate: string | null;
  isOngoing: boolean;
  createdAt: string;
  postedBy: {
    id: string;
    name: string;
    email: string;
  };
}

export default function ReviewOpportunitiesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const colors = useColors();
  const [opportunities, setOpportunities] = useState<PendingOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated" && session?.user?.role !== "admin") {
      router.push("/volunteering");
      return;
    }

    if (status === "authenticated") {
      fetchPendingOpportunities();
    }
  }, [status, session, router]);

  const fetchPendingOpportunities = async () => {
    try {
      const response = await fetch("/api/volunteering-opportunities/pending", {
        credentials: "include",
      });
      const data = await response.json();
      if (response.ok) {
        setOpportunities(data.opportunities || []);
      }
    } catch (error) {
      console.error("Error fetching pending opportunities:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      const response = await fetch(`/api/volunteering-opportunities/${id}/approve`, {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        await fetchPendingOpportunities();
      } else {
        alert("Failed to approve opportunity");
      }
    } catch (error) {
      console.error("Error approving opportunity:", error);
      alert("Failed to approve opportunity");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      const response = await fetch(`/api/volunteering-opportunities/${id}/reject`, {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        await fetchPendingOpportunities();
      } else {
        alert("Failed to reject opportunity");
      }
    } catch (error) {
      console.error("Error rejecting opportunity:", error);
      alert("Failed to reject opportunity");
    } finally {
      setProcessingId(null);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!session || session.user.role !== "admin") {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/volunteering")}
                className="text-xl font-bold text-gray-900"
              >
                Actify
              </button>
              <div className="h-6 w-px bg-gray-300 mx-2"></div>
              <span className="text-sm text-gray-500">Review Opportunities</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{session.user.name}</p>
                <p className="text-xs text-gray-500">{session.user.email}</p>
              </div>
              <button
                onClick={() => router.push("/volunteering")}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Back to Volunteering
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Review Opportunity Requests</h1>

        {opportunities.length === 0 ? (
          <div className="bg-white rounded-xl p-8 shadow-md border border-gray-200 text-center">
            <p className="text-gray-500">No pending opportunity requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {opportunities.map((opp) => (
              <div
                key={opp.id}
                className="bg-white rounded-xl p-6 shadow-md border border-gray-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{opp.title}</h3>
                    <p className="text-sm text-gray-600 mb-4">{opp.description}</p>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Organization:</span> {opp.organization}
                      </div>
                      <div>
                        <span className="font-medium">Date:</span> {formatDate(opp.startDate)}
                        {opp.endDate && ` - ${formatDate(opp.endDate)}`}
                        {opp.isOngoing && " (Ongoing)"}
                      </div>
                      <div>
                        <span className="font-medium">Submitted by:</span> {opp.postedBy.name} ({opp.postedBy.email})
                      </div>
                      <div>
                        <span className="font-medium">Submitted on:</span> {formatDate(opp.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleApprove(opp.id)}
                    disabled={processingId === opp.id}
                    className="flex-1 px-6 py-3 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                    style={{ backgroundColor: colors.primary }}
                    onMouseEnter={(e) => {
                      if (processingId !== opp.id) e.currentTarget.style.opacity = "0.9";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "1";
                    }}
                  >
                    {processingId === opp.id ? "Processing..." : "Approve"}
                  </button>
                  <button
                    onClick={() => handleReject(opp.id)}
                    disabled={processingId === opp.id}
                    className="flex-1 px-6 py-3 border border-red-300 text-red-700 font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {processingId === opp.id ? "Processing..." : "Reject"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

