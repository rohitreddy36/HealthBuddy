import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Activity, Brain, FileText, MessageCircle, Shield, Sparkles } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

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
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-accent/20">
      <header className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <span className="size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center">
            <Activity className="size-5" />
          </span>
          <span className="font-display text-lg">AIL Health</span>
        </div>
        <Link to="/auth">
          <Button variant="ghost" size="sm">
            Sign in
          </Button>
        </Link>
      </header>

      <section className="max-w-6xl mx-auto px-4 pt-12 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium mb-6">
          <Sparkles className="size-3.5" /> AI + ML Health Advisory
        </div>
        <h1 className="font-display text-4xl md:text-6xl font-semibold tracking-tight max-w-3xl mx-auto">
          Calm, careful health guidance — powered by AI.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto">
          Describe your symptoms, ask follow-up questions, and understand your medical reports in plain
          language. No alarms, no diagnoses — just gentle, structured guidance.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/auth">
            <Button size="lg" className="rounded-full px-6">
              Get started free
            </Button>
          </Link>
          <a href="#features">
            <Button size="lg" variant="outline" className="rounded-full px-6">
              How it works
            </Button>
          </a>
        </div>
      </section>

      <section id="features" className="max-w-6xl mx-auto px-4 pb-24">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
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
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="size-10 rounded-xl bg-secondary text-primary grid place-items-center mb-4">
                <f.icon className="size-5" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 p-4 rounded-xl bg-muted text-muted-foreground text-sm text-center max-w-3xl mx-auto">
          AIL Health Advisor is for general wellness guidance only and is not a replacement for
          professional medical diagnosis, treatment, or emergency care.
        </div>
      </section>
    </div>
  );
}
