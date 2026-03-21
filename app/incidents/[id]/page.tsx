"use client";

/**
 * Canary — Incident Detail Page
 *
 * /incidents/[id]
 *
 * Full incident view with header, AI chat panel, activity timeline,
 * and publish action. Uses Monolith design system.
 */

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

// ── Types ────────────────────────────────────────────────────────────────────

interface IncidentLocation {
  lat?: number;
  lng?: number;
  address?: string;
  zipCode?: string;
  description?: string;
}

interface Incident {
  id: string;
  title: string;
  description?: string;
  type: string;
  severity: number;
  status: string;
  location?: IncidentLocation;
  sources?: string[];
  createdAt: string;
  updatedAt: string;
  aiAnalysis?: Record<string, unknown>;
}

interface AgentLog {
  id: string;
  agentType: string;
  incidentId: string | null;
  sessionId: string;
  stepIndex: number;
  decisionRationale: string;
  timestamp: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeSince(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function severityLabel(sev: number): string {
  if (sev >= 5) return "CRITICAL";
  if (sev >= 4) return "HIGH";
  if (sev >= 3) return "MODERATE";
  if (sev >= 2) return "LOW";
  return "INFO";
}

function severityColor(sev: number): string {
  if (sev >= 4) return "text-error";
  if (sev >= 3) return "text-tertiary";
  return "text-on-surface-variant";
}

function statusColor(status: string): string {
  switch (status) {
    case "resolved":
      return "bg-tertiary/15 text-tertiary";
    case "escalated":
      return "bg-error/15 text-error";
    case "responding":
    case "triaging":
      return "bg-tertiary/15 text-tertiary";
    default:
      return "bg-surface-container-highest text-on-surface-variant";
  }
}

const typeIcons: Record<string, string> = {
  flood: "water",
  fire: "local_fire_department",
  structural: "apartment",
  medical: "emergency",
  hazmat: "skull",
  earthquake: "landslide",
  infrastructure: "construction",
  cyber: "security",
  other: "sensors",
};

// ── Component ────────────────────────────────────────────────────────────────

export default function IncidentDetailPage() {
  const params = useParams<{ id: string }>();
  const incidentId = params.id;

  const [incident, setIncident] = useState<Incident | null>(null);
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // AI Chat scoped to this incident
  const { messages: chatMessages, sendMessage, status: chatStatus } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Fetch incident data
  useEffect(() => {
    if (!incidentId) return;

    const fetchIncident = async () => {
      try {
        const res = await fetch(`/api/incidents/${incidentId}`);
        if (!res.ok) throw new Error("Not found");
        const json = await res.json();
        setIncident(json.incident);
        setAgentLogs(json.agentLogs ?? []);
        setError(false);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchIncident();
    const interval = setInterval(fetchIncident, 30_000);
    return () => clearInterval(interval);
  }, [incidentId]);

  // Publish handler
  const handlePublish = async () => {
    if (!incidentId || publishing) return;
    setPublishing(true);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/publish`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        setPublicUrl(json.publicUrl);
      }
    } catch {
      console.error("[publish] failed");
    } finally {
      setPublishing(false);
    }
  };

  // Quick action helpers
  const sendQuickAction = (text: string) => {
    const context = incident
      ? `[Incident Context: "${incident.title}" (ID: ${incident.id}, type: ${incident.type}, severity: ${incident.severity}, status: ${incident.status})] `
      : "";
    sendMessage({ text: context + text });
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <span className="w-6 h-6 border-2 border-tertiary/30 border-t-tertiary rounded-full animate-spin" />
          <span className="text-[10px] font-bold tracking-[0.3rem] uppercase text-on-surface-variant">
            Loading Incident…
          </span>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error || !incident) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="material-symbols-outlined text-4xl text-error">
            error
          </span>
          <span className="text-[10px] font-bold tracking-[0.3rem] uppercase text-on-surface-variant">
            Incident not found
          </span>
          <Link
            href="/"
            className="px-5 py-2 bg-secondary-container text-on-secondary-container font-semibold text-sm rounded-lg hover:bg-surface-bright transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const locationText =
    incident.location?.description ??
    incident.location?.address ??
    null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const analysis = incident.aiAnalysis as any;
  const protocolSteps: { step: string; done: boolean; active?: boolean }[] =
    analysis?.protocolSteps ?? [];

  return (
    <div className="min-h-dvh bg-background text-on-background">
      {/* ── Top bar ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 h-14 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/15 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">
              arrow_back
            </span>
            <span className="text-xs font-semibold uppercase tracking-widest hidden sm:inline">
              Dashboard
            </span>
          </Link>
          <div className="h-4 w-px bg-outline-variant/30" />
          <h1 className="font-bold text-sm tracking-tight text-on-surface truncate max-w-[200px] sm:max-w-none">
            {incident.title}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-tertiary" />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-tertiary hidden sm:block">
              Live
            </span>
          </div>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-24">
        {/* ── Incident header ──────────────────────────────── */}
        <section className="mb-10">
          <div className="bg-surface-container-low border border-outline-variant/15 rounded-xl p-7">
            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {/* Type badge */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-highest text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">
                <span className="material-symbols-outlined text-[14px]">
                  {typeIcons[incident.type] ?? "sensors"}
                </span>
                {incident.type}
              </span>

              {/* Severity */}
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${
                  incident.severity >= 4
                    ? "bg-error/15 text-error"
                    : incident.severity >= 3
                    ? "bg-tertiary/15 text-tertiary"
                    : "bg-surface-container-highest text-on-surface-variant"
                }`}
              >
                SEV {incident.severity} — {severityLabel(incident.severity)}
              </span>

              {/* Status */}
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${statusColor(
                  incident.status
                )}`}
              >
                {incident.status}
              </span>
            </div>

            {/* Title */}
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-on-surface">
              {incident.title}
            </h2>

            {/* Description */}
            {incident.description && (
              <p className="text-on-surface-variant text-sm leading-relaxed max-w-2xl mb-3">
                {incident.description}
              </p>
            )}

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-on-surface-variant">
              {locationText && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">
                    location_on
                  </span>
                  {locationText}
                </span>
              )}
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">
                  schedule
                </span>
                Created {timeSince(incident.createdAt)}
              </span>
              {incident.sources && incident.sources.length > 0 && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">
                    source
                  </span>
                  {incident.sources.join(", ")}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 mt-6">
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="bg-tertiary-gradient px-5 py-2 rounded-lg text-white font-semibold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-40"
              >
                {publishing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Publishing…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">
                      public
                    </span>
                    Create Public Status Page
                  </>
                )}
              </button>
            </div>

            {/* Published URL */}
            {publicUrl && (
              <div className="mt-4 p-3 bg-tertiary/10 rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary text-[16px]">
                  check_circle
                </span>
                <span className="text-xs text-tertiary font-semibold">
                  Published:
                </span>
                <span className="text-xs text-on-surface font-mono">
                  {publicUrl}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* ── Two-column layout ────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT — Timeline + Protocol ──────────────────── */}
          <div className="lg:col-span-7 space-y-8">
            {/* Activity timeline */}
            <div className="bg-surface-container-low rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">
                  Activity Timeline
                </span>
                <span className="text-[10px] text-tertiary bg-tertiary/10 px-2 py-0.5 rounded-full">
                  {agentLogs.length} entries
                </span>
              </div>

              <div className="space-y-3">
                {agentLogs.length === 0 ? (
                  <div className="py-8 flex flex-col items-center text-center">
                    <span className="material-symbols-outlined text-xl text-outline-variant mb-2">
                      history
                    </span>
                    <p className="text-xs text-on-surface-variant">
                      No activity recorded for this incident yet.
                    </p>
                  </div>
                ) : (
                  agentLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex gap-3 items-start p-3 rounded-lg hover:bg-surface-container-high transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[14px] text-on-surface-variant">
                          {log.agentType === "orchestrator"
                            ? "hub"
                            : log.agentType === "triage"
                            ? "troubleshoot"
                            : "smart_toy"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-on-surface uppercase tracking-wide">
                            {log.agentType}
                          </span>
                          <span className="text-[10px] text-on-surface-variant font-mono">
                            {timeSince(log.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant leading-relaxed">
                          {log.decisionRationale}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Protocol steps */}
            {protocolSteps.length > 0 && (
              <div className="bg-surface-container-low rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">
                    Response Protocol
                  </span>
                  <span className="text-[10px] text-tertiary font-mono">
                    {protocolSteps.filter((s) => s.done).length} /{" "}
                    {protocolSteps.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {protocolSteps.map((s, i) => (
                    <div key={i} className="flex items-center gap-3">
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
                          <span className="material-symbols-outlined text-tertiary text-[12px]">
                            check
                          </span>
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
            )}
          </div>

          {/* RIGHT — AI Chat panel ───────────────────────── */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-20">
              <div className="bg-surface-container-high rounded-2xl border border-outline-variant/20 shadow-[0_0_32px_0_rgba(231,229,228,0.08)] overflow-hidden flex flex-col" style={{ height: "min(640px, calc(100dvh - 8rem))" }}>
                {/* Chat header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-outline-variant/15 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-tertiary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-tertiary text-[18px]">
                        neurology
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-on-surface">
                        Canary AI
                      </p>
                      <p className="text-[10px] text-tertiary font-bold uppercase tracking-widest">
                        {chatStatus === "submitted"
                          ? "Connecting…"
                          : chatStatus === "streaming"
                          ? "Analyzing…"
                          : "Ready"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${severityColor(incident.severity)} ${
                      incident.severity >= 4 ? "bg-error/10" : "bg-tertiary/10"
                    }`}
                  >
                    SEV {incident.severity}
                  </span>
                </div>

                {/* Chat messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">
                  {chatMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
                      <span className="material-symbols-outlined text-3xl text-outline-variant mb-3">
                        forum
                      </span>
                      <p className="text-xs text-on-surface-variant font-semibold uppercase tracking-widest mb-1">
                        Incident AI Assistant
                      </p>
                      <p className="text-xs text-on-surface-variant max-w-[240px]">
                        Ask about this incident, run triage, or request
                        actions.
                      </p>
                    </div>
                  )}

                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] px-4 py-2.5 rounded-xl text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-tertiary/15 text-on-surface rounded-br-sm"
                            : "bg-surface-container-lowest text-on-surface rounded-bl-sm"
                        }`}
                      >
                        {msg.parts.map((part, i) => {
                          if (part.type === "text") {
                            return (
                              <span key={`${msg.id}-${i}`}>{part.text}</span>
                            );
                          }
                          if (part.type.startsWith("tool-")) {
                            const toolPart = part as {
                              type: string;
                              toolCallId: string;
                              state: string;
                              toolName?: string;
                            };
                            const toolLabel =
                              toolPart.toolName ??
                              part.type.replace("tool-", "");
                            const isResult = toolPart.state === "result";
                            return (
                              <span
                                key={`${msg.id}-${i}`}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide my-1 ${
                                  isResult
                                    ? "bg-tertiary/10 text-tertiary"
                                    : "bg-surface-container-highest text-on-surface-variant"
                                }`}
                              >
                                <span className="material-symbols-outlined text-[12px]">
                                  {isResult ? "check_circle" : "pending"}
                                </span>
                                {toolLabel}
                              </span>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  ))}

                  {(chatStatus === "submitted" ||
                    chatStatus === "streaming") && (
                    <div className="flex justify-start">
                      <div className="px-4 py-2.5 rounded-xl bg-surface-container-lowest rounded-bl-sm">
                        <span className="flex gap-1">
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-tertiary animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          />
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-tertiary animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          />
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-tertiary animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          />
                        </span>
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Quick action buttons */}
                <div className="flex gap-2 px-4 py-2 border-t border-outline-variant/10 shrink-0 overflow-x-auto scrollbar-thin">
                  <button
                    onClick={() =>
                      sendQuickAction(
                        "Run triage analysis on this incident. Assess root cause, blast radius, affected population, and recommend immediate actions. Push findings to the dashboard."
                      )
                    }
                    disabled={chatStatus !== "ready"}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-lowest text-[10px] font-semibold text-on-surface-variant hover:bg-surface-bright hover:text-on-surface transition-colors disabled:opacity-30"
                  >
                    <span className="material-symbols-outlined text-[12px]">
                      troubleshoot
                    </span>
                    Run Triage
                  </button>
                  <button
                    onClick={() =>
                      sendQuickAction(
                        "Generate an ICS-209 incident status summary report. Include situation summary, resource needs, and recommended actions."
                      )
                    }
                    disabled={chatStatus !== "ready"}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-lowest text-[10px] font-semibold text-on-surface-variant hover:bg-surface-bright hover:text-on-surface transition-colors disabled:opacity-30"
                  >
                    <span className="material-symbols-outlined text-[12px]">
                      description
                    </span>
                    Generate Report
                  </button>
                  <button
                    onClick={() =>
                      sendQuickAction(
                        "Check shelter capacity near the affected area for this incident."
                      )
                    }
                    disabled={chatStatus !== "ready"}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-lowest text-[10px] font-semibold text-on-surface-variant hover:bg-surface-bright hover:text-on-surface transition-colors disabled:opacity-30"
                  >
                    <span className="material-symbols-outlined text-[12px]">
                      night_shelter
                    </span>
                    Check Shelters
                  </button>
                </div>

                {/* Chat input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!chatInput.trim() || chatStatus !== "ready") return;
                    sendQuickAction(chatInput);
                    setChatInput("");
                  }}
                  className="flex items-center gap-2 px-4 py-3 border-t border-outline-variant/15 shrink-0"
                >
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.currentTarget.value)}
                    placeholder="Ask about this incident…"
                    className="flex-1 bg-surface-container-lowest border border-outline-variant/15 focus:border-tertiary rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none transition-colors"
                    disabled={chatStatus !== "ready"}
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || chatStatus !== "ready"}
                    className="w-9 h-9 rounded-lg bg-tertiary-gradient flex items-center justify-center text-white disabled:opacity-30 transition-opacity active:scale-95 shrink-0"
                    aria-label="Send message"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      send
                    </span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
