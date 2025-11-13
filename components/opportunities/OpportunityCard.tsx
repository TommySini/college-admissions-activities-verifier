"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, Award, Bookmark, Bell, ExternalLink } from "lucide-react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

interface OpportunityCardProps {
  edition: any; // Full edition with opportunity data
  onSave?: () => void;
  onFollow?: () => void;
  onExportCalendar?: () => void;
}

export function OpportunityCard({
  edition,
  onSave,
  onFollow,
  onExportCalendar,
}: OpportunityCardProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // Fix hydration: relative time is non-deterministic, compute client-side only
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const opportunity = edition.opportunity;
  const isSaved = edition.saves && edition.saves.length > 0;
  const isFollowed = edition.follows && edition.follows.length > 0;
  const hasSchoolParticipation = edition.participations && edition.participations.length > 0;
  
  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaving(true);
    await onSave?.();
    setIsSaving(false);
  };
  
  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFollowing(true);
    await onFollow?.();
    setIsFollowing(false);
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "success";
      case "upcoming":
        return "warning";
      case "closed":
        return "destructive";
      default:
        return "secondary";
    }
  };
  
  const getModalityIcon = (modality: string) => {
    switch (modality) {
      case "online":
        return "🌐";
      case "in_person":
        return "📍";
      case "hybrid":
        return "🔄";
      default:
        return "";
    }
  };
  
  const opportunitySlug = opportunity.slug;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Link href={`/opportunities/${opportunitySlug}`}>
        <Card
          className="hover:shadow-lg transition-all cursor-pointer group h-full flex flex-col"
          data-testid="opportunity-card"
        >
        <div className="p-6 flex flex-col gap-4 h-full">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                  {opportunity.name}
                </h3>
                {hasSchoolParticipation && (
                  <Badge variant="success" className="text-xs shrink-0">
                    ✓ Done at your school
                  </Badge>
                )}
              </div>
              {opportunity.provider && (
                <p className="text-sm text-slate-600 mb-2">{opportunity.provider.name}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Badge variant={getStatusColor(edition.status) as any}>
                  {edition.status}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {getModalityIcon(opportunity.modality)} {opportunity.modality}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {opportunity.type}
                </Badge>
                {opportunity.structure === "team" && (
                  <Badge variant="outline" className="text-xs">
                    <Users className="h-3 w-3 mr-1" />
                    Team
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex gap-1 shrink-0">
              <Button
                size="icon"
                variant="ghost"
                onClick={handleSave}
                disabled={isSaving}
                className={isSaved ? "text-yellow-600" : ""}
              >
                <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleFollow}
                disabled={isFollowing}
                className={isFollowed ? "text-blue-600" : ""}
              >
                <Bell className={`h-4 w-4 ${isFollowed ? "fill-current" : ""}`} />
              </Button>
            </div>
          </div>
          
          {/* Description */}
          {opportunity.description && (
            <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
              {opportunity.description}
            </p>
          )}
          
          {/* Details */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm space-y-2">
            {edition.registrationDeadline && (
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-slate-900">Registration Deadline</p>
                  <p className={isPast(new Date(edition.registrationDeadline)) ? "text-red-600" : "text-slate-600"}>
                    {format(new Date(edition.registrationDeadline), "MMM d, yyyy")}
                    {isClient && !isPast(new Date(edition.registrationDeadline)) && (
                      <span className="ml-2 text-xs">
                        ({formatDistanceToNow(new Date(edition.registrationDeadline), { addSuffix: true })})
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}
            
            {edition.eventStart && (
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-slate-900">Event Date</p>
                  <p className="text-slate-600">
                    {format(new Date(edition.eventStart), "MMM d, yyyy")}
                    {edition.eventEnd && ` - ${format(new Date(edition.eventEnd), "MMM d, yyyy")}`}
                  </p>
                </div>
              </div>
            )}
            
            {opportunity.location && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-slate-900">Location</p>
                  <p className="text-slate-600">
                    {[opportunity.location.city, opportunity.location.state, opportunity.location.country]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              </div>
            )}
            
            {(() => {
              // Safe guard: normalize awardTypes to array even if API missed something
              const awards = Array.isArray(edition.awardTypes)
                ? edition.awardTypes
                : (typeof edition.awardTypes === "string"
                    ? edition.awardTypes.split(/[,\s]+/).map(s => s.trim()).filter(Boolean)
                    : []);
              
              if (awards.length === 0) return null;
              
              return (
                <div className="flex items-start gap-2">
                  <Award className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-slate-900">Awards</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {awards.map((award) => (
                        <Badge key={award} variant="outline" className="text-xs">
                          {String(award).replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
          
          {/* Domain tags */}
          {opportunity.domains && opportunity.domains.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {opportunity.domains.slice(0, 3).map((od: any) => (
                <Badge key={od.domain.id} variant="secondary" className="text-xs">
                  {od.domain.name}
                </Badge>
              ))}
              {opportunity.domains.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{opportunity.domains.length - 3} more
                </Badge>
              )}
            </div>
          )}
          
          {/* Footer */}
          <div className="mt-auto flex gap-2 pt-4 border-t border-slate-200">
            {opportunity.website && (
              <Button
                variant="shimmer"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(opportunity.website, "_blank");
                }}
              >
                <ExternalLink className="h-4 w-4" />
                Learn More
              </Button>
            )}
            {(edition.registrationDeadline || edition.eventStart) && (
              <Button
                variant="shimmer"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onExportCalendar?.();
                }}
                title="Add to calendar"
              >
                <Calendar className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* Popularity indicator */}
          {edition.popularityScore > 50 && (
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span>🔥</span>
              <span>{edition.savesCount} saves • {edition.followsCount} following</span>
            </div>
          )}
        </div>
      </Card>
      </Link>
    </motion.div>
  );
}

