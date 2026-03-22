"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────────────────────

interface IncidentOption {
  id: string;
  title: string;
  type: string;
  severity: number;
  status: string;
}

interface TimelineEvent {
  timestamp: string;
  seconds: number;
  event: string;
  severity: number;
  category: string;
}

interface VideoAnalysisResult {
  incidentId: string;
  analysis: {
    summary: string;
    severity: number;
    confidence: number;
    hazards: string[];
    sceneSummary: string;
    progressionAnalysis?: string;
    timeline: TimelineEvent[];
    structuralIntegrity?: string;
    damageCategory?: string;
    detectedObjects?: string[];
    recommendedActions?: string[];
  };
  isNewIncident: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function severityColor(sev: number): string {
  if (sev >= 4) return "text-error";
  if (sev >= 3) return "text-tertiary";
  return "text-on-surface-variant";
}

function severityBg(sev: number): string {
  if (sev >= 4) return "bg-error/15 text-error";
  if (sev >= 3) return "bg-tertiary/15 text-tertiary";
  return "bg-surface-container-highest text-on-surface-variant";
}

function categoryIcon(cat: string): string {
  switch (cat) {
    case "damage": return "broken_image";
    case "hazard": return "warning";
    case "movement": return "directions_run";
    case "structural": return "apartment";
    case "environmental": return "eco";
    case "human_activity": return "group";
    default: return "sensors";
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function VideoAnalysisPage() {
  const [incidents, setIncidents] = useState<IncidentOption[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState("");
  const [createMode, setCreateMode] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("other");
  const [newSeverity, setNewSeverity] = useState(3);
  const [newLocation, setNewLocation] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<VideoAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch incidents for attachment
  useEffect(() => {
    fetch("/api/incidents")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) setIncidents(json.data);
      })
      .catch(() => {});
  }, []);

  // Clean up video preview URL
  useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    };
  }, [videoPreviewUrl]);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("video/")) return;
    setVideoFile(file);
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!videoFile || analyzing) return;
    if (createMode && !newTitle.trim()) {
      setError("A title is required when creating a new incident.");
      return;
    }
    if (!createMode && !selectedIncidentId) {
      setError("Select an incident to attach to.");
      return;
    }

    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("video", videoFile);

      if (createMode) {
        formData.append("title", newTitle.trim());
        formData.append("type", newType);
        formData.append("severity", String(newSeverity));
        if (newLocation.trim()) formData.append("location", newLocation.trim());
        if (newDescription.trim()) formData.append("description", newDescription.trim());
      } else {
        formData.append("incidentId", selectedIncidentId);
      }

      const res = await fetch("/api/video/analyze", { method: "POST", body: formData });

      // Handle non-JSON responses (e.g. 413 Request Entity Too Large)
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        const text = await res.text();
        setError(`Server error (${res.status}): ${text.slice(0, 200)}`);
        return;
      }

      const json = await res.json();

      if (json.success) {
        setResult(json.data);
      } else {
        setError(json.error?.message ?? "Analysis failed");
      }
    } catch (err) {
      console.error("[video] fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to connect to analysis service.");
    } finally {
      setAnalyzing(false);
    }
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
          <Link href="/" className="flex items-center gap-4 px-2 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors">
            <div className="min-w-[24px] flex justify-center"><span className="material-symbols-outlined text-[20px]">dashboard</span></div>
            <span className="font-medium text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">Dashboard</span>
          </Link>
          <Link href="/chat" className="flex items-center gap-4 px-2 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors">
            <div className="min-w-[24px] flex justify-center"><span className="material-symbols-outlined text-[20px]">forum</span></div>
            <span className="font-medium text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">Chat</span>
          </Link>
          <Link href="/video" className="flex items-center gap-4 px-2 py-2.5 rounded-lg bg-surface-container-high text-tertiary" aria-current="page">
            <div className="min-w-[24px] flex justify-center"><span className="material-symbols-outlined text-[20px]">smart_display</span></div>
            <span className="font-medium text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">Video Analysis</span>
          </Link>
          <Link href="/reports" className="flex items-center gap-4 px-2 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors">
            <div className="min-w-[24px] flex justify-center"><span className="material-symbols-outlined text-[20px]">description</span></div>
            <span className="font-medium text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">Reports</span>
          </Link>
          <Link href="/resources" className="flex items-center gap-4 px-2 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors">
            <div className="min-w-[24px] flex justify-center"><span className="material-symbols-outlined text-[20px]">inventory_2</span></div>
            <span className="font-medium text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">Resources</span>
          </Link>
          <Link href="/settings" className="flex items-center gap-4 px-2 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors">
            <div className="min-w-[24px] flex justify-center"><span className="material-symbols-outlined text-[20px]">settings</span></div>
            <span className="font-medium text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">Settings</span>
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
            <span className="material-symbols-outlined text-tertiary text-xl">smart_display</span>
            <h1 className="font-bold text-base tracking-tighter text-on-surface">
              Video Analysis
            </h1>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Gemini 2.5 Flash
          </span>
        </header>

        {/* Content */}
        <main className="flex-1 pt-14">
          <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* LEFT — Upload & Config ──────────────────────── */}
              <div className="space-y-6">

                {/* Video drop zone */}
                <div
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
                    dragging
                      ? "border-tertiary bg-tertiary/5"
                      : videoFile
                      ? "border-tertiary/30 bg-surface-container-low"
                      : "border-outline-variant/30 hover:border-outline-variant/50"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file) handleFileSelect(file);
                  }}
                >
                  {videoFile && videoPreviewUrl ? (
                    <div className="space-y-4">
                      <video
                        src={videoPreviewUrl}
                        controls
                        className="w-full rounded-xl max-h-64 bg-black"
                      />
                      <div className="flex items-center justify-between">
                        <div className="text-left">
                          <p className="text-sm font-semibold text-on-surface truncate max-w-[200px]">{videoFile.name}</p>
                          <p className="text-[10px] text-on-surface-variant">{(videoFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                        </div>
                        <button
                          onClick={() => {
                            setVideoFile(null);
                            if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
                            setVideoPreviewUrl(null);
                            setResult(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          className="px-3 py-1.5 rounded-lg bg-surface-container-highest text-on-surface-variant text-xs font-semibold hover:text-on-surface transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8">
                      <span className="material-symbols-outlined text-4xl text-outline-variant mb-4 block">
                        video_call
                      </span>
                      <p className="text-sm font-semibold text-on-surface-variant mb-1">
                        Drop video here or click to upload
                      </p>
                      <p className="text-[10px] text-on-surface-variant/60">
                        MP4, MOV, WebM, AVI supported
                      </p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-4 px-4 py-2 rounded-lg bg-secondary-container text-on-secondary-container text-xs font-semibold hover:bg-surface-bright transition-colors"
                      >
                        Choose Video
                      </button>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/mov,video/quicktime,video/webm,video/avi,video/x-msvideo"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                  />
                </div>

                {/* Incident attachment */}
                <div className="bg-surface-container-low rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Incident
                    </span>
                    <div className="flex gap-1 bg-surface-container-highest rounded-full p-0.5">
                      <button
                        onClick={() => setCreateMode(true)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider transition-colors ${
                          createMode ? "bg-tertiary text-white" : "text-on-surface-variant hover:text-on-surface"
                        }`}
                      >
                        New
                      </button>
                      <button
                        onClick={() => setCreateMode(false)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider transition-colors ${
                          !createMode ? "bg-tertiary text-white" : "text-on-surface-variant hover:text-on-surface"
                        }`}
                      >
                        Attach
                      </button>
                    </div>
                  </div>

                  {createMode ? (
                    <div className="space-y-3">
                      <input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Incident title *"
                        className="w-full bg-surface-container-lowest border border-outline-variant/15 rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:border-tertiary transition-colors"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <select
                          value={newType}
                          onChange={(e) => setNewType(e.target.value)}
                          className="bg-surface-container-lowest border border-outline-variant/15 rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:border-tertiary transition-colors"
                        >
                          <option value="flood">Flood</option>
                          <option value="fire">Fire</option>
                          <option value="structural">Structural</option>
                          <option value="medical">Medical</option>
                          <option value="hazmat">HAZMAT</option>
                          <option value="earthquake">Earthquake</option>
                          <option value="infrastructure">Infrastructure</option>
                          <option value="cyber">Cyber</option>
                          <option value="other">Other</option>
                        </select>
                        <select
                          value={newSeverity}
                          onChange={(e) => setNewSeverity(Number(e.target.value))}
                          className="bg-surface-container-lowest border border-outline-variant/15 rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:border-tertiary transition-colors"
                        >
                          <option value={1}>Sev 1 — Info</option>
                          <option value={2}>Sev 2 — Low</option>
                          <option value={3}>Sev 3 — Moderate</option>
                          <option value={4}>Sev 4 — High</option>
                          <option value={5}>Sev 5 — Critical</option>
                        </select>
                      </div>
                      <input
                        value={newLocation}
                        onChange={(e) => setNewLocation(e.target.value)}
                        placeholder="Location (optional)"
                        className="w-full bg-surface-container-lowest border border-outline-variant/15 rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:border-tertiary transition-colors"
                      />
                      <textarea
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="Additional context (optional)"
                        rows={2}
                        className="w-full bg-surface-container-lowest border border-outline-variant/15 rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:border-tertiary transition-colors resize-none"
                      />
                    </div>
                  ) : (
                    <div>
                      {incidents.length === 0 ? (
                        <p className="text-xs text-on-surface-variant py-4 text-center">
                          No active incidents found.
                        </p>
                      ) : (
                        <select
                          value={selectedIncidentId}
                          onChange={(e) => setSelectedIncidentId(e.target.value)}
                          className="w-full bg-surface-container-lowest border border-outline-variant/15 rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:border-tertiary transition-colors"
                        >
                          <option value="">Select an incident...</option>
                          {incidents.map((inc) => (
                            <option key={inc.id} value={inc.id}>
                              [{inc.type.toUpperCase()}] {inc.title} (Sev {inc.severity})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!videoFile || analyzing}
                  className="w-full py-3.5 rounded-xl bg-tertiary-gradient text-white font-bold text-sm tracking-widest uppercase shadow-lg shadow-tertiary/20 hover:opacity-90 transition-all disabled:opacity-30 flex items-center justify-center gap-3 active:scale-95"
                >
                  {analyzing ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Analyzing Video...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">play_circle</span>
                      Analyze Video
                    </>
                  )}
                </button>

                {error && (
                  <div className="bg-error/10 border border-error/20 rounded-xl p-4 flex items-start gap-3">
                    <span className="material-symbols-outlined text-error text-[18px] mt-0.5">error</span>
                    <p className="text-xs text-error">{error}</p>
                  </div>
                )}
              </div>

              {/* RIGHT — Results ──────────────────────────────── */}
              <div className="space-y-6">

                {!result && !analyzing && (
                  <div className="bg-surface-container-low rounded-xl p-8 flex flex-col items-center text-center py-20">
                    <div className="w-16 h-16 rounded-2xl bg-surface-container-highest flex items-center justify-center mb-5">
                      <span className="material-symbols-outlined text-3xl text-outline-variant">smart_display</span>
                    </div>
                    <p className="text-sm font-semibold text-on-surface-variant uppercase tracking-widest mb-2">
                      Video Intelligence
                    </p>
                    <p className="text-sm text-on-surface-variant max-w-sm leading-relaxed">
                      Upload incident footage to extract a timestamped event timeline, damage assessment, and response recommendations powered by Gemini.
                    </p>
                  </div>
                )}

                {analyzing && (
                  <div className="bg-surface-container-low rounded-xl p-8 flex flex-col items-center text-center py-20">
                    <span className="w-10 h-10 border-3 border-tertiary/30 border-t-tertiary rounded-full animate-spin mb-5" />
                    <p className="text-sm font-semibold text-on-surface uppercase tracking-widest mb-1">
                      Video Analysis Kicked Off
                    </p>
                    <p className="text-xs text-on-surface-variant max-w-sm mb-4">
                      AI is watching the video and extracting timestamped events, hazards, and damage assessment. An incident will be created when analysis completes.
                    </p>
                    <div className="flex items-center gap-2 px-4 py-2 bg-tertiary/10 rounded-full">
                      <span className="material-symbols-outlined text-tertiary text-[14px]">info</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-tertiary">
                        This may take 30–60 seconds
                      </span>
                    </div>
                  </div>
                )}

                {result && (
                  <>
                    {/* Summary card */}
                    <div className="bg-surface-container-low rounded-xl p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                          Analysis Summary
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest ${severityBg(result.analysis.severity)}`}>
                          SEV {result.analysis.severity}
                        </span>
                      </div>

                      <p className="text-sm text-on-surface leading-relaxed">{result.analysis.sceneSummary}</p>

                      {result.analysis.progressionAnalysis && (
                        <div className="p-4 bg-surface-container-lowest rounded-xl border-l-2 border-tertiary">
                          <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mb-1">
                            Progression
                          </p>
                          <p className="text-xs text-on-surface leading-relaxed">{result.analysis.progressionAnalysis}</p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 pt-2">
                        <span className="text-[10px] text-on-surface-variant">
                          Confidence: <span className="text-on-surface font-mono">{Math.round(result.analysis.confidence * 100)}%</span>
                        </span>
                        {result.analysis.structuralIntegrity && (
                          <span className="text-[10px] text-on-surface-variant">
                            Structure: <span className="text-on-surface">{result.analysis.structuralIntegrity.replace(/_/g, " ")}</span>
                          </span>
                        )}
                        {result.analysis.damageCategory && (
                          <span className="text-[10px] text-on-surface-variant">
                            Category: <span className="text-on-surface">{result.analysis.damageCategory}</span>
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/incidents/${result.incidentId}`}
                        className="inline-flex items-center gap-1.5 text-xs text-tertiary font-semibold hover:underline"
                      >
                        <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                        View Incident
                      </Link>
                    </div>

                    {/* Timeline */}
                    {result.analysis.timeline.length > 0 && (
                      <div className="bg-surface-container-low rounded-xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                            Event Timeline
                          </span>
                          <span className="text-[10px] text-tertiary bg-tertiary/10 px-2 py-0.5 rounded-full">
                            {result.analysis.timeline.length} events
                          </span>
                        </div>

                        <div className="space-y-0">
                          {result.analysis.timeline.map((evt, i) => (
                            <div key={i} className="flex gap-4 relative">
                              {/* Timeline line */}
                              {i < result.analysis.timeline.length - 1 && (
                                <div className="absolute left-[19px] top-8 bottom-0 w-px bg-outline-variant/20" />
                              )}

                              {/* Icon */}
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 z-10 ${severityBg(evt.severity)}`}>
                                <span className="material-symbols-outlined text-[16px]">{categoryIcon(evt.category)}</span>
                              </div>

                              {/* Content */}
                              <div className="flex-1 pb-5">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-mono text-xs font-bold text-tertiary">{evt.timestamp}</span>
                                  <span className={`text-[9px] font-bold uppercase tracking-widest ${severityColor(evt.severity)}`}>
                                    SEV {evt.severity}
                                  </span>
                                </div>
                                <p className="text-sm text-on-surface leading-relaxed">{evt.event}</p>
                                <span className="text-[9px] text-on-surface-variant uppercase tracking-widest mt-1 inline-block">
                                  {evt.category.replace(/_/g, " ")}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Hazards & Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(result.analysis.hazards?.length ?? 0) > 0 && (
                        <div className="bg-surface-container-low rounded-xl p-5 space-y-3">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-error">
                            Hazards Detected
                          </span>
                          <div className="space-y-2">
                            {result.analysis.hazards.map((h, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-error text-[14px] mt-0.5">warning</span>
                                <span className="text-xs text-on-surface">{h}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {(result.analysis.recommendedActions?.length ?? 0) > 0 && (
                        <div className="bg-surface-container-low rounded-xl p-5 space-y-3">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-tertiary">
                            Recommended Actions
                          </span>
                          <div className="space-y-2">
                            {result.analysis.recommendedActions!.map((a, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-tertiary text-[14px] mt-0.5">task_alt</span>
                                <span className="text-xs text-on-surface">{a}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Detected objects */}
                    {(result.analysis.detectedObjects?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {result.analysis.detectedObjects!.map((obj, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-full bg-surface-container-highest text-[10px] font-semibold text-on-surface-variant">
                            {obj}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
