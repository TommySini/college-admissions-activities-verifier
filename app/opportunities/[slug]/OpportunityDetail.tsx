"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Calendar, MapPin, Users, Award, Bookmark, Bell, ArrowLeft, 
  ExternalLink, Globe, Clock, DollarSign, CheckCircle2
} from "lucide-react";
import { format, isPast } from "date-fns";
import { downloadICalFile } from "@/lib/calendar";

interface OpportunityDetailProps {
  slug: string;
}

export function OpportunityDetail({ slug }: OpportunityDetailProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [opportunity, setOpportunity] = useState<any>(null);
  const [currentEdition, setCurrentEdition] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated") {
      fetchOpportunity();
    }
  }, [status, slug]);

  const fetchOpportunity = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/opportunities/${slug}`);
      const data = await response.json();

      if (response.ok) {
        setOpportunity(data.opportunity);
        setCurrentEdition(data.currentEdition);
      } else {
        console.error("Failed to fetch opportunity:", data.error);
      }
    } catch (error) {
      console.error("Error fetching opportunity:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentEdition) return;
    setIsSaving(true);
    try {
      await fetch(`/api/editions/${currentEdition.id}/save`, { method: "POST" });
      fetchOpportunity();
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFollow = async () => {
    if (!currentEdition) return;
    setIsFollowing(true);
    try {
      await fetch(`/api/editions/${currentEdition.id}/follow`, { method: "POST" });
      fetchOpportunity();
    } catch (error) {
      console.error("Error following:", error);
    } finally {
      setIsFollowing(false);
    }
  };

  const handleExportDeadline = () => {
    if (!currentEdition?.registrationDeadline) return;
    downloadICalFile({
      uid: `${currentEdition.id}-deadline`,
      title: `${opportunity.name} - Registration Deadline`,
      description: `Registration deadline for ${opportunity.name}`,
      location: opportunity.location
        ? [opportunity.location.city, opportunity.location.state, opportunity.location.country]
            .filter(Boolean)
            .join(", ")
        : undefined,
      url: opportunity.website || "",
      startDate: new Date(currentEdition.registrationDeadline),
      endDate: new Date(currentEdition.registrationDeadline),
      organizer: opportunity.provider?.name,
    });
  };

  const handleExportEvent = () => {
    if (!currentEdition?.eventStart) return;
    downloadICalFile({
      uid: `${currentEdition.id}-event`,
      title: opportunity.name,
      description: opportunity.description || "",
      location: opportunity.location
        ? [opportunity.location.city, opportunity.location.state, opportunity.location.country]
            .filter(Boolean)
            .join(", ")
        : undefined,
      url: opportunity.website || "",
      startDate: new Date(currentEdition.eventStart),
      endDate: currentEdition.eventEnd
        ? new Date(currentEdition.eventEnd)
        : new Date(currentEdition.eventStart),
      organizer: opportunity.provider?.name,
    });
  };

  if (status === "loading" || loading) {
    return <LoadingSkeleton />;
  }

  if (!opportunity) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md p-12 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Opportunity Not Found</h2>
          <p className="text-slate-600 mb-6">The opportunity you're looking for doesn't exist.</p>
          <Button variant="shimmer" onClick={() => router.push("/opportunities")}>
            Browse All Opportunities
          </Button>
        </Card>
      </div>
    );
  }

  const isSaved = currentEdition?.saves && currentEdition.saves.length > 0;
  const isFollowed = currentEdition?.follows && currentEdition.follows.length > 0;
  const hasSchoolParticipation =
    currentEdition?.participations && currentEdition.participations.length > 0;

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/opportunities"
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Opportunities
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
                Dashboard
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-start justify-between gap-6 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-4xl font-bold text-slate-900">{opportunity.name}</h1>
                {hasSchoolParticipation && (
                  <Badge variant="success" className="text-sm">
                    ✓ Done at your school
                  </Badge>
                )}
              </div>
              {opportunity.provider && (
                <p className="text-lg text-slate-600 mb-3">
                  by {opportunity.provider.name}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {currentEdition && (
                  <Badge
                    variant={
                      currentEdition.status === "open"
                        ? "success"
                        : currentEdition.status === "upcoming"
                        ? "warning"
                        : "secondary"
                    }
                  >
                    {currentEdition.status}
                  </Badge>
                )}
                <Badge variant="outline">{opportunity.type}</Badge>
                <Badge variant="outline">{opportunity.modality}</Badge>
                {opportunity.structure === "team" && (
                  <Badge variant="outline">
                    <Users className="h-3 w-3 mr-1" />
                    Team
                  </Badge>
                )}
              </div>
            </div>

            {currentEdition && (
              <div className="flex gap-2 shrink-0">
                <Button
                  variant={isSaved ? "shimmer" : "outline"}
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  <Bookmark className={`h-4 w-4 mr-2 ${isSaved ? "fill-current" : ""}`} />
                  {isSaved ? "Saved" : "Save"}
                </Button>
                <Button
                  variant={isFollowed ? "shimmer" : "outline"}
                  onClick={handleFollow}
                  disabled={isFollowing}
                >
                  <Bell className={`h-4 w-4 mr-2 ${isFollowed ? "fill-current" : ""}`} />
                  {isFollowed ? "Following" : "Follow"}
                </Button>
              </div>
            )}
          </div>

          {opportunity.description && (
            <p className="text-slate-700 leading-relaxed text-lg">{opportunity.description}</p>
          )}
        </header>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Edition Info */}
            {currentEdition && (
              <Card className="p-6">
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">
                  {currentEdition.cycle} Edition
                </h2>

                <div className="space-y-4">
                  {/* Dates */}
                  {currentEdition.registrationDeadline && (
                    <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                      <Calendar className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">Registration Deadline</p>
                        <p
                          className={
                            isPast(new Date(currentEdition.registrationDeadline))
                              ? "text-red-600 font-medium"
                              : "text-slate-700"
                          }
                        >
                          {format(new Date(currentEdition.registrationDeadline), "MMMM d, yyyy")}
                        </p>
                      </div>
                      <Button variant="shimmer" size="sm" onClick={handleExportDeadline}>
                        <Calendar className="h-4 w-4 mr-2" />
                        Add to Calendar
                      </Button>
                    </div>
                  )}

                  {currentEdition.eventStart && (
                    <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                      <Calendar className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">Event Dates</p>
                        <p className="text-slate-700">
                          {format(new Date(currentEdition.eventStart), "MMMM d, yyyy")}
                          {currentEdition.eventEnd &&
                            ` - ${format(new Date(currentEdition.eventEnd), "MMMM d, yyyy")}`}
                        </p>
                      </div>
                      <Button variant="shimmer" size="sm" onClick={handleExportEvent}>
                        <Calendar className="h-4 w-4 mr-2" />
                        Add to Calendar
                      </Button>
                    </div>
                  )}

                  {/* Awards */}
                  {currentEdition.awardTypes && currentEdition.awardTypes.length > 0 && (
                    <div>
                      <p className="font-medium text-slate-900 mb-2">Awards & Recognition</p>
                      <div className="flex flex-wrap gap-2">
                        {currentEdition.awardTypes.map((award: string) => (
                          <Badge key={award} variant="secondary">
                            {award.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Eligibility */}
                  {(currentEdition.gradeMin || currentEdition.gradeMax) && (
                    <div>
                      <p className="font-medium text-slate-900 mb-2">Eligibility</p>
                      <p className="text-slate-700">
                        Grades {currentEdition.gradeMin || "?"} - {currentEdition.gradeMax || "?"}
                      </p>
                    </div>
                  )}

                  {/* Cost */}
                  {currentEdition.registrationFee !== null &&
                    currentEdition.registrationFee !== undefined && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-slate-400" />
                        <span className="font-medium text-slate-900">Registration Fee:</span>
                        <span className="text-slate-700">
                          {currentEdition.registrationFee === 0
                            ? "Free"
                            : `$${currentEdition.registrationFee}`}
                        </span>
                      </div>
                    )}
                </div>
              </Card>
            )}

            {/* Description & Details */}
            {opportunity.description && (
              <Card className="p-6">
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">About</h2>
                <p className="text-slate-700 leading-relaxed">{opportunity.description}</p>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <Card className="p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Quick Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Globe className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-slate-900">Format</p>
                    <p className="text-slate-600 capitalize">{opportunity.modality}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Users className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-slate-900">Structure</p>
                    <p className="text-slate-600 capitalize">{opportunity.structure}</p>
                    {opportunity.teamMin && opportunity.teamMax && (
                      <p className="text-xs text-slate-500">
                        Team size: {opportunity.teamMin}-{opportunity.teamMax}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-slate-900">Geography</p>
                    <p className="text-slate-600 capitalize">
                      {opportunity.geography.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>

                {opportunity.location && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-slate-900">Location</p>
                      <p className="text-slate-600">
                        {[
                          opportunity.location.city,
                          opportunity.location.state,
                          opportunity.location.country,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Domains */}
            {opportunity.domains && opportunity.domains.length > 0 && (
              <Card className="p-6">
                <h3 className="font-semibold text-slate-900 mb-3">Domains</h3>
                <div className="flex flex-wrap gap-2">
                  {opportunity.domains.map((od: any) => (
                    <Badge key={od.domain.id} variant="secondary">
                      {od.domain.name}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* External Links */}
            {opportunity.website && (
              <Button
                variant="shimmer"
                className="w-full"
                onClick={() => window.open(opportunity.website, "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Visit Official Website
              </Button>
            )}

            {/* Social Proof */}
            {currentEdition && (
              <Card className="p-6 bg-slate-50">
                <h3 className="font-semibold text-slate-900 mb-3">Community</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Bookmark className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600">
                      {currentEdition._count?.saves || 0} saves
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600">
                      {currentEdition._count?.follows || 0} following
                    </span>
                  </div>
                  {hasSchoolParticipation && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-green-700 font-medium">
                        Done by students at your school
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen">
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

