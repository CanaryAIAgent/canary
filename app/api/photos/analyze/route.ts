/**
 * Canary — Photo Analysis
 *
 * POST /api/photos/analyze
 *
 * Accepts multipart form data with incident images,
 * runs Gemini Flash (multimodal) analysis, and persists
 * results to the incident in Supabase.
 */

import { generateObject } from 'ai';
import { getPhotoModel, type PhotoModel } from '@/lib/ai/config';
import {
  dbInsertIncident,
  dbGetIncident,
  dbUpdateIncident,
  dbInsertAgentLog,
} from '@/lib/db';
import { PhotoAnalysisResponseSchema } from '@/lib/schemas';
import { addSignal, addActivity, updateStats, stats } from '@/lib/data/store';

export const maxDuration = 60;

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
    const photoModelId = (formData.get('model') as PhotoModel | null) || 'flash';

    // Collect image files
    const images = formData.getAll('images') as File[];

    if (!images || images.length === 0) {
      return Response.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'At least one image is required' } },
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

    // Convert images to base64 for multimodal prompt
    const imageParts: Array<{ type: 'image'; image: string }> = [];
    for (const file of images) {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const mimeType = file.type || 'image/jpeg';
      imageParts.push({ type: 'image', image: `data:${mimeType};base64,${base64}` });
    }

    // Build AI prompt
    const promptText = [
      'Analyze the following incident photo(s) for emergency response purposes.',
      'Identify any damage, hazards, structural issues, and relevant details.',
      'Provide a severity rating from 1 (minor) to 5 (critical).',
      'Categorize the type of damage using ATC-45 rapid assessment categories if applicable.',
      'List any detected objects, hazards, and recommended actions.',
      location ? `Known location context: ${location}` : null,
      description ? `Additional context: ${description}` : null,
    ].filter(Boolean).join('\n');

    // Run AI analysis
    const { object: analysis } = await generateObject({
      model: getPhotoModel(photoModelId),
      schema: PhotoAnalysisResponseSchema,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: promptText },
            ...imageParts,
          ],
        },
      ],
    });

    const finalSeverity = severity ?? analysis.severity ?? 3;
    let resultIncidentId: string;
    let isNewIncident = false;

    if (incidentId && existingIncident) {
      // Update existing incident
      const existingMedia = existingIncident.mediaUrls ?? [];
      await dbUpdateIncident(incidentId, {
        aiAnalysis: analysis,
        mediaUrls: [...existingMedia, ...imageParts.map((_, i) => `photo-upload-${i}`)],
        severity: finalSeverity,
      });
      resultIncidentId = incidentId;
    } else {
      // Create new incident
      const incidentType = ['flood', 'fire', 'structural', 'medical', 'hazmat', 'earthquake', 'infrastructure', 'cyber'].includes(type)
        ? type as 'flood' | 'fire' | 'structural' | 'medical' | 'hazmat' | 'earthquake' | 'infrastructure' | 'cyber'
        : 'other' as const;

      const newIncident = await dbInsertIncident({
        title: title!,
        description: description || analysis.summary || '',
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
      tag: `${tagPrefix} // PHOTO`,
      tagColor: finalSeverity >= 4 ? 'text-error' : finalSeverity >= 3 ? 'text-tertiary' : 'text-on-surface-variant',
      title: title || analysis.summary || 'Photo Analysis',
      desc: analysis.summary || 'AI photo analysis completed',
      source: 'Photo Upload',
      time: 'just now',
      icon: 'photo_camera',
      incidentId: resultIncidentId,
    });

    addActivity(
      'Photo Analyzer',
      `Analyzed ${images.length} photo(s) for incident "${title || existingIncident?.title}" — severity ${finalSeverity}, ${analysis.hazards?.length ?? 0} hazards detected`,
    );

    // Persist full analysis to agent_logs so it can be viewed later on the incident page
    try {
      await dbInsertAgentLog({
        agentType: 'triage',
        incidentId: resultIncidentId,
        sessionId: crypto.randomUUID(),
        stepIndex: 0,
        decisionRationale: `Photo Analysis: ${analysis.summary ?? 'Image analyzed'}. Severity: ${finalSeverity}. Hazards: ${(analysis.hazards ?? []).join(', ') || 'none detected'}.`,
        confidenceScore: analysis.confidence ?? null,
        toolCallsAttempted: ['photo_analysis'],
        toolCallsSucceeded: ['photo_analysis'],
        toolCallsFailed: [],
        actionsEscalated: [],
        rawStepJson: JSON.stringify({
          type: 'photo_analysis',
          imagesProcessed: images.length,
          analysis,
        }),
        timestamp: new Date().toISOString(),
      });
    } catch (logErr) {
      console.error('[photos/analyze] agent log persist failed (non-fatal):', logErr);
    }

    if (isNewIncident) {
      updateStats({
        activeIncidents: stats.activeIncidents + 1,
      });
    }

    return Response.json({
      success: true,
      data: {
        incidentId: resultIncidentId,
        analysis,
        imagesProcessed: images.length,
        isNewIncident,
      },
    });
  } catch (error) {
    console.error('[photos/analyze] error:', error);
    return Response.json(
      {
        success: false,
        error: {
          code: 'ANALYSIS_ERROR',
          message: error instanceof Error ? error.message : 'Photo analysis failed',
        },
      },
      { status: 500 },
    );
  }
}
