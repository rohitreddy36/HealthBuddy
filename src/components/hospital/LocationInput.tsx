import { Loader2, LocateFixed, MapPin } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Location priority per spec section 3: (1) browser/device geolocation,
// (2) user-entered location, (3) city/area/PIN code. Denied geolocation
// never breaks the feature -- it just surfaces the manual entry path with
// the exact copy the spec asks for.
export interface ResolvedUserLocation {
  latitude?: number;
  longitude?: number;
  locationQuery?: string;
  label: string;
}

interface LocationInputProps {
  onResolved: (location: ResolvedUserLocation) => void;
  className?: string;
}

export function LocationInput({ onResolved, className }: LocationInputProps) {
  const [manualLocation, setManualLocation] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [denied, setDenied] = useState(false);

  function requestGeolocation() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setDenied(true);
      return;
    }
    setRequesting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setRequesting(false);
        setDenied(false);
        onResolved({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          label: "Your current location",
        });
      },
      () => {
        setRequesting(false);
        setDenied(true);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }

  function submitManual() {
    const trimmed = manualLocation.trim();
    if (!trimmed) return;
    onResolved({ locationQuery: trimmed, label: trimmed });
  }

  return (
    <div className={className ?? "space-y-3"}>
      <Button
        type="button"
        variant="outline"
        onClick={requestGeolocation}
        disabled={requesting}
        className="w-full sm:w-auto"
      >
        {requesting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <LocateFixed className="size-4" />
        )}
        Use my current location
      </Button>

      {denied && (
        <p className="text-sm text-muted-foreground">
          Location access was not provided. Enter your city or area to find nearby hospitals.
        </p>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={manualLocation}
            onChange={(e) => setManualLocation(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitManual()}
            placeholder="City, area, PIN code, or address"
            className="pl-8"
          />
        </div>
        <Button type="button" onClick={submitManual} disabled={!manualLocation.trim()}>
          Search
        </Button>
      </div>
    </div>
  );
}
