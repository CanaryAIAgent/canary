"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface XBotStatus {
  enabled: boolean;
  lastPollAt: string | null;
  sinceId: string | null;
  totalMentions: number;
}

interface XBotMention {
  id: string;
  tweet_id: string;
  author_handle: string;
  tweet_text: string;
  confidence: string;
  ai_response: string | null;
  processed_at: string;
}

export default function SettingsPage() {
  const [status, setStatus] = useState<XBotStatus | null>(null);
  const [mentions, setMentions] = useState<XBotMention[]>([]);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/xbot/status");
      const data = await res.json();
      setStatus(data);
    } catch (error) {
      console.error("Failed to fetch X bot status:", error);
    }
  };

  const fetchMentions = async () => {
    try {
      const res = await fetch("/api/xbot/log");
      const data = await res.json();
      setMentions(data.mentions || []);
    } catch (error) {
      console.error("Failed to fetch mentions:", error);
    }
  };

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchStatus(), fetchMentions()]);
      setLoading(false);
    };
    init();

    const interval = setInterval(() => {
      fetchStatus();
      fetchMentions();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleToggle = async (enabled: boolean) => {
    try {
      const res = await fetch("/api/xbot/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });

      if (res.ok) {
        await fetchStatus();
      }
    } catch (error) {
      console.error("Failed to toggle X bot:", error);
    }
  };

  const handleManualPoll = async () => {
    setPolling(true);
    try {
      const res = await fetch("/api/xbot/poll?action=check");
      const result = await res.json();
      console.log("Manual poll result:", result);
      await Promise.all([fetchStatus(), fetchMentions()]);
    } catch (error) {
      console.error("Failed to trigger manual poll:", error);
    } finally {
      setPolling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <span className="w-6 h-6 border-2 border-tertiary/30 border-t-tertiary rounded-full animate-spin" />
          <span className="text-[10px] font-bold tracking-[0.3rem] uppercase text-on-surface-variant">
            Loading Settings…
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-background text-on-background">
      {/* Sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-50 flex-col py-4 w-14 bg-surface-container-low border-r border-outline-variant/15 group hover:w-72 transition-all duration-300 ease-in-out overflow-hidden">
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
          >
            <div className="min-w-[24px] flex justify-center">
              <span className="text-[12px] font-bold">D</span>
            </div>
            <span className="font-medium text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              Dashboard
            </span>
          </Link>
          <button className="flex items-center gap-4 px-2 py-2.5 rounded-lg bg-surface-container-high text-tertiary">
            <div className="min-w-[24px] flex justify-center">
              <span className="text-[12px] font-bold">S</span>
            </div>
            <span className="font-medium text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              Settings
            </span>
          </button>
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

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:pl-14">
        {/* Top bar */}
        <header className="fixed top-0 left-0 right-0 lg:left-14 z-40 h-14 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/15 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-base tracking-tighter text-on-surface">Settings</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-surface-container-high border border-outline-variant/15 flex items-center justify-center">
              <span className="text-on-surface-variant text-xs font-bold">OP</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="pt-20 pb-24 px-4 sm:px-6 max-w-5xl mx-auto w-full space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-on-surface mb-1">X Bot Settings</h2>
            <p className="text-sm text-on-surface-variant">
              Configure and monitor the X (Twitter) bot for @canaryaiagent
            </p>
          </div>

          {/* Status Card */}
          <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/15">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-tertiary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-tertiary text-[24px]">share</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-on-surface">X Bot Status</h3>
                  <p className="text-xs text-on-surface-variant">Monitoring @canaryaiagent mentions</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                    status?.enabled
                      ? "bg-tertiary/10 text-tertiary"
                      : "bg-surface-container-highest text-on-surface-variant"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${status?.enabled ? "bg-tertiary" : "bg-outline-variant"}`}
                  />
                  <span className="text-[10px] font-bold uppercase tracking-widest">
                    {status?.enabled ? "Active" : "Disabled"}
                  </span>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={status?.enabled || false}
                    onChange={(e) => handleToggle(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tertiary" />
                </label>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-surface-container-lowest rounded-lg p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  Total Mentions
                </p>
                <p className="text-2xl font-bold text-on-surface">
                  {status?.totalMentions?.toString().padStart(2, "0") || "00"}
                </p>
              </div>

              <div className="bg-surface-container-lowest rounded-lg p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  Last Poll
                </p>
                <p className="text-sm font-mono text-on-surface">
                  {status?.lastPollAt
                    ? new Date(status.lastPollAt).toLocaleTimeString()
                    : "Never"}
                </p>
              </div>

              <div className="bg-surface-container-lowest rounded-lg p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  Since ID
                </p>
                <p className="text-xs font-mono text-on-surface truncate">
                  {status?.sinceId || "Not set"}
                </p>
              </div>

              <div className="bg-surface-container-lowest rounded-lg p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  Cron Schedule
                </p>
                <p className="text-xs font-semibold text-on-surface">Every minute</p>
              </div>
            </div>

            {/* Manual Poll Button */}
            <button
              onClick={handleManualPoll}
              disabled={polling}
              className="w-full py-3 rounded-lg bg-tertiary-gradient text-white font-semibold text-sm tracking-wider uppercase hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {polling ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Polling...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                  Trigger Manual Poll
                </>
              )}
            </button>
          </div>

          {/* Recent Mentions */}
          <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/15">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-on-surface">Recent Mentions</h3>
                <p className="text-xs text-on-surface-variant">Latest @canaryaiagent mentions</p>
              </div>
              <button
                onClick={fetchMentions}
                className="px-3 py-1.5 rounded-lg bg-surface-container-highest text-on-surface-variant hover:text-on-surface text-xs font-semibold transition-colors"
              >
                Refresh
              </button>
            </div>

            <div className="space-y-4">
              {mentions.length === 0 ? (
                <div className="py-12 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-3xl text-outline-variant">
                      chat_bubble_outline
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-on-surface-variant">No mentions yet</p>
                  <p className="text-xs text-on-surface-variant/70 max-w-[280px] mt-1">
                    Mentions of @canaryaiagent will appear here when detected
                  </p>
                </div>
              ) : (
                mentions.map((mention) => (
                  <div
                    key={mention.id}
                    className="bg-surface-container-lowest rounded-lg p-4 border-l-2 border-tertiary/30"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-on-surface">
                          @{mention.author_handle}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                            mention.confidence === "confirmed"
                              ? "bg-tertiary/10 text-tertiary"
                              : "bg-surface-container-high text-on-surface-variant"
                          }`}
                        >
                          {mention.confidence}
                        </span>
                      </div>
                      <span className="text-[10px] text-on-surface-variant font-mono">
                        {new Date(mention.processed_at).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-sm text-on-surface mb-3 leading-relaxed">
                      {mention.tweet_text}
                    </p>

                    {mention.ai_response && (
                      <div className="bg-surface-container-high rounded-lg p-3 mt-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
                          AI Response
                        </p>
                        <p className="text-xs text-on-surface leading-relaxed">
                          {mention.ai_response}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/15">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-tertiary text-[20px]">info</span>
              <div>
                <h4 className="text-sm font-semibold text-on-surface mb-2">How it works</h4>
                <ul className="text-xs text-on-surface-variant space-y-1.5 leading-relaxed">
                  <li>• Vercel cron job polls for @canaryaiagent mentions every minute</li>
                  <li>• AI analyzes each mention and determines confidence level</li>
                  <li>• Bot automatically replies with appropriate response</li>
                  <li>• All mentions are stored in Supabase for tracking</li>
                  <li>• Toggle above to enable/disable automatic polling</li>
                </ul>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
