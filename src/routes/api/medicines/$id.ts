import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { getMedicineById } from "@/lib/medicine-service.server";

// GET /api/medicines/:id -- ids are plain numeric strings from the static
// data/medicines-500.json dataset, not Supabase UUIDs (see
// medicine-service.server.ts).
const paramsSchema = z.object({ id: z.string().min(1) });

export const Route = createFileRoute("/api/medicines/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const parsed = paramsSchema.safeParse(params);
        if (!parsed.success)
          return Response.json({ error: "Invalid medicine id" }, { status: 400 });

        const medicine = await getMedicineById(parsed.data.id);
        if (!medicine) return Response.json({ error: "Medicine not found" }, { status: 404 });
        return Response.json({ medicine });
      },
    },
  },
});
