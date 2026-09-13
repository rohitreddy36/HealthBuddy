import { MapPin, Star, Stethoscope } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { HospitalResultItem } from "@/lib/hospital-service.server";
import { getDefaultRoutingProvider } from "@/lib/providers/routing";

interface HospitalRecommendationCardProps {
  hospital: HospitalResultItem;
  specialty: string;
  userLocation: { latitude: number; longitude: number } | null;
  onViewDetails?: (hospital: HospitalResultItem) => void;
  selected?: boolean;
}

// Maps a ranking_reason sentence to one of the short badge labels spec
// section 7 asks for -- never an unsupported superlative like "best
// hospital in the city".
function matchBadgeLabel(reason: string): string {
  const lower = reason.toLowerCase();
  if (lower.startsWith("best match")) return "Best Match";
  if (lower.includes("closest")) return "Closest Relevant Hospital";
  if (lower.includes("highly rated")) return "Highly Rated Nearby";
  if (lower.includes("strong specialty")) return "Strong Specialty Match";
  return "Relevant Hospital";
}

export function HospitalRecommendationCard({
  hospital,
  specialty,
  userLocation,
  onViewDetails,
  selected,
}: HospitalRecommendationCardProps) {
  const directionsUrl = getDefaultRoutingProvider().buildDirectionsUrl(userLocation, {
    latitude: hospital.latitude,
    longitude: hospital.longitude,
  });

  return (
    <div
      className={`hover-lift space-y-2 rounded-3xl p-4 transition-shadow ${
        selected ? "glass-card glow-brand border-primary/40" : "glass-card"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 font-semibold">🏥 {hospital.name}</div>
          {hospital.address && (
            <div className="mt-0.5 text-xs text-muted-foreground">{hospital.address}</div>
          )}
        </div>
        <Badge variant="secondary" className="shrink-0">
          {matchBadgeLabel(hospital.ranking_reason)}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        {hospital.rating != null && (
          <span className="flex items-center gap-1">
            <Star className="size-3.5 fill-current text-amber-500" /> {hospital.rating.toFixed(1)}
            {hospital.reviewCount ? ` (${hospital.reviewCount})` : ""}
          </span>
        )}
        <span className="flex items-center gap-1">
          <MapPin className="size-3.5" /> {hospital.distanceKm.toFixed(1)} km
        </span>
        <span className="flex items-center gap-1">
          <Stethoscope className="size-3.5" /> {specialty}
          {hospital.specialtyMatch === true ? " · match" : ""}
        </span>
      </div>

      <p className="text-xs text-muted-foreground">{hospital.ranking_reason}</p>

      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="outline" onClick={() => onViewDetails?.(hospital)}>
          View Details
        </Button>
        <Button size="sm" asChild>
          <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
            Directions
          </a>
        </Button>
      </div>
    </div>
  );
}
