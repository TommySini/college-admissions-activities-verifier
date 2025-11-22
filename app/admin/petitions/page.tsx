"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, CheckCircle, XCircle, Clock } from "lucide-react";

export default function AdminPetitionsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [petitions, setPetitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  
  useEffect(() => {
    if (status === "authenticated") {
      if (session.user.role !== "admin") {
        router.push("/dashboard");
        return;
      }
      fetchPetitions();
    } else if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, session, router, filterStatus]);
  
  const fetchPetitions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/petitions?status=${filterStatus}`);
      const data = await response.json();
      setPetitions(data.petitions || []);
    } catch (error) {
      console.error("Error fetching petitions:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleReview = async (id: string, status: string, notes?: string) => {
    try {
      await fetch(`/api/petitions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewNotes: notes }),
      });
      fetchPetitions();
    } catch (error) {
      console.error("Error reviewing petition:", error);
    }
  };
  
  const handleAIVerify = async (id: string) => {
    try {
      const response = await fetch(`/api/petitions/${id}/ai-verify`, {
        method: "POST",
      });
      const data = await response.json();
      alert(`AI Confidence: ${(data.confidence * 100).toFixed(1)}%\nExtracted: ${JSON.stringify(data.extracted, null, 2)}`);
      fetchPetitions();
    } catch (error: any) {
      alert(error.message || "AI verification failed");
    }
  };
  
  if (status === "loading" || loading) {
    return <div className="admin-dark-scope p-8">Loading...</div>;
  }
  
  return (
    <div className="admin-dark-scope min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Petition Review
          </h1>
          <p className="text-slate-600">
            Review and approve opportunities suggested by students
          </p>
        </div>
        
        <div className="flex gap-2 mb-6">
          {["pending", "needs_review", "approved", "rejected"].map((s) => (
            <Button
              key={s}
              variant={filterStatus === s ? "shimmer" : "outline"}
              onClick={() => setFilterStatus(s)}
            >
              {s.replace("_", " ")}
            </Button>
          ))}
        </div>
        
        {petitions.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-slate-600">No petitions with status: {filterStatus}</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {petitions.map((petition) => (
              <Card key={petition.id} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-slate-900">
                        {petition.title}
                      </h3>
                      <Badge variant={
                        petition.status === "approved" ? "success" :
                        petition.status === "rejected" ? "destructive" :
                        petition.status === "needs_review" ? "warning" : "secondary"
                      }>
                        {petition.status}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-slate-600 mb-3">
                      Submitted by {petition.user?.name || "Unknown"} ({petition.user?.email})
                    </p>
                    
                    {petition.description && (
                      <p className="text-slate-700 mb-3">{petition.description}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-3 text-sm">
                      <a
                        href={petition.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Official Website
                      </a>
                      {petition.evidenceUrl && (
                        <a
                          href={petition.evidenceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Evidence
                        </a>
                      )}
                    </div>
                    
                    {petition.aiConfidence && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium text-blue-900">
                          AI Confidence: {(petition.aiConfidence * 100).toFixed(1)}%
                        </p>
                      </div>
                    )}
                    
                    {petition.reviewNotes && (
                      <div className="mt-3 p-3 bg-slate-100 rounded-lg">
                        <p className="text-sm font-medium text-slate-900 mb-1">Review Notes:</p>
                        <p className="text-sm text-slate-700">{petition.reviewNotes}</p>
                      </div>
                    )}
                  </div>
                  
                  {petition.status === "pending" && (
                    <div className="flex flex-col gap-2 shrink-0">
                      {process.env.NEXT_PUBLIC_FEATURE_AI_VERIFY === "true" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAIVerify(petition.id)}
                        >
                          AI Verify
                        </Button>
                      )}
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          const notes = prompt("Approval notes (optional):");
                          handleReview(petition.id, "approved", notes || undefined);
                        }}
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReview(petition.id, "needs_review")}
                      >
                        <Clock className="h-4 w-4" />
                        Needs Review
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          const notes = prompt("Rejection reason:");
                          if (notes) handleReview(petition.id, "rejected", notes);
                        }}
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

