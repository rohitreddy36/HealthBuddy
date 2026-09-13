import type { HospitalResultItem } from "@/lib/hospital-service.server";

import { HospitalRecommendationCard } from "./HospitalRecommendationCard";

interface HospitalRecommendationListProps {
  hospitals: HospitalResultItem[];
  specialty: string;
  userLocation: { latitude: number; longitude: number } | null;
  selectedId?: string | null;
  onSelect?: (hospital: HospitalResultItem) => void;
  emptyMessage?: string;
}

export function HospitalRecommendationList({
  hospitals,
  specialty,
  userLocation,
  selectedId,
  onSelect,
  emptyMessage,
}: HospitalRecommendationListProps) {
  if (hospitals.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        {emptyMessage ?? "No hospitals found for this search yet."}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {hospitals.map((h) => (
        <HospitalRecommendationCard
          key={h.id ?? `${h.latitude},${h.longitude},${h.name}`}
          hospital={h}
          specialty={specialty}
          userLocation={userLocation}
          selected={h.id != null && h.id === selectedId}
          onViewDetails={onSelect}
        />
      ))}
    </div>
  );
}
