"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────────────────────

interface XBotMention {
  id: string;
  tweet_id: string;
  author_handle: string;
  tweet_text: string;
  confidence: string;
  ai_response: string | null;
  processed_at: string;
  media_urls: string[];
  has_media: boolean;
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

// ── Component ────────────────────────────────────────────────────────────────

export default function MentionsPage() {
  const [mentions, setMentions] = useState<XBotMention[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<"all" | "confirmed" | "potential">("all");

  useEffect(() => {
    fetch("/api/xbot/log")
      .then((r) => r.json())
      .then((json) => {
        if (json.mentions) setMentions(json.mentions);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const filteredMentions = mentions.filter((m) => {
    if (filter === "all") return true;
    return m.confidence === filter;
  });

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
            className="flex items-center gap-4 px-2 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
            aria-label="Reports"
          >
            <div className="min-w-[24px] flex justify-center">
              <span className="material-symbols-outlined text-[20px]">description</span>
            </div>
            <span className="font-medium text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              Reports
            </span>
          </Link>
          <Link
            href="/resources"
            className="flex items-center gap-4 px-2 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
            aria-label="Resources"
          >
            <div className="min-w-[24px] flex justify-center">
              <span className="material-symbols-outlined text-[20px]">inventory_2</span>
            </div>
            <span className="font-medium text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              Resources
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
            <span className="material-symbols-outlined text-tertiary text-xl">share</span>
            <h1 className="font-bold text-base tracking-tighter text-on-surface">
              X Mentions
            </h1>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            {filteredMentions.length} {filteredMentions.length === 1 ? "mention" : "mentions"}
          </span>
        </header>

        {/* Content */}
        <main className="flex-1 pt-14">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">

            {/* Filter tabs */}
            {!loading && !error && mentions.length > 0 && (
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${
                    filter === "all"
                      ? "bg-tertiary/15 text-tertiary"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  All ({mentions.length})
                </button>
                <button
                  onClick={() => setFilter("confirmed")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${
                    filter === "confirmed"
                      ? "bg-tertiary/15 text-tertiary"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  Confirmed ({mentions.filter((m) => m.confidence === "confirmed").length})
                </button>
                <button
                  onClick={() => setFilter("potential")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${
                    filter === "potential"
                      ? "bg-tertiary/15 text-tertiary"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  Potential ({mentions.filter((m) => m.confidence === "potential").length})
                </button>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-32">
                <span className="w-6 h-6 border-2 border-tertiary/30 border-t-tertiary rounded-full animate-spin" />
                <span className="text-[10px] font-bold tracking-[0.3rem] uppercase text-on-surface-variant mt-4">
                  Loading mentions...
                </span>
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <span className="material-symbols-outlined text-4xl text-error mb-3">error</span>
                <p className="text-sm text-on-surface-variant">Failed to load mentions.</p>
              </div>
            )}

            {/* Empty */}
            {!loading && !error && mentions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center mb-5">
                  <span className="material-symbols-outlined text-3xl text-outline-variant">share</span>
                </div>
                <p className="text-sm font-semibold text-on-surface-variant uppercase tracking-widest mb-2">
                  No mentions yet
                </p>
                <p className="text-sm text-on-surface-variant max-w-md leading-relaxed">
                  X mentions will appear here once they are detected by the XBot monitoring system.
                </p>
              </div>
            )}

            {/* Mention cards */}
            {!loading && !error && filteredMentions.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredMentions.map((mention) => (
                  <div
                    key={mention.id}
                    className="bg-surface-container-low border border-outline-variant/15 rounded-xl overflow-hidden hover:border-tertiary/30 transition-colors"
                  >
                    {/* Media preview */}
                    {mention.has_media && mention.media_urls.length > 0 && (
                      <div className="relative bg-surface-container-highest aspect-video">
                        <img
                          src={mention.media_urls[0]}
                          alt="Tweet media"
                          className="w-full h-full object-cover"
                        />
                        {mention.media_urls.length > 1 && (
                          <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-full">
                            +{mention.media_urls.length - 1}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-4">
                      {/* Author */}
                      <div className="flex items-center justify-between mb-3">
                        <a
                          href={`https://x.com/${mention.author_handle}/status/${mention.tweet_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm font-semibold text-on-surface hover:text-tertiary transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">account_circle</span>
                          @{mention.author_handle}
                        </a>
                        <a
                          href={`https://x.com/${mention.author_handle}/status/${mention.tweet_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-on-surface-variant hover:text-tertiary transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                        </a>
                      </div>

                      {/* Confidence badge */}
                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${
                            mention.confidence === "confirmed"
                              ? "bg-tertiary/15 text-tertiary"
                              : "bg-surface-container-highest text-on-surface-variant"
                          }`}
                        >
                          {mention.confidence}
                        </span>
                        {mention.ai_response && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-highest text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">
                            <span className="material-symbols-outlined text-[12px]">psychology</span>
                            AI Analyzed
                          </span>
                        )}
                      </div>

                      {/* Tweet text */}
                      <p className="text-sm text-on-surface leading-relaxed mb-3 line-clamp-4">
                        {mention.tweet_text}
                      </p>

                      {/* Timestamp */}
                      <div className="flex items-center gap-1 text-xs text-on-surface-variant">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        {timeSince(mention.processed_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
