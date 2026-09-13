import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buildMedicineSearchUrls } from "@/lib/medicine-search-url";

// Feature C, spec section 16. Reusable everywhere a verified medicine
// mention needs a "Find Medicine" action -- the report explainer, the
// Medicine Explorer's detail view, and anywhere else a medicine name shows
// up. HealthBuddy never processes payments, stores payment info, purchases
// medicine, or claims real-time stock -- this only ever opens a plain
// external search the user completes themselves.
interface FindMedicineButtonProps {
  name: string;
  strength?: string | null;
  /** Only an exact DB match should render the buttons -- see medicine-service.server.ts. */
  verified: boolean;
  prescriptionRequired?: boolean;
  className?: string;
}

export function FindMedicineButton({
  name,
  strength,
  verified,
  prescriptionRequired,
  className,
}: FindMedicineButtonProps) {
  if (!verified) {
    return (
      <p className={className ?? "text-xs italic text-muted-foreground"}>
        Medicine name could not be verified.
      </p>
    );
  }

  const urls = buildMedicineSearchUrls(name, strength);

  return (
    <div className={className ?? "flex flex-wrap items-center gap-2"}>
      <Button size="sm" variant="outline" asChild>
        <a href={urls.buyOnline} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="size-3.5" /> Buy Online
        </a>
      </Button>
      <Button size="sm" variant="outline" asChild>
        <a href={urls.pharmacyNearMe} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="size-3.5" /> Pharmacy Near Me
        </a>
      </Button>
      {prescriptionRequired && (
        <span className="text-xs text-muted-foreground">A valid prescription may be required.</span>
      )}
    </div>
  );
}
