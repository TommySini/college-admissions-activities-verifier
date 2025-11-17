"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, CheckCircle } from "lucide-react";

export default function NewPetitionPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    title: "",
    url: "",
    description: "",
    evidenceUrl: "",
  });
  
  if (status === "unauthenticated") {
    router.push("/auth/signin");
    return null;
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    
    try {
      const response = await fetch("/api/petitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to submit petition");
      }
      
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Petition Submitted!
          </h2>
          <p className="text-slate-600 mb-6">
            Thank you for suggesting this opportunity. Our team will review it and add it to the platform if approved.
          </p>
          <div className="flex gap-3">
            <Button variant="shimmer" onClick={() => router.push("/opportunities")} className="flex-1">
              Browse Opportunities
            </Button>
            <Button variant="shimmer" onClick={() => {
              setSubmitted(false);
              setFormData({ title: "", url: "", description: "", evidenceUrl: "" });
            }} className="flex-1">
              Submit Another
            </Button>
          </div>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link href="/opportunities" className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Back to Opportunities
          </Link>
        </div>
      </nav>
      
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Suggest an Opportunity
          </h1>
          <p className="text-slate-600">
            Know of a competition, program, or opportunity that's missing? Help us build the most comprehensive database for high school students.
          </p>
        </div>
        
        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Opportunity Name *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., National Economics Challenge"
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-300 focus:border-blue-500 text-slate-800 placeholder:text-slate-500 dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-400 dark:border-slate-700"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Official Website URL *
              </label>
              <input
                type="url"
                required
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://..."
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-300 focus:border-blue-500 text-slate-800 placeholder:text-slate-500 dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-400 dark:border-slate-700"
              />
              <p className="text-xs text-slate-500 mt-1">
                Please provide the official website with registration and deadline information
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                placeholder="Tell us about this opportunity..."
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-300 focus:border-blue-500 text-slate-800 placeholder:text-slate-500 dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-400 dark:border-slate-700"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Evidence/Proof URL (Optional)
              </label>
              <input
                type="url"
                value={formData.evidenceUrl}
                onChange={(e) => setFormData({ ...formData, evidenceUrl: e.target.value })}
                placeholder="https://..."
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-300 focus:border-blue-500 text-slate-800 placeholder:text-slate-500 dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-400 dark:border-slate-700"
              />
              <p className="text-xs text-slate-500 mt-1">
                Social media, news articles, or other sources that verify this opportunity
              </p>
            </div>
            
            <div className="pt-4 border-t border-slate-200">
              <p className="text-sm text-slate-600 mb-4">
                By submitting, you confirm that this is a legitimate opportunity for high school students and you're providing accurate information.
              </p>
              <div className="flex gap-3">
                <Button variant="shimmer" type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? "Submitting..." : "Submit Petition"}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.push("/opportunities")}>
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}

