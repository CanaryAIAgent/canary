"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

export default function ChatPage() {
  const [modelTier, setModelTier] = useState<"flash" | "pro" | "pro3">("flash");
  const [chatInput, setChatInput] = useState("");
  const [chatFiles, setChatFiles] = useState<File[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { modelTier },
    }),
    onFinish: () => {
      // Log AI completion as activity
      fetch("/api/dashboard/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor: "AI Assistant", action: "Completed response" }),
      }).catch(() => {});
    },
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!chatInput.trim() && chatFiles.length === 0) || status !== "ready") return;

    const parts: Array<{ type: "text"; text: string } | { type: "file"; mediaType: string; url: string }> = [];

    if (chatInput.trim()) {
      parts.push({ type: "text", text: chatInput });
    }

    if (chatFiles.length > 0) {
      const fileParts = await Promise.all(
        chatFiles.map(
          (file) =>
            new Promise<{ type: "file"; mediaType: string; url: string }>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve({ type: "file", mediaType: file.type, url: reader.result as string });
              reader.onerror = reject;
              reader.readAsDataURL(file);
            }),
        ),
      );
      parts.push(...fileParts);
      if (!chatInput.trim()) {
        parts.unshift({ type: "text", text: `Analyze ${chatFiles.length} uploaded photo(s) for incident damage assessment.` });
      }
    }

    // Log user message as activity
    const activityText = chatInput.trim()
      ? chatInput.trim().slice(0, 120)
      : `Uploaded ${chatFiles.length} photo(s) for analysis`;
    fetch("/api/dashboard/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actor: "Operator", action: activityText }),
    }).catch(() => {});

    sendMessage({ role: "user", parts } as Parameters<typeof sendMessage>[0]);
    setChatInput("");
    setChatFiles([]);
    if (chatFileInputRef.current) chatFileInputRef.current.value = "";
  };

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
          <a
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
          </a>
          <a
            href="/chat"
            className="flex items-center gap-4 px-2 py-2.5 rounded-lg bg-surface-container-high text-tertiary"
            aria-label="Chat"
            aria-current="page"
          >
            <div className="min-w-[24px] flex justify-center">
              <span className="material-symbols-outlined text-[20px]">forum</span>
            </div>
            <span className="font-medium text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              Chat
            </span>
          </a>
          <a
            href="/video"
            className="flex items-center gap-4 px-2 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
            aria-label="Video Analysis"
          >
            <div className="min-w-[24px] flex justify-center">
              <span className="material-symbols-outlined text-[20px]">smart_display</span>
            </div>
            <span className="font-medium text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              Video Analysis
            </span>
          </a>
          <a
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
          </a>
          <a
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
          </a>
          <a
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
          </a>
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
            <span className="material-symbols-outlined text-tertiary text-xl">forum</span>
            <h1 className="font-bold text-base tracking-tighter text-on-surface">
              AI Assistant
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={modelTier}
              onChange={(e) => setModelTier(e.target.value as "flash" | "pro" | "pro3")}
              className="bg-surface-container-lowest border border-outline-variant/15 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-on-surface-variant outline-none appearance-none cursor-pointer hover:border-outline-variant/30 transition-colors"
            >
              <option value="flash">Flash</option>
              <option value="pro">Pro</option>
              <option value="pro3">3.1 Pro</option>
            </select>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
              status === "streaming" ? "bg-tertiary/10 text-tertiary" : status === "submitted" ? "bg-warning/10 text-warning" : "bg-surface-container-highest text-on-surface-variant"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                status === "streaming" ? "bg-tertiary animate-pulse" : status === "submitted" ? "bg-warning animate-pulse" : "bg-on-surface-variant/50"
              }`} />
              {status === "submitted" ? "Connecting" : status === "streaming" ? "Streaming" : "Ready"}
            </span>
          </div>
        </header>

        {/* Chat area */}
        <div className="flex-1 flex flex-col pt-14">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-16 xl:px-32 py-6 space-y-5 scrollbar-thin">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center opacity-50 py-20">
                <div className="w-16 h-16 rounded-2xl bg-tertiary/10 flex items-center justify-center mb-5">
                  <span className="material-symbols-outlined text-tertiary text-3xl">neurology</span>
                </div>
                <p className="text-sm text-on-surface-variant font-semibold uppercase tracking-widest mb-2">
                  Canary AI Assistant
                </p>
                <p className="text-sm text-on-surface-variant max-w-md leading-relaxed">
                  Report signals, run triage analysis, check shelter capacity, or ask for strategic recommendations. All actions push live updates to the EOC dashboard.
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="flex items-start gap-3 max-w-3xl w-full">
                  {msg.role !== "user" && (
                    <div className="w-8 h-8 rounded-full bg-tertiary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-tertiary text-[16px]">neurology</span>
                    </div>
                  )}
                  <div
                    className={`flex-1 px-5 py-3.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-tertiary/15 text-on-surface rounded-br-sm ml-12"
                        : "bg-surface-container-low text-on-surface rounded-bl-sm"
                    }`}
                  >
                    {msg.parts.map((part, i) => {
                      if (part.type === "text") {
                        return (
                          <span key={`${msg.id}-${i}`} className="whitespace-pre-wrap">
                            {part.text}
                          </span>
                        );
                      }
                      if (part.type === "file") {
                        const filePart = part as { type: "file"; mediaType?: string; url: string };
                        if (filePart.mediaType?.startsWith("image/")) {
                          return (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={`${msg.id}-${i}`}
                              src={filePart.url}
                              alt="Uploaded image"
                              className="rounded-xl max-w-full max-h-80 object-cover my-2"
                            />
                          );
                        }
                      }
                      if (part.type.startsWith("tool-")) {
                        const toolPart = part as { type: string; toolCallId: string; state: string; toolName?: string };
                        const toolLabel = toolPart.toolName ?? part.type.replace("tool-", "");
                        const isResult = toolPart.state === "result";
                        return (
                          <span
                            key={`${msg.id}-${i}`}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide my-1.5 mr-1.5 ${
                              isResult
                                ? "bg-tertiary/10 text-tertiary"
                                : "bg-surface-container-highest text-on-surface-variant"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {isResult ? "check_circle" : "pending"}
                            </span>
                            {toolLabel}
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-on-secondary-container text-xs font-bold">OP</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {(status === "submitted" || status === "streaming") && (
              <div className="flex justify-start">
                <div className="flex items-start gap-3 max-w-3xl">
                  <div className="w-8 h-8 rounded-full bg-tertiary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-tertiary text-[16px]">neurology</span>
                  </div>
                  <div className="px-5 py-3.5 rounded-2xl bg-surface-container-low rounded-bl-sm">
                    <span className="flex gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-tertiary animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-tertiary animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full bg-tertiary animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick-action chips */}
          <div className="flex gap-2 px-4 md:px-8 lg:px-16 xl:px-32 py-2 overflow-x-auto scrollbar-thin">
            <button
              onClick={() => setChatInput("I have a field signal to report: ")}
              disabled={status !== "ready"}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-low border border-outline-variant/15 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-[14px]">cell_tower</span>
              Report field signal
            </button>
            <button
              onClick={() => setChatInput("Run triage analysis on the current situation. Push findings to the dashboard.")}
              disabled={status !== "ready"}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-low border border-outline-variant/15 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-[14px]">troubleshoot</span>
              Run triage
            </button>
            <button
              onClick={() => setChatInput("Check shelter capacity near the affected area")}
              disabled={status !== "ready"}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-low border border-outline-variant/15 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-[14px]">night_shelter</span>
              Check shelters
            </button>
            <button
              onClick={() => setChatInput("Generate a full situation report (SITREP) for the current incident.")}
              disabled={status !== "ready"}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-low border border-outline-variant/15 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-[14px]">summarize</span>
              Generate SITREP
            </button>
          </div>

          {/* Image previews */}
          {chatFiles.length > 0 && (
            <div className="flex gap-2 px-4 md:px-8 lg:px-16 xl:px-32 py-2 overflow-x-auto scrollbar-thin">
              {chatFiles.map((file, i) => (
                <div key={`${file.name}-${i}`} className="relative group shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-surface-container-highest">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover" />
                  <button
                    onClick={() => setChatFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Remove ${file.name}`}
                  >
                    <span className="material-symbols-outlined text-[12px]">close</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-3 px-4 md:px-8 lg:px-16 xl:px-32 py-4 border-t border-outline-variant/15 bg-surface/80 backdrop-blur-xl"
          >
            <input
              ref={chatFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  const newFiles = Array.from(e.target.files).filter((f) =>
                    ["image/jpeg", "image/png", "image/webp"].includes(f.type)
                  );
                  setChatFiles((prev) => [...prev, ...newFiles].slice(0, 5));
                }
              }}
            />
            <button
              type="button"
              onClick={() => chatFileInputRef.current?.click()}
              disabled={status !== "ready"}
              className="w-10 h-10 rounded-xl bg-surface-container-low border border-outline-variant/15 flex items-center justify-center text-on-surface-variant hover:text-tertiary hover:border-tertiary/30 transition-colors disabled:opacity-30 shrink-0"
              aria-label="Attach images"
            >
              <span className="material-symbols-outlined text-[20px]">add_photo_alternate</span>
            </button>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.currentTarget.value)}
              placeholder="Report signal, run triage, or ask AI..."
              className="flex-1 bg-surface-container-low border border-outline-variant/15 focus:border-tertiary rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none transition-colors"
              disabled={status !== "ready"}
            />
            <button
              type="submit"
              disabled={(!chatInput.trim() && chatFiles.length === 0) || status !== "ready"}
              className="w-10 h-10 rounded-xl bg-tertiary-gradient flex items-center justify-center text-white disabled:opacity-30 transition-opacity active:scale-95 shrink-0"
              aria-label="Send message"
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
