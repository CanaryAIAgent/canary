"use client";

// Canary — EOC Command Dashboard
// Design: Monolith / Precision Studio (stitch/monolith_studio/DESIGN.md)
// Layout: App Shell with sidebar + main content + sticky AI panel

import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";

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

// ── Component ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { messages: chatMessages, sendMessage, status: chatStatus } = useChat({
    onFinish: () => {
      // Refresh dashboard data after AI responds (it may have pushed updates)
      fetch("/api/dashboard").then((r) => r.json()).then(setData).catch(() => {});
    },
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

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
    { label: "Signal Health", value: `${data.stats.signalHealthPct}%`, sub: "", subColor: "text-tertiary", accent: false },
  ] : [];

  const signalCards = data?.signals ?? [];
  const auditLog = data?.activity ?? [];
  const protocolSteps = data?.protocolSteps ?? [];
  const aiRec = data?.aiRecommendation;

  return (
    <div className="flex min-h-dvh bg-background text-on-background">

      {/* ── Sidebar (desktop only) ───────────────────────────────── */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 z-50 flex-col py-4 w-14 bg-surface-container-low border-r border-outline-variant/15 group hover:w-72 transition-all duration-300 ease-in-out overflow-hidden"
        aria-label="Primary navigation"
      >
        {/* Logo mark */}
        <div className="flex items-center gap-4 px-4 mb-8 overflow-hidden">
          <div className="min-w-[24px] flex justify-center">
            <span className="text-tertiary text-sm font-bold">C</span>
          </div>
          <span className="font-bold uppercase tracking-widest text-xs text-on-surface whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            Canary
          </span>
        </div>

        {/* Nav links — only Dashboard exists */}
        <nav className="flex flex-col gap-1 px-2 flex-1">
          <button
            className="flex items-center gap-4 px-2 py-2.5 rounded-lg bg-surface-container-high text-tertiary"
            aria-label="Dashboard"
            aria-current="page"
          >
            <div className="min-w-[24px] flex justify-center">
              <span className="text-[12px] font-bold">D</span>
            </div>
            <span className="font-medium text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              Dashboard
            </span>
          </button>
        </nav>

        {/* Operator identity */}
        <div className="px-3 pt-4 border-t border-outline-variant/15 flex items-center gap-3 overflow-hidden">
          <div className="min-w-[32px] h-8 w-8 rounded-lg bg-tertiary/10 flex items-center justify-center shrink-0">
            <span className="text-tertiary text-xs font-bold">OP</span>
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
            <h1 className="font-bold text-base tracking-tighter text-on-surface">
              Canary
            </h1>
          </div>

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
              <span className="text-on-surface-variant text-xs font-bold">OP</span>
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
                  {m.sub && <span className={`text-xs font-medium ${m.subColor}`}>{m.sub}</span>}
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
                      No Active Incident
                    </h2>
                    <p className="text-on-surface-variant text-sm leading-relaxed max-w-md">
                      No incident data available. Signals and field reports will appear here when an incident is active.
                    </p>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      className="bg-tertiary-gradient px-5 py-2 rounded-lg text-white font-semibold text-sm hover:opacity-90 transition-opacity active:scale-95"
                      aria-label="Deploy resources to incident"
                    >
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
                    </div>
                    {[
                      { label: "Field Teams Active", pct: 0 },
                      { label: "Shelter Capacity", pct: 0 },
                      { label: "Comms Signal", pct: 0 },
                    ].map((bar) => (
                      <div key={bar.label} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-on-surface-variant">{bar.label}</span>
                          <span className="text-on-surface">{bar.pct}%</span>
                        </div>
                        <div className="w-full bg-surface-container-high h-1 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-tertiary"
                            style={{ width: `${bar.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 border-t border-outline-variant/15 mt-2">
                    <span className="text-[10px] text-on-surface-variant font-mono">
                      STATION: EOC ALPHA // OPS: STANDBY
                    </span>
                  </div>
                </div>
              </div>

              {/* Signal feed */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-on-surface">Live Signal Stream</h3>
                    <p className="text-on-surface-variant text-xs mt-0.5">Correlated signals from active incident area</p>
                  </div>
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
                  {signalCards.length === 0 ? (
                    <div className="col-span-full h-36 flex flex-col items-center justify-center opacity-30">
                      <p className="text-[10px] font-bold tracking-[0.3rem] uppercase text-outline-variant">
                        No signals
                      </p>
                    </div>
                  ) : (
                    signalCards.map((card, i) => (
                      <article
                        key={card.id ?? i}
                        className="bg-surface-container-low border border-outline-variant/15 rounded-xl overflow-hidden group hover:border-outline-variant/30 transition-colors"
                      >
                        {card.empty ? (
                          <div className="h-36 flex flex-col items-center justify-center opacity-30">
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

                            {/* Title */}
                            <div>
                              <h4 className="font-semibold text-sm text-on-surface uppercase tracking-tight">
                                {card.title}
                              </h4>
                              <p className="text-xs text-on-surface-variant leading-relaxed mt-1 line-clamp-2">
                                {card.desc}
                              </p>
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
                    ))
                  )}
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
                      <span className="text-tertiary text-xs font-bold">AI</span>
                    </div>
                    <div>
                      <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-[0.2rem]">
                        AI Strategy Recommendation
                      </p>
                      <p className="text-tertiary text-sm font-medium">
                        Confidence Score: {aiRec && aiRec.confidenceScore > 0 ? `${aiRec.confidenceScore}%` : '—'}
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
                        {aiRec?.actionSequence || '—'}
                      </p>
                    </div>

                    {/* Stats */}
                    {(aiRec?.stats ?? []).length > 0 && (
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
                    )}
                  </div>

                  {/* CTA buttons */}
                  <button
                    className="w-full py-3.5 rounded-xl bg-tertiary-gradient text-white font-bold text-sm tracking-widest uppercase shadow-lg shadow-tertiary/20 hover:opacity-90 transition-all flex items-center justify-center gap-3 active:scale-95 duration-100"
                    aria-label="Approve resource dispatch"
                  >
                    {aiRec?.ctaLabel ?? 'Approve Dispatch'}
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
                    {auditLog.length === 0 ? (
                      <p className="text-xs text-on-surface-variant opacity-50">No activity</p>
                    ) : (
                      auditLog.map((entry, i) => (
                        <div key={entry.id ?? i} className="flex gap-3 items-start">
                          <div className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0 mt-1.5" />
                          <p className="text-xs text-on-surface/80">
                            <span className="font-bold text-on-surface">{entry.actor}:</span>{" "}
                            {entry.action}{" "}
                            <span className="text-on-surface-variant font-mono">{entry.time}m ago</span>
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Response protocol */}
                <div className="bg-surface-container-low rounded-xl p-5">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">
                      Response Protocol
                    </span>
                    <span className="text-[10px] text-tertiary font-mono">
                      {protocolSteps.filter((s) => s.done).length} / {protocolSteps.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {protocolSteps.length === 0 ? (
                      <p className="text-xs text-on-surface-variant opacity-50">No active protocol</p>
                    ) : (
                      protocolSteps.map((s, i) => (
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
                              <span className="text-tertiary text-[10px] font-bold">✓</span>
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
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ── Floating AI Chat Panel ─────────────────────────────────────── */}
      {chatOpen && (
        <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50 w-[min(400px,calc(100vw-2rem))] flex flex-col bg-surface-container-high border border-outline-variant/20 rounded-2xl shadow-[0_0_32px_0_rgba(231,229,228,0.08)] overflow-hidden"
          style={{ height: "min(560px, calc(100dvh - 6rem))" }}
        >
          {/* Chat header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-outline-variant/15 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-tertiary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-tertiary text-[18px]">neurology</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-on-surface">Canary AI</p>
                <p className="text-[10px] text-tertiary font-bold uppercase tracking-widest">
                  {chatStatus === "streaming" ? "Analyzing…" : "Ready"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors"
              aria-label="Close chat"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">
            {chatMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
                <span className="material-symbols-outlined text-3xl text-outline-variant mb-3">forum</span>
                <p className="text-xs text-on-surface-variant font-semibold uppercase tracking-widest mb-1">
                  EOC AI Assistant
                </p>
                <p className="text-xs text-on-surface-variant max-w-[240px]">
                  Report signals, request triage, or ask for strategic recommendations.
                </p>
              </div>
            )}

            {chatMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-4 py-2.5 rounded-xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-tertiary/15 text-on-surface rounded-br-sm"
                      : "bg-surface-container-lowest text-on-surface rounded-bl-sm"
                  }`}
                >
                  {msg.parts.map((part, i) => {
                    if (part.type === "text") {
                      return <span key={`${msg.id}-${i}`}>{part.text}</span>;
                    }
                    if (part.type.startsWith("tool-")) {
                      const toolPart = part as { type: string; toolCallId: string; state: string };
                      return (
                        <span key={`${msg.id}-${i}`} className="flex items-center gap-1.5 text-[10px] text-tertiary font-mono py-1">
                          <span className="material-symbols-outlined text-[12px]">build</span>
                          {part.type.replace("tool-", "")}
                          {toolPart.state === "result" && " ✓"}
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            ))}

            {chatStatus === "streaming" && (
              <div className="flex justify-start">
                <div className="px-4 py-2.5 rounded-xl bg-surface-container-lowest rounded-bl-sm">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!chatInput.trim() || chatStatus === "streaming") return;
              sendMessage({ text: chatInput });
              setChatInput("");
            }}
            className="flex items-center gap-2 px-4 py-3 border-t border-outline-variant/15 shrink-0"
          >
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.currentTarget.value)}
              placeholder="Report signal or ask AI…"
              className="flex-1 bg-surface-container-lowest border border-outline-variant/15 focus:border-tertiary rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none transition-colors"
              disabled={chatStatus === "streaming"}
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || chatStatus === "streaming"}
              className="w-9 h-9 rounded-lg bg-tertiary-gradient flex items-center justify-center text-white disabled:opacity-30 transition-opacity active:scale-95 shrink-0"
              aria-label="Send message"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </form>
        </div>
      )}

      {/* ── Chat FAB (Floating Action Button) ──────────────────────────── */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50 w-14 h-14 rounded-full bg-tertiary-gradient shadow-lg shadow-tertiary/25 flex items-center justify-center text-white hover:opacity-90 transition-all active:scale-95 group"
          aria-label="Open AI assistant"
        >
          <span className="material-symbols-outlined text-[24px] group-hover:scale-110 transition-transform">neurology</span>
        </button>
      )}

      {/* ── Bottom nav bar (mobile) ───────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 w-full flex justify-around items-center h-16 bg-surface/80 backdrop-blur-xl border-t border-outline-variant/15 z-40 lg:hidden"
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
