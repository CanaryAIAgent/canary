"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────────────────────

interface ReportEntry {
  id: string;
  title: string;
  type: string;
  severity: number;
  status: string;
  createdAt: string;
  reports: {
    insurance: { generatedAt: string } | null;
    emergency: { generatedAt: string } | null;
    research: { generatedAt: string } | null;
  };
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

const reportTypes = [
  { key: "insurance" as const, label: "Insurance", icon: "shield", color: "text-tertiary" },
  { key: "emergency" as const, label: "Emergency", icon: "emergency", color: "text-error" },
  { key: "research" as const, label: "Research", icon: "travel_explore", color: "text-on-surface-variant" },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [entries, setEntries] = useState<ReportEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setEntries(json.data);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-dvh bg-background text-on-background">

      {/* ── Sidebar ───────────────────────────────────────────────── */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 z-50 flex-col py-4 w-14 bg-surface-container-low border-r border-outline-variant/15 group hover:w-72 transition-all duration-300 ease-in-out overflow-hidden"
        aria-label="Primary navigation"
      >
        <div className="flex items-center gap-4 px-4 mb-8 overflow-hidden">
          <div className="min-w-[24px] flex justify-center">
            <span className="text-tertiary text-sm font-bold">C</span>
          </div>
          <span className="font-bold uppercase tracking-widest text-xs text-on-surface whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            Canary
          </span>
        </div>

        <nav className="flex flex-col gap-1 px-2 flex-1">
          <Link
            href="/"
            className="flex items-center gap-4 px-2 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
            aria-label="Dashboard"
          >
            <div className="min-w-[24px] flex justify-center">
              <span className="material-symbols-outlined text-[20px]">dashboard</span>
            </div>
            <span className="font-medium text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              Dashboard
            </span>
          </Link>
          <Link
            href="/chat"
            className="flex items-center gap-4 px-2 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
            aria-label="Chat"
          >
            <div className="min-w-[24px] flex justify-center">
              <span className="material-symbols-outlined text-[20px]">forum</span>
            </div>
            <span className="font-medium text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              Chat
            </span>
          </Link>
          <Link
            href="/reports"
            className="flex items-center gap-4 px-2 py-2.5 rounded-lg bg-surface-container-high text-tertiary"
            aria-label="Reports"
            aria-current="page"
          >
            <div className="min-w-[24px] flex justify-center">
              <span className="material-symbols-outlined text-[20px]">description</span>
            </div>
            <span className="font-medium text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              Reports
            </span>
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-4 px-2 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
            aria-label="Settings"
          >
            <div className="min-w-[24px] flex justify-center">
              <span className="material-symbols-outlined text-[20px]">settings</span>
            </div>
            <span className="font-medium text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              Settings
            </span>
          </Link>
        </nav>

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

      {/* ── Main content ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:pl-14">

        {/* Top bar */}
        <header className="fixed top-0 left-0 right-0 lg:left-14 z-40 h-14 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/15 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-tertiary text-xl">description</span>
            <h1 className="font-bold text-base tracking-tighter text-on-surface">
              Situation Reports
            </h1>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            {entries.length} {entries.length === 1 ? "incident" : "incidents"} with reports
          </span>
        </header>

        {/* Content */}
        <main className="flex-1 pt-14">
          <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">

            {/* Loading */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-32">
                <span className="w-6 h-6 border-2 border-tertiary/30 border-t-tertiary rounded-full animate-spin" />
                <span className="text-[10px] font-bold tracking-[0.3rem] uppercase text-on-surface-variant mt-4">
                  Loading reports...
                </span>
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <span className="material-symbols-outlined text-4xl text-error mb-3">error</span>
                <p className="text-sm text-on-surface-variant">Failed to load reports.</p>
              </div>
            )}

            {/* Empty */}
            {!loading && !error && entries.length === 0 && (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center mb-5">
                  <span className="material-symbols-outlined text-3xl text-outline-variant">description</span>
                </div>
                <p className="text-sm font-semibold text-on-surface-variant uppercase tracking-widest mb-2">
                  No reports yet
                </p>
                <p className="text-sm text-on-surface-variant max-w-md leading-relaxed">
                  Launch the multi-agent swarm from an incident page to generate insurance, emergency, and research reports.
                </p>
              </div>
            )}

            {/* Report cards */}
            {!loading && !error && entries.length > 0 && (
              <div className="space-y-6">
                {entries.map((entry) => {
                  const reportCount = [entry.reports.insurance, entry.reports.emergency, entry.reports.research].filter(Boolean).length;

                  return (
                    <div
                      key={entry.id}
                      className="bg-surface-container-low border border-outline-variant/15 rounded-xl overflow-hidden"
                    >
                      {/* Incident header */}
                      <div className="p-6 pb-4">
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-highest text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">
                            <span className="material-symbols-outlined text-[14px]">
                              {typeIcons[entry.type] ?? "sensors"}
                            </span>
                            {entry.type}
                          </span>
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${
                              entry.severity >= 4
                                ? "bg-error/15 text-error"
                                : entry.severity >= 3
                                ? "bg-tertiary/15 text-tertiary"
                                : "bg-surface-container-highest text-on-surface-variant"
                            }`}
                          >
                            SEV {entry.severity} — {severityLabel(entry.severity)}
                          </span>
                          <span className="text-[10px] font-mono text-on-surface-variant">
                            {reportCount}/3 reports
                          </span>
                        </div>

                        <Link
                          href={`/incidents/${entry.id}`}
                          className="text-lg font-bold text-on-surface hover:text-tertiary transition-colors"
                        >
                          {entry.title}
                        </Link>

                        <div className="flex items-center gap-3 mt-2 text-xs text-on-surface-variant">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                            {timeSince(entry.createdAt)}
                          </span>
                          <span className="capitalize">{entry.status}</span>
                        </div>
                      </div>

                      {/* Report links */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 border-t border-outline-variant/10">
                        {reportTypes.map(({ key, label, icon, color }) => {
                          const report = entry.reports[key];
                          return (
                            <div
                              key={key}
                              className="border-b sm:border-b-0 sm:border-r last:border-r-0 border-outline-variant/10"
                            >
                              {report ? (
                                <Link
                                  href={`/reports/${entry.id}/${key}`}
                                  className="flex items-center gap-3 px-6 py-4 hover:bg-surface-container-high transition-colors group/link"
                                >
                                  <div className={`w-9 h-9 rounded-lg bg-tertiary/10 flex items-center justify-center shrink-0`}>
                                    <span className={`material-symbols-outlined text-[18px] ${color}`}>{icon}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-on-surface group-hover/link:text-tertiary transition-colors">
                                      {label} Report
                                    </p>
                                    <p className="text-[10px] text-on-surface-variant font-mono">
                                      {timeSince(report.generatedAt)}
                                    </p>
                                  </div>
                                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant group-hover/link:text-tertiary transition-colors">
                                    arrow_forward
                                  </span>
                                </Link>
                              ) : (
                                <div className="flex items-center gap-3 px-6 py-4 opacity-40">
                                  <div className="w-9 h-9 rounded-lg bg-surface-container-highest flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">{icon}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-on-surface-variant">
                                      {label} Report
                                    </p>
                                    <p className="text-[10px] text-on-surface-variant">
                                      Not generated
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
