import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { HospitalResultItem } from "@/lib/hospital-service.server";
import { getDefaultRoutingProvider } from "@/lib/providers/routing";

interface HospitalDetailsProps {
  hospital: HospitalResultItem | null;
  specialty: string;
  userLocation: { latitude: number; longitude: number } | null;
  onOpenChange: (open: boolean) => void;
}

function specialtyMatchLabel(match: boolean | null): string {
  if (match === true) return " (match)";
  if (match === false) return " (not confirmed from listing)";
  return "";
}

export function HospitalDetails({
  hospital,
  specialty,
  userLocation,
  onOpenChange,
}: HospitalDetailsProps) {
  const directionsUrl = hospital
    ? getDefaultRoutingProvider().buildDirectionsUrl(userLocation, {
        latitude: hospital.latitude,
        longitude: hospital.longitude,
      })
    : "#";

  return (
    <Dialog open={hospital !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        {hospital && (
          <>
            <DialogHeader>
              <DialogTitle>🏥 {hospital.name}</DialogTitle>
              <DialogDescription>{hospital.address ?? "Address not available"}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Relevant specialty: </span>
                {specialty}
                {specialtyMatchLabel(hospital.specialtyMatch)}
              </div>
              <div>
                <span className="text-muted-foreground">Distance: </span>
                {hospital.distanceKm.toFixed(1)} km
              </div>
              {hospital.rating != null && (
                <div>
                  <span className="text-muted-foreground">Rating: </span>⭐{" "}
                  {hospital.rating.toFixed(1)}
                  {hospital.reviewCount ? ` (${hospital.reviewCount} reviews)` : ""}
                </div>
              )}
              {hospital.phone && (
                <div>
                  <span className="text-muted-foreground">Phone: </span>
                  {hospital.phone}
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Why this result: </span>
                {hospital.ranking_reason}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button asChild className="flex-1">
                <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                  Get Directions
                </a>
              </Button>
              {hospital.website && (
                <Button variant="outline" asChild>
                  <a href={hospital.website} target="_blank" rel="noopener noreferrer">
                    Website
                  </a>
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
