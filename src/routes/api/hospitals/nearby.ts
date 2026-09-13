import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { nearbyHospitals } from "@/lib/hospital-service.server";

// GET /api/hospitals/nearby?lat=&lng=&radius=&specialty=&location=
//
// Public JSON endpoint matching the product spec's literal contract. The
// in-app UI instead calls src/lib/hospital.functions.ts's getNearbyHospitals
// server fn (auth'd, same underlying service) -- this route exists for
// external callers / testing / anything hitting the API directly.
const querySchema = z.object({
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radius: z.coerce.number().min(1).max(50).optional(),
  specialty: z.string().max(60).optional(),
  location: z.string().max(200).optional(),
});

export const Route = createFileRoute("/api/hospitals/nearby")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid query parameters", details: parsed.error.flatten() },
            { status: 400 },
          );
        }

        try {
          const result = await nearbyHospitals({
            latitude: parsed.data.lat,
            longitude: parsed.data.lng,
            radiusKm: parsed.data.radius,
            specialty: parsed.data.specialty,
            locationQuery: parsed.data.location,
          });
          return Response.json(result);
        } catch (error) {
          console.error("[api/hospitals/nearby] failed", error);
          return Response.json({ error: "Hospital search failed unexpectedly." }, { status: 500 });
        }
      },
    },
  },
});
