import { createFileRoute, redirect } from "@tanstack/react-router";

// Retired in favor of Clerk's /sign-in and /sign-up routes. Kept as a
// redirect so any existing bookmarks/links to /auth still work.
export const Route = createFileRoute("/auth")({
  beforeLoad: () => {
    throw redirect({ to: "/sign-in/$" });
  },
});
