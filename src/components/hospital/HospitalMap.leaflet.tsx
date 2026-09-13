import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import type { HospitalResultItem } from "@/lib/hospital-service.server";

import {
  HospitalMarkerPopup,
  hospitalMarkerIcon,
  hospitalMarkerIconSelected,
  youMarkerIcon,
} from "./HospitalMarker";

export interface HospitalMapProps {
  center: { latitude: number; longitude: number };
  hospitals: HospitalResultItem[];
  selectedId?: string | null;
  onSelect?: (hospital: HospitalResultItem) => void;
}

function RecenterOnChange({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([latitude, longitude], map.getZoom());
  }, [latitude, longitude, map]);
  return null;
}

// The actual Leaflet + OpenStreetMap map (spec section 4/8). Only ever
// loaded client-side via a dynamic import in HospitalMap.tsx -- see that
// file for why (Leaflet touches `window` at import time, which breaks SSR).
export function LeafletHospitalMap({ center, hospitals, selectedId, onSelect }: HospitalMapProps) {
  return (
    <MapContainer
      center={[center.latitude, center.longitude]}
      zoom={13}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterOnChange latitude={center.latitude} longitude={center.longitude} />
      <Marker position={[center.latitude, center.longitude]} icon={youMarkerIcon}>
        <Popup>You</Popup>
      </Marker>
      {hospitals.map((h) => {
        const key = h.id ?? `${h.latitude},${h.longitude},${h.name}`;
        return (
          <Marker
            key={key}
            position={[h.latitude, h.longitude]}
            icon={h.id && h.id === selectedId ? hospitalMarkerIconSelected : hospitalMarkerIcon}
            eventHandlers={onSelect ? { click: () => onSelect(h) } : undefined}
          >
            <Popup>
              <HospitalMarkerPopup hospital={h} />
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
