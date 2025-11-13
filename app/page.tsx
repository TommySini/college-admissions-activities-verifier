"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, BarChart3, CheckCircle, Lock, Zap } from "lucide-react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session && !hasRedirected) {
      setHasRedirected(true);
      // Redirect admins to admin dashboard, others to regular dashboard
      if (session.user.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [status, session, router, hasRedirected]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-black">Loading...</div>
      </div>
    );
  }

  if (session) {
    // Show loading while redirecting
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-black">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30">
      {/* Content Layer */}
      <div className="relative z-10 min-h-screen">
        {/* Navigation */}
        <nav className="w-full sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg overflow-hidden shadow-lg shadow-blue-500/50">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                >
                  <source src="/logo-video.mp4" type="video/mp4" />
                  {/* Fallback content if video cannot load */}
                  A
                </video>
              </div>
              <span className="text-xl font-bold text-black">Actify</span>
            </div>
            <Link
              href="/auth/signin"
              className="px-6 py-2 text-black font-medium hover:text-gray-700 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-black mb-6 leading-tight">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Manage all your student's activities
              </span>
              <br />
              in one platform.
            </h1>
            <p className="text-xl md:text-2xl text-black/70 mb-8 max-w-3xl mx-auto leading-relaxed">
              Making the college admissions process more efficient and trustworthy than ever.
            </p>
          </div>

          {/* Sign Up Section */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-black/5 backdrop-blur-xl rounded-2xl p-8 md:p-12 shadow-2xl border border-black/10">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-black mb-3">
                  Get Started Today
                </h2>
                <p className="text-black/60">
                  Choose your role and sign in with Google to begin
                </p>
              </div>

              <div className="space-y-4">
                <Link
                  href="/auth/signin?role=student"
                  className="block w-full group"
                >
                  <div className="bg-black/5 backdrop-blur-sm border-2 border-blue-200 rounded-xl p-6 hover:border-blue-400 hover:bg-black/10 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 backdrop-blur-sm rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors border border-blue-200">
                          <BookOpen className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-lg font-semibold text-black mb-1">
                            Sign Up as Student
                          </h3>
                          <p className="text-sm text-black/60">
                            Track and verify your extracurricular activities
                          </p>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/auth/signin?role=admin"
                  className="block w-full group"
                >
                  <div className="bg-black/5 backdrop-blur-sm border-2 border-purple-200 rounded-xl p-6 hover:border-purple-400 hover:bg-black/10 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-100 backdrop-blur-sm rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors border border-purple-200">
                          <BarChart3 className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-lg font-semibold text-black mb-1">
                            Sign Up as Admin
                          </h3>
                          <p className="text-sm text-black/60">
                            Manage students, view analytics, and export data
                          </p>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-purple-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              </div>

              <div className="mt-8 pt-8 border-t border-black/10">
                <p className="text-center text-sm text-black/50">
                  Secure authentication with Google OAuth
                </p>
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div className="mt-24 grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center bg-black/5 backdrop-blur-sm rounded-2xl p-6 border border-black/10">
              <div className="w-16 h-16 bg-blue-100 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-200">
                <CheckCircle className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-black mb-2">Verified Activities</h3>
              <p className="text-black/60 text-sm">
                Activities reviewed by school-approved organizations ensure accuracy and credibility
              </p>
            </div>

            <div className="text-center bg-black/5 backdrop-blur-sm rounded-2xl p-6 border border-black/10">
              <div className="w-16 h-16 bg-blue-100 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-200">
                <Lock className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-black mb-2">Secure & Private</h3>
              <p className="text-black/60 text-sm">
                Your data is protected with industry-standard security practices
              </p>
            </div>

            <div className="text-center bg-black/5 backdrop-blur-sm rounded-2xl p-6 border border-black/10">
              <div className="w-16 h-16 bg-blue-100 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-200">
                <Zap className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-black mb-2">Fast & Efficient</h3>
              <p className="text-black/60 text-sm">
                Streamline your college application process with verified activities
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-black/10 mt-24">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="text-center text-sm text-black/50">
              <p>© 2024 Actify. All rights reserved.</p>
              <p className="mt-2">Powered by The Benjamin School</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
