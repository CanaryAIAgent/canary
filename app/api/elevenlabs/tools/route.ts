/**
 * Canary — ElevenLabs Conversational AI server tool webhook
 *
 * POST /api/elevenlabs/tools
 *
 * ElevenLabs calls this endpoint when the voice agent invokes a server tool.
 * We dispatch to the same Canary backend functions that the text chat uses.
 */

import {
  addSignal,
  addActivity,
  updateStats,
  getDashboardData,
} from '@/lib/data/store';
import {
  dbInsertIncident,
  dbInsertAgentLog,
} from '@/lib/db';

interface ToolPayload {
  tool_call_id: string;
  tool_name: string;
  parameters: Record<string, unknown>;
}

export async function POST(req: Request) {
  let payload: ToolPayload;
  try {
    payload = (await req.json()) as ToolPayload;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { tool_name, parameters } = payload;

  try {
    switch (tool_name) {
      case 'push_signal': {
        const p = parameters as {
          title: string;
          description: string;
          severity: number;
          incident_type: string;
          source?: string;
          location?: string;
        };

        const severity = Math.round(Math.min(5, Math.max(1, p.severity ?? 3)));
        const tagPrefix = severity >= 4 ? 'CRITICAL' : severity >= 3 ? 'ALERT' : 'MONITOR';

        const card = addSignal({
          tag: `${tagPrefix} // VOICE`,
          tagColor: severity >= 4 ? 'text-error' : severity >= 3 ? 'text-tertiary' : 'text-on-surface-variant',
          title: p.title,
          desc: p.description,
          source: p.source ?? 'Voice Report',
          time: 'just now',
          icon: 'mic',
        });

        const validTypes = ['flood', 'fire', 'structural', 'medical', 'hazmat', 'earthquake', 'infrastructure', 'cyber', 'other'] as const;
        const iType = validTypes.includes(p.incident_type as typeof validTypes[number])
          ? (p.incident_type as typeof validTypes[number])
          : ('other' as const);

        const incident = await dbInsertIncident({
          title: p.title,
          description: p.description,
          type: iType,
          severity,
          status: 'new',
          location: p.location ? { description: p.location } : {},
          sources: ['voice'],
          mediaUrls: [],
          corroboratedBySignals: [],
          linkedCameraAlerts: [],
        });

        updateStats({ activeIncidents: getDashboardData().stats.activeIncidents + 1 });
        addActivity('Voice Agent', `Reported: ${p.title} (severity ${severity})`);

        return Response.json({
          success: true,
          signal_id: card.id,
          incident_id: incident.id,
          message: `Signal "${p.title}" pushed to dashboard and incident created`,
        });
      }

      case 'create_incident': {
        const p = parameters as {
          title: string;
          description: string;
          severity: number;
          incident_type: string;
          location?: string;
        };

        const severity = Math.round(Math.min(5, Math.max(1, p.severity ?? 3)));
        const validTypes = ['flood', 'fire', 'structural', 'medical', 'hazmat', 'earthquake', 'infrastructure', 'cyber', 'other'] as const;
        const iType = validTypes.includes(p.incident_type as typeof validTypes[number])
          ? (p.incident_type as typeof validTypes[number])
          : ('other' as const);

        const incident = await dbInsertIncident({
          title: p.title,
          description: p.description,
          type: iType,
          severity,
          status: 'new',
          location: p.location ? { description: p.location } : {},
          sources: ['voice'],
          mediaUrls: [],
          corroboratedBySignals: [],
          linkedCameraAlerts: [],
        });

        updateStats({ activeIncidents: getDashboardData().stats.activeIncidents + 1 });
        addActivity('Voice Agent', `Created incident: ${p.title}`);

        return Response.json({
          success: true,
          incident_id: incident.id,
          message: `Incident "${p.title}" created`,
        });
      }

      case 'check_shelter_capacity': {
        const p = parameters as { zip_code?: string; location?: string };
        // Return mock shelter data (same as the chat tool)
        const shelters = [
          { name: 'Central Community Center', capacity: 200, currentOccupancy: 45, address: `${p.zip_code ?? p.location ?? 'Downtown'} Main St` },
          { name: 'Memorial High School Gym', capacity: 350, currentOccupancy: 120, address: `${p.zip_code ?? p.location ?? 'North'} School Rd` },
          { name: 'Faith Baptist Church', capacity: 100, currentOccupancy: 88, address: `${p.zip_code ?? p.location ?? 'East'} Church Ave` },
        ];
        return Response.json({ success: true, shelters });
      }

      case 'log_activity': {
        const p = parameters as { actor?: string; action: string };
        const entry = addActivity(p.actor ?? 'Voice Agent', p.action);

        await dbInsertAgentLog({
          agentType: 'orchestrator',
          sessionId: crypto.randomUUID(),
          stepIndex: 0,
          decisionRationale: `${p.actor ?? 'Voice Agent'}: ${p.action}`,
          toolCallsAttempted: [],
          toolCallsSucceeded: [],
          toolCallsFailed: [],
          actionsEscalated: [],
          timestamp: new Date().toISOString(),
        }).catch(() => {});

        return Response.json({ success: true, activity_id: entry.id });
      }

      default:
        return Response.json(
          { error: `Unknown tool: ${tool_name}` },
          { status: 400 },
        );
    }
  } catch (err) {
    console.error(`[elevenlabs/tools] ${tool_name} failed:`, err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Tool execution failed' },
      { status: 500 },
    );
  }
}
