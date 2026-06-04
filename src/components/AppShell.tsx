import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Activity, FileText, LayoutDashboard, LogOut, MessageCircle, Stethoscope } from "lucide-react";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/analyze", label: "Symptom Check", icon: Stethoscope },
  { to: "/chat", label: "AI Assistant", icon: MessageCircle },
  { to: "/documents", label: "Reports", icon: FileText },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
            <span className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center">
              <Activity className="size-4" />
            </span>
            <span className="font-display">AIL Health</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {nav.map((item) => {
              const active = location.pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors",
                    active
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/" });
            }}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
        <nav className="md:hidden border-t flex overflow-x-auto px-2">
          {nav.map((item) => {
            const active = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "px-3 py-2 text-xs flex-1 text-center",
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
      <footer className="max-w-6xl mx-auto px-4 py-6 text-xs text-muted-foreground text-center">
        AIL Health Advisor provides general wellness guidance only. It is not a substitute for professional medical care.
      </footer>
    </div>
  );
}
