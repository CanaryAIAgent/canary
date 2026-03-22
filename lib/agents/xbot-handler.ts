/**
 * Canary — X Bot AI Handler
 *
 * Receives parsed XMention payloads from the polling route,
 * uses Gemini to analyze the content for disaster signals,
 * searches for related incidents, and either links to an existing
 * incident or creates a new one.
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { type XMention } from '@/lib/schemas';
import { getFlashModel } from '@/lib/ai/config';
import { supabase, dbInsertIncident, dbInsertAgentLog } from '@/lib/db';
import { addSignal, addActivity, updateStats, updateRecommendation, stats } from '@/lib/data/store';

export interface XBotHandlerResult {
  reply: string;
  shouldCreateIncident: boolean;
  incidentId?: string;
  suggestedSeverity?: number;
  extractedLocation?: string;
  isLinkedToExisting?: boolean;
}

// Schema for the AI analysis of an X mention
const XMentionAnalysisSchema = z.object({
  isDisasterRelated: z.boolean().describe('Whether the mention describes a disaster, emergency, or hazard'),
  summary: z.string().describe('Brief summary of the reported situation'),
  severity: z.number().min(1).max(5).describe('Severity 1 (minor) to 5 (critical)'),
  incidentType: z.enum(['flood', 'fire', 'structural', 'medical', 'hazmat', 'earthquake', 'infrastructure', 'cyber', 'other'])
    .describe('Best matching incident type'),
  extractedLocation: z.string().optional().describe('Any location mentioned in the text'),
  searchKeywords: z.array(z.string()).describe('2-5 keywords to search for related existing incidents'),
  suggestedReply: z.string().describe('Professional, concise reply to the tweet author (max 280 chars)'),
  confidence: z.number().min(0).max(1).describe('Confidence in this analysis'),
});

/**
 * Search for existing incidents that match the mention content.
 */
async function searchRelatedIncidents(keywords: string[], incidentType: string): Promise<{
  id: string;
  title: string;
  type: string;
  severity: number;
  status: string;
} | null> {
  try {
    // Build search patterns from keywords
    const patterns = keywords
      .filter(k => k.length > 2)
      .map(k => `title.ilike.%${k}%,description.ilike.%${k}%,location_description.ilike.%${k}%`);

    if (patterns.length === 0) return null;

    const { data: rows, error } = await supabase
      .from('incidents')
      .select('id, title, type, severity, status, created_at')
      .in('status', ['new', 'triaging', 'responding', 'escalated'])
      .or(patterns.join(','))
      .order('created_at', { ascending: false })
      .limit(5);

    if (error || !rows || rows.length === 0) {
      // Fall back to type-based search
      const { data: typeRows } = await supabase
        .from('incidents')
        .select('id, title, type, severity, status')
        .eq('type', incidentType)
        .in('status', ['new', 'triaging', 'responding', 'escalated'])
        .order('created_at', { ascending: false })
        .limit(3);

      if (typeRows && typeRows.length > 0) {
        return typeRows[0] as { id: string; title: string; type: string; severity: number; status: string };
      }
      return null;
    }

    // Return the most relevant match
    return rows[0] as { id: string; title: string; type: string; severity: number; status: string };
  } catch (err) {
    console.error('[xbot-handler] Search failed:', err);
    return null;
  }
}

/**
 * Process an X mention and generate a reply.
 * Uses Gemini to analyze the mention, searches for related incidents,
 * and either links to an existing incident or creates a new one.
 */
export async function handleXMention(mention: XMention): Promise<XBotHandlerResult> {
  console.log('[xbot-handler] Processing mention:', {
    id: mention.id,
    author: mention.authorHandle,
    text: mention.text.slice(0, 80),
    hasMedia: mention.mediaUrls.length > 0,
    hasLocation: !!mention.geo,
  });

  try {
    // 1. AI analysis of the mention
    const { object: analysis } = await generateObject({
      model: getFlashModel(),
      schema: XMentionAnalysisSchema,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: [
                'Analyze this X/Twitter mention sent to an Emergency Operations Center bot.',
                'Determine if it describes a disaster, emergency, or hazard situation.',
                'Extract location info, classify severity, suggest a reply, and provide search keywords.',
                '',
                `Author: @${mention.authorHandle}`,
                `Text: ${mention.text}`,
                `Has media: ${mention.mediaUrls.length > 0 ? 'Yes' : 'No'}`,
                `Has location: ${mention.geo ? `Yes (${mention.geo.coordinates?.lat}, ${mention.geo.coordinates?.lng})` : 'No'}`,
                mention.lang ? `Language: ${mention.lang}` : '',
              ].filter(Boolean).join('\n'),
            },
          ],
        },
      ],
    });

    // 2. If not disaster related, return a simple acknowledgement
    if (!analysis.isDisasterRelated) {
      return {
        reply: analysis.suggestedReply || 'Thanks for reaching out. Our team monitors for emergency situations. If you need to report an incident, please include details about the situation and location.',
        shouldCreateIncident: false,
      };
    }

    // 3. Search for related existing incidents
    const existingIncident = await searchRelatedIncidents(
      analysis.searchKeywords,
      analysis.incidentType,
    );

    let incidentId: string | undefined;
    let isLinkedToExisting = false;

    if (existingIncident) {
      // Link to existing incident
      incidentId = existingIncident.id;
      isLinkedToExisting = true;

      // Add the social signal to corroborated_by_signals
      try {
        const { data: current } = await supabase
          .from('incidents')
          .select('corroborated_by_signals')
          .eq('id', incidentId)
          .single();

        const existing = (current?.corroborated_by_signals as string[]) ?? [];
        if (!existing.includes(mention.id)) {
          await supabase
            .from('incidents')
            .update({
              corroborated_by_signals: [...existing, mention.id],
            })
            .eq('id', incidentId);
        }
      } catch {
        // Non-fatal — linking failed but incident exists
      }

      addActivity(
        'X Bot',
        `Linked @${mention.authorHandle}'s report to existing incident "${existingIncident.title}" (${existingIncident.status})`,
      );

      console.log(`[xbot-handler] Linked mention ${mention.id} to existing incident ${incidentId}`);
    } else {
      // Create new incident from the mention
      try {
        const locationObj = mention.geo?.coordinates
          ? { lat: mention.geo.coordinates.lat, lng: mention.geo.coordinates.lng, description: analysis.extractedLocation }
          : analysis.extractedLocation
          ? { description: analysis.extractedLocation }
          : {};

        const newIncident = await dbInsertIncident({
          title: analysis.summary.slice(0, 120),
          description: `Reported by @${mention.authorHandle} on X: ${mention.text}`,
          type: analysis.incidentType,
          severity: analysis.severity,
          status: 'new',
          location: locationObj,
          sources: ['social'],
          mediaUrls: mention.mediaUrls,
          corroboratedBySignals: [mention.id],
          linkedCameraAlerts: [],
        });

        incidentId = newIncident.id;
        updateStats({ activeIncidents: stats.activeIncidents + 1 });

        addActivity(
          'X Bot',
          `Created incident from @${mention.authorHandle}: "${analysis.summary.slice(0, 80)}" — severity ${analysis.severity}`,
        );

        // Auto-populate triage panel
        updateRecommendation({
          actionSequence: analysis.summary,
          confidenceScore: Math.round(analysis.confidence * 100),
          stats: [
            { label: 'Severity', value: `${analysis.severity}/5` },
            { label: 'Source', value: `@${mention.authorHandle}` },
            { label: 'Type', value: analysis.incidentType },
          ],
          ctaLabel: 'Approve Dispatch',
        });

        console.log(`[xbot-handler] Created new incident ${incidentId} from mention ${mention.id}`);
      } catch (err) {
        console.error('[xbot-handler] Failed to create incident:', err);
      }
    }

    // 4. Push signal to dashboard
    const tagPrefix = analysis.severity >= 4 ? 'CRITICAL' : analysis.severity >= 3 ? 'ALERT' : 'MONITOR';
    addSignal({
      tag: `${tagPrefix} // X`,
      tagColor: analysis.severity >= 4 ? 'text-error' : analysis.severity >= 3 ? 'text-tertiary' : 'text-on-surface-variant',
      title: analysis.summary.slice(0, 80),
      desc: mention.text.slice(0, 150),
      source: `@${mention.authorHandle}`,
      time: 'just now',
      icon: 'person_search',
      incidentId,
    });

    // 5. Log to agent_logs
    try {
      await dbInsertAgentLog({
        agentType: 'xbot',
        incidentId: incidentId ?? undefined,
        sessionId: crypto.randomUUID(),
        stepIndex: 0,
        decisionRationale: `X mention from @${mention.authorHandle}: ${analysis.summary}. ${isLinkedToExisting ? `Linked to existing incident.` : `Created new incident.`} Severity: ${analysis.severity}. Confidence: ${analysis.confidence}.`,
        confidenceScore: analysis.confidence,
        toolCallsAttempted: ['analyzeMention', 'searchIncidents', isLinkedToExisting ? 'linkIncident' : 'createIncident'],
        toolCallsSucceeded: ['analyzeMention', 'searchIncidents', isLinkedToExisting ? 'linkIncident' : 'createIncident'],
        toolCallsFailed: [],
        actionsEscalated: analysis.severity >= 4 ? ['high_severity_alert'] : [],
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Non-fatal
    }

    // 6. Build reply
    let reply = analysis.suggestedReply;
    if (isLinkedToExisting && existingIncident) {
      reply = `${reply} This has been linked to an active incident we're tracking.`;
    } else if (incidentId) {
      reply = `${reply} We've created an incident record and our team has been notified.`;
    }

    // Truncate to X's character limit
    if (reply.length > 270) reply = reply.slice(0, 267) + '...';

    return {
      reply,
      shouldCreateIncident: !isLinkedToExisting && !!incidentId,
      incidentId,
      suggestedSeverity: analysis.severity,
      extractedLocation: analysis.extractedLocation,
      isLinkedToExisting,
    };
  } catch (err) {
    console.error('[xbot-handler] AI analysis failed:', err);

    // Fallback to simple heuristic
    const isDisasterRelated = /flood|fire|collapse|emergency|damage|help|trapped|evacuate/i.test(mention.text);

    return {
      reply: isDisasterRelated
        ? 'Thank you for the report. Our team is reviewing this information and will respond shortly.'
        : 'Thanks for reaching out. Our team will review your message.',
      shouldCreateIncident: false,
    };
  }
}
