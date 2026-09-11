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
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="relative hidden lg:flex flex-col justify-between p-10 overflow-hidden bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground">
        <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_20%_20%,white,transparent_35%),radial-gradient(circle_at_80%_60%,white,transparent_40%)]" />
        <div className="pointer-events-none absolute -top-16 -right-16 size-72 rounded-full bg-white/10 blur-3xl animate-blob" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 size-80 rounded-full bg-white/10 blur-3xl animate-blob-delayed" />
        <div className="relative flex items-center gap-2 font-semibold">
          <span className="size-9 rounded-xl bg-white/15 grid place-items-center backdrop-blur">
            <Activity className="size-5" />
          </span>
          <span className="font-display text-lg">HealthBuddy</span>
        </div>
        <div className="relative space-y-6 max-w-sm">
          <h2 className="font-display text-3xl font-semibold leading-tight">
            Calm, careful health guidance — powered by AI.
          </h2>
          <ul className="space-y-4">
            {highlights.map((h) => (
              <li
                key={h.text}
                className="flex items-start gap-3 text-sm text-primary-foreground/90"
              >
                <span className="mt-0.5 size-7 shrink-0 rounded-lg bg-white/15 grid place-items-center backdrop-blur">
                  <h.icon className="size-3.5" />
                </span>
                {h.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-primary-foreground/70">
          AIL Health Advisor provides general wellness guidance only. Not a substitute for
          professional medical care.
        </p>
      </div>

      <div className="relative flex flex-col items-center justify-center px-4 py-12">
        <ThemeToggle className="absolute top-4 right-4" />
        <div className="w-full max-w-sm">
          <div className="flex lg:hidden items-center justify-center gap-2 mb-8">
            <span className="size-10 rounded-xl bg-primary text-primary-foreground grid place-items-center">
              <Activity className="size-5" />
            </span>
            <span className="font-display text-xl font-semibold">HealthBuddy</span>
          </div>
          <div className="mb-6 text-center lg:text-left">
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
