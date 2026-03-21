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
    title: `Insurance Claim Report — ${incident.title} — Canary`,
    description: `AI-generated insurance claim report for incident: ${incident.title}`,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function InsuranceReportPage({
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
  const report = aiAnalysis?.swarmReports?.insurance as
    | {
        reportNumber: string;
        incidentClassification: string;
        dateOfLoss: string;
        estimatedDamage: {
          currency: string;
          minEstimate: number;
          maxEstimate: number;
          breakdown: Array<{ category: string; estimate: number; description: string }>;
        };
        propertyDetails: { type: string; address?: string; description: string };
        causeOfLoss: string;
        damageAssessment: string;
        supportingEvidence: string[];
        recommendations: string[];
        disclaimer: string;
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
            The insurance claim report for this incident has not been generated yet.
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
            Insurance Claim Report
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-on-surface-variant">
              Report #{report.reportNumber}
            </span>
            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-tertiary/15 text-tertiary">
              {report.incidentClassification}
            </span>
          </div>
        </div>

        {/* ── Property Details ─────────────────────────────────────────── */}
        <section className="mb-8 rounded-xl border border-outline-variant/15 bg-surface-container-low p-6">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-4">
            Property Details
          </h2>
          <div className="space-y-2">
            <p className="text-on-surface">
              <span className="font-semibold">Type:</span> {report.propertyDetails.type}
            </p>
            {report.propertyDetails.address && (
              <p className="text-on-surface">
                <span className="font-semibold">Address:</span> {report.propertyDetails.address}
              </p>
            )}
            <p className="text-on-surface">
              <span className="font-semibold">Description:</span> {report.propertyDetails.description}
            </p>
            <p className="text-on-surface">
              <span className="font-semibold">Date of Loss:</span> {report.dateOfLoss}
            </p>
          </div>
        </section>

        {/* ── Cause of Loss ────────────────────────────────────────────── */}
        <section className="mb-8">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
            Cause of Loss
          </h2>
          <p className="text-base leading-relaxed text-on-surface">
            {report.causeOfLoss}
          </p>
        </section>

        {/* ── Damage Assessment ────────────────────────────────────────── */}
        <section className="mb-8">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
            Damage Assessment
          </h2>
          <div className="space-y-4">
            {report.damageAssessment.split('\n\n').map((paragraph, i) => (
              <p key={i} className="text-base leading-relaxed text-on-surface">
                {paragraph}
              </p>
            ))}
          </div>
        </section>

        {/* ── Estimated Damage Table ───────────────────────────────────── */}
        <section className="mb-8 rounded-xl border border-outline-variant/15 bg-surface-container-low p-6">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-4">
            Estimated Damage
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/15">
                  <th className="text-left py-2 pr-4 font-semibold text-on-surface-variant">Category</th>
                  <th className="text-right py-2 pr-4 font-semibold text-on-surface-variant">Estimate</th>
                  <th className="text-left py-2 font-semibold text-on-surface-variant">Description</th>
                </tr>
              </thead>
              <tbody>
                {report.estimatedDamage.breakdown.map((item, i) => (
                  <tr key={i} className="border-b border-outline-variant/10">
                    <td className="py-3 pr-4 text-on-surface font-medium">{item.category}</td>
                    <td className="py-3 pr-4 text-on-surface text-right tabular-nums">
                      {formatCurrency(item.estimate, report.estimatedDamage.currency)}
                    </td>
                    <td className="py-3 text-on-surface-variant">{item.description}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-outline-variant/25">
                  <td className="py-3 pr-4 font-bold text-on-surface">Total Range</td>
                  <td colSpan={2} className="py-3 text-right font-bold text-on-surface tabular-nums">
                    {formatCurrency(report.estimatedDamage.minEstimate, report.estimatedDamage.currency)}
                    {' — '}
                    {formatCurrency(report.estimatedDamage.maxEstimate, report.estimatedDamage.currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* ── Supporting Evidence ───────────────────────────────────────── */}
        {report.supportingEvidence.length > 0 && (
          <section className="mb-8">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
              Supporting Evidence
            </h2>
            <ul className="space-y-2">
              {report.supportingEvidence.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-base text-on-surface">
                  <span className="material-symbols-outlined text-tertiary mt-0.5 text-lg flex-shrink-0">
                    check_circle
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Recommendations ──────────────────────────────────────────── */}
        {report.recommendations.length > 0 && (
          <section className="mb-8">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
              Recommendations
            </h2>
            <ul className="space-y-2">
              {report.recommendations.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-base text-on-surface">
                  <span className="mt-1.5 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-tertiary" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Disclaimer ───────────────────────────────────────────────── */}
        <div className="border-t border-outline-variant/15 pt-6 mb-12">
          <p className="text-xs leading-relaxed text-on-surface-variant/70">
            {report.disclaimer}
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
