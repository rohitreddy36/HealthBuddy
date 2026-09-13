import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { getMedicinesBySymptomFn } from "@/lib/medicine.functions";

export const Route = createFileRoute("/_authenticated/explore/symptoms/$name")({
  component: SymptomMedicinesPage,
});

type Medicine = Awaited<ReturnType<typeof getMedicinesBySymptomFn>>[number];

function SymptomMedicinesPage() {
  const { name } = Route.useParams();
  const listBySymptom = useServerFn(getMedicinesBySymptomFn);
  const [medicines, setMedicines] = useState<Medicine[] | null>(null);

  useEffect(() => {
    setMedicines(null);
    listBySymptom({ data: { symptom: name } })
      .then(setMedicines)
      .catch(() => setMedicines([]));
  }, [name, listBySymptom]);

  return (
    <div className="space-y-4">
      {/* Only the browser's own back button got you back to the symptom
          list/search before -- not discoverable, and it doesn't clear the
          filter that led here either. */}
      <Link
        to="/explore"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to Explorer
      </Link>

      <header>
        <h1 className="font-display text-2xl font-semibold text-gradient">Medicines for {name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reference information only — this is not a recommendation to take any specific medicine.
        </p>
      </header>

      {medicines === null ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : medicines.length === 0 ? (
        <p className="text-sm text-muted-foreground">No medicines found for this symptom.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {medicines.map((m) => (
            <Link
              key={m.id}
              to="/explore/medicines/$id"
              params={{ id: m.id }}
              className="hover-lift rounded-2xl glass-card p-4 transition-shadow hover:glow-brand"
            >
              <div className="font-medium">{m.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {m.drug_class ?? m.generic_name ?? ""}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
