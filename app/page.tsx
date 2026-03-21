"use client";

// Canary — EOC Command Dashboard
// Design: Monolith / Precision Studio (stitch/monolith_studio/DESIGN.md)
// Layout: App Shell with sidebar + main content + sticky AI panel

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

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
  incidentId?: string;
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

interface ActiveIncident {
  id: string;
  title: string;
  description: string;
  type: string;
  severity: number;
  status: string;
  location: string;
  sources: string[];
  createdAt: string;
}

interface DashboardData {
  stats: DashboardStats;
  activeIncident: ActiveIncident | null;
  signals: SignalCard[];
  activity: ActivityEntry[];
  protocolSteps: ProtocolStep[];
  aiRecommendation: AiRecommendation;
}

// ── Signal Ingestion Modal ──────────────────────────────────────────────────

// ── Photo Analysis types ──────────────────────────────────────────────────

interface IncidentOption {
  id: string;
  title: string;
  type: string;
  severity: number;
  status: string;
  createdAt: string;
}

interface PhotoAnalysisResult {
  incidentId: string;
  analysis: {
    summary: string;
    severity: number;
    confidence: number;
    hazards: string[];
    structuralIntegrity: string;
    detectedObjects: string[];
    recommendedActions: string[];
    damageCategory: string;
    resourceRecommendations: string[];
  };
}

const INCIDENT_TYPES = ["flood", "fire", "structural", "medical", "hazmat", "earthquake", "infrastructure", "cyber", "other"] as const;

const SEVERITY_COLORS: Record<number, string> = {
  1: "bg-green-600",
  2: "bg-yellow-500",
  3: "bg-orange-500",
  4: "bg-red-500",
  5: "bg-red-700",
};

// ── Signal Ingestion Modal ──────────────────────────────────────────────────

interface IngestResult {
  success: boolean;
  data?: {
    signalId: string;
    analysis: {
      isEmergency: boolean;
      severity: number;
      category: string;
      title: string;
      summary: string;
      credibility: number;
      extractedLocation?: string;
      recommendedAction: string;
      icon: string;
    };
  };
  error?: { code: string; message: string };
}

function SignalIngestModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [type, setType] = useState<"field" | "social" | "camera">("field");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<IngestResult | null>(null);

  const handleSubmit = async () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/signals/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, text, source: type === "field" ? "Field Operator" : type === "social" ? "Social Monitor" : "Camera System" }),
      });
      const json: IngestResult = await res.json();
      setResult(json);
      if (json.success) {
        onSuccess();
      }
    } catch {
      setResult({ success: false, error: { code: "NETWORK_ERROR", message: "Failed to reach signal ingestion API" } });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setText("");
    setResult(null);
    setSubmitting(false);
    onClose();
  };

  if (!open) return null;

  const typeOptions: { value: "field" | "social" | "camera"; label: string; icon: string }[] = [
    { value: "field", label: "Field Report", icon: "person_search" },
    { value: "social", label: "Social Media", icon: "share" },
    { value: "camera", label: "Camera Alert", icon: "videocam" },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Panel */}
      <div className="relative w-[min(480px,calc(100vw-2rem))] bg-surface-container-high rounded-2xl shadow-[0_0_32px_0_rgba(231,229,228,0.08)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-tertiary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-tertiary text-[18px]">cell_tower</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-on-surface">Report Signal</p>
              <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">AI-analyzed ingestion</p>
            </div>
          </div>
          <button onClick={handleClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors" aria-label="Close">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 space-y-5">
          {/* Type selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Signal Type</label>
            <div className="flex gap-2">
              {typeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setType(opt.value)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                    type === opt.value
                      ? "bg-tertiary/15 text-tertiary"
                      : "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-bright"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text input */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Signal Content</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.currentTarget.value)}
              placeholder={
                type === "field" ? "Describe the field observation..."
                : type === "social" ? "Paste the social media post..."
                : "Describe the camera alert..."
              }
              rows={4}
              className="w-full bg-surface-container-lowest border border-outline-variant/15 focus:border-tertiary rounded-lg px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none transition-colors resize-none"
              disabled={submitting}
            />
          </div>

          {/* Result */}
          {result && (
            <div className={`p-4 rounded-xl ${result.success ? "bg-tertiary/10" : "bg-error/10"}`}>
              {result.success && result.data ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-tertiary text-[16px]">check_circle</span>
                    <span className="text-xs font-bold text-tertiary uppercase tracking-widest">Signal Analyzed</span>
                  </div>
                  <p className="text-sm font-semibold text-on-surface">{result.data.analysis.title}</p>
                  <p className="text-xs text-on-surface-variant">{result.data.analysis.summary}</p>
                  <div className="flex gap-3 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Severity: <span className="text-on-surface">{result.data.analysis.severity}/5</span>
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Action: <span className="text-on-surface">{result.data.analysis.recommendedAction}</span>
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Credibility: <span className="text-on-surface">{result.data.analysis.credibility}%</span>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-error text-[16px]">error</span>
                  <span className="text-xs text-error">{result.error?.message ?? "Analysis failed"}</span>
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || submitting}
              className="flex-1 py-3 rounded-xl bg-tertiary-gradient text-white font-bold text-sm tracking-widest uppercase disabled:opacity-30 transition-opacity active:scale-95 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing…
                </>
              ) : result?.success ? (
                "Submit Another"
              ) : (
                "Analyze & Submit"
              )}
            </button>
            {result?.success && (
              <button
                onClick={handleClose}
                className="px-5 py-3 rounded-xl bg-secondary-container text-on-secondary-container font-semibold text-sm hover:bg-surface-bright transition-colors"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Metric display helper ───────────────────────────────────────────────────

function formatMetricValue(value: number, padded: boolean): string {
  if (value === 0) return "\u2014"; // em dash for zero
  return padded ? String(value).padStart(2, "0") : String(value);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [signalModalOpen, setSignalModalOpen] = useState(false);
  const [signalFilter, setSignalFilter] = useState("All Signals");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Photo Analysis tab state
  const [activeTab, setActiveTab] = useState<"command" | "photos">("command");
  const [incidents, setIncidents] = useState<IncidentOption[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState("");
  const [createMode, setCreateMode] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("flood");
  const [newSeverity, setNewSeverity] = useState(3);
  const [newLocation, setNewLocation] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [analysisResult, setAnalysisResult] = useState<PhotoAnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshDashboard = useCallback(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  const { messages: chatMessages, sendMessage, status: chatStatus } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onFinish: () => {
      refreshDashboard();
    },
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/dashboard");
        const json = await res.json();
        setData(json);
        setFetchError(false);
      } catch {
        console.error("[dashboard] fetch failed");
        setFetchError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 15_000);
    return () => clearInterval(interval);
  }, []);

  // Fetch incidents for photo analysis tab
  useEffect(() => {
    if (activeTab !== "photos") return;
    fetch("/api/incidents")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) setIncidents(json.data);
      })
      .catch(() => {});
  }, [activeTab]);

  // Photo analysis handlers
  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return;
    const accepted = Array.from(files).filter((f) =>
      ["image/jpeg", "image/png", "image/webp"].includes(f.type)
    );
    setUploadedFiles((prev) => [...prev, ...accepted].slice(0, 5));
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAnalyzeSubmit = async () => {
    if (uploadedFiles.length === 0) return;
    if (!createMode && !selectedIncidentId) return;
    if (createMode && !newTitle.trim()) return;

    setAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    const formData = new FormData();
    uploadedFiles.forEach((f) => formData.append("images", f));

    if (createMode) {
      formData.append("title", newTitle);
      formData.append("type", newType);
      formData.append("severity", String(newSeverity));
      if (newLocation.trim()) formData.append("location", newLocation);
      if (newDescription.trim()) formData.append("description", newDescription);
    } else {
      formData.append("incidentId", selectedIncidentId);
    }

    try {
      const res = await fetch("/api/photos/analyze", { method: "POST", body: formData });
      const json = await res.json();
      if (json.success) {
        setAnalysisResult(json.data);
        refreshDashboard();
      } else {
        setAnalysisError(json.error?.message ?? "Analysis failed");
      }
    } catch {
      setAnalysisError("Failed to reach photo analysis API");
    } finally {
      setAnalyzing(false);
    }
  };

  const canSubmitPhotos =
    uploadedFiles.length > 0 &&
    (createMode ? newTitle.trim().length > 0 : selectedIncidentId.length > 0);

  // Quick-action handlers for chat
  const prefillChat = (text: string) => {
    setChatInput(text);
    setChatOpen(true);
  };

  if (loading && !data) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <span className="w-6 h-6 border-2 border-tertiary/30 border-t-tertiary rounded-full animate-spin" />
          <span className="text-[10px] font-bold tracking-[0.3rem] uppercase text-on-surface-variant">
            Loading EOC Data…
          </span>
        </div>
      </div>
    );
  }

  if (fetchError && !data) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="material-symbols-outlined text-4xl text-error">cloud_off</span>
          <span className="text-[10px] font-bold tracking-[0.3rem] uppercase text-on-surface-variant">
            Unable to reach EOC systems
          </span>
          <button
            onClick={() => { setLoading(true); setFetchError(false); fetch("/api/dashboard").then(r => r.json()).then(setData).catch(() => setFetchError(true)).finally(() => setLoading(false)); }}
            className="px-5 py-2 bg-secondary-container text-on-secondary-container font-semibold text-sm rounded-lg hover:bg-surface-bright transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const metrics = data ? [
    { label: "Active Incidents", value: formatMetricValue(data.stats.activeIncidents, true), sub: data.stats.incidentDelta, subColor: "text-error", accent: true },
    { label: "Resource Requests", value: formatMetricValue(data.stats.resourceRequests, true), sub: data.stats.resourceStatus, subColor: "text-tertiary", accent: false },
    { label: "Deployment ETA", value: data.stats.deploymentEtaMinutes > 0 ? `${data.stats.deploymentEtaMinutes}m` : "\u2014", sub: data.stats.deploymentEtaMinutes > 0 ? "avg" : "", subColor: "text-on-surface-variant", accent: false },
    { label: "Signal Health", value: data.stats.signalHealthPct > 0 ? `${data.stats.signalHealthPct}%` : "\u2014", sub: "", subColor: "text-tertiary", accent: false },
  ] : [];

  const incident = data?.activeIncident ?? null;
  const allSignalCards = data?.signals ?? [];
  const signalCards = signalFilter === "All Signals"
    ? allSignalCards
    : allSignalCards.filter((card) => {
        const tag = (card.tag ?? "").toUpperCase();
        const source = (card.source ?? "").toUpperCase();
        switch (signalFilter) {
          case "Field": return tag.includes("FIELD") || source.includes("FIELD");
          case "Social": return tag.includes("SOCIAL") || source.includes("SOCIAL") || tag.includes("X");
          case "Camera": return tag.includes("CAMERA") || source.includes("CAMERA") || card.icon === "videocam";
          case "Critical": return tag.includes("CRITICAL") || (card.credibility ?? 0) >= 90;
          default: return true;
        }
      });
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
            {/* Report Signal button */}
            <button
              onClick={() => setSignalModalOpen(true)}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-tertiary-gradient text-white font-semibold text-xs tracking-wider uppercase hover:opacity-90 transition-opacity active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">cell_tower</span>
              <span className="hidden sm:inline">Report Signal</span>
            </button>

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

          {/* ── Page-level tabs ────────────────────────────────────── */}
          <div className="bg-surface-container-low rounded-xl flex gap-0 overflow-hidden">
            {([
              { key: "command" as const, label: "Command Center", icon: "sensors" },
              { key: "photos" as const, label: "Photo Analysis", icon: "photo_camera" },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${
                  activeTab === tab.key
                    ? "text-tertiary border-b-2 border-tertiary"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Command Center tab ─────────────────────────────────── */}
          {activeTab === "command" && (<>

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
                      {incident ? (
                        <>
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-error" />
                          </span>
                          <span className="text-[10px] font-semibold uppercase tracking-[0.2rem] text-error">
                            Active Incident — {incident.type.toUpperCase()} — SEV {incident.severity}
                          </span>
                        </>
                      ) : (
                        <span className="text-[10px] font-semibold uppercase tracking-[0.2rem] text-on-surface-variant">
                          No Active Incident
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-on-surface">
                      {incident?.title ?? "Awaiting Incident Data"}
                    </h2>
                    <p className="text-on-surface-variant text-sm leading-relaxed max-w-md">
                      {incident?.description ?? "Report a field signal or use the AI assistant to begin incident tracking."}
                    </p>
                    {incident?.location && (
                      <p className="text-on-surface-variant text-xs mt-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                        {incident.location}
                      </p>
                    )}
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    {incident ? (
                      <>
                        <button
                          onClick={() => {
                            setChatOpen(true);
                            setChatInput(`Deploy resources for incident "${incident.title}" (ID: ${incident.id}). Assess resource needs and recommend dispatch.`);
                          }}
                          className="bg-tertiary-gradient px-5 py-2 rounded-lg text-white font-semibold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity active:scale-95"
                        >
                          <span className="material-symbols-outlined text-[16px]">emergency</span>
                          Deploy Resources
                        </button>
                        <button
                          onClick={() => {
                            router.push(`/incidents/${incident.id}`);
                          }}
                          className="px-5 py-2 bg-secondary-container text-on-secondary-container font-semibold text-sm rounded-lg hover:bg-surface-bright transition-colors flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                          View Incident
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setSignalModalOpen(true)}
                        className="bg-tertiary-gradient px-5 py-2 rounded-lg text-white font-semibold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[16px]">cell_tower</span>
                        Report Signal
                      </button>
                    )}
                  </div>
                </div>

                {/* Field operation status mini-card */}
                <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-xl p-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                        Field Status
                      </span>
                      {incident && (
                        <span className="material-symbols-outlined text-tertiary text-[18px]">shield</span>
                      )}
                    </div>
                    {(incident ? [
                      { label: "Severity Level", pct: incident.severity * 20, warn: incident.severity >= 4 },
                      { label: "Signal Health", pct: data?.stats.signalHealthPct ?? 0 },
                      { label: "Active Signals", pct: Math.min(100, signalCards.length * 20) },
                    ] : [
                      { label: "Field Teams Active", pct: 0 },
                      { label: "Shelter Capacity", pct: 0 },
                      { label: "Comms Signal", pct: 0 },
                    ]).map((bar) => (
                      <div key={bar.label} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-on-surface-variant">{bar.label}</span>
                          <span className={`${'warn' in bar && bar.warn ? "text-error" : "text-on-surface"}`}>{bar.pct > 0 ? `${bar.pct}%` : "\u2014"}</span>
                        </div>
                        <div className="w-full bg-surface-container-high h-1 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${'warn' in bar && bar.warn ? "bg-error" : "bg-tertiary"}`}
                            style={{ width: `${bar.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 border-t border-outline-variant/15 mt-2">
                    <span className="text-[10px] text-on-surface-variant font-mono">
                      STATION: EOC ALPHA // OPS: {incident ? "ACTIVE" : "STANDBY"}
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
                  {["All Signals", "Field", "Social", "Camera", "Critical"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setSignalFilter(f)}
                      className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase transition-colors ${
                        signalFilter === f
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
                    <div className="col-span-full py-16 flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-3xl text-outline-variant">sensors_off</span>
                      </div>
                      <p className="text-sm font-semibold text-on-surface-variant mb-1">
                        No signals yet
                      </p>
                      <p className="text-xs text-on-surface-variant/70 max-w-[280px] mb-5">
                        Report a field signal or use the AI chat to ingest and analyze incoming intelligence.
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setSignalModalOpen(true)}
                          className="px-4 py-2 rounded-lg bg-tertiary-gradient text-white font-semibold text-xs tracking-wider uppercase hover:opacity-90 transition-opacity active:scale-95 flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[14px]">cell_tower</span>
                          Report Signal
                        </button>
                        <button
                          onClick={() => prefillChat("I have a field report to submit: ")}
                          className="px-4 py-2 rounded-lg bg-secondary-container text-on-secondary-container font-semibold text-xs hover:bg-surface-bright transition-colors flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[14px]">neurology</span>
                          Use AI Chat
                        </button>
                      </div>
                    </div>
                  ) : (
                    signalCards.map((card, i) => (
                      <article
                        key={card.id ?? i}
                        onClick={() => { if (card.incidentId) router.push(`/incidents/${card.incidentId}`); }}
                        className={`bg-surface-container-low border border-outline-variant/15 rounded-xl overflow-hidden group hover:border-outline-variant/30 transition-colors ${card.incidentId ? "cursor-pointer" : ""}`}
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
                        Confidence Score: {aiRec && aiRec.confidenceScore > 0 ? `${aiRec.confidenceScore}%` : "\u2014"}
                      </p>
                    </div>
                  </div>

                  {/* Content — show waiting state when no confidence */}
                  {(!aiRec || aiRec.confidenceScore === 0) ? (
                    <div className="py-8 flex flex-col items-center text-center">
                      <div className="w-14 h-14 rounded-full bg-surface-container-lowest flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-2xl text-outline-variant">psychology</span>
                      </div>
                      <p className="text-sm font-semibold text-on-surface-variant mb-1">Waiting for AI analysis</p>
                      <p className="text-xs text-on-surface-variant/70 max-w-[240px] mb-5">
                        Report signals or run triage to get strategic recommendations from the AI.
                      </p>
                      <button
                        onClick={() => {
                          if (incident) {
                            setChatOpen(true);
                            setChatInput(`Run triage analysis on incident "${incident.title}" (ID: ${incident.id}, type: ${incident.type}, severity: ${incident.severity}). Assess root cause, blast radius, affected population, and recommend immediate actions. Push your findings to the dashboard recommendation panel and set a response protocol.`);
                          } else {
                            prefillChat("Analyze the current situation and provide triage recommendations. Push your findings to the dashboard.");
                          }
                        }}
                        className="px-4 py-2 rounded-lg bg-secondary-container text-on-secondary-container font-semibold text-xs hover:bg-surface-bright transition-colors flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[14px]">neurology</span>
                        Run Triage
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Action sequence */}
                      <div className="space-y-5 mb-8">
                        <div className="p-5 bg-surface-container-lowest rounded-xl border-l-2 border-tertiary">
                          <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mb-2">
                            Action Sequence
                          </p>
                          <p className="text-on-surface text-base font-medium leading-snug">
                            {aiRec.actionSequence || "\u2014"}
                          </p>
                        </div>

                        {/* Stats */}
                        {(aiRec.stats ?? []).length > 0 && (
                          <div className="space-y-3">
                            {(aiRec.stats ?? []).map((stat) => (
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
                        onClick={async () => {
                          if (!incident) return;
                          try {
                            const res = await fetch("/api/dashboard/approve", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ incidentId: incident.id }),
                            });
                            const result = await res.json();
                            if (result.success) {
                              // Refresh dashboard to show updated status
                              refreshDashboard();
                            }
                          } catch {
                            console.error("[approve] failed");
                          }
                        }}
                        className="w-full py-3.5 rounded-xl bg-tertiary-gradient text-white font-bold text-sm tracking-widest uppercase shadow-lg shadow-tertiary/20 hover:opacity-90 transition-all flex items-center justify-center gap-3 active:scale-95 duration-100"
                        aria-label="Approve resource dispatch"
                      >
                        {aiRec.ctaLabel ?? "Approve Dispatch"}
                      </button>
                      <button
                        onClick={() => {
                          // Clear locally immediately
                          if (data) {
                            setData({
                              ...data,
                              aiRecommendation: { actionSequence: "", confidenceScore: 0, stats: [], ctaLabel: "Approve Dispatch" },
                            });
                          }
                          // Persist dismissal to Supabase so it doesn't come back on next poll
                          fetch("/api/dashboard/dismiss", { method: "POST" }).catch(() => {});
                        }}
                        className="w-full mt-3 py-2.5 rounded-xl bg-surface-container-highest text-on-surface-variant font-semibold text-xs tracking-widest uppercase hover:text-on-surface transition-colors"
                        aria-label="Dismiss recommendation and override manually"
                      >
                        Dismiss &amp; Manual Override
                      </button>
                    </>
                  )}
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
                      <div className="py-6 flex flex-col items-center text-center">
                        <span className="material-symbols-outlined text-xl text-outline-variant mb-2">history</span>
                        <p className="text-xs text-on-surface-variant">No activity yet</p>
                        <p className="text-[10px] text-on-surface-variant/50 mt-0.5">Actions and events will appear here in real time.</p>
                      </div>
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
                    {protocolSteps.length > 0 && (
                      <span className="text-[10px] text-tertiary font-mono">
                        {protocolSteps.filter((s) => s.done).length} / {protocolSteps.length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {protocolSteps.length === 0 ? (
                      <div className="py-6 flex flex-col items-center text-center">
                        <span className="material-symbols-outlined text-xl text-outline-variant mb-2">checklist</span>
                        <p className="text-xs text-on-surface-variant">No active protocol</p>
                        <p className="text-[10px] text-on-surface-variant/50 mt-0.5">Protocol steps will be set when an incident response plan is activated.</p>
                      </div>
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
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          </>)}

          {/* ── Photo Analysis tab ─────────────────────────────────── */}
          {activeTab === "photos" && (
            <div className="space-y-8">

              {/* Results (shown at top after analysis) */}
              {analysisResult && (
                <div className="bg-surface-container-high rounded-2xl p-7 border border-outline-variant/20 shadow-[0_0_32px_0_rgba(231,229,228,0.08)] space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-tertiary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-tertiary text-[18px]">analytics</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-on-surface">AI Photo Analysis Complete</p>
                      <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">
                        Confidence: {Math.round(analysisResult.analysis.confidence * 100)}%
                      </p>
                    </div>
                    <div className="ml-auto">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white ${SEVERITY_COLORS[analysisResult.analysis.severity] ?? "bg-gray-500"}`}>
                        SEV {analysisResult.analysis.severity}
                      </span>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="p-5 bg-surface-container-lowest rounded-xl border-l-2 border-tertiary">
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mb-2">Summary</p>
                    <p className="text-on-surface text-sm leading-relaxed">{analysisResult.analysis.summary}</p>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Hazards */}
                    {analysisResult.analysis.hazards.length > 0 && (
                      <div className="bg-surface-container-lowest rounded-xl p-4 space-y-2">
                        <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">Hazards Detected</p>
                        <ul className="space-y-1">
                          {analysisResult.analysis.hazards.map((h, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-on-surface">
                              <span className="material-symbols-outlined text-error text-[14px] mt-0.5">warning</span>
                              {h}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Structural Integrity */}
                    <div className="bg-surface-container-lowest rounded-xl p-4 space-y-2">
                      <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">Structural Integrity</p>
                      <p className="text-sm text-on-surface font-medium capitalize">
                        {analysisResult.analysis.structuralIntegrity.replace(/_/g, " ")}
                      </p>
                    </div>

                    {/* Detected Objects */}
                    {analysisResult.analysis.detectedObjects.length > 0 && (
                      <div className="bg-surface-container-lowest rounded-xl p-4 space-y-2">
                        <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">Detected Objects</p>
                        <div className="flex flex-wrap gap-1.5">
                          {analysisResult.analysis.detectedObjects.map((obj, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-full bg-tertiary/10 text-tertiary text-[10px] font-semibold">
                              {obj}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Damage Category */}
                    <div className="bg-surface-container-lowest rounded-xl p-4 space-y-2">
                      <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">Damage Category</p>
                      <p className="text-sm text-on-surface font-medium capitalize">
                        {analysisResult.analysis.damageCategory.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>

                  {/* Recommended Actions */}
                  {analysisResult.analysis.recommendedActions.length > 0 && (
                    <div className="bg-surface-container-lowest rounded-xl p-4 space-y-2">
                      <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">Recommended Actions</p>
                      <ul className="space-y-1.5">
                        {analysisResult.analysis.recommendedActions.map((a, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-on-surface">
                            <span className="material-symbols-outlined text-tertiary text-[14px] mt-0.5">chevron_right</span>
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Footer actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-outline-variant/15">
                    <span className="text-[10px] text-on-surface-variant font-mono">
                      Incident ID: {analysisResult.incidentId.slice(0, 8)}…
                    </span>
                    <button
                      onClick={() => router.push(`/incidents/${analysisResult.incidentId}`)}
                      className="px-4 py-2 bg-secondary-container text-on-secondary-container font-semibold text-xs rounded-lg hover:bg-surface-bright transition-colors flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                      View Incident
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* LEFT — Incident selector + upload ────────────────── */}
                <div className="lg:col-span-7 space-y-6">

                  {/* Incident Selector */}
                  <div className="bg-surface-container-low border border-outline-variant/15 rounded-xl p-6 space-y-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-full bg-tertiary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-tertiary text-[18px]">description</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-on-surface">Select Incident</p>
                        <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">Link photos to incident</p>
                      </div>
                    </div>

                    {/* Toggle: existing vs create */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCreateMode(false)}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                          !createMode
                            ? "bg-tertiary/15 text-tertiary"
                            : "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-bright"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">list</span>
                        Existing Incident
                      </button>
                      <button
                        onClick={() => setCreateMode(true)}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                          createMode
                            ? "bg-tertiary/15 text-tertiary"
                            : "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-bright"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">add_circle</span>
                        Create New
                      </button>
                    </div>

                    {!createMode ? (
                      /* Existing incident dropdown */
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Incident</label>
                        <select
                          value={selectedIncidentId}
                          onChange={(e) => setSelectedIncidentId(e.target.value)}
                          className="w-full bg-surface-container-lowest border border-outline-variant/15 focus:border-tertiary rounded-lg px-4 py-3 text-sm text-on-surface outline-none transition-colors appearance-none"
                        >
                          <option value="">Select an incident…</option>
                          {incidents.map((inc) => (
                            <option key={inc.id} value={inc.id}>
                              [{inc.type.toUpperCase()}] {inc.title} — SEV {inc.severity}
                            </option>
                          ))}
                        </select>
                        {incidents.length === 0 && (
                          <p className="text-[10px] text-on-surface-variant">No incidents found. Create a new one instead.</p>
                        )}
                      </div>
                    ) : (
                      /* Create new incident form */
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Title *</label>
                          <input
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="Incident title…"
                            className="w-full bg-surface-container-lowest border border-outline-variant/15 focus:border-tertiary rounded-lg px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none transition-colors"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Type</label>
                            <select
                              value={newType}
                              onChange={(e) => setNewType(e.target.value)}
                              className="w-full bg-surface-container-lowest border border-outline-variant/15 focus:border-tertiary rounded-lg px-4 py-3 text-sm text-on-surface outline-none transition-colors appearance-none capitalize"
                            >
                              {INCIDENT_TYPES.map((t) => (
                                <option key={t} value={t} className="capitalize">{t}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Severity</label>
                            <div className="flex gap-1.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <button
                                  key={s}
                                  onClick={() => setNewSeverity(s)}
                                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                                    newSeverity === s
                                      ? `${SEVERITY_COLORS[s]} text-white`
                                      : "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-bright"
                                  }`}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Location (optional)</label>
                          <input
                            value={newLocation}
                            onChange={(e) => setNewLocation(e.target.value)}
                            placeholder="e.g. Downtown sector B"
                            className="w-full bg-surface-container-lowest border border-outline-variant/15 focus:border-tertiary rounded-lg px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none transition-colors"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Description (optional)</label>
                          <textarea
                            value={newDescription}
                            onChange={(e) => setNewDescription(e.target.value)}
                            placeholder="Brief incident description…"
                            rows={3}
                            className="w-full bg-surface-container-lowest border border-outline-variant/15 focus:border-tertiary rounded-lg px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none transition-colors resize-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Image Upload Area */}
                  <div className="bg-surface-container-low border border-outline-variant/15 rounded-xl p-6 space-y-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-full bg-tertiary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-tertiary text-[18px]">photo_camera</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-on-surface">Upload Images</p>
                        <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">Max 5 images — JPEG, PNG, WebP</p>
                      </div>
                    </div>

                    {/* Drop zone */}
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFilesSelected(e.dataTransfer.files); }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                        dragging
                          ? "border-tertiary bg-tertiary/5"
                          : "border-outline-variant/30 hover:border-outline-variant/50"
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFilesSelected(e.target.files)}
                      />
                      <span className="material-symbols-outlined text-3xl text-on-surface-variant mb-3">cloud_upload</span>
                      <p className="text-sm font-semibold text-on-surface mb-1">
                        {dragging ? "Drop images here" : "Drag & drop or click to upload"}
                      </p>
                      <p className="text-[10px] text-on-surface-variant">
                        {uploadedFiles.length}/5 images selected
                      </p>
                    </div>

                    {/* Thumbnails */}
                    {uploadedFiles.length > 0 && (
                      <div className="grid grid-cols-5 gap-3">
                        {uploadedFiles.map((file, i) => (
                          <div key={`${file.name}-${i}`} className="relative group aspect-square rounded-lg overflow-hidden bg-surface-container-highest">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRemoveFile(i); }}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              aria-label={`Remove ${file.name}`}
                            >
                              <span className="material-symbols-outlined text-[12px]">close</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Error */}
                  {analysisError && (
                    <div className="p-4 rounded-xl bg-error/10 flex items-center gap-2">
                      <span className="material-symbols-outlined text-error text-[16px]">error</span>
                      <span className="text-xs text-error">{analysisError}</span>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    onClick={handleAnalyzeSubmit}
                    disabled={!canSubmitPhotos || analyzing}
                    className="w-full py-3.5 rounded-xl bg-tertiary-gradient text-white font-bold text-sm tracking-widest uppercase disabled:opacity-30 transition-opacity active:scale-95 flex items-center justify-center gap-2"
                  >
                    {analyzing ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Analyzing…
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                        Analyze Images
                      </>
                    )}
                  </button>
                </div>

                {/* RIGHT — Instructions / tips ─────────────────────── */}
                <div className="lg:col-span-5">
                  <div className="lg:sticky lg:top-20 space-y-5">
                    <div className="bg-surface-container-high rounded-2xl p-7 border border-outline-variant/20 shadow-[0_0_32px_0_rgba(231,229,228,0.08)]">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-full bg-tertiary/10 flex items-center justify-center">
                          <span className="text-tertiary text-xs font-bold">AI</span>
                        </div>
                        <div>
                          <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-[0.2rem]">
                            Photo Intelligence
                          </p>
                          <p className="text-tertiary text-sm font-medium">AI-Powered Analysis</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {[
                          { icon: "upload_file", title: "Upload Photos", desc: "Upload up to 5 incident photos for AI analysis. Supports JPEG, PNG, and WebP formats." },
                          { icon: "link", title: "Link to Incident", desc: "Associate photos with an existing incident or create a new one for tracking." },
                          { icon: "auto_awesome", title: "AI Analysis", desc: "Our AI identifies hazards, assesses structural integrity, and recommends response actions." },
                          { icon: "assessment", title: "Actionable Results", desc: "Get severity ratings, detected objects, and prioritized action items from each photo set." },
                        ].map((tip) => (
                          <div key={tip.title} className="flex gap-3">
                            <div className="w-8 h-8 rounded-lg bg-surface-container-lowest flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-tertiary text-[16px]">{tip.icon}</span>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-on-surface">{tip.title}</p>
                              <p className="text-[10px] text-on-surface-variant leading-relaxed mt-0.5">{tip.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

        </main>
      </div>

      {/* ── Signal Ingestion Modal ─────────────────────────────────────── */}
      <SignalIngestModal
        open={signalModalOpen}
        onClose={() => setSignalModalOpen(false)}
        onSuccess={refreshDashboard}
      />

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
                  {chatStatus === "submitted" ? "Connecting…" : chatStatus === "streaming" ? "Analyzing…" : "Ready"}
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
                      const toolPart = part as { type: string; toolCallId: string; state: string; toolName?: string };
                      const toolLabel = toolPart.toolName ?? part.type.replace("tool-", "");
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

            {(chatStatus === "submitted" || chatStatus === "streaming") && (
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

          {/* Quick-action buttons */}
          <div className="flex gap-2 px-4 py-2 border-t border-outline-variant/10 shrink-0 overflow-x-auto scrollbar-thin">
            <button
              onClick={() => setChatInput("I have a field signal to report: ")}
              disabled={chatStatus !== "ready"}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-lowest text-[10px] font-semibold text-on-surface-variant hover:bg-surface-bright hover:text-on-surface transition-colors disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-[12px]">cell_tower</span>
              Report field signal
            </button>
            <button
              onClick={() => {
                if (incident) {
                  setChatInput(`Run triage on incident "${incident.title}" (ID: ${incident.id}, type: ${incident.type}, severity: ${incident.severity}). Use pushRecommendation and setResponseProtocol to update the dashboard.`);
                } else {
                  setChatInput("Run triage analysis on the current situation. Push findings to the dashboard.");
                }
              }}
              disabled={chatStatus !== "ready"}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-lowest text-[10px] font-semibold text-on-surface-variant hover:bg-surface-bright hover:text-on-surface transition-colors disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-[12px]">troubleshoot</span>
              Run triage
            </button>
            <button
              onClick={() => { setChatInput("Check shelter capacity near the affected area"); }}
              disabled={chatStatus !== "ready"}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-lowest text-[10px] font-semibold text-on-surface-variant hover:bg-surface-bright hover:text-on-surface transition-colors disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-[12px]">night_shelter</span>
              Check shelters
            </button>
          </div>

          {/* Chat input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!chatInput.trim() || chatStatus !== "ready") return;
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
              disabled={chatStatus !== "ready"}
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || chatStatus !== "ready"}
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
