"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Participation {
  id: string;
  opportunity: {
    id: string;
    title: string;
    organization: string;
    endDate: string | null;
  };
}

interface OpportunityCompletionPromptProps {
  participations: Participation[];
  onComplete: (participationId: string, completed: boolean) => Promise<void>;
  onDismiss: () => void;
}

export function OpportunityCompletionPrompt({
  participations,
  onComplete,
  onDismiss,
}: OpportunityCompletionPromptProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const handleComplete = async (participationId: string, completed: boolean) => {
    setProcessingId(participationId);
    try {
      await onComplete(participationId, completed);
      setDismissedIds((prev) => new Set([...prev, participationId]));
    } catch (error) {
      console.error("Error updating participation:", error);
      alert("Failed to update participation. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  const visibleParticipations = participations.filter(
    (p) => !dismissedIds.has(p.id)
  );

  if (visibleParticipations.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            Complete Your Opportunities
          </h2>
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <p className="text-gray-600 mb-6">
          The following opportunities have ended. Did you complete them?
        </p>

        <div className="space-y-4">
          {visibleParticipations.map((participation) => (
            <div
              key={participation.id}
              className="p-4 border border-gray-200 rounded-lg"
            >
              <div className="mb-3">
                <h3 className="font-semibold text-gray-900">
                  {participation.opportunity.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {participation.opportunity.organization}
                </p>
                {participation.opportunity.endDate && (
                  <p className="text-xs text-gray-500 mt-1">
                    Ended: {new Date(participation.opportunity.endDate).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleComplete(participation.id, true)}
                  disabled={processingId === participation.id}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingId === participation.id
                    ? "Processing..."
                    : "Yes, I completed it"}
                </button>
                <button
                  onClick={() => handleComplete(participation.id, false)}
                  disabled={processingId === participation.id}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingId === participation.id
                    ? "Processing..."
                    : "No, I didn't complete it"}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onDismiss}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            I'll do this later
          </button>
        </div>
      </div>
    </div>
  );
}

