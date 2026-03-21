/**
 * Canary — In-memory data store (MVP)
 *
 * Singleton arrays that serve as the in-memory database for the MVP.
 * Includes mutation functions for AI agents to push live data.
 *
 * In production, replace these exports with database queries.
 */

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

export interface DashboardStats {
  activeIncidents: number;
  incidentDelta: string;       // e.g. "+2/hr"
  resourceRequests: number;
  resourceStatus: string;      // e.g. "Pending"
  deploymentEtaMinutes: number;
  signalHealthPct: number;
}

export interface SignalCard {
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

export interface ActivityEntry {
  id: string;
  actor: string;
  action: string;
  time: string;
}

export interface ProtocolStep {
  id: string;
  step: string;
  done: boolean;
  active?: boolean;
}

export interface AIRecommendation {
  actionSequence: string;
  confidenceScore: number;
  stats: { label: string; value: string }[];
  ctaLabel: string;
}

export interface DashboardData {
  stats: DashboardStats;
  signals: SignalCard[];
  activity: ActivityEntry[];
  protocolSteps: ProtocolStep[];
  aiRecommendation: AIRecommendation;
}

// ---------------------------------------------------------------------------
// Live data — mutable state (populated by AI agents at runtime)
// ---------------------------------------------------------------------------

export const stats: DashboardStats = {
  activeIncidents: 0,
  incidentDelta: '',
  resourceRequests: 0,
  resourceStatus: '',
  deploymentEtaMinutes: 0,
  signalHealthPct: 0,
};

export const signals: SignalCard[] = [];

export const activity: ActivityEntry[] = [];

export const protocolSteps: ProtocolStep[] = [];

export const aiRecommendation: AIRecommendation = {
  actionSequence: '',
  confidenceScore: 0,
  stats: [],
  ctaLabel: 'Approve Dispatch',
};

// ---------------------------------------------------------------------------
// Mutation functions — called by AI agent routes
// ---------------------------------------------------------------------------

let signalCounter = 0;
let activityCounter = 0;
let stepCounter = 0;

export function updateStats(partial: Partial<DashboardStats>) {
  Object.assign(stats, partial);
}

export function addSignal(card: Omit<SignalCard, 'id'>): SignalCard {
  const id = `sig-${String(++signalCounter).padStart(3, '0')}`;
  const entry = { id, ...card };
  // Prepend (newest first), cap at 20
  signals.unshift(entry);
  if (signals.length > 20) signals.pop();
  return entry;
}

export function addActivity(actor: string, action: string): ActivityEntry {
  const id = `act-${String(++activityCounter).padStart(3, '0')}`;
  const entry: ActivityEntry = { id, actor, action, time: '0m' };
  activity.unshift(entry);
  if (activity.length > 50) activity.pop();
  return entry;
}

export function setProtocolSteps(steps: Omit<ProtocolStep, 'id'>[]) {
  protocolSteps.length = 0;
  stepCounter = 0;
  for (const s of steps) {
    protocolSteps.push({
      id: `step-${String(++stepCounter).padStart(3, '0')}`,
      ...s,
    });
  }
}

export function advanceProtocol(stepId: string) {
  for (const s of protocolSteps) {
    if (s.id === stepId) {
      s.done = true;
      s.active = false;
    }
  }
  // Activate next pending step
  const next = protocolSteps.find((s) => !s.done);
  if (next) next.active = true;
}

export function updateRecommendation(rec: Partial<AIRecommendation>) {
  Object.assign(aiRecommendation, rec);
}

// ---------------------------------------------------------------------------
// Aggregate getter
// ---------------------------------------------------------------------------

export function getDashboardData(): DashboardData {
  return {
    stats,
    signals,
    activity,
    protocolSteps,
    aiRecommendation,
  };
}
