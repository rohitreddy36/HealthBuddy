import { auth } from "@clerk/tanstack-react-start/server";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { recommendHospitals } from "@/lib/hospital-service.server";

// POST /api/hospitals/recommend
// Body: { symptoms?: string | string[], specialty?, documentId?, latitude?,
//         longitude?, locationQuery?, radiusKm? }
//
// Public endpoint (works for a logged-out caller with symptoms/location
// only); a signed-in caller may additionally pass documentId to pull the
// specialty from a report they own (Feature C -> A link, spec section 17).
const bodySchema = z.object({
  symptoms: z.union([z.string(), z.array(z.string())]).optional(),
  specialty: z.string().max(60).optional(),
  documentId: z.string().uuid().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  locationQuery: z.string().max(200).optional(),
  radiusKm: z.number().min(1).max(50).optional(),
});

export const Route = createFileRoute("/api/hospitals/recommend")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const parsed = bodySchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid request body", details: parsed.error.flatten() },
            { status: 400 },
          );
        }

        const symptoms = Array.isArray(parsed.data.symptoms)
          ? parsed.data.symptoms.join(", ")
          : parsed.data.symptoms;

        let userId: string | null = null;
        try {
          const session = await auth();
          userId = session.isAuthenticated ? session.userId : null;
        } catch {
          userId = null;
        }

        try {
          const result = await recommendHospitals({ ...parsed.data, symptoms, userId });
          return Response.json(result);
        } catch (error) {
          console.error("[api/hospitals/recommend] failed", error);
          return Response.json(
            { error: "Hospital recommendation failed unexpectedly." },
            { status: 500 },
          );
        }
      },
    },
  },
});
