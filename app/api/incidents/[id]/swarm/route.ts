/**
 * Canary — Multi-Agent Swarm API
 *
 * POST /api/incidents/[id]/swarm
 *
 * Runs 3 AI agents in parallel for an incident:
 *   1. Insurance Report Agent — structured insurance/claims report
 *   2. Emergency Guidance Agent — public safety guidance for residents
 *   3. Similar Incidents Research Agent — historical incident analysis
 *
 * Results are stored in the incident's aiAnalysis.swarmReports field.
 */

import { NextRequest } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { getProModel } from '@/lib/ai/config';
import { dbGetIncident, dbUpdateIncident, dbInsertAgentLog } from '@/lib/db';

export const maxDuration = 120;

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const InsuranceReportSchema = z.object({
  reportNumber: z.string().describe('Generated report reference number'),
  incidentClassification: z.string().describe('Insurance classification, e.g. "Property Damage - Natural Disaster"'),
  dateOfLoss: z.string().describe('Date the incident occurred'),
  estimatedDamage: z.object({
    currency: z.string().default('USD'),
    minEstimate: z.number().describe('Minimum estimated damage in dollars'),
    maxEstimate: z.number().describe('Maximum estimated damage in dollars'),
    breakdown: z.array(z.object({
      category: z.string().describe('e.g. "Structural", "Contents", "Business Interruption"'),
      estimate: z.number(),
      description: z.string(),
    })),
  }),
  propertyDetails: z.object({
    type: z.string().describe('Property type affected'),
    address: z.string().optional(),
    description: z.string(),
  }),
  causeOfLoss: z.string().describe('Detailed description of what caused the damage'),
  damageAssessment: z.string().describe('Detailed multi-paragraph assessment of damage'),
  supportingEvidence: z.array(z.string()).describe('List of evidence types available'),
  recommendations: z.array(z.string()).describe('Recommendations for the claims process'),
  disclaimer: z.string().describe('Standard AI-generated report disclaimer'),
});

const EmergencyGuidanceSchema = z.object({
  headline: z.string().describe('Public-facing emergency headline'),
  threatLevel: z.enum(['extreme', 'severe', 'moderate', 'advisory', 'information']),
  summary: z.string().describe('2-3 paragraph public summary'),
  immediateActions: z.array(z.object({
    priority: z.enum(['critical', 'high', 'medium']),
    action: z.string(),
    details: z.string().optional(),
  })),
  evacuationGuidance: z.object({
    required: z.boolean(),
    zones: z.array(z.string()).default([]),
    routes: z.array(z.string()).default([]),
    shelters: z.array(z.string()).default([]),
  }),
  safetyInstructions: z.array(z.string()),
  resourceContacts: z.array(z.object({
    name: z.string(),
    phone: z.string().optional(),
    description: z.string(),
  })),
  doNotDoList: z.array(z.string()).describe('Things residents should NOT do'),
  updatedAt: z.string().describe('ISO timestamp'),
});

const SimilarIncidentsSchema = z.object({
  searchSummary: z.string().describe('Overview of the research findings'),
  similarIncidents: z.array(z.object({
    title: z.string(),
    date: z.string().describe('When it occurred'),
    location: z.string(),
    similarity: z.number().min(0).max(100).describe('Similarity percentage'),
    summary: z.string().describe('What happened'),
    responseStrategy: z.string().describe('How it was responded to'),
    outcome: z.string().describe('Final outcome and lessons learned'),
    sourceUrl: z.string().describe('URL to news article or report about this incident'),
    sourceName: z.string().describe('Name of the source, e.g. "FEMA", "Reuters"'),
  })).describe('5-8 similar historical incidents'),
  keyLessonsLearned: z.array(z.string()),
  recommendedStrategies: z.array(z.string()).describe('Recommended strategies based on historical analysis'),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildIncidentContext(incident: {
  title: string;
  type: string;
  severity: number;
  status: string;
  description?: string;
  location?: { lat?: number; lng?: number; address?: string; zipCode?: string; description?: string };
  sources?: string[];
  createdAt: string;
  aiAnalysis?: Record<string, unknown>;
}): string {
  const parts = [
    `INCIDENT: ${incident.title}`,
    `Type: ${incident.type}`,
    `Severity: ${incident.severity}/5`,
    `Status: ${incident.status}`,
    `Created: ${incident.createdAt}`,
  ];
  if (incident.description) parts.push(`Description: ${incident.description}`);
  if (incident.location) {
    const loc = incident.location;
    const locParts: string[] = [];
    if (loc.address) locParts.push(loc.address);
    if (loc.zipCode) locParts.push(`ZIP: ${loc.zipCode}`);
    if (loc.description) locParts.push(loc.description);
    if (loc.lat && loc.lng) locParts.push(`Coords: ${loc.lat}, ${loc.lng}`);
    if (locParts.length) parts.push(`Location: ${locParts.join(', ')}`);
  }
  if (incident.sources?.length) parts.push(`Sources: ${incident.sources.join(', ')}`);
  if (incident.aiAnalysis) {
    const ai = incident.aiAnalysis;
    if (ai.summary) parts.push(`AI Summary: ${ai.summary}`);
    if (ai.hazards) parts.push(`Identified Hazards: ${JSON.stringify(ai.hazards)}`);
    if (ai.affectedInfrastructure) parts.push(`Affected Infrastructure: ${JSON.stringify(ai.affectedInfrastructure)}`);
  }
  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(
  _req: NextRequest,
  ctx: RouteContext<'/api/incidents/[id]'>,
) {
  const { id } = await ctx.params;
  const sessionId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // 1. Fetch incident
    const incident = await dbGetIncident(id);
    if (!incident) {
      return Response.json({ error: 'Incident not found' }, { status: 404 });
    }

    const context = buildIncidentContext(incident);
    const model = getProModel();

    // 2. Run all 3 agents in parallel
    const [insuranceResult, emergencyResult, researchResult] = await Promise.allSettled([
      // Agent 1: Insurance Report
      generateObject({
        model,
        schema: InsuranceReportSchema,
        prompt: `You are an expert insurance claims analyst. Analyze the following incident and generate a comprehensive, structured insurance report suitable for filing a property damage claim.

Focus on:
- Accurate damage classification and estimation
- Detailed property damage assessment
- Supporting evidence identification
- Actionable recommendations for the claims process

${context}

Generate a thorough insurance report with realistic damage estimates based on the incident type, severity, and location. Include a professional disclaimer noting this is an AI-generated preliminary assessment.`,
      }),

      // Agent 2: Emergency Guidance
      generateObject({
        model,
        schema: EmergencyGuidanceSchema,
        prompt: `You are an emergency management communications specialist. Create public-facing emergency guidance for residents affected by the following incident.

Focus on:
- Clear, actionable safety instructions
- Evacuation guidance if warranted
- Resource contacts (use realistic emergency service numbers)
- A clear "do not do" list to prevent additional harm

${context}

Generate guidance appropriate for the incident severity and type. The tone should be authoritative yet reassuring. Set the updatedAt field to the current ISO timestamp.`,
      }),

      // Agent 3: Similar Incidents Research
      generateObject({
        model,
        schema: SimilarIncidentsSchema,
        prompt: `You are a disaster research analyst specializing in historical incident analysis. Research and identify 5-8 similar historical incidents to the one described below.

Focus on:
- Finding real or highly plausible historical parallels
- Documenting the response strategies that were used
- Extracting lessons learned and outcomes
- Recommending strategies based on what worked in similar situations

${context}

For each similar incident, provide the response strategy, outcome, and a source reference. Conclude with key lessons learned and recommended strategies for the current incident.`,
      }),
    ]);

    // 3. Process results
    const now = new Date().toISOString();
    const reports: Record<string, unknown> = {};
    const responseReports: Record<string, { status: string; url?: string; error?: string }> = {};
    let successCount = 0;
    let failCount = 0;

    // Insurance
    if (insuranceResult.status === 'fulfilled') {
      reports.insurance = { ...insuranceResult.value.object, generatedAt: now };
      responseReports.insurance = { status: 'success', url: `/reports/${id}/insurance` };
      successCount++;
    } else {
      reports.insurance = { error: insuranceResult.reason?.message ?? 'Unknown error', generatedAt: now };
      responseReports.insurance = { status: 'failed', error: insuranceResult.reason?.message ?? 'Unknown error' };
      failCount++;
    }

    // Emergency
    if (emergencyResult.status === 'fulfilled') {
      reports.emergency = { ...emergencyResult.value.object, generatedAt: now };
      responseReports.emergency = { status: 'success', url: `/reports/${id}/emergency` };
      successCount++;
    } else {
      reports.emergency = { error: emergencyResult.reason?.message ?? 'Unknown error', generatedAt: now };
      responseReports.emergency = { status: 'failed', error: emergencyResult.reason?.message ?? 'Unknown error' };
      failCount++;
    }

    // Research
    if (researchResult.status === 'fulfilled') {
      reports.research = { ...researchResult.value.object, generatedAt: now };
      responseReports.research = { status: 'success', url: `/reports/${id}/research` };
      successCount++;
    } else {
      reports.research = { error: researchResult.reason?.message ?? 'Unknown error', generatedAt: now };
      responseReports.research = { status: 'failed', error: researchResult.reason?.message ?? 'Unknown error' };
      failCount++;
    }

    // 4. Store results in aiAnalysis.swarmReports
    const existingAiAnalysis = (incident.aiAnalysis as Record<string, unknown>) ?? {};
    // aiAnalysis is stored as JSONB in Supabase — the swarmReports key extends
    // beyond the base AIAnalysis Zod schema, so we cast to satisfy TypeScript.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await dbUpdateIncident(id, {
      aiAnalysis: {
        ...existingAiAnalysis,
        swarmReports: reports,
      } as any,
    });

    // 5. Log each agent's completion
    const durationMs = Date.now() - startTime;
    // Agent type strings extend beyond the base AgentType enum — cast for DB insertion.
    const agentTypes = ['swarm:insurance', 'swarm:emergency', 'swarm:research'];
    const results = [insuranceResult, emergencyResult, researchResult];

    await Promise.all(
      agentTypes.map((agentType, i) =>
        dbInsertAgentLog({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          agentType: agentType as any,
          incidentId: id,
          sessionId,
          stepIndex: i,
          decisionRationale: results[i].status === 'fulfilled'
            ? `${agentType} completed successfully`
            : `${agentType} failed: ${(results[i] as PromiseRejectedResult).reason?.message ?? 'Unknown'}`,
          confidenceScore: results[i].status === 'fulfilled' ? 0.9 : 0,
          toolCallsAttempted: ['generateObject'],
          toolCallsSucceeded: results[i].status === 'fulfilled' ? ['generateObject'] : [],
          toolCallsFailed: results[i].status === 'rejected' ? ['generateObject'] : [],
          actionsEscalated: [],
          durationMs,
          timestamp: now,
        }),
      ),
    );

    // 6. Return response
    const total = successCount + failCount;
    return Response.json({
      success: successCount > 0,
      data: {
        incidentId: id,
        reports: responseReports,
        summary: `${successCount}/${total} agents completed successfully`,
      },
    });
  } catch (err) {
    console.error('[api/incidents/[id]/swarm] Error:', err);
    return Response.json(
      { error: 'Swarm execution failed', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
