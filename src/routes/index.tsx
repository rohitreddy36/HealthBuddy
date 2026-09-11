import { useAuth } from "@clerk/tanstack-react-start";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  Brain,
  FileText,
  Loader2,
  MessageCircle,
  Shield,
  Sparkles,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { DashboardContent } from "@/components/DashboardContent";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AIL Health Advisor — Calm AI Health Guidance" },
      {
        name: "description",
        content:
          "AI-powered symptom checker, health chat, and medical report explainer. Gentle, judgement-free guidance for everyday wellness.",
      },
      { property: "og:title", content: "AIL Health Advisor" },
      {
        property: "og:description",
        content: "AI-powered symptom analysis, health chat, and medical report explainer.",
      },
    ],
  }),
  component: Home,
});

const features = [
  {
    icon: Brain,
    title: "Smart Symptom Check",
    body: "Answer a few gentle follow-up questions. Get a calm, structured summary — never a scary headline.",
  },
  {
    icon: MessageCircle,
    title: "AI Health Chat",
    body: "Ask anything — 'Can I drink coffee with a cold?' Get conversational, judgement-free guidance.",
  },
  {
    icon: FileText,
    title: "Report Explainer",
    body: "Paste a blood report or prescription. We translate the medical jargon into plain English.",
  },
  {
    icon: Shield,
    title: "Private by design",
    body: "Your data is yours alone. Row-level security keeps everything scoped to your account.",
  },
] as const;

const steps = [
  {
    n: "01",
    title: "Tell us what's up",
    body: "Describe your symptoms in your own words — no forms, no jargon.",
  },
  {
    n: "02",
    title: "Answer a few gentle follow-ups",
    body: "A short, targeted checklist helps sharpen the guidance.",
  },
  {
    n: "03",
    title: "Get calm, structured guidance",
    body: "Self-care, diet, exercise, and a clear signal on when to see a doctor.",
  },
] as const;

// The homepage doubles as the dashboard: signed-in visitors see their
// dashboard directly here (no separate redirect/flash to /dashboard —
// Clerk's post sign-in/up redirect already lands on "/"), logged-out
// visitors see the marketing page below.
function Home() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isSignedIn) {
    return (
      <AppShell>
        <DashboardContent />
      </AppShell>
    );
  }

  return <Landing />;
}

function Landing() {
  return (
    <div className="min-h-screen bg-background overflow-x-clip">
      <header className="sticky top-0 z-20 glass border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <span className="size-9 rounded-xl bg-gradient-to-br from-primary to-info text-primary-foreground grid place-items-center shadow-sm">
              <Activity className="size-5" />
            </span>
            <span className="font-display text-lg">HealthBuddy</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/sign-in/$">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link to="/sign-up/$">
              <Button
                size="sm"
                className="rounded-full shadow-sm hover:shadow-md transition-shadow"
              >
                Sign up
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-24 -left-24 size-[26rem] rounded-full bg-primary/25 blur-3xl animate-blob" />
          <div className="absolute top-10 right-[-6rem] size-[22rem] rounded-full bg-accent/40 blur-3xl animate-blob-delayed" />
          <div className="absolute bottom-[-8rem] left-1/3 size-[20rem] rounded-full bg-info/20 blur-3xl animate-blob" />
        </div>

        <div className="max-w-6xl mx-auto px-4 pt-16 pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium mb-6 glow-ring animate-fade-up">
            <Sparkles className="size-3.5" /> AI + ML Health Advisory
          </div>
          <h1 className="animate-fade-up font-display text-4xl md:text-6xl font-semibold tracking-tight max-w-3xl mx-auto [animation-delay:80ms]">
            Calm, careful health guidance — <span className="text-gradient">powered by AI.</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto animate-fade-up [animation-delay:160ms]">
            Describe your symptoms, ask follow-up questions, and understand your medical reports in
            plain language. No alarms, no diagnoses — just gentle, structured guidance.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 animate-fade-up [animation-delay:240ms]">
            <Link to="/sign-up/$">
              <Button
                size="lg"
                className="rounded-full px-6 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
              >
                Get started free
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button
                size="lg"
                variant="outline"
                className="rounded-full px-6 hover:-translate-y-0.5 transition-transform"
              >
                How it works
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section id="features" className="max-w-6xl mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group relative rounded-2xl border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 animate-fade-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 group-hover:to-primary/[0.04] transition-colors duration-300 pointer-events-none" />
              <div className="size-11 rounded-xl bg-gradient-to-br from-secondary to-accent text-primary grid place-items-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                <f.icon className="size-5" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="text-center mb-10">
          <h2 className="font-display text-2xl md:text-3xl font-semibold">How it works</h2>
          <p className="text-muted-foreground text-sm mt-2">
            Three steps, a couple of minutes, no waiting rooms.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 relative">
          <div className="hidden md:block absolute top-6 left-[16.5%] right-[16.5%] h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          {steps.map((s) => (
            <div key={s.n} className="relative text-center px-2">
              <div className="mx-auto mb-4 size-12 rounded-full bg-gradient-to-br from-primary to-info text-primary-foreground font-display font-semibold grid place-items-center shadow-md shadow-primary/20">
                {s.n}
              </div>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-info px-8 py-12 text-center text-primary-foreground shadow-xl shadow-primary/20">
          <div className="pointer-events-none absolute inset-0 opacity-15 [background-image:radial-gradient(circle_at_15%_20%,white,transparent_35%),radial-gradient(circle_at_85%_70%,white,transparent_40%)]" />
          <h2 className="relative font-display text-2xl md:text-3xl font-semibold">
            Ready to feel a little more informed?
          </h2>
          <p className="relative mt-2 text-sm text-primary-foreground/85 max-w-lg mx-auto">
            It's free to start, and every check stays private to your account.
          </p>
          <div className="relative mt-6">
            <Link to="/sign-up/$">
              <Button
                size="lg"
                variant="secondary"
                className="rounded-full px-6 shadow-lg hover:-translate-y-0.5 transition-transform"
              >
                Create your free account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-4 pb-10">
        <div className="p-4 rounded-xl bg-muted text-muted-foreground text-sm text-center max-w-3xl mx-auto">
          AIL Health Advisor is for general wellness guidance only and is not a replacement for
          professional medical diagnosis, treatment, or emergency care.
        </div>
      </footer>
    </div>
  );
}
