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
  incidentId?: string;
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

export interface ActiveIncident {
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

export interface DashboardData {
  stats: DashboardStats;
  activeIncident: ActiveIncident | null;
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

export let activeIncident: ActiveIncident | null = null;

export const aiRecommendation: AIRecommendation = {
  actionSequence: '',
  confidenceScore: 0,
  stats: [],
  ctaLabel: 'Approve Dispatch',
};

export function setActiveIncident(incident: ActiveIncident | null) {
  activeIncident = incident;
}

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
    activeIncident,
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
  const { dbListIncidents, dbListSocialSignals, dbListCameraAlerts, dbListAgentLogs } =
    await import('@/lib/db');

  try {
    const activeStatuses = ['new', 'triaging', 'responding', 'escalated'];

    const [activeIncidents, recentSignals, recentAlerts, recentLogs] = await Promise.all([
      dbListIncidents({ status: activeStatuses, limit: 100 }),
      dbListSocialSignals({ limit: 10 }),
      dbListCameraAlerts({ limit: 10 }),
      dbListAgentLogs({ limit: 20 }),
    ]);

    const hasDbData =
      activeIncidents.length > 0 ||
      recentSignals.length > 0 ||
      recentAlerts.length > 0 ||
      recentLogs.length > 0;

    // Only overwrite in-memory state if Supabase actually has data.
    // Otherwise keep whatever is in memory (from signal ingest, chat tools, etc.)
    if (!hasDbData) {
      return getDashboardData();
    }

    // Stats from DB — incidents are the source of truth
    updateStats({
      activeIncidents: activeIncidents.length,
      incidentDelta: activeIncidents.length > 0
        ? `+${activeIncidents.length} active`
        : '',
      signalHealthPct: activeIncidents.length > 0 || recentSignals.length > 0 ? 98 : 0,
    });

    // Set the primary active incident — prefer one with AI analysis, else highest severity
    if (activeIncidents.length > 0) {
      const withAnalysis = activeIncidents.find((i) => i.aiAnalysis != null);
      const bySeverity = [...activeIncidents].sort((a, b) => b.severity - a.severity);
      const top = withAnalysis ?? bySeverity[0];

      setActiveIncident({
        id: top.id,
        title: top.title,
        description: top.description ?? `${top.type} incident — severity ${top.severity}`,
        type: top.type,
        severity: top.severity,
        status: top.status,
        location: top.location?.description ?? top.location?.address ?? '',
        sources: top.sources ?? [],
        createdAt: top.createdAt,
      });

      // Reconstruct recommendation and protocol from ai_analysis JSONB
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const analysis = top.aiAnalysis as any;
      if (analysis?.recommendation) {
        const rec = analysis.recommendation;
        updateRecommendation({
          actionSequence: rec.actionSequence ?? '',
          confidenceScore: rec.confidenceScore ?? 0,
          stats: rec.stats ?? [],
          ctaLabel: rec.ctaLabel ?? 'Approve Dispatch',
        });
      }
      if (analysis?.protocolSteps && Array.isArray(analysis.protocolSteps)) {
        setProtocolSteps(analysis.protocolSteps);
      }
    }

    // Build signal cards from ALL DB sources: incidents, social signals, camera alerts
    const dbSignals: SignalCard[] = [];
    let dbSigCount = 0;

    const incidentIconMap: Record<string, string> = {
      flood: 'water', fire: 'local_fire_department', structural: 'apartment',
      medical: 'emergency', hazmat: 'skull', earthquake: 'landslide',
      infrastructure: 'construction', cyber: 'security', other: 'sensors',
    };

    // Incidents → signal cards (primary source of dashboard signals)
    for (const inc of activeIncidents) {
      const sources = (inc.sources ?? []).join('/').toUpperCase() || 'SYSTEM';
      const tagPrefix = inc.severity >= 4 ? 'CRITICAL' : inc.severity >= 3 ? 'ALERT' : 'MONITOR';
      dbSignals.push({
        id: `db-inc-${String(++dbSigCount).padStart(3, '0')}`,
        tag: `${tagPrefix} // ${sources}`,
        tagColor: inc.severity >= 4 ? 'text-error' : inc.severity >= 3 ? 'text-tertiary' : 'text-on-surface-variant',
        title: inc.title,
        desc: inc.description ?? `${inc.type} incident — severity ${inc.severity}`,
        source: sources,
        credibility: inc.severity >= 4 ? 95 : inc.severity >= 3 ? 80 : 60,
        credibilityColor: inc.severity >= 4 ? 'bg-tertiary' : inc.severity >= 3 ? 'bg-tertiary' : 'bg-warning',
        time: timeSince(inc.createdAt),
        icon: incidentIconMap[inc.type] ?? 'sensors',
        incidentId: inc.id,
      });
    }

    // Social signals → signal cards
    for (const sig of recentSignals) {
      const credMap: Record<string, number> = { high: 95, medium: 70, unverified: 40, disputed: 15 };
      dbSignals.push({
        id: `db-sig-${String(++dbSigCount).padStart(3, '0')}`,
        tag: `${sig.credibility.toUpperCase()} // ${sig.platform.toUpperCase()}`,
        tagColor: sig.credibility === 'high' ? 'text-tertiary' : sig.credibility === 'disputed' ? 'text-error' : 'text-on-surface-variant',
        title: sig.aiSummary ?? sig.text.slice(0, 80),
        desc: sig.text,
        source: `@${sig.handle}`,
        credibility: credMap[sig.credibility] ?? 50,
        credibilityColor: (credMap[sig.credibility] ?? 50) >= 80 ? 'bg-tertiary' : (credMap[sig.credibility] ?? 50) >= 50 ? 'bg-warning' : 'bg-error',
        time: timeSince(sig.ingestedAt),
        icon: 'person_search',
      });
    }

    // Camera alerts → signal cards
    for (const alert of recentAlerts) {
      dbSignals.push({
        id: `db-sig-${String(++dbSigCount).padStart(3, '0')}`,
        tag: `LIVE // CAMERA`,
        tagColor: alert.severity >= 4 ? 'text-error' : 'text-tertiary',
        title: alert.detectedEvent,
        desc: alert.aiAnalysis ?? alert.detectedEvent,
        source: alert.cameraName,
        credibility: Math.round(alert.confidence * 100),
        credibilityColor: alert.confidence >= 0.8 ? 'bg-tertiary' : alert.confidence >= 0.5 ? 'bg-warning' : 'bg-error',
        time: timeSince(alert.createdAt),
        icon: 'videocam',
      });
    }

    // Replace signals with DB data (DB is the source of truth for persisted state)
    if (dbSignals.length > 0) {
      const existingTitles = new Set(dbSignals.map((s) => s.title));
      // Keep any in-memory signals not already in DB
      const memOnly = signals.filter((s) => !existingTitles.has(s.title));
      signals.length = 0;
      signals.push(...dbSignals, ...memOnly);
      if (signals.length > 20) signals.length = 20;
    }

    // Rebuild activity from DB logs + in-memory entries
    if (recentLogs.length > 0) {
      const dbEntries: ActivityEntry[] = recentLogs.map((log) => ({
        id: `db-act-${log.id.slice(0, 8)}`,
        actor: log.agentType,
        action: log.decisionRationale.slice(0, 120),
        time: timeSince(log.timestamp),
      }));
      // Keep in-memory entries not duplicated in DB (by checking action text overlap)
      const dbActions = new Set(dbEntries.map((e) => e.action));
      const memOnly = activity.filter((a) => !a.id.startsWith('db-act-') && !dbActions.has(a.action));
      activity.length = 0;
      // DB entries first (newest first — already sorted by timestamp desc), then mem-only
      activity.push(...dbEntries, ...memOnly);
      if (activity.length > 50) activity.length = 50;
    }

    // Build protocol steps from the latest active incident's runbook
    if (activeIncidents.length > 0 && protocolSteps.length === 0) {
      try {
        const { dbGetRunbook } = await import('@/lib/db');
        const latestIncident = activeIncidents[0];
        const runbook = await dbGetRunbook({ incidentType: latestIncident.type });
        if (runbook && runbook.steps.length > 0) {
          setProtocolSteps(
            runbook.steps.map((s) => ({
              step: s.title,
              done: s.status === 'completed',
              active: s.status === 'running',
            })),
          );
        }
      } catch {
        // Keep existing protocol steps
      }
    }
  } catch (err) {
    console.error('[syncDashboardFromDb] Error syncing from DB:', err);
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
