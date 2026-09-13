import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { rankBySimilarity } from "@/lib/fuzzy-match";
import {
  listMedicineNamesFn,
  listPopularMedicinesFn,
  listSymptomsFn,
  searchMedicinesFn,
} from "@/lib/medicine.functions";

export const Route = createFileRoute("/_authenticated/explore/")({
  head: () => ({ meta: [{ title: "Health Explorer — HealthBuddy" }] }),
  component: ExploreHub,
});

type Medicine = Awaited<ReturnType<typeof listPopularMedicinesFn>>[number];
type Symptom = Awaited<ReturnType<typeof listSymptomsFn>>[number];
type MedicineNameOption = Awaited<ReturnType<typeof listMedicineNamesFn>>[number];

// Health Explorer (spec section 11-13): search + browse the medicines/
// symptoms reference database. Debounced search per spec section 24.
function ExploreHub() {
  const navigate = useNavigate();
  const listMedicines = useServerFn(listPopularMedicinesFn);
  const listSymptoms = useServerFn(listSymptomsFn);
  const listMedicineNames = useServerFn(listMedicineNamesFn);
  const search = useServerFn(searchMedicinesFn);

  const [popular, setPopular] = useState<Medicine[] | null>(null);
  const [symptoms, setSymptoms] = useState<Symptom[] | null>(null);
  const [allNames, setAllNames] = useState<MedicineNameOption[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Medicine[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  useEffect(() => {
    listMedicines()
      .then(setPopular)
      .catch(() => setPopular([]));
    listSymptoms()
      .then(setSymptoms)
      .catch(() => setSymptoms([]));
    listMedicineNames()
      .then(setAllNames)
      .catch(() => setAllNames([]));
    // Fetched once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timeout = setTimeout(() => {
      search({ data: { q: trimmed } })
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, search]);

  // A predefined-name dropdown fed by every medicine already in the
  // database, so a user who fat-fingers "parachetamol" sees "Paracetamol"
  // as a pickable suggestion instead of typing straight into a dead end.
  // Computed client-side (no round-trip) against the name list fetched
  // once on mount; searchMedicinesFn itself also tolerates the same kind
  // of typo server-side (see fuzzy-match.ts) for whatever gets typed and
  // submitted without picking a suggestion.
  const suggestions = useMemo(() => rankBySimilarity(query, allNames, 6), [query, allNames]);

  function pickSuggestion(name: string, id: string) {
    setSuggestionsOpen(false);
    setQuery(name);
    void navigate({ to: "/explore/medicines/$id", params: { id } });
  }

  // There was previously no way to clear a typed search/symptom query other
  // than deleting it character by character (or navigating away and back,
  // which resets it anyway since it's local state) -- this resets straight
  // back to "Popular medicines" in one click.
  function clearQuery() {
    setQuery("");
    setResults(null);
    setSuggestionsOpen(false);
  }

  const shown = results ?? popular;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold text-gradient">Health Explorer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Look up medicines and symptoms from our reference database. This information is
          educational and does not replace advice from a qualified healthcare professional.
        </p>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSuggestionsOpen(true);
          }}
          onFocus={() => setSuggestionsOpen(true)}
          onBlur={() => setTimeout(() => setSuggestionsOpen(false), 150)}
          placeholder="Search medicines, symptoms, or conditions"
          className="pl-9 pr-9"
        />
        {searching ? (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : (
          query && (
            <button
              type="button"
              aria-label="Clear search"
              // onMouseDown (not onClick) so this fires before the input's
              // onBlur closes the suggestions dropdown.
              onMouseDown={(e) => {
                e.preventDefault();
                clearQuery();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )
        )}
        {suggestionsOpen && query.trim() && suggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border bg-popover shadow-md">
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                // onMouseDown (not onClick) so this fires before the
                // input's onBlur closes the dropdown.
                onMouseDown={(e) => {
                  e.preventDefault();
                  pickSuggestion(s.name, s.id);
                }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <span>{s.name}</span>
                {s.generic_name && s.generic_name !== s.name && (
                  <span className="text-xs text-muted-foreground">{s.generic_name}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <section>
        <h2 className="mb-3 font-semibold">{results ? "Search results" : "Popular medicines"}</h2>
        {shown === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : shown.length === 0 ? (
          <p className="text-sm text-muted-foreground">No medicines found.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {shown.map((m) => (
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
                {m.prescription_required && (
                  <Badge variant="secondary" className="mt-2 text-xs">
                    Prescription
                  </Badge>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Explore by symptom</h2>
        {symptoms === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {symptoms.map((s) => (
              <Link
                key={s.id}
                to="/explore/symptoms/$name"
                params={{ name: s.name }}
                className="rounded-full border px-3 py-1.5 text-sm transition-colors hover:border-primary/50"
              >
                {s.name}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
