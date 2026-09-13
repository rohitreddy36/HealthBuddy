import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireAuth } from "@/integrations/supabase/auth-middleware";

import {
  nearbyHospitals as nearbyHospitalsService,
  recommendHospitals as recommendHospitalsService,
} from "./hospital-service.server";

// TanStack Start server-fn wrappers around hospital-service.server.ts, used
// by the in-app UI (via useServerFn). The literal REST endpoints from the
// product spec (GET /api/hospitals/nearby, POST /api/hospitals/recommend)
// live in src/routes/api/hospitals/* and call the same service functions --
// see that directory for the public, unauthenticated JSON API.

const locationInputSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  locationQuery: z.string().max(200).optional(),
  radiusKm: z.number().min(1).max(50).optional(),
});

export const getNearbyHospitals = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((i: unknown) =>
    locationInputSchema.extend({ specialty: z.string().max(60).optional() }).parse(i),
  )
  .handler(async ({ data }) => nearbyHospitalsService(data));

export const getHospitalRecommendation = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((i: unknown) =>
    locationInputSchema
      .extend({
        symptoms: z.string().max(1000).optional(),
        specialty: z.string().max(60).optional(),
        documentId: z.string().uuid().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) =>
    recommendHospitalsService({ ...data, userId: context.userId }),
  );
