/**
 * Canary — In-memory data store (MVP)
 *
 * Singleton arrays that serve as the in-memory database for the MVP.
 * Seeded with realistic EOC data matching the Hurricane Helene scenario.
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
// Seed data — Hurricane Helene scenario
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
