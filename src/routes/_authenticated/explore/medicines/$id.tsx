import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { FindMedicineButton } from "@/components/FindMedicineButton";
import { Badge } from "@/components/ui/badge";
import { getMedicineDetailFn } from "@/lib/medicine.functions";

export const Route = createFileRoute("/_authenticated/explore/medicines/$id")({
  component: MedicineDetailPage,
});

type Medicine = Awaited<ReturnType<typeof getMedicineDetailFn>>;

// A way back to the Explorer's search/filter -- there was previously no
// link on this page at all, only the browser's own back button, which
// isn't discoverable and (via a fresh page load) doesn't restore whatever
// search or symptom filter got the user here in the first place.
function BackToExplorer() {
  return (
    <Link
      to="/explore"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" /> Back to Explorer
    </Link>
  );
}

function MedicineDetailPage() {
  const { id } = Route.useParams();
  const getDetail = useServerFn(getMedicineDetailFn);
  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getDetail({ data: { id } })
      .then(setMedicine)
      .finally(() => setLoading(false));
  }, [id, getDetail]);

  if (loading) {
    return (
      <div className="space-y-4">
        <BackToExplorer />
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      </div>
    );
  }

  if (!medicine) {
    return (
      <div className="space-y-4">
        <BackToExplorer />
        <p className="text-sm text-muted-foreground">Medicine not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      <BackToExplorer />

      <header>
        <h1 className="flex flex-wrap items-center gap-2 font-display text-2xl font-semibold text-gradient">
          {medicine.name}
          {medicine.prescription_required && (
            <Badge variant="secondary">Prescription required</Badge>
          )}
        </h1>
        {medicine.generic_name && (
          <p className="mt-1 text-sm text-muted-foreground">{medicine.generic_name}</p>
        )}
      </header>

      <div className="space-y-4 rounded-2xl glass-card p-5">
        <FindMedicineButton
          name={medicine.name}
          verified
          prescriptionRequired={medicine.prescription_required}
        />

        {medicine.description && <p className="text-sm">{medicine.description}</p>}

        <DetailBlock title="Brand names" items={medicine.brand_names} />
        <DetailBlock title="Drug class" items={medicine.drug_class ? [medicine.drug_class] : []} />
        <DetailBlock title="Common uses" items={medicine.common_uses} />
        <DetailBlock title="Precautions" items={medicine.precautions} />
        <DetailBlock title="Side effects" items={medicine.side_effects} />
      </div>

      <p className="text-xs text-muted-foreground">
        This information is for educational purposes and does not replace advice from a qualified
        healthcare professional.
      </p>
    </div>
  );
}

function DetailBlock({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="mb-1 text-sm font-medium">{title}</div>
      <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}
