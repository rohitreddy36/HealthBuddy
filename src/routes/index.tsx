import { useAuth } from "@clerk/tanstack-react-start";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  Brain,
  FileText,
  Loader2,
  Lock,
  MessageCircle,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { AuroraBackground } from "@/components/AuroraBackground";
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

const trustPills = [
  { icon: Lock, text: "Private by design" },
  { icon: Zap, text: "Free to start" },
  { icon: Sparkles, text: "AI + ML powered" },
] as const;

// The homepage doubles as the dashboard: signed-in visitors see their
// dashboard directly here (no separate redirect/flash to /dashboard —
// Clerk's post sign-in/up redirect already lands on "/"), logged-out
// visitors see the marketing page below.
function Home() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
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
    <div className="min-h-screen overflow-x-clip bg-background">
      <AuroraBackground />

      <header className="sticky top-0 z-20 border-b border-black/[0.06] glass-strong dark:border-white/[0.08]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5 font-semibold">
            <span className="grid size-9 place-items-center rounded-2xl bg-gradient-to-br from-brand-1 via-brand-2 to-brand-3 text-brand-foreground shadow-lg shadow-primary/30">
              <Activity className="size-5" />
            </span>
            <span className="font-display text-gradient text-lg font-bold">HealthBuddy</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/sign-in/$">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link to="/sign-up/$">
              <Button size="sm">Sign up</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-4 pt-20 pb-24 text-center">
          <div className="glow-ring animate-fade-up mb-6 inline-flex items-center gap-2 rounded-full bg-accent px-3.5 py-1.5 text-xs font-medium text-accent-foreground">
            <Sparkles className="size-3.5" /> AI + ML Health Advisory
          </div>
          <h1 className="animate-fade-up font-display mx-auto max-w-4xl text-5xl font-bold tracking-tight [animation-delay:80ms] md:text-7xl">
            Calm, careful health
            <br />
            <span className="gradient-text-animated">guidance, powered by AI.</span>
          </h1>
          <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-lg text-muted-foreground [animation-delay:160ms]">
            Describe your symptoms, ask follow-up questions, and understand your medical reports in
            plain language. No alarms, no diagnoses — just gentle, structured guidance.
          </p>
          <div className="animate-fade-up mt-8 flex flex-wrap items-center justify-center gap-3 [animation-delay:240ms]">
            <Link to="/sign-up/$">
              <Button size="lg" className="px-7">
                Get started free
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="px-7">
                How it works
              </Button>
            </a>
          </div>
          <div className="animate-fade-up mt-10 flex flex-wrap items-center justify-center gap-3 [animation-delay:320ms]">
            {trustPills.map((p) => (
              <span
                key={p.text}
                className="glass-card inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-muted-foreground"
              >
                <p.icon className="size-3.5 text-primary" />
                {p.text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section id="features" className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="hover-lift glass-card animate-fade-up group relative overflow-hidden rounded-3xl p-6 shadow-xl shadow-black/[0.03] hover:glow-brand"
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <div className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-gradient-to-br from-brand-1/20 to-brand-3/20 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
              <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-1 via-brand-2 to-brand-3 text-brand-foreground shadow-lg shadow-primary/25 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                <f.icon className="size-5" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="mb-10 text-center">
          <h2 className="font-display text-2xl font-semibold md:text-3xl">
            How it <span className="text-gradient">works</span>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Three steps, a couple of minutes, no waiting rooms.
          </p>
        </div>
        <div className="relative grid gap-6 md:grid-cols-3">
          <div className="absolute top-6 left-[16.5%] right-[16.5%] hidden h-px bg-gradient-to-r from-transparent via-brand-2/50 to-transparent md:block" />
          {steps.map((s, i) => (
            <div
              key={s.n}
              className="animate-fade-up relative px-2 text-center"
              style={{ animationDelay: `${i * 110}ms` }}
            >
              <div className="font-display mx-auto mb-4 grid size-12 place-items-center rounded-full bg-gradient-to-br from-brand-1 via-brand-2 to-brand-3 text-brand-foreground font-semibold shadow-lg shadow-primary/30">
                {s.n}
              </div>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="relative overflow-hidden rounded-4xl bg-gradient-to-br from-brand-1 via-brand-2 to-brand-3 px-8 py-14 text-center text-brand-foreground shadow-2xl shadow-primary/30">
          <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_15%_20%,white,transparent_35%),radial-gradient(circle_at_85%_70%,white,transparent_40%)]" />
          <div className="pointer-events-none absolute -top-16 -left-16 size-64 animate-blob rounded-full bg-white/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-10 size-72 animate-blob-delayed rounded-full bg-white/15 blur-3xl" />
          <h2 className="font-display relative text-2xl font-semibold md:text-3xl">
            Ready to feel a little more informed?
          </h2>
          <p className="relative mx-auto mt-2 max-w-lg text-sm text-white/85">
            It's free to start, and every check stays private to your account.
          </p>
          <div className="relative mt-7">
            <Link to="/sign-up/$">
              <Button size="lg" variant="secondary" className="px-7 shadow-xl">
                Create your free account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-4 pb-10">
        <div className="glass-card mx-auto max-w-3xl rounded-2xl p-4 text-center text-sm text-muted-foreground">
          AIL Health Advisor is for general wellness guidance only and is not a replacement for
          professional medical diagnosis, treatment, or emergency care.
        </div>
      </footer>
    </div>
  );
}
