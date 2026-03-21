/**
 * Canary — Video Analysis
 *
 * POST /api/video/analyze
 *
 * Accepts multipart form data with an incident video,
 * runs Gemini (multimodal video) analysis, and persists
 * results with timestamped events to the incident in Supabase.
 */

import { generateObject } from 'ai';
import { getVideoModel } from '@/lib/ai/config';
import {
  dbInsertIncident,
  dbGetIncident,
  dbUpdateIncident,
  dbInsertAgentLog,
} from '@/lib/db';
import { VideoAnalysisResponseSchema } from '@/lib/schemas';
import { addSignal, addActivity, updateStats, stats } from '@/lib/data/store';

export const maxDuration = 120; // Videos take longer to process

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    // Extract fields
    const incidentId = formData.get('incidentId') as string | null;
    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;
    const type = (formData.get('type') as string) || 'other';
    const severityRaw = formData.get('severity');
    const severity = severityRaw ? Number(severityRaw) : undefined;
    const location = formData.get('location') as string | null;

    // Get the video file
    const video = formData.get('video') as File | null;

    if (!video) {
      return Response.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'A video file is required' } },
        { status: 400 },
      );
    }

    if (!incidentId && !title) {
      return Response.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Either incidentId or title is required' } },
        { status: 400 },
      );
    }

    // Verify incident exists if ID provided
    let existingIncident = null;
    if (incidentId) {
      existingIncident = await dbGetIncident(incidentId);
      if (!existingIncident) {
        return Response.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Incident not found' } },
          { status: 404 },
        );
      }
    }

    // Convert video to base64 data URL for Gemini
    const arrayBuffer = await video.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = video.type || 'video/mp4';

    // Build AI prompt
    const promptText = [
      'Analyze the following incident video for emergency response purposes.',
      'Watch the entire video carefully and create a detailed timeline of significant events with precise timestamps.',
      '',
      'For each notable event, record:',
      '- The exact timestamp (HH:MM:SS format)',
      '- What happened at that moment',
      '- The severity of that specific event (1-5)',
      '- The category (damage, hazard, movement, structural, environmental, human_activity, other)',
      '',
      'Also provide:',
      '- An overall severity rating from 1 (minor) to 5 (critical)',
      '- A scene summary covering the entire video',
      '- A progression analysis describing how the situation changes over time',
      '- Damage categorization using ATC-45 rapid assessment categories if applicable',
      '- Any detected hazards, objects, and recommended actions',
      '- Structural integrity assessment if visible',
      location ? `Known location context: ${location}` : null,
      description ? `Additional context: ${description}` : null,
    ].filter(Boolean).join('\n');

    // Run AI analysis with video
    const { object: analysis } = await generateObject({
      model: getVideoModel(),
      schema: VideoAnalysisResponseSchema,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: promptText },
            { type: 'file', mediaType: mimeType, data: base64 },
          ],
        },
      ],
    });

    const finalSeverity = severity ?? analysis.severity ?? 3;
    let resultIncidentId: string;
    let isNewIncident = false;

    if (incidentId && existingIncident) {
      // Update existing incident
      await dbUpdateIncident(incidentId, {
        aiAnalysis: { ...analysis, type: 'video_analysis' } as typeof analysis,
        severity: finalSeverity,
      });
      resultIncidentId = incidentId;
    } else {
      // Create new incident
      const validTypes = ['flood', 'fire', 'structural', 'medical', 'hazmat', 'earthquake', 'infrastructure', 'cyber'] as const;
      const incidentType = validTypes.includes(type as typeof validTypes[number])
        ? (type as typeof validTypes[number])
        : 'other' as const;

      const newIncident = await dbInsertIncident({
        title: title!,
        description: description || analysis.sceneSummary || analysis.summary || '',
        type: incidentType,
        severity: finalSeverity,
        status: 'new',
        location: location ? { description: location } : (analysis.extractedAddress ? { description: analysis.extractedAddress } : {}),
        sources: ['field'],
        aiAnalysis: { ...analysis, type: 'video_analysis' } as typeof analysis,
        mediaUrls: [],
        corroboratedBySignals: [],
        linkedCameraAlerts: [],
      });
      resultIncidentId = newIncident.id;
      isNewIncident = true;
    }

    // Push to live dashboard
    const tagPrefix = finalSeverity >= 4 ? 'CRITICAL' : finalSeverity >= 3 ? 'ALERT' : 'MONITOR';
    addSignal({
      tag: `${tagPrefix} // VIDEO`,
      tagColor: finalSeverity >= 4 ? 'text-error' : finalSeverity >= 3 ? 'text-tertiary' : 'text-on-surface-variant',
      title: title || analysis.sceneSummary?.slice(0, 60) || 'Video Analysis',
      desc: analysis.summary || 'AI video analysis completed',
      source: 'Video Upload',
      time: 'just now',
      icon: 'videocam',
      incidentId: resultIncidentId,
    });

    addActivity(
      'Video Analyzer',
      `Analyzed video for incident "${title || existingIncident?.title}" — severity ${finalSeverity}, ${analysis.timeline?.length ?? 0} events detected`,
    );

    // Persist to agent_logs
    try {
      await dbInsertAgentLog({
        agentType: 'triage',
        incidentId: resultIncidentId,
        sessionId: crypto.randomUUID(),
        stepIndex: 0,
        decisionRationale: `Video Analysis: ${analysis.summary ?? 'Video analyzed'}. Severity: ${finalSeverity}. Timeline: ${analysis.timeline?.length ?? 0} events. Hazards: ${(analysis.hazards ?? []).join(', ') || 'none detected'}.`,
        confidenceScore: analysis.confidence ?? null,
        toolCallsAttempted: ['video_analysis'],
        toolCallsSucceeded: ['video_analysis'],
        toolCallsFailed: [],
        actionsEscalated: [],
        rawStepJson: JSON.stringify({
          type: 'video_analysis',
          analysis,
        }),
        timestamp: new Date().toISOString(),
      });
    } catch (logErr) {
      console.error('[video/analyze] agent log persist failed (non-fatal):', logErr);
    }

    if (isNewIncident) {
      updateStats({ activeIncidents: stats.activeIncidents + 1 });
    }

    return Response.json({
      success: true,
      data: {
        incidentId: resultIncidentId,
        analysis,
        isNewIncident,
      },
    });
  } catch (error) {
    console.error('[video/analyze] error:', error);
    return Response.json(
      {
        success: false,
        error: {
          code: 'ANALYSIS_ERROR',
          message: error instanceof Error ? error.message : 'Video analysis failed',
        },
      },
      { status: 500 },
    );
  }
}
