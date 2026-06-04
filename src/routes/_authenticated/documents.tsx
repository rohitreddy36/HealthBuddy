import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not analyze");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Medical report explainer</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Paste a blood report, prescription, or scan summary. We'll explain it in plain language.
        </p>
      </header>

      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <div>
          <Label htmlFor="t">Title</Label>
          <Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="CBC, Sep 2025" className="mt-1.5" />
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
          <Label htmlFor="file" className="cursor-pointer inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border rounded-md px-3 py-2">
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
            {loading ? <><Loader2 className="size-4 animate-spin" /> Analyzing…</> : "Explain my report"}
          </Button>
        </div>
      </div>

      {result && (
        <div className="space-y-4">
          <Section title="Document type">
            <p className="text-sm">{result.document_type}</p>
          </Section>
          <Section title="Simple summary">
            <p className="text-sm whitespace-pre-wrap">{result.simple_summary}</p>
          </Section>
          <Section title="Key terms explained">
            <ul className="text-sm space-y-2">
              {result.key_findings.map((k: { term: string; explanation: string }) => (
                <li key={k.term}><b>{k.term}:</b> {k.explanation}</li>
              ))}
            </ul>
          </Section>
          {result.values_to_watch.length > 0 && (
            <Section title="Values to watch">
              <ul className="text-sm space-y-2">
                {result.values_to_watch.map((v: { name: string; value: string; note: string }) => (
                  <li key={v.name} className="rounded-lg bg-secondary/60 p-3">
                    <div className="font-medium">{v.name}: {v.value}</div>
                    <div className="text-muted-foreground text-xs">{v.note}</div>
                  </li>
                ))}
              </ul>
            </Section>
          )}
          <Section title="Questions to ask your doctor">
            <ul className="text-sm list-disc pl-5 space-y-1">
              {result.questions_for_doctor.map((q: string) => <li key={q}>{q}</li>)}
            </ul>
          </Section>
          <Section title="What to track">
            <ul className="text-sm list-disc pl-5 space-y-1">
              {result.suggested_tracking.map((s: string) => <li key={s}>{s}</li>)}
            </ul>
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h3 className="font-semibold mb-2">{title}</h3>
      {children}
    </section>
  );
}
