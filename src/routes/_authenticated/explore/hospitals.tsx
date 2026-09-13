import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Siren } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { HospitalDetails } from "@/components/hospital/HospitalDetails";
import { HospitalMap } from "@/components/hospital/HospitalMap";
import { HospitalRecommendationList } from "@/components/hospital/HospitalRecommendationList";
import { LocationInput, type ResolvedUserLocation } from "@/components/hospital/LocationInput";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { HospitalResultItem } from "@/lib/hospital-service.server";
import { getHospitalRecommendation } from "@/lib/hospital.functions";

// Feature A: Smart Nearby Hospital Recommendation. Reachable directly from
// the Explore tab, or deep-linked from a symptom check / report ("Find
// Nearby Hospitals", spec section 17) via ?specialty=&documentId=.
const searchSchema = z.object({
  specialty: z.string().optional(),
  symptoms: z.string().optional(),
  documentId: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/explore/hospitals")({
  head: () => ({ meta: [{ title: "Find Hospitals — HealthBuddy" }] }),
  validateSearch: (search) => searchSchema.parse(search),
  component: HospitalsPage,
});

type RecommendationResult = Awaited<ReturnType<typeof getHospitalRecommendation>>;

function HospitalsPage() {
  const search = Route.useSearch();
  const recommend = useServerFn(getHospitalRecommendation);

  const cameFromReport = Boolean(search.specialty || search.documentId);
  const [symptomsInput, setSymptomsInput] = useState(search.symptoms ?? "");
  const [location, setLocation] = useState<ResolvedUserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<RecommendationResult | null>(null);
  const [detailsHospital, setDetailsHospital] = useState<HospitalResultItem | null>(null);

  async function runSearch(loc: ResolvedUserLocation) {
    setLoading(true);
    try {
      const result = await recommend({
        data: {
          latitude: loc.latitude,
          longitude: loc.longitude,
          locationQuery: loc.locationQuery,
          specialty: search.specialty,
          documentId: search.documentId,
          symptoms: cameFromReport ? undefined : symptomsInput.trim() || undefined,
        },
      });
      setResponse(result);
      if (result.providerStatus === "error") {
        toast.error(result.message ?? "Hospital search failed.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not search hospitals");
    } finally {
      setLoading(false);
    }
  }

  function onLocationResolved(loc: ResolvedUserLocation) {
    setLocation(loc);
    void runSearch(loc);
  }

  function searchAgain() {
    if (location) void runSearch(location);
  }

  const userCoords: { latitude: number; longitude: number } | null =
    response?.location ??
    (location?.latitude != null && location?.longitude != null
      ? { latitude: location.latitude, longitude: location.longitude }
      : null);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold text-gradient">Find nearby hospitals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Based on your symptoms or report, we suggest a relevant specialty and nearby hospitals —
          never a diagnosis.
        </p>
      </header>

      <div className="space-y-4 rounded-2xl glass-card p-5">
        {cameFromReport ? (
          <p className="text-sm text-muted-foreground">
            Showing hospitals relevant to{" "}
            <span className="font-medium text-foreground">{search.specialty ?? "your report"}</span>
            .
          </p>
        ) : (
          <div>
            <Label htmlFor="symptoms">Symptoms (optional)</Label>
            <Textarea
              id="symptoms"
              value={symptomsInput}
              onChange={(e) => setSymptomsInput(e.target.value)}
              placeholder="e.g. Fever, persistent cough and difficulty breathing"
              rows={2}
              className="mt-1.5"
            />
            {location && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={searchAgain}
                disabled={loading}
              >
                Update specialty from symptoms
              </Button>
            )}
          </div>
        )}

        <LocationInput onResolved={onLocationResolved} />
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Searching nearby hospitals…
        </div>
      )}

      {!loading && response?.providerStatus === "location_required" && (
        <p className="text-sm text-muted-foreground">{response.message}</p>
      )}

      {!loading && response && response.providerStatus !== "location_required" && (
        <div className="space-y-4">
          {response.emergency && (
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
              <Siren className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div className="text-sm">
                <p className="font-semibold text-destructive">
                  Your symptoms may require urgent medical attention.
                </p>
                <p className="mt-1 text-muted-foreground">
                  Please seek emergency care immediately or call your local emergency number.
                </p>
              </div>
            </div>
          )}

          {response.providerStatus === "unconfigured" && (
            <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
              {response.message}
            </p>
          )}
          {response.providerStatus === "error" && (
            <p className="rounded-2xl border border-dashed p-4 text-sm text-destructive">
              {response.message}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Relevant specialty:</span>
            <span className="font-medium text-foreground">{response.specialty}</span>
          </div>

          {userCoords && (
            <HospitalMap
              center={userCoords}
              hospitals={response.hospitals}
              selectedId={detailsHospital?.id ?? null}
              onSelect={setDetailsHospital}
            />
          )}

          <HospitalRecommendationList
            hospitals={response.hospitals}
            specialty={response.specialty}
            userLocation={userCoords}
            selectedId={detailsHospital?.id ?? null}
            onSelect={setDetailsHospital}
            emptyMessage={
              response.providerStatus === "ok"
                ? "No hospitals found nearby for this search."
                : undefined
            }
          />
        </div>
      )}

      <HospitalDetails
        hospital={detailsHospital}
        specialty={response?.specialty ?? "General Medicine"}
        userLocation={userCoords}
        onOpenChange={(open) => !open && setDetailsHospital(null)}
      />
    </div>
  );
}
