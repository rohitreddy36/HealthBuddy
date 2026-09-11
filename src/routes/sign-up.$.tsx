import { SignUp } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";

import { AuthShell } from "@/components/AuthShell";

export const Route = createFileRoute("/sign-up/$")({
  head: () => ({ meta: [{ title: "Create your account — AIL Health" }] }),
  component: Page,
});

function Page() {
  return (
    <AuthShell title="Create your account" subtitle="Start understanding your health, gently.">
      <SignUp
        appearance={{
          elements: { rootBox: "w-full", card: "shadow-none border-0 p-0 w-full" },
        }}
      />
    </AuthShell>
  );
}
