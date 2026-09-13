import L from "leaflet";

import type { HospitalResultItem } from "@/lib/hospital-service.server";

// Emoji markers per spec section 7 (📍 You / 🏥 Hospital Name) -- avoids the
// classic Leaflet+bundler broken-default-icon problem entirely, since there's
// no image asset to resolve.
function buildEmojiIcon(emoji: string, size: number) {
  return L.divIcon({
    html: `<div style="font-size:${size}px;line-height:1;transform:translate(-50%,-100%);filter:drop-shadow(0 1px 1px rgba(0,0,0,0.35))">${emoji}</div>`,
    className: "healthbuddy-emoji-marker",
    iconSize: [0, 0],
  });
}

export const youMarkerIcon = buildEmojiIcon("📍", 26);
export const hospitalMarkerIcon = buildEmojiIcon("🏥", 24);
export const hospitalMarkerIconSelected = buildEmojiIcon("🏥", 34);

export function HospitalMarkerPopup({ hospital }: { hospital: HospitalResultItem }) {
  return (
    <div className="space-y-1 text-sm">
      <div className="font-semibold">🏥 {hospital.name}</div>
      {hospital.address && <div className="text-xs text-muted-foreground">{hospital.address}</div>}
      <div className="text-xs">
        📍 {hospital.distanceKm.toFixed(1)} km
        {hospital.rating != null ? ` · ⭐ ${hospital.rating.toFixed(1)}` : ""}
      </div>
    </div>
  );
}
