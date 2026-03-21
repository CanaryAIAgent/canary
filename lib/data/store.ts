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

// ---------------------------------------------------------------------------
// Sync from Supabase — hydrate dashboard state from real DB data
// ---------------------------------------------------------------------------

export async function syncDashboardFromDb(): Promise<DashboardData> {
  // Dynamic import to avoid pulling Supabase into every module that imports store
  const { dbListIncidents, dbListSocialSignals, dbListCameraAlerts, dbListAgentLogs } =
    await import('@/lib/db');

  try {
    const activeStatuses = ['new', 'triaging', 'responding', 'escalated'];

    // Run queries in parallel
    const [activeIncidents, recentSignals, recentAlerts, recentLogs] = await Promise.all([
      dbListIncidents({ status: activeStatuses, limit: 100 }),
      dbListSocialSignals({ limit: 10 }),
      dbListCameraAlerts({ limit: 10 }),
      dbListAgentLogs({ limit: 20 }),
    ]);

    // Update stats
    updateStats({
      activeIncidents: activeIncidents.length,
      incidentDelta: `${activeIncidents.length} active`,
      signalHealthPct: recentSignals.length > 0 ? 100 : 0,
    });

    // Build signal cards from social signals + camera alerts
    signals.length = 0;
    signalCounter = 0;

    for (const sig of recentSignals) {
      const credMap: Record<string, number> = { high: 95, medium: 70, unverified: 40, disputed: 15 };
      const colorMap: Record<string, string> = { high: 'green', medium: 'yellow', unverified: 'gray', disputed: 'red' };
      signals.push({
        id: `sig-${String(++signalCounter).padStart(3, '0')}`,
        tag: sig.platform.toUpperCase(),
        tagColor: 'blue',
        title: sig.aiSummary ?? sig.text.slice(0, 80),
        desc: sig.text,
        source: `@${sig.handle}`,
        credibility: credMap[sig.credibility] ?? 50,
        credibilityColor: colorMap[sig.credibility] ?? 'gray',
        time: timeSince(sig.ingestedAt),
        icon: 'signal',
      });
    }

    for (const alert of recentAlerts) {
      signals.push({
        id: `sig-${String(++signalCounter).padStart(3, '0')}`,
        tag: 'CAMERA',
        tagColor: 'red',
        title: alert.detectedEvent,
        desc: alert.aiAnalysis ?? alert.detectedEvent,
        source: alert.cameraName,
        credibility: Math.round(alert.confidence * 100),
        credibilityColor: alert.confidence >= 0.8 ? 'green' : alert.confidence >= 0.5 ? 'yellow' : 'red',
        time: timeSince(alert.createdAt),
        icon: 'camera',
      });
    }

    // Build activity from agent logs
    activity.length = 0;
    activityCounter = 0;

    for (const log of recentLogs) {
      activity.push({
        id: `act-${String(++activityCounter).padStart(3, '0')}`,
        actor: log.agentType,
        action: log.decisionRationale.slice(0, 120),
        time: timeSince(log.timestamp),
      });
    }

    // Build protocol steps from the latest active incident's runbook steps
    if (activeIncidents.length > 0) {
      try {
        const { dbGetRunbook } = await import('@/lib/db');
        const latestIncident = activeIncidents[0];
        const runbook = await dbGetRunbook({ incidentType: latestIncident.type });
        if (runbook && runbook.steps.length > 0) {
          const steps = runbook.steps.map((s) => ({
            step: s.title,
            done: s.status === 'completed',
            active: s.status === 'running',
          }));
          setProtocolSteps(steps);
        }
      } catch {
        // Runbook fetch failed — keep existing protocol steps
      }
    }
  } catch (err) {
    console.error('[syncDashboardFromDb] Error syncing from DB, using in-memory fallback:', err);
  }

  return getDashboardData();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeSince(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  return `${Math.floor(diffHr / 24)}d`;
}
