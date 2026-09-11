import { SignIn } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";

import { AuthShell } from "@/components/AuthShell";

export const Route = createFileRoute("/sign-in/$")({
  head: () => ({ meta: [{ title: "Sign in — AIL Health" }] }),
  component: Page,
});

function Page() {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue your wellness journey.">
      <SignIn
        appearance={{
          elements: { rootBox: "w-full", card: "shadow-none border-0 p-0 w-full" },
        }}
      />
    </AuthShell>
  );
}
