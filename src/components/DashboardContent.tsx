import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  MessageCircle,
  Sparkles,
  Stethoscope,
  TrendingUp,
} from "lucide-react";

import { listDashboard } from "@/lib/health.functions";
import { cn } from "@/lib/utils";

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

type DashboardData = Awaited<ReturnType<typeof listDashboard>>;
type Insights = DashboardData["insights"];
type CareUrgency = keyof Insights["careBreakdown"];

export function DashboardContent() {
  const fn = useServerFn(listDashboard);
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => fn() });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">
          Hello
          {data?.profile?.full_name && (
            <span className="text-gradient">, {data.profile.full_name.split(" ")[0]}</span>
          )}
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
            className="group hover-lift glass-card relative overflow-hidden rounded-3xl p-5 shadow-xl shadow-black/[0.03] transition-shadow duration-300 hover:glow-brand"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:to-primary/[0.04] transition-colors duration-300 pointer-events-none" />
            <div className="size-10 rounded-xl bg-gradient-to-br from-brand-1 via-brand-2 to-brand-3 text-brand-foreground shadow-md shadow-primary/25 grid place-items-center mb-3 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
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

      {!isLoading && data && data.insights.totalChecks > 0 && (
        <HealthInsights insights={data.insights} />
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <section className="rounded-3xl glass-card p-5 shadow-xl shadow-black/[0.03]">
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

        <section className="rounded-3xl glass-card p-5 shadow-xl shadow-black/[0.03]">
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

        <section className="rounded-3xl glass-card p-5 shadow-xl shadow-black/[0.03]">
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

// ---------------------------------------------------------------------------
// Health insights — stat tiles + charts built from the aggregates that
// listDashboard computes server-side (health.functions.ts#buildDashboardInsights).
// ---------------------------------------------------------------------------

function HealthInsights({ insights }: { insights: Insights }) {
  const weekCounts = insights.weeklyTrend.map((w) => w.count);
  const thisWeek = weekCounts[weekCounts.length - 1] ?? 0;
  const lastWeek = weekCounts[weekCounts.length - 2] ?? 0;
  const delta = thisWeek - lastWeek;
  const hasTrendSignal = insights.weeklyTrend.some((w) => w.count > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Symptom checks" value={insights.totalChecks} icon={Stethoscope} />
        <StatTile label="Reports analyzed" value={insights.totalReports} icon={FileText} />
        <StatTile
          label="This week"
          value={thisWeek}
          icon={TrendingUp}
          delta={hasTrendSignal ? delta : undefined}
        />
        <StatTile
          label="Top concern"
          value={insights.topConcerns[0]?.name ?? "—"}
          icon={Sparkles}
          isText
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="rounded-3xl glass-card p-5 shadow-xl shadow-black/[0.03]">
          <h2 className="font-semibold mb-1">Checks by week</h2>
          <p className="text-xs text-muted-foreground mb-4">Last 8 weeks</p>
          <WeeklyTrendChart weeks={insights.weeklyTrend} />
        </section>

        <section className="rounded-3xl glass-card p-5 shadow-xl shadow-black/[0.03]">
          <h2 className="font-semibold mb-1">Care urgency</h2>
          <p className="text-xs text-muted-foreground mb-4">Across all your checks</p>
          <CareBreakdownChart breakdown={insights.careBreakdown} />
        </section>
      </div>

      {insights.topConcerns.length > 0 && (
        <section className="rounded-3xl glass-card p-5 shadow-xl shadow-black/[0.03]">
          <h2 className="font-semibold mb-1">Most reported concerns</h2>
          <p className="text-xs text-muted-foreground mb-4">From your symptom check history</p>
          <TopConcernsChart concerns={insights.topConcerns} />
        </section>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
  delta,
  isText,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  delta?: number;
  isText?: boolean;
}) {
  return (
    <div className="rounded-2xl glass-card p-4 shadow-lg shadow-black/[0.03]">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-2">
        <Icon className="size-3.5" />
        <span className="truncate">{label}</span>
      </div>
      <div
        className={cn(
          "font-display font-semibold truncate",
          isText ? "text-base" : "text-2xl text-primary",
        )}
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </div>
      {typeof delta === "number" && (
        <div className="text-xs mt-1 text-muted-foreground tabular-nums">
          {delta > 0 ? "+" : ""}
          {delta} vs last week
        </div>
      )}
    </div>
  );
}

function WeeklyTrendChart({ weeks }: { weeks: Insights["weeklyTrend"] }) {
  const max = Math.max(1, ...weeks.map((w) => w.count));
  const H = 120;
  const barW = 22;
  const gap = 16;
  const left = 26;
  const W = weeks.length * (barW + gap) - gap;
  const lastIdx = weeks.length - 1;

  return (
    <div className="overflow-x-auto thin-scrollbar">
      <svg
        viewBox={`0 0 ${W + left + 6} ${H + 30}`}
        width="100%"
        style={{ minWidth: 280 }}
        role="img"
        aria-label={`Symptom checks per week for the last ${weeks.length} weeks, peak ${max} in one week`}
      >
        <text x={0} y={12} className="fill-muted-foreground" style={{ fontSize: 9 }}>
          {max}
        </text>
        <line
          x1={left}
          y1={8}
          x2={W + left + 6}
          y2={8}
          className="stroke-border"
          strokeWidth={1}
          strokeDasharray="2,3"
        />
        <line x1={left} y1={H} x2={W + left + 6} y2={H} className="stroke-border" strokeWidth={1} />
        {weeks.map((w, i) => {
          const x = left + i * (barW + gap);
          const h = w.count === 0 ? 0 : Math.max(4, (w.count / max) * (H - 8));
          const y = H - h;
          return (
            <g key={w.weekStart}>
              <rect x={x} y={y} width={barW} height={h} rx={4} fill="var(--chart-1)">
                <title>
                  {w.label}: {w.count} check{w.count === 1 ? "" : "s"}
                </title>
              </rect>
              {i === lastIdx && w.count > 0 && (
                <text
                  x={x + barW / 2}
                  y={y - 6}
                  textAnchor="middle"
                  className="fill-foreground font-medium"
                  style={{ fontSize: 10 }}
                >
                  {w.count}
                </text>
              )}
              <text
                x={x + barW / 2}
                y={H + 16}
                textAnchor="middle"
                className="fill-muted-foreground"
                style={{ fontSize: 9 }}
              >
                {w.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const CARE_META: Record<
  CareUrgency,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    colorVar: string;
    textClass: string;
  }
> = {
  monitor_at_home: {
    label: "Monitor at home",
    icon: CheckCircle2,
    colorVar: "var(--success)",
    textClass: "text-success",
  },
  book_appointment_soon: {
    label: "Book appointment soon",
    icon: Clock,
    colorVar: "var(--info)",
    textClass: "text-info",
  },
  seek_urgent_care: {
    label: "Seek urgent care",
    icon: AlertCircle,
    colorVar: "var(--destructive)",
    textClass: "text-destructive",
  },
};

function CareBreakdownChart({ breakdown }: { breakdown: Insights["careBreakdown"] }) {
  const entries = (Object.keys(CARE_META) as CareUrgency[]).map((key) => ({
    key,
    count: breakdown[key],
    ...CARE_META[key],
  }));
  const total = entries.reduce((s, e) => s + e.count, 0);
  const max = Math.max(1, ...entries.map((e) => e.count));

  if (total === 0) {
    return <p className="text-sm text-muted-foreground">No guidance recorded yet.</p>;
  }

  return (
    <div className="space-y-3">
      {entries.map((e) => {
        const Icon = e.icon;
        const pct = Math.round((e.count / total) * 100);
        return (
          <div key={e.key} className="flex items-center gap-3">
            <div className={cn("flex items-center gap-1.5 text-xs w-36 shrink-0", e.textClass)}>
              <Icon className="size-3.5 shrink-0" />
              <span className="truncate">{e.label}</span>
            </div>
            <div
              className="flex-1 h-3.5 rounded-full bg-secondary overflow-hidden"
              title={`${e.label}: ${e.count} (${pct}%)`}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: e.count === 0 ? "0%" : `${Math.max(6, (e.count / max) * 100)}%`,
                  backgroundColor: e.colorVar,
                }}
              />
            </div>
            <div className="text-xs font-medium w-6 text-right tabular-nums">{e.count}</div>
          </div>
        );
      })}
    </div>
  );
}

function TopConcernsChart({ concerns }: { concerns: Insights["topConcerns"] }) {
  const max = Math.max(1, ...concerns.map((c) => c.count));
  return (
    <div className="space-y-2.5">
      {concerns.map((c) => (
        <div key={c.name} className="flex items-center gap-3">
          <div className="text-xs w-40 shrink-0 truncate" title={c.name}>
            {c.name}
          </div>
          <div
            className="flex-1 h-3 rounded-full bg-secondary overflow-hidden"
            title={`${c.name}: ${c.count}`}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(6, (c.count / max) * 100)}%`,
                backgroundColor: "var(--chart-1)",
              }}
            />
          </div>
          <div className="text-xs font-medium w-6 text-right tabular-nums text-muted-foreground">
            {c.count}
          </div>
        </div>
      ))}
    </div>
  );
}
