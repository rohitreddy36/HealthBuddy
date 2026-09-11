import { UserButton, useAuth } from "@clerk/tanstack-react-start";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Activity, FileText, LayoutDashboard, MessageCircle, Stethoscope } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/analyze", label: "Symptom Check", icon: Stethoscope },
  { to: "/chat", label: "AI Assistant", icon: MessageCircle },
  { to: "/documents", label: "Reports", icon: FileText },
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
      <header className="border-b glass sticky top-0 z-10 print:hidden">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold group">
            <span className="size-8 rounded-lg bg-gradient-to-br from-primary to-info text-primary-foreground grid place-items-center shadow-sm transition-transform duration-300 group-hover:rotate-6">
              <Activity className="size-4" />
            </span>
            <span className="font-display">HealthBuddy</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {nav.map((item) => {
              const active =
                item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "relative px-3 py-1.5 rounded-full text-sm flex items-center gap-2 transition-all duration-200",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/70",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <UserButton />
          </div>
        </div>
        <nav className="md:hidden border-t flex overflow-x-auto px-2">
          {nav.map((item) => {
            const active =
              item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "px-3 py-2 text-xs flex-1 text-center transition-colors",
                  active ? "text-primary font-medium" : "text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      <footer className="max-w-6xl mx-auto px-4 py-6 text-xs text-muted-foreground text-center print:hidden">
        AIL Health Advisor provides general wellness guidance only. It is not a substitute for
        professional medical care.
      </footer>
    </div>
  );
}
