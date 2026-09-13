import { cn } from "@/lib/utils";

/**
 * Shared decorative backdrop: three large blurred, animated brand-gradient
 * blobs fixed behind the page content. Used by AppShell, AuthShell, and the
 * marketing landing page so the "glass" cards/nav have colorful motion to
 * blur -- without it, glassmorphism has nothing behind it to show off.
 * Purely decorative (aria-hidden, pointer-events-none, negative z-index) so
 * it never affects layout or interaction.
 */
export function AuroraBackground({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none fixed inset-0 -z-10 overflow-hidden", className)}
    >
      <div className="absolute -top-32 -left-32 size-[32rem] rounded-full bg-brand-1/25 blur-3xl animate-blob" />
      <div className="absolute top-1/3 -right-40 size-[28rem] rounded-full bg-brand-2/20 blur-3xl animate-blob-delayed" />
      <div className="absolute bottom-[-10rem] left-1/4 size-[26rem] rounded-full bg-brand-3/20 blur-3xl animate-blob-slow" />
    </div>
  );
}
