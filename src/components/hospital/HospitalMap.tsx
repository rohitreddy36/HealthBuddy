import { useEffect, useState, type JSX } from "react";

import { cn } from "@/lib/utils";

import type { HospitalMapProps } from "./HospitalMap.leaflet";

export type { HospitalMapProps };

/**
 * SSR-safe wrapper around the real Leaflet map. Leaflet reads `window`/DOM
 * at module-evaluation time, which throws during TanStack Start's server
 * render -- so the actual implementation (HospitalMap.leaflet.tsx) is only
 * ever pulled in via a dynamic import from inside useEffect (client-only).
 * This also satisfies spec section 24's "lazy loading of map components".
 */
export function HospitalMap({ className, ...mapProps }: HospitalMapProps & { className?: string }) {
  const [Comp, setComp] = useState<((p: HospitalMapProps) => JSX.Element) | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("./HospitalMap.leaflet").then((mod) => {
      if (!cancelled) setComp(() => mod.LeafletHospitalMap);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    // `isolate` traps Leaflet's internal panes/controls (which use z-index
    // up to 700-800 with no stacking context of their own -- Leaflet only
    // sets `position: relative` on .leaflet-container, not a z-index, so
    // those values compete directly against the rest of the page) inside
    // this element's own stacking context. Without it, the map's marker
    // popup (and even its zoom controls) can paint above a z-50 shadcn
    // Dialog/Sheet/dropdown that's DOM-portalled elsewhere, which is
    // exactly the "map popup overlapping the hospital details dialog" bug.
    <div className={cn("isolate", className ?? "h-80 w-full overflow-hidden rounded-2xl border")}>
      {Comp ? (
        <Comp {...mapProps} />
      ) : (
        <div className="grid h-full place-items-center text-sm text-muted-foreground">
          Loading map…
        </div>
      )}
    </div>
  );
}
