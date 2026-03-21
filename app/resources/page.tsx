"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────────────────────

interface ResourceRequest {
  id: string;
  incidentId: string | null;
  resourceType: string;
  quantity: number;
  priority: "immediate" | "urgent" | "standard";
  description: string | null;
  status: string;
  requestedBy: string;
  approvedBy: string | null;
  deniedReason: string | null;
  approvedAt: string | null;
  dispatchedAt: string | null;
  fulfilledAt: string | null;
  createdAt: string;
  updatedAt: string;
  incidentTitle?: string;
}

interface Incident {
  id: string;
  title: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const priorityColors: Record<string, string> = {
  immediate: "bg-red-500/15 text-red-400 border border-red-500/20",
  urgent: "bg-orange-500/15 text-orange-400 border border-orange-500/20",
  standard: "bg-blue-500/15 text-blue-400 border border-blue-500/20",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20",
  approved: "bg-green-500/15 text-green-400 border border-green-500/20",
  denied: "bg-red-500/15 text-red-400 border border-red-500/20",
  dispatched: "bg-blue-500/15 text-blue-400 border border-blue-500/20",
  fulfilled: "bg-neutral-500/15 text-neutral-400 border border-neutral-500/20",
  cancelled: "bg-neutral-500/15 text-neutral-400 border border-neutral-500/20",
};

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ResourcesPage() {
  const [requests, setRequests] = useState<ResourceRequest[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [formType, setFormType] = useState("");
  const [formQuantity, setFormQuantity] = useState(1);
  const [formPriority, setFormPriority] = useState<"immediate" | "urgent" | "standard">("standard");
  const [formIncident, setFormIncident] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Deny modal
  const [denyTarget, setDenyTarget] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState("");

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchRequests = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      const qs = params.toString();
      const res = await fetch(`/api/resources${qs ? `?${qs}` : ""}`);
      if (res.ok) {
        const json = await res.json();
        setRequests(json.data ?? []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter]);

  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch("/api/incidents");
      if (res.ok) {
        const json = await res.json();
        setIncidents(json.data ?? []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    fetchIncidents();
  }, [fetchRequests, fetchIncidents]);

  // Polling every 15s
  useEffect(() => {
    const id = setInterval(fetchRequests, 15_000);
    return () => clearInterval(id);
  }, [fetchRequests]);

  // ── Actions ──────────────────────────────────────────────────────────────

  async function doAction(requestId: string, action: string, body?: object) {
    setActionLoading(requestId);
    try {
      await fetch(`/api/resources/${requestId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      await fetchRequests();
    } catch {
      /* ignore */
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formType.trim()) return;
    setFormSubmitting(true);
    try {
      await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceType: formType.trim(),
          quantity: formQuantity,
          priority: formPriority,
          incidentId: formIncident || null,
          description: formDescription.trim() || null,
        }),
      });
      setFormType("");
      setFormQuantity(1);
      setFormPriority("standard");
      setFormIncident("");
      setFormDescription("");
      setShowCreate(false);
      await fetchRequests();
    } catch {
      /* ignore */
    } finally {
      setFormSubmitting(false);
    }
  }

  function handleDenyConfirm() {
    if (!denyTarget) return;
    doAction(denyTarget, "deny", { reason: denyReason.trim() || "Denied" });
    setDenyTarget(null);
    setDenyReason("");
  }

  // ── Filter state ─────────────────────────────────────────────────────────

  const statusOptions = ["all", "pending", "approved", "dispatched", "fulfilled", "denied"];
  const priorityOptions = [
    { value: "all", label: "All Priorities" },
    { value: "immediate", label: "Immediate" },
    { value: "urgent", label: "Urgent" },
    { value: "standard", label: "Standard" },
  ];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-dvh bg-background text-on-background">

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 z-50 flex-col py-4 w-14 bg-surface-container-low border-r border-outline-variant/15 group hover:w-72 transition-all duration-300 ease-in-out overflow-hidden"
        aria-label="Primary navigation"
      >
        {/* Logo */}
        <div className="flex items-center gap-4 px-4 mb-8 overflow-hidden">
          <div className="min-w-[24px] flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/canary-logo.svg" alt="Canary" className="w-6 h-6" />
          </div>
          <span className="font-bold uppercase tracking-widest text-xs text-on-surface whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            Canary
          </span>
        </div>

        {/* Nav links */}
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
            className="flex items-center gap-4 px-2 py-2.5 rounded-lg bg-surface-container-high text-tertiary"
            aria-label="Resources"
            aria-current="page"
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

        {/* Top bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between gap-4 px-6 py-4 bg-surface-container-low/80 backdrop-blur-md border-b border-outline-variant/15">
          <h1 className="font-bold text-base tracking-tighter text-on-surface">Resource Requests</h1>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── Header area ────────────────────────────────────────── */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl font-bold text-on-surface mb-1">Resource Requests</h2>
              <p className="text-sm text-on-surface-variant">Manage and approve resource deployment requests</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-tertiary-gradient text-on-tertiary text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              New Request
            </button>
          </div>

          {/* ── Create form (modal overlay) ────────────────────────── */}
          {showCreate && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <form
                onSubmit={handleCreate}
                className="w-full max-w-lg bg-surface-container-low border border-outline-variant/15 rounded-2xl p-6 space-y-5 shadow-2xl"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-on-surface">New Resource Request</h3>
                  <button type="button" onClick={() => setShowCreate(false)} className="text-on-surface-variant hover:text-on-surface">
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>

                {/* Resource Type */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-1.5">Resource Type</label>
                  <input
                    type="text"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    placeholder="e.g. Water Tanker, Medical Kit, Generator"
                    className="w-full bg-surface-container-lowest border border-outline-variant/15 focus:border-tertiary rounded-lg px-4 py-3 text-sm text-on-surface outline-none transition-colors"
                    required
                  />
                </div>

                {/* Quantity */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-1.5">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(Number(e.target.value) || 1)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/15 focus:border-tertiary rounded-lg px-4 py-3 text-sm text-on-surface outline-none transition-colors"
                  />
                </div>

                {/* Priority selector */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-1.5">Priority</label>
                  <div className="flex gap-2">
                    {(["standard", "urgent", "immediate"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setFormPriority(p)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                          formPriority === p
                            ? p === "immediate"
                              ? "bg-red-500/20 text-red-400 border border-red-500/30"
                              : p === "urgent"
                                ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                                : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            : "bg-surface-container-lowest border border-outline-variant/15 text-on-surface-variant hover:bg-surface-container-high"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Incident */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-1.5">Linked Incident</label>
                  <select
                    value={formIncident}
                    onChange={(e) => setFormIncident(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/15 focus:border-tertiary rounded-lg px-4 py-3 text-sm text-on-surface outline-none transition-colors"
                  >
                    <option value="">None</option>
                    {incidents.map((inc) => (
                      <option key={inc.id} value={inc.id}>
                        {inc.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-1.5">Description (optional)</label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={3}
                    placeholder="Additional details about this request..."
                    className="w-full bg-surface-container-lowest border border-outline-variant/15 focus:border-tertiary rounded-lg px-4 py-3 text-sm text-on-surface outline-none transition-colors resize-none"
                  />
                </div>

                {/* Submit */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="px-4 py-2.5 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container-high transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="px-5 py-2.5 rounded-lg bg-tertiary-gradient text-on-tertiary text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {formSubmitting ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── Deny reason modal ──────────────────────────────────── */}
          {denyTarget && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="w-full max-w-md bg-surface-container-low border border-outline-variant/15 rounded-2xl p-6 space-y-4 shadow-2xl">
                <h3 className="text-lg font-bold text-on-surface">Deny Request</h3>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-1.5">Reason</label>
                  <textarea
                    value={denyReason}
                    onChange={(e) => setDenyReason(e.target.value)}
                    rows={3}
                    placeholder="Reason for denial..."
                    className="w-full bg-surface-container-lowest border border-outline-variant/15 focus:border-tertiary rounded-lg px-4 py-3 text-sm text-on-surface outline-none transition-colors resize-none"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setDenyTarget(null); setDenyReason(""); }}
                    className="px-4 py-2.5 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container-high transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDenyConfirm}
                    className="px-5 py-2.5 rounded-lg bg-red-500/20 text-red-400 text-sm font-semibold hover:bg-red-500/30 transition-colors"
                  >
                    Deny Request
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Filter bar ─────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Status pills */}
            <div className="flex gap-1 bg-surface-container-low rounded-lg p-1 border border-outline-variant/15">
              {statusOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                    statusFilter === s
                      ? "bg-tertiary/10 text-tertiary"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {s === "all" ? "All" : s}
                </button>
              ))}
            </div>

            {/* Priority dropdown */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant/15 focus:border-tertiary rounded-lg px-4 py-2 text-sm text-on-surface outline-none transition-colors"
            >
              {priorityOptions.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* ── Request cards ──────────────────────────────────────── */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-tertiary/30 border-t-tertiary rounded-full animate-spin" />
              <span className="ml-3 text-sm text-on-surface-variant">Loading requests...</span>
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 mb-3">inventory_2</span>
              <p className="text-on-surface-variant text-sm">No resource requests found</p>
              <p className="text-on-surface-variant/60 text-xs mt-1">Create a new request to get started</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="bg-surface-container-low border border-outline-variant/15 rounded-xl p-5 space-y-3"
                >
                  {/* Top row: badges + meta */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${priorityColors[req.priority] ?? priorityColors.standard}`}>
                        {req.priority}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColors[req.status] ?? statusColors.pending}`}>
                        {req.status}
                      </span>
                    </div>
                    <span className="text-[10px] text-on-surface-variant">{formatTime(req.createdAt)}</span>
                  </div>

                  {/* Resource info */}
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-on-surface font-semibold">{req.resourceType}</span>
                      <span className="text-on-surface-variant text-sm">x{req.quantity}</span>
                    </div>
                    {req.description && (
                      <p className="text-sm text-on-surface-variant mt-1">{req.description}</p>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-on-surface-variant">
                    <span>Requested by: <span className="text-on-surface">{req.requestedBy}</span></span>
                    {req.incidentTitle && req.incidentId && (
                      <span>
                        Incident:{" "}
                        <Link href={`/incidents/${req.incidentId}`} className="text-tertiary hover:underline">
                          {req.incidentTitle}
                        </Link>
                      </span>
                    )}
                    {req.approvedAt && <span>Approved: {formatTime(req.approvedAt)}</span>}
                    {req.dispatchedAt && <span>Dispatched: {formatTime(req.dispatchedAt)}</span>}
                    {req.fulfilledAt && <span>Fulfilled: {formatTime(req.fulfilledAt)}</span>}
                    {req.deniedReason && <span>Denied: {req.deniedReason}</span>}
                  </div>

                  {/* Action buttons */}
                  {req.status === "pending" && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => doAction(req.id, "approve")}
                        disabled={actionLoading === req.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400 text-xs font-semibold hover:bg-green-500/25 transition-colors disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[16px]">check</span>
                        Approve
                      </button>
                      <button
                        onClick={() => setDenyTarget(req.id)}
                        disabled={actionLoading === req.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs font-semibold hover:bg-red-500/25 transition-colors disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                        Deny
                      </button>
                    </div>
                  )}
                  {req.status === "approved" && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => doAction(req.id, "dispatch")}
                        disabled={actionLoading === req.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-400 text-xs font-semibold hover:bg-blue-500/25 transition-colors disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                        Dispatch
                      </button>
                    </div>
                  )}
                  {req.status === "dispatched" && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => doAction(req.id, "fulfill")}
                        disabled={actionLoading === req.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-500/15 text-neutral-300 text-xs font-semibold hover:bg-neutral-500/25 transition-colors disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[16px]">task_alt</span>
                        Mark Fulfilled
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
