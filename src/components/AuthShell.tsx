import { Activity, HeartPulse, MessageCircle, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/ThemeToggle";

const highlights = [
  { icon: HeartPulse, text: "Calm, structured symptom guidance — never alarming." },
  { icon: MessageCircle, text: "Ask anything, anytime, in a judgement-free chat." },
  { icon: ShieldCheck, text: "Private by design, protected with row-level security." },
];

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[#0b1b3a] p-10 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white,transparent_35%),radial-gradient(circle_at_80%_60%,white,transparent_40%)]" />
        <div className="pointer-events-none absolute -top-16 -right-16 size-72 animate-blob rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 size-80 animate-blob-delayed rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 size-64 animate-float rounded-full bg-brand-3/20 blur-3xl" />
        <div className="relative flex items-center gap-2 font-semibold">
          <span className="grid size-9 place-items-center rounded-2xl bg-white/15 shadow-lg backdrop-blur">
            <Activity className="size-5" />
          </span>
          <span className="font-display text-lg">HealthBuddy</span>
        </div>
        <div className="relative max-w-sm space-y-6">
          <h2 className="font-display gradient-text-animated text-3xl font-semibold leading-tight">
            Calm, careful health guidance — powered by AI.
          </h2>
          <ul className="space-y-4">
            {highlights.map((h) => (
              <li key={h.text} className="flex items-start gap-3 text-sm text-white/90">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-xl bg-white/15 shadow-md backdrop-blur">
                  <h.icon className="size-3.5" />
                </span>
                {h.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/70">
          AIL Health Advisor provides general wellness guidance only. Not a substitute for
          professional medical care.
        </p>
      </div>

      <div className="relative flex flex-col items-center justify-center overflow-hidden px-4 py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden lg:hidden"
        >
          <div className="absolute -top-24 -left-16 size-72 animate-blob rounded-full bg-brand-1/20 blur-3xl" />
          <div className="absolute -bottom-24 -right-16 size-72 animate-blob-delayed rounded-full bg-brand-3/20 blur-3xl" />
        </div>
        <ThemeToggle className="absolute top-4 right-4" />
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-center gap-2 lg:hidden">
            <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-brand-1 via-brand-2 to-brand-3 text-brand-foreground shadow-lg shadow-primary/30">
              <Activity className="size-5" />
            </span>
            <span className="font-display text-xl font-bold">HealthBuddy</span>
          </div>
          <div className="mb-6 text-center lg:text-left">
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="glass-card animate-fade-up rounded-3xl p-6 shadow-2xl shadow-primary/10 sm:p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
