/**
 * Canary — Video Analysis
 *
 * POST /api/video/analyze
 *
 * Accepts multipart form data with an incident video,
 * runs Gemini (multimodal video) analysis via the Google Generative AI SDK,
 * and persists results with timestamped events to the incident in Supabase.
 *
 * Uses @google/generative-ai directly (not the AI SDK) because the AI SDK's
 * generateObject does not support video file parts.
 */

import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import {
  dbInsertIncident,
  dbGetIncident,
  dbUpdateIncident,
  dbInsertAgentLog,
} from '@/lib/db';
import { addSignal, addActivity, updateStats, updateRecommendation, setProtocolSteps, stats } from '@/lib/data/store';

export const maxDuration = 120;

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    summary: { type: SchemaType.STRING, description: 'Concise narrative of the incident' },
    severity: { type: SchemaType.NUMBER, description: 'Overall severity 1-5' },
    confidence: { type: SchemaType.NUMBER, description: 'Confidence 0-1' },
    hazards: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    sceneSummary: { type: SchemaType.STRING, description: 'Overall scene description' },
    progressionAnalysis: { type: SchemaType.STRING, description: 'How situation changes over time' },
    timeline: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          timestamp: { type: SchemaType.STRING, description: 'HH:MM:SS format' },
          seconds: { type: SchemaType.NUMBER },
          event: { type: SchemaType.STRING },
          severity: { type: SchemaType.NUMBER },
          category: { type: SchemaType.STRING },
        },
        required: ['timestamp', 'seconds', 'event', 'severity', 'category'],
      },
    },
    damageCategory: { type: SchemaType.STRING },
    structuralIntegrity: { type: SchemaType.STRING },
    detectedObjects: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    extractedAddress: { type: SchemaType.STRING },
    recommendedActions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  },
  required: ['summary', 'severity', 'confidence', 'hazards', 'sceneSummary', 'timeline'],
} satisfies ResponseSchema;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const incidentId = formData.get('incidentId') as string | null;
    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;
    const type = (formData.get('type') as string) || 'other';
    const severityRaw = formData.get('severity');
    const severity = severityRaw ? Number(severityRaw) : undefined;
    const location = formData.get('location') as string | null;

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

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is required');

    const arrayBuffer = await video.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = video.type || 'video/mp4';

    // Upload video via Google File API (required for video)
    const fileManager = new GoogleAIFileManager(apiKey);
    const { writeFileSync, unlinkSync } = await import('fs');
    const { join } = await import('path');
    const { tmpdir } = await import('os');
    const tmpPath = join(tmpdir(), `canary-video-${Date.now()}.mp4`);

    let fileUri: string;
    try {
      writeFileSync(tmpPath, buffer);

      const uploadResult = await fileManager.uploadFile(tmpPath, {
        mimeType,
        displayName: video.name || 'incident-video.mp4',
      });

      let file = uploadResult.file;
      while (file.state === 'PROCESSING') {
        await new Promise(r => setTimeout(r, 2000));
        file = await fileManager.getFile(file.name);
      }

      if (file.state === 'FAILED') {
        throw new Error('Video processing failed on Google servers');
      }

      fileUri = file.uri;
    } finally {
      try { unlinkSync(tmpPath); } catch { /* ignore */ }
    }

    // Build prompt
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

    // Call Gemini directly with video file reference
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    const result = await model.generateContent([
      promptText,
      { fileData: { mimeType, fileUri } },
    ]);

    const responseText = result.response.text();
    let analysis;
    try {
      analysis = JSON.parse(responseText);
    } catch {
      // Model returned non-JSON — extract what we can
      console.error('[video/analyze] Failed to parse AI response, raw text:', responseText.slice(0, 500));
      analysis = {
        summary: responseText.slice(0, 500),
        severity: severity ?? 3,
        confidence: 0.5,
        hazards: [],
        sceneSummary: responseText.slice(0, 300),
        timeline: [],
      };
    }

    const finalSeverity = severity ?? analysis.severity ?? 3;
    let resultIncidentId: string;
    let isNewIncident = false;

    if (incidentId && existingIncident) {
      await dbUpdateIncident(incidentId, {
        aiAnalysis: analysis,
        severity: finalSeverity,
      });
      resultIncidentId = incidentId;
    } else {
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
        aiAnalysis: analysis,
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
        rawStepJson: JSON.stringify({ type: 'video_analysis', analysis }),
        timestamp: new Date().toISOString(),
      });
    } catch (logErr) {
      console.error('[video/analyze] agent log persist failed (non-fatal):', logErr);
    }

    if (isNewIncident) {
      updateStats({ activeIncidents: stats.activeIncidents + 1 });
    }

    // Auto-populate triage panel with analysis
    const actions = analysis.recommendedActions ?? [];
    updateRecommendation({
      actionSequence: actions.join('\n') || analysis.sceneSummary || analysis.summary || 'Review video analysis results.',
      confidenceScore: Math.round((analysis.confidence ?? 0.8) * 100),
      stats: [
        { label: 'Severity', value: `${finalSeverity}/5` },
        { label: 'Timeline Events', value: String(analysis.timeline?.length ?? 0) },
        { label: 'Hazards', value: String(analysis.hazards?.length ?? 0) },
      ],
      ctaLabel: 'Approve Dispatch',
    });

    if (actions.length > 0) {
      setProtocolSteps(
        actions.map((action: string, i: number) => ({
          step: action,
          done: false,
          active: i === 0,
        })),
      );
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
