import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { listMedicinesBySymptom } from "@/lib/medicine-service.server";

// GET /api/medicines/by-symptom?symptom=
const querySchema = z.object({ symptom: z.string().min(1).max(100) });

export const Route = createFileRoute("/api/medicines/by-symptom")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
        if (!parsed.success) {
          return Response.json(
            { error: "Query parameter 'symptom' is required." },
            { status: 400 },
          );
        }
        const medicines = await listMedicinesBySymptom(parsed.data.symptom);
        return Response.json({ medicines });
      },
    },
  },
});
