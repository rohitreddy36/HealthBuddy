import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, FileText, MessageCircle, Sparkles, Stethoscope } from "lucide-react";

import { listDashboard } from "@/lib/health.functions";

const quickLinks = [
  {
    to: "/analyze",
    icon: Stethoscope,
    title: "Check symptoms",
    body: "Guided symptom analysis",
  },
  {
    to: "/chat",
    icon: MessageCircle,
    title: "Ask the assistant",
    body: "Conversational health guidance",
  },
  {
    to: "/documents",
    icon: FileText,
    title: "Explain a report",
    body: "Plain-language medical reports",
  },
] as const;

export function DashboardContent() {
  const fn = useServerFn(listDashboard);
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => fn() });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">
          Hello{data?.profile?.full_name ? `, ${data.profile.full_name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          How are you feeling today? Choose where you'd like to start.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {quickLinks.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:to-primary/[0.04] transition-colors duration-300 pointer-events-none" />
            <div className="size-10 rounded-xl bg-gradient-to-br from-secondary to-accent text-primary grid place-items-center mb-3 transition-transform duration-300 group-hover:scale-110">
              <c.icon className="size-5" />
            </div>
            <div className="flex items-center justify-between">
              <div className="font-semibold">{c.title}</div>
              <ArrowRight className="size-4 text-muted-foreground opacity-0 -translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
            </div>
            <div className="text-sm text-muted-foreground">{c.body}</div>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold mb-3">Recent symptom checks</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : data?.analyses.length ? (
            <ul className="space-y-2">
              {data.analyses.map((a) => (
                <li key={a.id} className="text-sm border-b last:border-0 py-2">
                  <div className="font-medium truncate">{a.initial_symptoms}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No checks yet.</p>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold mb-3">Recent reports</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : data?.documents.length ? (
            <ul className="space-y-2">
              {data.documents.map((d) => (
                <li key={d.id} className="text-sm border-b last:border-0 py-2">
                  <div className="font-medium truncate">{d.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {d.doc_type ?? "Report"} · {new Date(d.created_at).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No reports yet.</p>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold mb-3 flex items-center gap-1.5">
            <Sparkles className="size-4 text-primary" /> Recent quick questions
          </h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : data?.quickQuestions.length ? (
            <ul className="space-y-2">
              {data.quickQuestions.map((q) => (
                <li key={q.id} className="text-sm border-b last:border-0 py-2">
                  <div className="font-medium truncate">{q.content}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(q.created_at).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nothing yet — try the chat bubble in the corner.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
