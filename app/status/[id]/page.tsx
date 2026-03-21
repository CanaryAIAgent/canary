import { dbGetIncident } from '@/lib/db';
import type { Metadata } from 'next';

// ---------------------------------------------------------------------------
// Status badge colors
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  new:        { label: 'New',        bg: 'bg-blue-600/20',   text: 'text-blue-400'   },
  triaging:   { label: 'Triaging',   bg: 'bg-yellow-600/20', text: 'text-yellow-400' },
  responding: { label: 'Responding', bg: 'bg-orange-600/20', text: 'text-orange-400' },
  resolved:   { label: 'Resolved',   bg: 'bg-green-600/20',  text: 'text-green-400'  },
  closed:     { label: 'Closed',     bg: 'bg-neutral-600/20',text: 'text-neutral-400'},
  escalated:  { label: 'Escalated',  bg: 'bg-red-600/20',    text: 'text-red-400'    },
};

const SEVERITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'SEV-1 — Minimal',  color: 'text-green-400'  },
  2: { label: 'SEV-2 — Low',      color: 'text-blue-400'   },
  3: { label: 'SEV-3 — Moderate', color: 'text-yellow-400' },
  4: { label: 'SEV-4 — High',     color: 'text-orange-400' },
  5: { label: 'SEV-5 — Critical', color: 'text-red-400'    },
};

const TYPE_LABELS: Record<string, string> = {
  flood: 'Flood',
  fire: 'Fire',
  structural: 'Structural',
  medical: 'Medical',
  hazmat: 'Hazmat',
  earthquake: 'Earthquake',
  infrastructure: 'Infrastructure',
  cyber: 'Cyber',
  other: 'Other',
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
    return { title: 'Incident Not Found — Canary' };
  }
  return {
    title: `${incident.title} — Canary Status`,
    description: `Status update for incident: ${incident.title}`,
  };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function StatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const incident = await dbGetIncident(id);

  // ── Incident not found ──────────────────────────────────────────────────
  if (!incident) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-6">
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
  const publicSummary = aiAnalysis?.publicSummary as
    | { summary?: string; affectedArea?: string; safetyInstructions?: string[] | string }
    | undefined;

  // ── Public summary not yet published ────────────────────────────────────
  if (!publicSummary) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4 block">
            pending
          </span>
          <h1 className="text-2xl font-bold text-on-surface mb-2">
            Status Page Not Yet Published
          </h1>
          <p className="text-on-surface-variant text-lg mb-6">
            This incident is being assessed. A public status update will be available shortly.
          </p>
          <p className="text-sm text-on-surface-variant">
            Incident: {incident.title}
          </p>
        </div>
      </main>
    );
  }

  // ── Resolve display values ──────────────────────────────────────────────
  const statusCfg = STATUS_CONFIG[incident.status] ?? STATUS_CONFIG['new'];
  const severityCfg = SEVERITY_LABELS[incident.severity] ?? SEVERITY_LABELS[3];
  const typeLabel = TYPE_LABELS[incident.type] ?? incident.type;

  const safetyInstructions: string[] = Array.isArray(publicSummary.safetyInstructions)
    ? publicSummary.safetyInstructions
    : typeof publicSummary.safetyInstructions === 'string'
      ? [publicSummary.safetyInstructions]
      : [];

  const updatedAt = new Date(incident.updatedAt);
  const formattedTime = updatedAt.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  return (
    <main className="min-h-dvh px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* ── Header badges ──────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${statusCfg.bg} ${statusCfg.text}`}
          >
            {statusCfg.label}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${severityCfg.color} bg-surface-container-high`}
          >
            {severityCfg.label}
          </span>
          <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold text-on-surface-variant bg-surface-container-high">
            {typeLabel}
          </span>
        </div>

        {/* ── Title ──────────────────────────────────────────────────── */}
        <h1 className="text-3xl sm:text-4xl font-bold text-on-surface leading-tight mb-8">
          {incident.title}
        </h1>

        {/* ── Public summary ─────────────────────────────────────────── */}
        {publicSummary.summary && (
          <section className="mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
              Summary
            </h2>
            <p className="text-lg leading-relaxed text-on-surface">
              {publicSummary.summary}
            </p>
          </section>
        )}

        {/* ── Affected area ──────────────────────────────────────────── */}
        {publicSummary.affectedArea && (
          <section className="mb-8 rounded-xl bg-surface-container-low p-5">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-on-surface-variant mt-0.5">
                location_on
              </span>
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-1">
                  Affected Area
                </h2>
                <p className="text-base text-on-surface">
                  {publicSummary.affectedArea}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ── Safety instructions ────────────────────────────────────── */}
        {safetyInstructions.length > 0 && (
          <section className="mb-8 rounded-xl bg-orange-950/30 border border-orange-800/30 p-5">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-orange-400 mt-0.5">
                warning
              </span>
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-orange-400 mb-3">
                  Safety Instructions
                </h2>
                <ul className="space-y-2">
                  {safetyInstructions.map((instruction, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-base text-on-surface"
                    >
                      <span className="mt-1.5 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
                      {instruction}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* ── Last updated ───────────────────────────────────────────── */}
        <div className="border-t border-outline-variant/15 pt-6 mb-12">
          <p className="text-sm text-on-surface-variant">
            Last updated: {formattedTime}
          </p>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <footer className="text-center text-sm text-on-surface-variant pb-8">
          Powered by{' '}
          <a
            href="/"
            className="font-semibold text-tertiary hover:underline"
          >
            Canary
          </a>
        </footer>
      </div>
    </main>
  );
}
