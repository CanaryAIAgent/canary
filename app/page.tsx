"use client";

// Canary — EOC Command Dashboard
// Design: Monolith / Precision Studio (stitch/monolith_studio/DESIGN.md)
// Layout: App Shell with icon-rail sidebar + main content + sticky AI panel

import { useState, useEffect } from "react";

// ── Data shape from /api/dashboard ──────────────────────────────────────────

interface DashboardStats {
  activeIncidents: number;
  incidentDelta: string;
  resourceRequests: number;
  resourceStatus: string;
  deploymentEtaMinutes: number;
  signalHealthPct: number;
}

interface SignalCard {
  id: string;
  tag: string | null;
  tagColor: string;
  title: string | null;
  desc: string | null;
  source: string | null;
  credibility: number;
  credibilityColor: string;
  time: string;
  icon: string;
  empty?: boolean;
}

interface ActivityEntry {
  id: string;
  actor: string;
  action: string;
  time: string;
}

interface ProtocolStep {
  id: string;
  step: string;
  done: boolean;
  active?: boolean;
}

interface AiRecommendation {
  actionSequence: string;
  confidenceScore: number;
  stats: Array<{ label: string; value: string }>;
  ctaLabel: string;
}

interface DashboardData {
  stats: DashboardStats;
  signals: SignalCard[];
  activity: ActivityEntry[];
  protocolSteps: ProtocolStep[];
  aiRecommendation: AiRecommendation;
}

// ── Static UI config ─────────────────────────────────────────────────────────

const navItems = [
  { icon: "sensors", label: "Dashboard", active: true },
  { icon: "assignment", label: "Field Reports", active: false },
  { icon: "cell_tower", label: "Social Feed", active: false },
  { icon: "videocam", label: "Camera Feeds", active: false },
  { icon: "local_shipping", label: "Resources", active: false },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/dashboard');
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error('[dashboard] fetch failed', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 15_000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-tertiary text-4xl animate-spin" style={{ animationDuration: '2s' }}>
            autorenew
          </span>
          <span className="text-[10px] font-bold tracking-[0.3rem] uppercase text-on-surface-variant">
            Loading EOC Data…
          </span>
        </div>
      </div>
    );
  }

  const metrics = data ? [
    { label: "Active Incidents", value: String(data.stats.activeIncidents).padStart(2, '0'), sub: data.stats.incidentDelta, subColor: "text-error", accent: true },
    { label: "Resource Requests", value: String(data.stats.resourceRequests).padStart(2, '0'), sub: data.stats.resourceStatus, subColor: "text-tertiary", accent: false },
    { label: "Deployment ETA", value: `${data.stats.deploymentEtaMinutes}m`, sub: "avg", subColor: "text-on-surface-variant", accent: false },
    { label: "Signal Health", value: `${data.stats.signalHealthPct}%`, sub: "✓", subColor: "text-tertiary", accent: false },
  ] : [];

  const signalCards = data?.signals ?? [];
  const auditLog = data?.activity ?? [];
  const protocolSteps = data?.protocolSteps ?? [];
  const aiRec = data?.aiRecommendation;

  return (
    <div className="flex min-h-dvh bg-background text-on-background">

      {/* ── Icon-rail sidebar (desktop only) ─────────────────────────── */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 z-50 flex-col py-4 w-14 bg-surface-container-low border-r border-outline-variant/15 group hover:w-72 transition-all duration-300 ease-in-out overflow-hidden"
        aria-label="Primary navigation"
      >
        {/* Logo mark */}
        <div className="flex items-center gap-4 px-4 mb-8 overflow-hidden">
          <div className="min-w-[24px] flex justify-center">
            <span className="material-symbols-outlined text-tertiary">sensors</span>
          </div>
          <span className="font-bold uppercase tracking-widest text-xs text-on-surface whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            Canary
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-1 px-2 flex-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`flex items-center gap-4 px-2 py-2.5 rounded-lg transition-all ${
                item.active
                  ? "bg-surface-container-high text-tertiary"
                  : "text-on-surface/60 hover:text-on-surface hover:bg-surface-container-high"
              }`}
              aria-label={item.label}
              aria-current={item.active ? "page" : undefined}
            >
              <div className="min-w-[24px] flex justify-center">
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              </div>
              <span className="font-medium text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        {/* Operator identity */}
        <div className="px-3 pt-4 border-t border-outline-variant/15 flex items-center gap-3 overflow-hidden">
          <div className="min-w-[32px] h-8 w-8 rounded-lg bg-tertiary/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-tertiary text-[18px]">account_circle</span>
          </div>
          <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
            <span className="text-sm font-semibold text-on-surface">Operator 01</span>
            <span className="text-[10px] text-on-surface-variant">Incident Commander</span>
          </div>
        </div>
      </aside>

      {/* ── Main content area ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:pl-14">

        {/* ── Top App Bar ──────────────────────────────────────────── */}
        <header className="fixed top-0 left-0 right-0 lg:left-14 z-40 h-14 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/15 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-tertiary lg:hidden">sensors</span>
            <h1 className="font-bold text-base tracking-tighter text-on-surface">
              Canary
              <span className="font-normal text-on-surface-variant ml-2 text-sm hidden sm:inline">
                | INC-042
              </span>
            </h1>
          </div>

          <nav className="hidden md:flex items-center gap-6" aria-label="Section navigation">
            <a className="text-xs font-semibold tracking-widest uppercase text-tertiary px-2 py-1" href="#">Dashboard</a>
            <a className="text-xs font-semibold tracking-widest uppercase text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/50 transition-colors px-2 py-1 rounded" href="#">Field Reports</a>
            <a className="text-xs font-semibold tracking-widest uppercase text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/50 transition-colors px-2 py-1 rounded" href="#">Resources</a>
          </nav>

          <div className="flex items-center gap-3">
            {/* Live indicator */}
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-tertiary" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-tertiary hidden sm:block">Live</span>
            </div>
            <div className="h-8 w-8 rounded-lg bg-surface-container-high border border-outline-variant/15 flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">account_circle</span>
            </div>
          </div>
        </header>

        {/* ── Page content ─────────────────────────────────────────── */}
        <main className="pt-20 pb-24 px-4 sm:px-6 max-w-7xl mx-auto w-full space-y-10">

          {/* ── Metrics bento row ──────────────────────────────────── */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4" aria-label="Key metrics">
            {metrics.map((m) => (
              <div
                key={m.label}
                className={`bg-surface-container-low p-5 rounded-xl flex flex-col justify-between ${
                  m.accent ? "border-l-2 border-tertiary" : ""
                }`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.2rem] text-on-surface-variant">
                  {m.label}
                </span>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-on-surface">{m.value}</span>
                  <span className={`text-xs font-medium ${m.subColor}`}>{m.sub}</span>
                </div>
              </div>
            ))}
          </section>

          {/* ── Main two-column content ────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* LEFT — Incident header + signal stream ─────────────── */}
            <div className="lg:col-span-7 space-y-10">

              {/* Incident header card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 p-7 bg-surface-container-low border border-outline-variant/15 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-error" />
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.2rem] text-error">
                        Active Incident
                      </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-on-surface">
                      Hurricane Helene — Sector 7 Inundation
                    </h2>
                    <p className="text-on-surface-variant text-sm leading-relaxed max-w-md">
                      Storm surge flooding across coastal sectors 4–9. 847 residents in affected zones. Field teams report road impassability on Route 17 and SR-24. Primary shelter at Riverside High School at 94% capacity.
                    </p>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      className="bg-tertiary-gradient px-5 py-2 rounded-lg text-white font-semibold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity active:scale-95"
                      aria-label="Deploy resources to incident"
                    >
                      <span className="material-symbols-outlined text-[16px]">emergency</span>
                      Deploy Resources
                    </button>
                    <button
                      className="px-5 py-2 bg-secondary-container text-on-secondary-container font-semibold text-sm rounded-lg hover:bg-surface-bright transition-colors"
                      aria-label="Generate incident report"
                    >
                      Generate Report
                    </button>
                  </div>
                </div>

                {/* Field operation status mini-card */}
                <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-xl p-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                        Field Status
                      </span>
                      <span className="material-symbols-outlined text-tertiary text-[18px]">shield</span>
                    </div>
                    {[
                      { label: "Field Teams Active", pct: 72 },
                      { label: "Shelter Capacity", pct: 94, warn: true },
                      { label: "Comms Signal", pct: 97 },
                    ].map((bar) => (
                      <div key={bar.label} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-on-surface-variant">{bar.label}</span>
                          <span className={bar.warn ? "text-error" : "text-on-surface"}>{bar.pct}%</span>
                        </div>
                        <div className="w-full bg-surface-container-high h-1 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${bar.warn ? "bg-error" : "bg-tertiary"}`}
                            style={{ width: `${bar.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 border-t border-outline-variant/15 mt-2">
                    <span className="text-[10px] text-on-surface-variant font-mono">
                      STATION: EOC ALPHA // OPS: ACTIVE
                    </span>
                  </div>
                </div>
              </div>

              {/* Signal feed filters */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-on-surface">Live Signal Stream</h3>
                    <p className="text-on-surface-variant text-xs mt-0.5">Correlated signals from active incident area</p>
                  </div>
                  <button className="text-tertiary text-xs font-bold uppercase tracking-widest hover:bg-surface-bright/50 px-3 py-1.5 rounded-lg transition-colors">
                    View All
                  </button>
                </div>

                <div className="flex items-center gap-3 overflow-x-auto pb-3 scrollbar-thin mb-6">
                  {["All Signals", "Field Reports", "Social Intel", "Camera Feeds", "Voice Notes"].map((f, i) => (
                    <button
                      key={f}
                      className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase transition-colors ${
                        i === 0
                          ? "bg-tertiary text-white"
                          : "bg-surface-container-high text-on-surface-variant hover:bg-surface-bright"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                {/* Signal cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {signalCards.map((card, i) => (
                    <article
                      key={card.id ?? i}
                      className="bg-surface-container-low border border-outline-variant/15 rounded-xl overflow-hidden group hover:border-outline-variant/30 transition-colors"
                    >
                      {card.empty ? (
                        <div className="h-36 flex flex-col items-center justify-center opacity-30">
                          <span className="material-symbols-outlined text-4xl text-outline-variant animate-pulse">
                            hourglass_empty
                          </span>
                          <p className="text-[10px] font-bold tracking-[0.3rem] uppercase text-outline-variant mt-2">
                            Awaiting Feed…
                          </p>
                        </div>
                      ) : (
                        <div className="p-5 space-y-3">
                          {/* Tag + time */}
                          <div className="flex justify-between items-center">
                            <span className={`text-[10px] font-bold tracking-widest uppercase ${card.tagColor}`}>
                              {card.tag}
                            </span>
                            <span className="text-[10px] text-on-surface-variant font-mono">{card.time}</span>
                          </div>

                          {/* Icon + title */}
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-surface-container-highest flex items-center justify-center shrink-0 mt-0.5">
                              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">{card.icon}</span>
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm text-on-surface uppercase tracking-tight">
                                {card.title}
                              </h4>
                              <p className="text-xs text-on-surface-variant leading-relaxed mt-1 line-clamp-2">
                                {card.desc}
                              </p>
                            </div>
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between pt-3 border-t border-outline-variant/10">
                            <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">
                              {card.source}
                            </span>
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[9px] uppercase tracking-tighter text-on-surface-variant">
                                AI Credibility
                              </span>
                              <div className="w-14 h-1 bg-surface-container-high rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${card.credibilityColor}`}
                                  style={{ width: `${card.credibility}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT — Sticky AI recommendation panel ─────────────── */}
            <div className="lg:col-span-5">
              <div className="lg:sticky lg:top-20 space-y-5">

                {/* AI Strategy card */}
                <div className="bg-surface-container-high rounded-2xl p-7 border border-outline-variant/20 shadow-[0_0_32px_0_rgba(231,229,228,0.08)]">
                  <div className="flex items-center gap-3 mb-7">
                    <div className="w-10 h-10 rounded-full bg-tertiary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-tertiary">neurology</span>
                    </div>
                    <div>
                      <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-[0.2rem]">
                        AI Strategy Recommendation
                      </p>
                      <p className="text-tertiary text-sm font-medium">
                        Confidence Score: {aiRec ? `${aiRec.confidenceScore}%` : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Action sequence */}
                  <div className="space-y-5 mb-8">
                    <div className="p-5 bg-surface-container-lowest rounded-xl border-l-2 border-tertiary">
                      <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mb-2">
                        Action Sequence
                      </p>
                      <p className="text-on-surface text-base font-medium leading-snug">
                        {aiRec?.actionSequence ?? '—'}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="space-y-3">
                      {(aiRec?.stats ?? []).map((stat) => (
                        <div
                          key={stat.label}
                          className="flex justify-between items-center text-sm border-b border-outline-variant/10 pb-2 last:border-0"
                        >
                          <span className="text-on-surface-variant">{stat.label}</span>
                          <span className="text-on-surface font-mono">{stat.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA buttons */}
                  <button
                    className="w-full py-3.5 rounded-xl bg-tertiary-gradient text-white font-bold text-sm tracking-widest uppercase shadow-lg shadow-tertiary/20 hover:opacity-90 transition-all flex items-center justify-center gap-3 group active:scale-95 duration-100"
                    aria-label="Approve resource dispatch"
                  >
                    {aiRec?.ctaLabel ?? 'Approve Dispatch'}
                    <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                      chevron_right
                    </span>
                  </button>
                  <button
                    className="w-full mt-3 py-2.5 rounded-xl bg-surface-container-highest text-on-surface-variant font-semibold text-xs tracking-widest uppercase hover:text-on-surface transition-colors"
                    aria-label="Dismiss recommendation and override manually"
                  >
                    Dismiss &amp; Manual Override
                  </button>
                </div>

                {/* Field activity log */}
                <div className="bg-surface-container-low rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">
                      Field Activity Log
                    </span>
                    <span className="text-[10px] text-tertiary bg-tertiary/10 px-2 py-0.5 rounded-full">
                      Live
                    </span>
                  </div>
                  <div className="space-y-3">
                    {auditLog.map((entry, i) => (
                      <div key={entry.id ?? i} className="flex gap-3 items-start">
                        <div className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0 mt-1.5" />
                        <p className="text-xs text-on-surface/80">
                          <span className="font-bold text-on-surface">{entry.actor}:</span>{" "}
                          {entry.action}{" "}
                          <span className="text-on-surface-variant font-mono">{entry.time}m ago</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Response protocol */}
                <div className="bg-surface-container-low rounded-xl p-5">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">
                      Response Protocol: INC-042 v2.1
                    </span>
                    <span className="text-[10px] text-tertiary font-mono">
                      {protocolSteps.filter((s) => s.done).length} / {protocolSteps.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {protocolSteps.map((s, i) => (
                      <div key={s.id ?? i} className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                            s.done
                              ? "bg-tertiary/20"
                              : s.active
                              ? "bg-surface-container-highest border border-tertiary/40"
                              : "bg-surface-container-highest"
                          }`}
                        >
                          {s.done ? (
                            <span className="material-symbols-outlined text-tertiary text-[12px]">check</span>
                          ) : s.active ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-outline-variant/50" />
                          )}
                        </div>
                        <span
                          className={`text-xs ${
                            s.done
                              ? "line-through text-on-surface-variant"
                              : s.active
                              ? "text-on-surface font-medium"
                              : "text-on-surface-variant"
                          }`}
                        >
                          {s.step}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ── Bottom nav bar (mobile) ───────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 w-full flex justify-around items-center h-16 bg-surface/80 backdrop-blur-xl border-t border-outline-variant/15 z-50 lg:hidden"
        aria-label="Mobile navigation"
      >
        {[
          { icon: "sensors", label: "Home", active: true },
          { icon: "assignment", label: "Field", active: false },
          { icon: "cell_tower", label: "Social", active: false },
          { icon: "explore", label: "Map", active: false },
        ].map((item) => (
          <button
            key={item.label}
            className={`flex flex-col items-center justify-center transition-all active:scale-95 ${
              item.active ? "text-tertiary scale-110" : "text-outline-variant hover:text-on-surface"
            }`}
            aria-label={item.label}
            aria-current={item.active ? "page" : undefined}
          >
            <span
              className="material-symbols-outlined"
              style={item.active ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {item.icon}
            </span>
            <span className="text-[8px] font-semibold tracking-[0.1rem] uppercase mt-1">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
