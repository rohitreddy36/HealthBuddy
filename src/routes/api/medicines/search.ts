import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { searchMedicines } from "@/lib/medicine-service.server";

// GET /api/medicines/search?q=
const querySchema = z.object({ q: z.string().min(1).max(100) });

export const Route = createFileRoute("/api/medicines/search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
        if (!parsed.success) {
          return Response.json({ error: "Query parameter 'q' is required." }, { status: 400 });
        }
        const medicines = await searchMedicines(parsed.data.q);
        return Response.json({ medicines });
      },
    },
  },
});
