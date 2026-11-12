// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Only explicitly public settings may enter browser bundles, even if a
  // deployment still has the legacy VITE_GEMINI_API_KEY variable configured.
  envDefine: false,
  vite: {
    envPrefix: [
      "VITE_CLERK_PUBLISHABLE_KEY",
      "VITE_CLERK_SIGN_IN_URL",
      "VITE_CLERK_SIGN_UP_URL",
      "VITE_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL",
      "VITE_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL",
      "VITE_SUPABASE_URL",
      "VITE_SUPABASE_PUBLISHABLE_KEY",
    ],
  },
  nitro: { preset: "vercel" },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
