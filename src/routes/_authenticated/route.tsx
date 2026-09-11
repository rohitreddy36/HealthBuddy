import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { auth } from "@clerk/tanstack-react-start/server";

import { AppShell } from "@/components/AppShell";

const ensureSignedIn = createServerFn().handler(async () => {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated) {
    throw redirect({ to: "/sign-in/$" });
  }
  return { userId };
});

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => await ensureSignedIn(),
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
