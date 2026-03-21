/**
 * Debug endpoint to check correlation status
 * GET /api/debug/correlation
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get recent mentions
    const { data: mentions, error: mentionsError } = await supabase
      .from('xbot_mentions')
      .select('tweet_id, author_handle, tweet_text, confidence, has_media, has_location, incident_id, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (mentionsError) throw mentionsError;

    // Get recent incidents
    const { data: incidents, error: incidentsError } = await supabase
      .from('incidents')
      .select('id, title, status, corroborated_by_signals, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (incidentsError) throw incidentsError;

    // Check correlation status
    const correlatedMentions = mentions?.filter(m => m.incident_id !== null) || [];
    const uncorrelatedConfirmed = mentions?.filter(m => m.incident_id === null && m.confidence === 'confirmed') || [];
    const potentialMentions = mentions?.filter(m => m.confidence === 'potential') || [];

    return NextResponse.json({
      summary: {
        totalMentions: mentions?.length || 0,
        correlatedMentions: correlatedMentions.length,
        uncorrelatedConfirmed: uncorrelatedConfirmed.length,
        potentialMentions: potentialMentions.length,
        totalIncidents: incidents?.length || 0,
      },
      recentMentions: mentions?.map(m => ({
        tweetId: m.tweet_id,
        author: m.author_handle,
        text: m.tweet_text?.substring(0, 100),
        confidence: m.confidence,
        hasMedia: m.has_media,
        hasLocation: m.has_location,
        linkedToIncident: m.incident_id,
        createdAt: m.created_at,
      })),
      recentIncidents: incidents?.map(i => ({
        id: i.id,
        title: i.title,
        status: i.status,
        corroboratingSignals: i.corroborated_by_signals?.length || 0,
        createdAt: i.created_at,
      })),
      correlatedPairs: correlatedMentions.map(m => ({
        tweetId: m.tweet_id,
        incidentId: m.incident_id,
      })),
    });
  } catch (error) {
    console.error('[debug/correlation] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch correlation data', details: String(error) },
      { status: 500 }
    );
  }
}
