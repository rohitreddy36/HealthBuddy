import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { listPopularMedicines } from "@/lib/medicine-service.server";

// GET /api/medicines?limit= -- the Explorer's "Popular Medicines" list.
const querySchema = z.object({ limit: z.coerce.number().min(1).max(100).optional() });

export const Route = createFileRoute("/api/medicines/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
        const medicines = await listPopularMedicines(
          parsed.success ? (parsed.data.limit ?? 50) : 50,
        );
        return Response.json({ medicines });
      },
    },
  },
});
