import { dbGetIncident } from '@/lib/db';
import type { Metadata } from 'next';

// ---------------------------------------------------------------------------
// Threat level config
// ---------------------------------------------------------------------------

const THREAT_LEVELS: Record<string, { label: string; bg: string; text: string; border: string }> = {
  extreme:     { label: 'EXTREME',     bg: 'bg-red-600/20',    text: 'text-red-400',    border: 'border-red-600/40'    },
  severe:      { label: 'SEVERE',      bg: 'bg-orange-600/20', text: 'text-orange-400', border: 'border-orange-600/40' },
  moderate:    { label: 'MODERATE',    bg: 'bg-yellow-600/20', text: 'text-yellow-400', border: 'border-yellow-600/40' },
  advisory:    { label: 'ADVISORY',    bg: 'bg-blue-600/20',   text: 'text-blue-400',   border: 'border-blue-600/40'   },
  information: { label: 'INFORMATION', bg: 'bg-green-600/20',  text: 'text-green-400',  border: 'border-green-600/40'  },
};

const PRIORITY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  critical: { label: 'Critical', bg: 'bg-red-600/20',    text: 'text-red-400'    },
  high:     { label: 'High',     bg: 'bg-orange-600/20', text: 'text-orange-400' },
  medium:   { label: 'Medium',   bg: 'bg-yellow-600/20', text: 'text-yellow-400' },
};

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const incident = await dbGetIncident(id);
  if (!incident) {
    return { title: 'Report Not Found — Canary' };
  }
  return {
    title: `Emergency Guidance — ${incident.title} — Canary`,
    description: `AI-generated emergency guidance for incident: ${incident.title}`,
  };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function EmergencyReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const incident = await dbGetIncident(id);

  // ── Incident not found ────────────────────────────────────────────────
  if (!incident) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-6 bg-background">
        <div className="text-center max-w-md">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4 block">
            search_off
          </span>
          <h1 className="text-2xl font-bold text-on-surface mb-2">
            Incident Not Found
          </h1>
          <p className="text-on-surface-variant text-lg">
            The incident you are looking for does not exist or may have been removed.
          </p>
        </div>
      </main>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aiAnalysis = incident.aiAnalysis as Record<string, any> | undefined;
  const report = aiAnalysis?.swarmReports?.emergency as
    | {
        headline: string;
        threatLevel: 'extreme' | 'severe' | 'moderate' | 'advisory' | 'information';
        summary: string;
        immediateActions: Array<{ priority: 'critical' | 'high' | 'medium'; action: string; details?: string }>;
        evacuationGuidance: { required: boolean; zones: string[]; routes: string[]; shelters: string[] };
        safetyInstructions: string[];
        resourceContacts: Array<{ name: string; phone?: string; description: string }>;
        doNotDoList: string[];
        updatedAt: string;
        generatedAt: string;
      }
    | undefined;

  // ── Report not yet generated ──────────────────────────────────────────
  if (!report) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-6 bg-background">
        <div className="text-center max-w-md">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4 block">
            pending
          </span>
          <h1 className="text-2xl font-bold text-on-surface mb-2">
            Report Not Yet Generated
          </h1>
          <p className="text-on-surface-variant text-lg mb-6">
            The emergency guidance report for this incident has not been generated yet.
          </p>
          <p className="text-sm text-on-surface-variant">
            Incident: {incident.title}
          </p>
        </div>
      </main>
    );
  }

  const threatCfg = THREAT_LEVELS[report.threatLevel] ?? THREAT_LEVELS['moderate'];

  const sortedActions = [...report.immediateActions].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2 };
    return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
  });

  const generatedTime = new Date(report.generatedAt).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  return (
    <main className="min-h-dvh px-4 py-12 sm:px-6 lg:px-8 bg-background">
      <div className="mx-auto max-w-3xl">
        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
            AI-Generated Report
          </p>
        </div>

        {/* ── Threat Level Banner ──────────────────────────────────────── */}
        <div className={`rounded-xl border ${threatCfg.border} ${threatCfg.bg} p-6 mb-8`}>
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-2xl" style={{ color: 'currentColor' }}>
              warning
            </span>
            <span className={`text-sm font-bold uppercase tracking-widest ${threatCfg.text}`}>
              Threat Level: {threatCfg.label}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight leading-tight">
            {report.headline}
          </h1>
        </div>

        {/* ── Summary ──────────────────────────────────────────────────── */}
        <section className="mb-8">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
            Summary
          </h2>
          <div className="space-y-4">
            {report.summary.split('\n\n').map((paragraph, i) => (
              <p key={i} className="text-base leading-relaxed text-on-surface">
                {paragraph}
              </p>
            ))}
          </div>
        </section>

        {/* ── Immediate Actions ────────────────────────────────────────── */}
        {sortedActions.length > 0 && (
          <section className="mb-8">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-4">
              Immediate Actions
            </h2>
            <div className="space-y-3">
              {sortedActions.map((item, i) => {
                const pCfg = PRIORITY_CONFIG[item.priority] ?? PRIORITY_CONFIG['medium'];
                return (
                  <div
                    key={i}
                    className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${pCfg.bg} ${pCfg.text} flex-shrink-0 mt-0.5`}
                      >
                        {pCfg.label}
                      </span>
                      <div>
                        <p className="text-base font-medium text-on-surface">{item.action}</p>
                        {item.details && (
                          <p className="text-sm text-on-surface-variant mt-1">{item.details}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Evacuation Guidance ──────────────────────────────────────── */}
        {report.evacuationGuidance.required && (
          <section className="mb-8 rounded-xl border border-red-600/30 bg-red-950/20 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-red-400">directions_run</span>
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-red-400">
                Evacuation Guidance
              </h2>
            </div>

            {report.evacuationGuidance.zones.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-on-surface-variant mb-2">Affected Zones</h3>
                <div className="flex flex-wrap gap-2">
                  {report.evacuationGuidance.zones.map((zone, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-red-600/15 text-red-300"
                    >
                      {zone}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {report.evacuationGuidance.routes.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-on-surface-variant mb-2">Evacuation Routes</h3>
                <ul className="space-y-1.5">
                  {report.evacuationGuidance.routes.map((route, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-on-surface">
                      <span className="material-symbols-outlined text-base text-on-surface-variant mt-0.5 flex-shrink-0">
                        arrow_forward
                      </span>
                      {route}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {report.evacuationGuidance.shelters.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-on-surface-variant mb-2">Shelters</h3>
                <ul className="space-y-1.5">
                  {report.evacuationGuidance.shelters.map((shelter, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-on-surface">
                      <span className="material-symbols-outlined text-base text-on-surface-variant mt-0.5 flex-shrink-0">
                        night_shelter
                      </span>
                      {shelter}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* ── Safety Instructions ──────────────────────────────────────── */}
        {report.safetyInstructions.length > 0 && (
          <section className="mb-8">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-4">
              Safety Instructions
            </h2>
            <ol className="space-y-3">
              {report.safetyInstructions.map((instruction, i) => (
                <li key={i} className="flex items-start gap-3 text-base text-on-surface">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface-container-high text-xs font-bold text-on-surface-variant flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {instruction}
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* ── Do NOT Do ────────────────────────────────────────────────── */}
        {report.doNotDoList.length > 0 && (
          <section className="mb-8 rounded-xl border border-red-600/20 bg-red-950/10 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-red-400">block</span>
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-red-400">
                Do NOT Do
              </h2>
            </div>
            <ul className="space-y-2">
              {report.doNotDoList.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-base text-on-surface">
                  <span className="material-symbols-outlined text-red-400 mt-0.5 flex-shrink-0 text-lg">
                    close
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Emergency Contacts ───────────────────────────────────────── */}
        {report.resourceContacts.length > 0 && (
          <section className="mb-8">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-4">
              Emergency Contacts
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {report.resourceContacts.map((contact, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-4"
                >
                  <p className="font-semibold text-on-surface mb-1">{contact.name}</p>
                  {contact.phone && (
                    <p className="text-sm text-tertiary font-medium mb-1">{contact.phone}</p>
                  )}
                  <p className="text-sm text-on-surface-variant">{contact.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div className="border-t border-outline-variant/15 pt-6 mb-4">
          <p className="text-xs leading-relaxed text-on-surface-variant/70">
            This emergency guidance was generated by AI and should be used as supplementary
            information only. Always follow instructions from local authorities and official
            emergency services.
          </p>
        </div>

        <footer className="text-center text-sm text-on-surface-variant pb-8">
          <p className="mb-1">
            Generated by{' '}
            <a href="/" className="font-semibold text-tertiary hover:underline">
              Canary AI
            </a>
          </p>
          <p className="text-xs text-on-surface-variant/60">{generatedTime}</p>
        </footer>
      </div>
    </main>
  );
}
