import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Siren, Stethoscope, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FindMedicineButton } from "@/components/FindMedicineButton";
import { analyzeDocument } from "@/lib/health.functions";

export const Route = createFileRoute("/_authenticated/documents")({
  component: Documents,
});

type Result = Awaited<ReturnType<typeof analyzeDocument>>["analysis"];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function Documents() {
  const analyze = useServerFn(analyzeDocument);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);

  async function onFile(file: File) {
    if (file.size > 12 * 1024 * 1024) {
      toast.error("File too large (max 12MB).");
      return;
    }
    if (!title) setTitle(file.name);
    setFileName(file.name);
    if (file.type === "text/plain") {
      setText(await file.text());
      setImageDataUrl(null);
    } else if (file.type.startsWith("image/") || file.type === "application/pdf") {
      setImageDataUrl(await fileToDataUrl(file));
      setText("");
    } else {
      toast.error("Unsupported file. Use an image, PDF, or .txt.");
    }
  }

  async function submit() {
    if (!title.trim() || (text.trim().length < 10 && !imageDataUrl)) {
      toast.error("Add a title and either paste the report or upload an image/PDF.");
      return;
    }
    setLoading(true);
    try {
      const r = await analyze({
        data: { title, text: text || undefined, imageDataUrl: imageDataUrl ?? undefined },
      });
      setResult(r.analysis);
      setDocumentId(r.id ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not analyze");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold text-gradient">
          Medical report explainer
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Paste a blood report, prescription, or scan summary. We'll explain it in plain language.
        </p>
      </header>

      <div className="rounded-2xl glass-card p-6 space-y-4">
        <div>
          <Label htmlFor="t">Title</Label>
          <Input
            id="t"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="CBC, Sep 2025"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="text">Report content</Label>
          <Textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the report text here…"
            rows={10}
            className="mt-1.5 font-mono text-xs"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Label
            htmlFor="file"
            className="cursor-pointer inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border rounded-md px-3 py-2"
          >
            <Upload className="size-4" /> Upload image, PDF, or .txt
            <input
              id="file"
              type="file"
              accept="image/*,application/pdf,.txt,text/plain"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
          </Label>
          {fileName && (
            <span className="text-xs text-muted-foreground">
              Attached: {fileName}
              <button
                type="button"
                className="ml-2 underline"
                onClick={() => {
                  setImageDataUrl(null);
                  setFileName(null);
                }}
              >
                remove
              </button>
            </span>
          )}
          <Button onClick={submit} disabled={loading} className="ml-auto">
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Analyzing…
              </>
            ) : (
              "Explain my report"
            )}
          </Button>
        </div>
      </div>

      {result && (
        <div className="space-y-4">
          {result.urgency === "emergency" && (
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
              <Siren className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div className="text-sm">
                <p className="font-semibold text-destructive">
                  This report may require urgent medical attention.
                </p>
                <p className="mt-1 text-muted-foreground">
                  Please seek emergency care immediately or call your local emergency number.
                </p>
              </div>
            </div>
          )}

          <Section title="Document type">
            <p className="text-sm">{result.document_type}</p>
          </Section>
          <Section title="Simple summary">
            <p className="text-sm whitespace-pre-wrap">{result.simple_summary}</p>
          </Section>

          <Section
            title="Relevant specialty"
            icon={<Stethoscope className="size-4 text-primary" />}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm">{result.recommended_specialty}</p>
              <Button variant="outline" size="sm" asChild>
                <Link
                  to="/explore/hospitals"
                  search={{
                    specialty: result.recommended_specialty,
                    documentId: documentId ?? undefined,
                  }}
                >
                  Find Nearby Hospitals
                </Link>
              </Button>
            </div>
          </Section>

          {result.extracted_medicines.length > 0 && (
            <Section title="Medicines mentioned in this report">
              <ul className="space-y-3 text-sm">
                {result.extracted_medicines.map((m) => (
                  <li key={m.raw} className="rounded-lg bg-secondary/60 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium">
                        {m.name}
                        {m.strength ? ` — ${m.strength}` : ""}
                        {!m.verified && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            (could not be verified)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2">
                      <FindMedicineButton
                        name={m.name}
                        strength={m.strength}
                        verified={m.verified}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                This information is for educational purposes and does not replace advice from a
                qualified healthcare professional.
              </p>
            </Section>
          )}
          <Section title="Key terms explained">
            <ul className="text-sm space-y-2">
              {result.key_findings.map((k: { term: string; explanation: string }) => (
                <li key={k.term}>
                  <b>{k.term}:</b> {k.explanation}
                </li>
              ))}
            </ul>
          </Section>
          {result.values_to_watch.length > 0 && (
            <Section title="Values to watch">
              <ul className="text-sm space-y-2">
                {result.values_to_watch.map((v: { name: string; value: string; note: string }) => (
                  <li key={v.name} className="rounded-lg bg-secondary/60 p-3">
                    <div className="font-medium">
                      {v.name}: {v.value}
                    </div>
                    <div className="text-muted-foreground text-xs">{v.note}</div>
                  </li>
                ))}
              </ul>
            </Section>
          )}
          <Section title="Questions to ask your doctor">
            <ul className="text-sm list-disc pl-5 space-y-1">
              {result.questions_for_doctor.map((q: string) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </Section>
          <Section title="What to track">
            <ul className="text-sm list-disc pl-5 space-y-1">
              {result.suggested_tracking.map((s: string) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl glass-card p-5">
      <h3 className="font-semibold mb-2 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}
