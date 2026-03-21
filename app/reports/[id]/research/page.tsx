import { dbGetIncident } from '@/lib/db';
import type { Metadata } from 'next';

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
    title: `Similar Incidents Research — ${incident.title} — Canary`,
    description: `AI-generated research report on similar incidents for: ${incident.title}`,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function similarityColor(value: number): string {
  if (value >= 0.8) return 'bg-green-600/20 text-green-400';
  if (value >= 0.6) return 'bg-yellow-600/20 text-yellow-400';
  return 'bg-blue-600/20 text-blue-400';
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function ResearchReportPage({
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
  const report = aiAnalysis?.swarmReports?.research as
    | {
        searchSummary: string;
        similarIncidents: Array<{
          title: string;
          date: string;
          location: string;
          similarity: number;
          summary: string;
          responseStrategy: string;
          outcome: string;
          sourceUrl: string;
          sourceName: string;
        }>;
        keyLessonsLearned: string[];
        recommendedStrategies: string[];
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
            The similar incidents research report for this incident has not been generated yet.
          </p>
          <p className="text-sm text-on-surface-variant">
            Incident: {incident.title}
          </p>
        </div>
      </main>
    );
  }

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
        <div className="mb-10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
            AI-Generated Report
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-on-surface tracking-tight leading-tight mb-3">
            Similar Incidents Research Report
          </h1>
        </div>

        {/* ── Search Summary ───────────────────────────────────────────── */}
        <section className="mb-8">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
            Search Summary
          </h2>
          <p className="text-base leading-relaxed text-on-surface">
            {report.searchSummary}
          </p>
        </section>

        {/* ── Similar Incidents ────────────────────────────────────────── */}
        {report.similarIncidents.length > 0 && (
          <section className="mb-8">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-4">
              Similar Incidents ({report.similarIncidents.length})
            </h2>
            <div className="space-y-4">
              {report.similarIncidents.map((item, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                    <h3 className="text-lg font-semibold text-on-surface">{item.title}</h3>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${similarityColor(item.similarity)}`}
                    >
                      {Math.round(item.similarity * 100)}% match
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-on-surface-variant mb-4">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">calendar_today</span>
                      {item.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">location_on</span>
                      {item.location}
                    </span>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-semibold text-on-surface-variant mb-1">Summary</p>
                      <p className="text-on-surface leading-relaxed">{item.summary}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-on-surface-variant mb-1">Response Strategy</p>
                      <p className="text-on-surface leading-relaxed">{item.responseStrategy}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-on-surface-variant mb-1">Outcome</p>
                      <p className="text-on-surface leading-relaxed">{item.outcome}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-outline-variant/10">
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-tertiary hover:underline"
                    >
                      <span className="material-symbols-outlined text-base">open_in_new</span>
                      {item.sourceName}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Key Lessons Learned ──────────────────────────────────────── */}
        {report.keyLessonsLearned.length > 0 && (
          <section className="mb-8">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-4">
              Key Lessons Learned
            </h2>
            <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-6">
              <ul className="space-y-3">
                {report.keyLessonsLearned.map((lesson, i) => (
                  <li key={i} className="flex items-start gap-3 text-base text-on-surface">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface-container-high text-xs font-bold text-on-surface-variant flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {lesson}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* ── Recommended Strategies ───────────────────────────────────── */}
        {report.recommendedStrategies.length > 0 && (
          <section className="mb-8">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-4">
              Recommended Strategies
            </h2>
            <ul className="space-y-2">
              {report.recommendedStrategies.map((strategy, i) => (
                <li key={i} className="flex items-start gap-2 text-base text-on-surface">
                  <span className="mt-1.5 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-tertiary" />
                  {strategy}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Disclaimer ───────────────────────────────────────────────── */}
        <div className="border-t border-outline-variant/15 pt-6 mb-4">
          <p className="text-xs leading-relaxed text-on-surface-variant/70">
            This research report was generated by AI based on publicly available information.
            Similarity scores are approximate and should not be treated as definitive assessments.
            Always verify information with primary sources and consult domain experts before
            making decisions based on this report.
          </p>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
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
