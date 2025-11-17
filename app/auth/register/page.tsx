"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { WebGLShader } from "@/components/ui/web-gl-shader";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    profileType: "Applicant" as "Applicant" | "Organization",
    bio: "",
    location: "",
    description: "",
    website: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          profileType: formData.profileType,
          bio: formData.profileType === "Applicant" ? formData.bio : undefined,
          location: formData.location || undefined,
          description: formData.profileType === "Organization" ? formData.description : undefined,
          website: formData.profileType === "Organization" ? formData.website : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create account");
        setIsLoading(false);
        return;
      }

      // Redirect to sign in
      router.push("/auth/signin?registered=true");
    } catch (err) {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* WebGL Background */}
      <WebGLShader />
      
      {/* Content Layer */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="bg-black/5 backdrop-blur-xl rounded-2xl p-8 max-w-2xl w-full shadow-2xl border border-black/10 max-h-[90vh] overflow-y-auto">
          <h1 className="text-3xl font-bold text-black mb-2">
            Create Account
          </h1>
          <p className="text-black/60 mb-6">
            Create a new account to get started
          </p>

          {error && (
            <div className="p-3 bg-red-100/90 backdrop-blur-sm text-red-800 rounded-lg text-sm mb-4 border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Profile Type *
              </label>
              <select
                required
                value={formData.profileType}
                onChange={(e) =>
                  setFormData({ ...formData, profileType: e.target.value as "Applicant" | "Organization" })
                }
                className="w-full px-4 py-2 border border-black/10 rounded-lg bg-white/50 backdrop-blur-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Applicant">Applicant</option>
                <option value="Organization">Organization</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-1">
                {formData.profileType === "Organization" ? "Organization Name" : "Your Name"} *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-black/10 rounded-lg bg-white/50 backdrop-blur-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-black/10 rounded-lg bg-white/50 backdrop-blur-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Password *
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 border border-black/10 rounded-lg bg-white/50 backdrop-blur-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {formData.profileType === "Organization" ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-black/10 rounded-lg bg-white/50 backdrop-blur-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-4 py-2 border border-black/10 rounded-lg bg-white/50 backdrop-blur-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Bio
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-black/10 rounded-lg bg-white/50 backdrop-blur-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2 border border-black/10 rounded-lg bg-white/50 backdrop-blur-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-black/50">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-black font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

