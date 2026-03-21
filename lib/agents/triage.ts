/**
 * Canary — Triage Agent
 *
 * Specialist agent for physical damage assessment, life-safety risk analysis,
 * affected population estimation, and emergency resource prioritization.
 * Applies FEMA ATC-45 rapid assessment and ICS priority classification.
 * Invoked by the Orchestrator for any incident with severity >= 3.
 *
 * Model: gemini-2.0-flash for speed-critical triage (< 30s target)
 *        gemini-2.5-pro for complex multi-jurisdictional incident analysis
 * Max steps: 15
 * Route: POST /api/agents/triage
 */

import { generateText, generateObject, stepCountIs } from 'ai';
import { tool } from 'ai';
import { getFlashModel, getProModel } from '@/lib/ai/config';
import { z } from 'zod';
import { TRIAGE_PROMPT } from './prompts';
import {
  checkShelterCapacityTool,
  updateIncidentStatusTool,
  fetchRunbookTool,
  logAgentActionTool,
  notifyHumanTool,
  searchSimilarIncidentsTool,
} from './tools';
import {
  AIAnalysisSchema,
  SeverityLevelSchema,
  IncidentTypeSchema,
  type Incident,
  type TriageRequest,
  type AIAnalysis,
} from '@/lib/schemas';

// ---------------------------------------------------------------------------
// Triage-specific tools
// ---------------------------------------------------------------------------

/**
 * Analyze correlated signals — look for patterns across field/social/camera inputs
 */
const analyzeCorrelatedSignalsTool = tool({
  description:
    'Analyze and correlate all signals associated with an incident: field reports, social media posts, ' +
    'and camera alerts. Identify patterns, contradictions, and confidence-boosting corroborations.',
  inputSchema: z.object({
    incidentId: z.string().uuid(),
    includeSignalIds: z
      .array(z.string())
      .optional()
      .describe('Specific social signal IDs to include'),
    includeCameraAlertIds: z.array(z.string().uuid()).optional(),
  }),
  execute: async ({ incidentId }) => {
    // Production: JOIN incidents with social_signals and camera_alerts
    // Return all correlated signals with their analysis
    return {
      incidentId,
      fieldReportCount: 2,
      socialSignalCount: 7,
      cameraAlertCount: 1,
      corroborationScore: 0.85,
      topSignals: [
        {
          type: 'social',
          platform: 'x',
          text: 'Major flooding on Oak Street, cars stuck (mock)',
          extractedSeverity: 4,
          credibility: 'high',
          corroborates: true,
        },
        {
          type: 'camera',
          cameraId: 'CAM-047',
          detectedEvent: 'Active flooding, water depth est. 18–24 inches',
          confidence: 0.92,
          corroborates: true,
        },
      ],
      contradictions: [],
      overallCorroboration: 'HIGH',
    };
  },
});

/**
 * Estimate affected population — calculate people at risk in blast radius
 */
const estimateAffectedPopulationTool = tool({
  description:
    'Estimate the number of people affected or at risk based on the incident location and type. ' +
    'Uses zip code population data and incident radius estimation.',
  inputSchema: z.object({
    location: z.object({
      lat: z.number().optional(),
      lng: z.number().optional(),
      zipCode: z.string().optional(),
      address: z.string().optional(),
    }),
    incidentType: IncidentTypeSchema,
    radiusKm: z.number().positive().default(2).describe('Estimated impact radius in kilometers'),
  }),
  execute: async ({ location, incidentType, radiusKm }) => {
    // Production: query Census data or a zip code population database
    // Adjust by incident type (flood = lower density road areas, fire = building occupants, etc.)
    const basePopulation = 5000; // Mock: urban area default
    const typeMultiplier = incidentType === 'flood' ? 0.6 : incidentType === 'fire' ? 0.3 : 0.5;
    const radiusMultiplier = Math.PI * radiusKm * radiusKm * 0.1;

    const estimate = Math.floor(basePopulation * typeMultiplier * Math.max(1, radiusMultiplier / 10));

    return {
      location,
      incidentType,
      radiusKm,
      estimatedAffected: {
        min: Math.floor(estimate * 0.7),
        max: Math.floor(estimate * 1.5),
      },
      populationDataSource: 'US Census ACS 2023 (mock)',
      confidence: 0.65,
    };
  },
});

/**
 * Calculate RTO/RPO current state — compare current incident trajectory against commitments
 */
const calculateRtoRpoTool = tool({
  description:
    'Calculate the current RTO/RPO exposure for an incident. ' +
    'Compares incident start time, current recovery progress, and historical recovery times ' +
    'for similar incidents to produce a realistic recovery timeline.',
  inputSchema: z.object({
    incidentId: z.string().uuid(),
    incidentStartTime: z.string().datetime(),
    incidentType: IncidentTypeSchema,
    severity: SeverityLevelSchema,
    hasRunbook: z.boolean().default(false),
    currentPhase: z.enum(['detection', 'triage', 'recovery', 'validation']),
  }),
  execute: async ({ incidentStartTime, incidentType, severity, hasRunbook, currentPhase }) => {
    const elapsedMinutes = Math.floor(
      (Date.now() - new Date(incidentStartTime).getTime()) / 60000
    );

    // Estimate remaining time based on severity and phase
    const baseRto: Record<string, number> = {
      fire: 240,
      flood: 480,
      structural: 360,
      medical: 60,
      hazmat: 720,
      infrastructure: 120,
      cyber: 180,
      earthquake: 600,
      other: 120,
    };

    const rtoMinutes = (baseRto[incidentType] ?? 120) * (severity / 3);
    const runbookSpeedup = hasRunbook ? 0.65 : 1.0; // Runbooks reduce recovery time ~35%
    const phaseProgress: Record<string, number> = {
      detection: 0.1,
      triage: 0.25,
      recovery: 0.6,
      validation: 0.9,
    };

    const progress = phaseProgress[currentPhase] ?? 0.1;
    const estimatedRemainingMinutes = Math.floor(
      rtoMinutes * runbookSpeedup * (1 - progress)
    );
    const totalEstimatedMinutes = elapsedMinutes + estimatedRemainingMinutes;

    return {
      incidentType,
      severity,
      elapsedMinutes,
      rtoTargetMinutes: rtoMinutes,
      rpoExposureMinutes: Math.floor(elapsedMinutes * 0.8), // Rough RPO estimate
      estimatedRemainingMinutes,
      totalEstimatedMinutes,
      rtoBreachRisk:
        totalEstimatedMinutes > rtoMinutes ? 'HIGH' : totalEstimatedMinutes > rtoMinutes * 0.8 ? 'MEDIUM' : 'LOW',
      slaAtRisk: severity >= 4 && totalEstimatedMinutes > rtoMinutes * 0.9,
      hasRunbookAdvantage: hasRunbook,
    };
  },
});

/**
 * Generate blast radius map — identify all affected systems and services
 */
const generateBlastRadiusTool = tool({
  description:
    'Generate a structured blast radius assessment: which systems, services, customers, ' +
    'and geographic areas are directly and indirectly affected by this incident.',
  inputSchema: z.object({
    incidentId: z.string().uuid(),
    incidentType: IncidentTypeSchema,
    severity: SeverityLevelSchema,
    location: z
      .object({
        zipCode: z.string().optional(),
        address: z.string().optional(),
        description: z.string().optional(),
      })
      .optional(),
    additionalContext: z.string().optional(),
  }),
  execute: async ({ incidentType, severity, location }) => {
    // Production: query CMDB and service dependency graph
    // For natural disasters: query infrastructure location data + incident location

    const isPhysical = ['flood', 'fire', 'structural', 'earthquake', 'hazmat'].includes(incidentType);

    return {
      directImpact: {
        systems: isPhysical
          ? ['Physical infrastructure in affected area']
          : ['Primary service', 'Database cluster'],
        services: ['Emergency response coordination', 'Public alert system'],
        customers: severity >= 4 ? 'All customers in affected area' : 'Customers in immediate area',
        geographic: location?.zipCode ? [`ZIP code ${location.zipCode} and surrounding areas`] : ['Local area'],
      },
      indirectImpact: {
        systems: isPhysical
          ? ['Utility networks', 'Transportation grid']
          : ['Downstream consumers', 'Reporting systems'],
        estimatedCascadeRisk: severity >= 4 ? 'HIGH' : 'MEDIUM',
        slaBreachRisk: severity >= 4,
      },
      criticalInfrastructure: {
        hospitals: isPhysical && severity >= 3,
        utilities: isPhysical && severity >= 4,
        transport: isPhysical && severity >= 3,
      },
      containmentPerimeter: location?.zipCode
        ? `${location.zipCode} zip code boundary`
        : 'TBD — awaiting precise location data',
    };
  },
});

// ---------------------------------------------------------------------------
// Structured triage output schema
// ---------------------------------------------------------------------------

export const TriageResultSchema = z.object({
  rootCause: z.string(),
  rootCauseConfidence: z.number().min(0).max(1),
  blastRadius: z.string(),
  blastRadiusDetails: z.record(z.string(), z.unknown()).optional(),
  rtoEstimateMinutes: z.number().int().nonnegative(),
  rpoEstimateMinutes: z.number().int().nonnegative(),
  validatedSeverity: SeverityLevelSchema,
  severityJustification: z.string().optional(),
  immediateActions: z.array(z.string()).max(5),
  shouldEscalateToHuman: z.boolean(),
  escalationReason: z.string().optional(),
  runbookRecommendation: z.string().optional().describe('Recommended runbook ID or type'),
  affectedPopulation: z
    .object({ min: z.number(), max: z.number() })
    .optional(),
  complianceRisk: z.array(z.string()).default([]),
  analysisCompletedAt: z.string().datetime(),
  agentSessionId: z.string(),
});

export type TriageResult = z.infer<typeof TriageResultSchema>;

// ---------------------------------------------------------------------------
// Main triage agent function
// ---------------------------------------------------------------------------

export interface TriageAgentInput {
  incidentId: string;
  priority?: 'critical' | 'high' | 'normal';
  additionalContext?: string;
}

export async function runTriageAgent(input: TriageAgentInput): Promise<TriageResult> {
  const sessionId = crypto.randomUUID();
  const startTime = Date.now();

  // Choose model based on priority — critical gets the more powerful reasoner
  const model =
    input.priority === 'critical'
      ? getProModel()
      : getFlashModel();

  const prompt = [
    `Incident ID: ${input.incidentId}`,
    `Priority: ${input.priority ?? 'normal'}`,
    `Session ID: ${sessionId}`,
    input.additionalContext ? `Additional Context:\n${input.additionalContext}` : '',
    '\nPerform a complete triage analysis. Use available tools to gather evidence, then produce your structured findings.',
  ]
    .filter(Boolean)
    .join('\n');

  const { text, steps, finishReason } = await generateText({
    model,
    system: TRIAGE_PROMPT,
    prompt,
    tools: {
      // Triage-specific tools
      analyzeCorrelatedSignals: analyzeCorrelatedSignalsTool,
      estimateAffectedPopulation: estimateAffectedPopulationTool,
      calculateRtoRpo: calculateRtoRpoTool,
      generateBlastRadius: generateBlastRadiusTool,
      // Shared tools
      checkShelterCapacity: checkShelterCapacityTool,
      updateIncidentStatus: updateIncidentStatusTool,
      fetchRunbook: fetchRunbookTool,
      logAgentAction: logAgentActionTool,
      notifyHuman: notifyHumanTool,
      searchSimilarIncidents: searchSimilarIncidentsTool,
    },
    stopWhen: stepCountIs(15),
    maxRetries: 2,
    onFinish: ({ steps, usage }) => {
      console.log('[triage] completed', {
        sessionId,
        incidentId: input.incidentId,
        steps: steps.length,
        durationMs: Date.now() - startTime,
        tokens: usage.totalTokens,
      });
    },
  });

  // After the agentic loop completes, extract structured results using generateObject
  // This ensures we always return a valid, typed TriageResult regardless of how the agent
  // structured its narrative output.
  const { object: structuredResult } = await generateObject({
    model: getFlashModel(),
    schema: TriageResultSchema,
    prompt: [
      'Extract a structured TriageResult from this triage analysis:',
      '',
      text,
      '',
      `Session ID: ${sessionId}`,
      `Analysis completed at: ${new Date().toISOString()}`,
    ].join('\n'),
  });

  return structuredResult;
}
