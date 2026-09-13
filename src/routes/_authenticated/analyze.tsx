import { useUser } from "@clerk/tanstack-react-start";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  Mail,
  Siren,
  Stethoscope,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  analyzeSymptoms,
  getFollowUpQuestions,
  getLatestSymptomAnalysis,
} from "@/lib/health.functions";
import { sendMyReminderEmail } from "@/lib/reminder.functions";

export const Route = createFileRoute("/_authenticated/analyze")({
  head: () => ({ meta: [{ title: "Symptom Check — AIL Health" }] }),
  component: Analyze,
});

type Stage = "input" | "follow" | "result";
type Analysis = Awaited<ReturnType<typeof analyzeSymptoms>>;
type FollowUps = Awaited<ReturnType<typeof getFollowUpQuestions>>;

function Analyze() {
  const { user } = useUser();
  const fetchFollow = useServerFn(getFollowUpQuestions);
  const fetchAnalysis = useServerFn(analyzeSymptoms);
  const fetchLatest = useServerFn(getLatestSymptomAnalysis);
  const sendReminder = useServerFn(sendMyReminderEmail);

  const [stage, setStage] = useState<Stage>("input");
  const [restoring, setRestoring] = useState(true);
  const [loading, setLoading] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [analyzedAt, setAnalyzedAt] = useState<Date | null>(null);
  const [form, setForm] = useState({
    symptoms: "",
    duration: "",
    severity: "mild",
    ageGroup: "adult",
    medicalHistory: "",
  });
  const [followUps, setFollowUps] = useState<FollowUps | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<Analysis | null>(null);

  // Restore the most recently generated report on mount so switching tabs
  // (or any other remount) doesn't drop it and force a fresh AI request --
  // analyzeSymptoms already saves every result to symptom_analyses, this
  // just reads the latest one back for the signed-in user.
  useEffect(() => {
    fetchLatest()
      .then((latest) => {
        if (!latest) return;
        setForm({
          symptoms: latest.symptoms,
          duration: latest.duration,
          severity: latest.severity,
          ageGroup: latest.ageGroup,
          medicalHistory: latest.medicalHistory,
        });
        setSelected(new Set(latest.selectedFollowUps));
        setResult(latest.result);
        setAnalyzedAt(new Date(latest.createdAt));
        setStage("result");
      })
      .catch(() => {
        // No saved report yet (or the fetch failed) -- just start fresh.
      })
      .finally(() => setRestoring(false));
    // Runs once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function next() {
    if (!form.symptoms.trim()) return;
    setLoading(true);
    try {
      const r = await fetchFollow({ data: form });
      setFollowUps(r);
      setSelected(new Set());
      setStage("follow");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate questions");
    } finally {
      setLoading(false);
    }
  }

  async function analyze() {
    setLoading(true);
    try {
      const r = await fetchAnalysis({
        data: { ...form, selectedFollowUps: Array.from(selected) },
      });
      setResult(r);
      setAnalyzedAt(new Date());
      setStage("result");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not analyze");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStage("input");
    setResult(null);
    setFollowUps(null);
    setSelected(new Set());
  }

  async function emailMe() {
    setEmailing(true);
    try {
      const r = await sendReminder();
      toast.success(`Emailed to ${r.sentTo}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send the email");
    } finally {
      setEmailing(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold text-gradient">Symptom check</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Tell us what's going on. We'll ask a few gentle follow-ups, then give calm guidance.
        </p>
      </header>

      {restoring && (
        <div className="flex items-center gap-2 rounded-3xl glass-card p-6 text-sm text-muted-foreground shadow-xl shadow-black/[0.03]">
          <Loader2 className="size-4 animate-spin" /> Loading your last check…
        </div>
      )}

      {!restoring && stage === "input" && (
        <div className="rounded-3xl glass-card p-6 space-y-4 shadow-xl shadow-black/[0.03]">
          <div>
            <Label htmlFor="sym">What are you experiencing?</Label>
            <Textarea
              id="sym"
              placeholder="e.g., I have a cold"
              value={form.symptoms}
              onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
              className="mt-1.5"
              rows={3}
            />
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label>Duration</Label>
              <Input
                placeholder="2 days"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Severity</Label>
              <Select
                value={form.severity}
                onValueChange={(v) => setForm({ ...form, severity: v })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mild">Mild</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="severe">Severe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Age group</Label>
              <Select
                value={form.ageGroup}
                onValueChange={(v) => setForm({ ...form, ageGroup: v })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="child">Child</SelectItem>
                  <SelectItem value="teen">Teen</SelectItem>
                  <SelectItem value="adult">Adult</SelectItem>
                  <SelectItem value="senior">Senior</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="hx">Relevant medical history (optional)</Label>
            <Textarea
              id="hx"
              placeholder="e.g., asthma, diabetes"
              value={form.medicalHistory}
              onChange={(e) => setForm({ ...form, medicalHistory: e.target.value })}
              className="mt-1.5"
              rows={2}
            />
          </div>
          <Button onClick={next} disabled={loading || !form.symptoms.trim()} className="w-full">
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Preparing questions…
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      )}

      {!restoring && stage === "follow" && followUps && (
        <div className="rounded-3xl glass-card p-6 space-y-4 shadow-xl shadow-black/[0.03]">
          <p className="text-sm text-muted-foreground">{followUps.rationale}</p>
          <h2 className="font-semibold">Select any that apply:</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {followUps.follow_up_symptoms.map((s) => (
              <label
                key={s}
                className="flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors hover:border-primary/40 hover:bg-secondary/50"
              >
                <Checkbox
                  checked={selected.has(s)}
                  onCheckedChange={(c) => {
                    const next = new Set(selected);
                    if (c) next.add(s);
                    else next.delete(s);
                    setSelected(next);
                  }}
                />
                <span className="text-sm">{s}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStage("input")}>
              Back
            </Button>
            <Button onClick={analyze} disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Analyzing…
                </>
              ) : (
                "Get guidance"
              )}
            </Button>
          </div>
        </div>
      )}

      {!restoring && stage === "result" && result && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {user?.primaryEmailAddress?.emailAddress && (
                <>Report for {user.primaryEmailAddress.emailAddress} &middot; </>
              )}
              Generated {analyzedAt ? analyzedAt.toLocaleString() : ""}
            </p>
            <div className="flex gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={emailMe} disabled={emailing}>
                {emailing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Mail className="size-3.5" />
                )}
                Email me this
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Download className="size-3.5" /> Download as PDF
              </Button>
            </div>
          </div>

          {result.urgency === "emergency" && (
            <div className="flex items-start gap-3 rounded-3xl border border-destructive/40 bg-destructive/10 p-5 shadow-lg shadow-destructive/10 print:hidden animate-fade-up">
              <Siren className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div className="text-sm">
                <p className="font-semibold text-destructive">
                  Your symptoms may require urgent medical attention.
                </p>
                <p className="mt-1 text-muted-foreground">
                  Please seek emergency care immediately or call your local emergency number.
                </p>
                <Button asChild size="sm" variant="destructive" className="mt-2">
                  <Link
                    to="/explore/hospitals"
                    search={{ specialty: result.recommended_specialty, symptoms: form.symptoms }}
                  >
                    Find nearby hospitals
                  </Link>
                </Button>
              </div>
            </div>
          )}

          <Section title="Current health summary">
            <p className="text-sm">{result.summary}</p>
          </Section>

          <Section title="Possible concerns">
            <ul className="space-y-2">
              {result.possible_concerns.map((c) => (
                <li key={c.name} className="flex items-center justify-between text-sm">
                  <span>{c.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground capitalize">
                    {c.confidence} confidence
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Self-care guidance">
            <ul className="text-sm space-y-1 list-disc pl-5">
              {result.self_care.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </Section>

          <Section title="Diet recommendations">
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="font-medium text-success">Include</div>
                <ul className="list-disc pl-5">
                  {result.diet.include.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="font-medium text-destructive">Avoid</div>
                <ul className="list-disc pl-5">
                  {result.diet.avoid.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-3 text-sm">
              <div className="font-medium mb-1">Sample meal plan</div>
              <ul className="space-y-1">
                <li>
                  <b>Breakfast:</b> {result.diet.sample_meal_plan.breakfast}
                </li>
                <li>
                  <b>Lunch:</b> {result.diet.sample_meal_plan.lunch}
                </li>
                <li>
                  <b>Dinner:</b> {result.diet.sample_meal_plan.dinner}
                </li>
                <li>
                  <b>Snacks:</b> {result.diet.sample_meal_plan.snacks}
                </li>
              </ul>
              <p className="mt-2 text-muted-foreground">{result.diet.hydration}</p>
            </div>
          </Section>

          <Section title="Exercise & recovery">
            <ul className="text-sm space-y-1 list-disc pl-5">
              {result.exercise.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </Section>

          <Section
            title="When to seek medical attention"
            icon={<AlertCircle className="size-4 text-primary" />}
          >
            <div className="text-sm">
              <div className="font-medium capitalize mb-1">
                {result.when_to_seek_care.replace(/_/g, " ")}
              </div>
              <p className="text-muted-foreground">{result.care_reason}</p>
            </div>
          </Section>

          <Section
            title="Relevant specialty"
            icon={<Stethoscope className="size-4 text-primary" />}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm">{result.recommended_specialty}</p>
              <Button asChild size="sm" variant="outline" className="print:hidden">
                <Link
                  to="/explore/hospitals"
                  search={{ specialty: result.recommended_specialty, symptoms: form.symptoms }}
                >
                  Find Nearby Hospitals
                </Link>
              </Button>
            </div>
          </Section>

          <Section title="If ignored for a prolonged period">
            <p className="text-sm text-muted-foreground">{result.potential_complications}</p>
          </Section>

          <div className="flex gap-2 print:hidden">
            <Button variant="outline" onClick={reset}>
              New check
            </Button>
            <div className="flex-1 flex items-center gap-2 text-xs text-muted-foreground justify-end">
              <CheckCircle2 className="size-3.5 text-success" /> Saved to your dashboard
            </div>
          </div>
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
    <section className="rounded-3xl glass-card p-5 shadow-xl shadow-black/[0.03] animate-fade-up">
      <h3 className="font-semibold mb-2 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}
