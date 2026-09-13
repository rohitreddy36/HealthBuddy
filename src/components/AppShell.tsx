import { UserButton, useAuth } from "@clerk/tanstack-react-start";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  Compass,
  FileText,
  LayoutDashboard,
  MessageCircle,
  Stethoscope,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { AuroraBackground } from "@/components/AuroraBackground";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/analyze", label: "Symptom Check", icon: Stethoscope },
  { to: "/chat", label: "AI Assistant", icon: MessageCircle },
  { to: "/documents", label: "Reports", icon: FileText },
  { to: "/explore", label: "Explore", icon: Compass },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useAuth();

  // UserButton's sign-out doesn't trigger a route navigation on its own —
  // send the user back to the marketing page once their session clears.
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate({ to: "/", replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <AuroraBackground className="print:hidden" />

      <header className="sticky top-0 z-20 border-b border-black/[0.06] glass-strong print:hidden dark:border-white/[0.08]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="group flex items-center gap-2.5 font-semibold">
            <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-1 via-brand-2 to-brand-3 text-brand-foreground shadow-lg shadow-primary/30 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105">
              <Activity className="size-4.5" />
            </span>
            <span className="font-display text-gradient text-lg font-bold">HealthBuddy</span>
          </Link>
          <nav className="hidden items-center gap-1 rounded-full border border-black/[0.05] bg-background/40 p-1 backdrop-blur-sm md:flex dark:border-white/[0.06]">
            {nav.map((item) => {
              const active =
                item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "relative flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm transition-all duration-300",
                    active
                      ? "bg-gradient-to-r from-brand-1 via-brand-2 to-brand-3 text-brand-foreground shadow-md shadow-primary/30"
                      : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <UserButton />
          </div>
        </div>
        <nav className="flex overflow-x-auto border-t border-black/[0.06] px-2 md:hidden dark:border-white/[0.08]">
          {nav.map((item) => {
            const active =
              item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex-1 px-3 py-2 text-center text-xs transition-colors",
                  active ? "font-semibold text-gradient" : "text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <footer className="mx-auto max-w-6xl px-4 py-6 text-center text-xs text-muted-foreground print:hidden">
        AIL Health Advisor provides general wellness guidance only. It is not a substitute for
        professional medical care.
      </footer>
    </div>
  );
}
