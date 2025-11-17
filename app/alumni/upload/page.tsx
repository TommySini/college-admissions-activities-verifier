"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Step = "privacy" | "upload" | "processing" | "complete";

export default function UploadApplicationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState<Step>("privacy");
  const [privacy, setPrivacy] = useState<"ANONYMOUS" | "PSEUDONYM" | "FULL">("ANONYMOUS");
  const [displayName, setDisplayName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [intendedMajor, setIntendedMajor] = useState("");
  const [careerTags, setCareerTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/auth/signin");
    return null;
  }

  const handlePrivacyNext = async () => {
    try {
      // Save profile settings
      const tags = careerTags.split(",").map((t) => t.trim()).filter(Boolean);
      const res = await fetch("/api/alumni/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          privacy,
          displayName: privacy !== "ANONYMOUS" ? displayName : null,
          contactEmail: privacy === "FULL" ? contactEmail : null,
          intendedMajor,
          careerInterestTags: tags,
        }),
      });

      if (!res.ok) throw new Error("Failed to save profile");
      setStep("upload");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleFileUpload = async () => {
    if (!file) {
      setError("Please select a file");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/alumni/applications", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to upload file");
      }

      const data = await res.json();
      setApplicationId(data.application.id);
      setStep("processing");

      // Poll for parse status
      pollParseStatus(data.application.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setUploading(false);
    }
  };

  const pollParseStatus = async (appId: string) => {
    const maxAttempts = 30; // 30 seconds max
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/alumni/applications/${appId}`);
        if (!res.ok) throw new Error("Failed to check status");

        const data = await res.json();
        const status = data.application.parseStatus;

        if (status === "success") {
          clearInterval(interval);
          setStep("complete");
        } else if (status === "failed") {
          clearInterval(interval);
          setError("Parsing failed: " + data.application.parseError);
          setUploading(false);
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          setStep("complete"); // Still show as complete, parsing may continue in background
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-xl">A</span>
                </div>
                <span className="text-xl font-bold text-gray-900">Actify</span>
              </Link>
              <div className="h-6 w-px bg-gray-300 mx-2"></div>
              <span className="text-sm text-gray-500">Upload Application</span>
            </div>
            <Link
              href="/alumni"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Back to Alumni Database
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[
              { key: "privacy", label: "Privacy Settings" },
              { key: "upload", label: "Upload File" },
              { key: "processing", label: "Processing" },
              { key: "complete", label: "Complete" },
            ].map((s, idx) => (
              <div key={s.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      step === s.key
                        ? "bg-blue-600 text-white"
                        : idx < ["privacy", "upload", "processing", "complete"].indexOf(step)
                        ? "bg-green-600 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <p className="text-xs mt-2 text-gray-600">{s.label}</p>
                </div>
                {idx < 3 && <div className="h-0.5 bg-gray-200 flex-1 -mt-8"></div>}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* Step: Privacy Settings */}
        {step === "privacy" && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Privacy Settings</h2>
            <p className="text-gray-600 mb-6">
              Choose how your profile will be displayed to other students.
            </p>

            <div className="space-y-4 mb-6">
              <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="privacy"
                  value="ANONYMOUS"
                  checked={privacy === "ANONYMOUS"}
                  onChange={(e) => setPrivacy(e.target.value as any)}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-gray-900">Anonymous</p>
                  <p className="text-sm text-gray-600">
                    Your name and contact info will be hidden. Only your activities, essays, and results will be visible.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="privacy"
                  value="PSEUDONYM"
                  checked={privacy === "PSEUDONYM"}
                  onChange={(e) => setPrivacy(e.target.value as any)}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-gray-900">Pseudonym</p>
                  <p className="text-sm text-gray-600">
                    Show a display name but hide contact info.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="privacy"
                  value="FULL"
                  checked={privacy === "FULL"}
                  onChange={(e) => setPrivacy(e.target.value as any)}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-gray-900">Full Profile</p>
                  <p className="text-sm text-gray-600">
                    Show your name and contact email so students can reach out.
                  </p>
                </div>
              </label>
            </div>

            {privacy !== "ANONYMOUS" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name or pseudonym"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {privacy === "FULL" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Intended Major</label>
              <input
                type="text"
                value={intendedMajor}
                onChange={(e) => setIntendedMajor(e.target.value)}
                placeholder="e.g., Computer Science"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Career Interest Tags (comma-separated)
              </label>
              <input
                type="text"
                value={careerTags}
                onChange={(e) => setCareerTags(e.target.value)}
                placeholder="e.g., finance, technology, healthcare"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handlePrivacyNext}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Next: Upload File
            </button>
          </div>
        )}

        {/* Step: Upload File */}
        {step === "upload" && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Upload Your Application File</h2>
            <p className="text-gray-600 mb-6">
              Upload your college admissions document (DOCX or TXT). Our AI will extract activities, essays, and results.
            </p>
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              <strong>Tip:</strong> If you have a PDF, open it and use "Save As" → "Plain Text (.txt)" or "Word Document (.docx)" to convert it first.
            </div>

            <div className="mb-6">
              <label className="block w-full">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  {file ? (
                    <div>
                      <p className="text-gray-900 font-medium">{file.name}</p>
                      <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-600 mb-2">Click to select a file</p>
                      <p className="text-sm text-gray-500">PDF, DOCX, or TXT (max 10MB)</p>
                    </div>
                  )}
                </div>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep("privacy")}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Back
              </button>
              <button
                onClick={handleFileUpload}
                disabled={!file || uploading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? "Uploading..." : "Upload & Process"}
              </button>
            </div>
          </div>
        )}

        {/* Step: Processing */}
        {step === "processing" && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
            <div className="mb-4">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Processing Your Application</h2>
            <p className="text-gray-600">
              Our AI is extracting activities, essays, and admission results from your file. This may take a minute...
            </p>
          </div>
        )}

        {/* Step: Complete */}
        {step === "complete" && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Complete!</h2>
            <p className="text-gray-600 mb-6">
              Your application has been uploaded and processed. You can now view it in the alumni database.
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href={`/alumni/${applicationId}`}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                View My Application
              </Link>
              <Link
                href="/alumni"
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Browse Alumni Database
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

