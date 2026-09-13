import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

// Explore section layout (spec section 11): Explorer (medicines + symptoms
// browse, one integrated page per the mockup) and Hospitals as the two
// areas.
export const Route = createFileRoute("/_authenticated/explore")({
  component: ExploreLayout,
});

const tabs = [
  { to: "/explore", label: "Explorer" },
  { to: "/explore/hospitals", label: "Hospitals" },
] as const;

function ExploreLayout() {
  const location = useLocation();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex gap-1 border-b">
        {tabs.map((t) => {
          const active =
            t.to === "/explore"
              ? location.pathname === "/explore"
              : location.pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
                active
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}
