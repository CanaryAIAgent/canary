/**
 * Canary — ElevenLabs Conversational AI signed URL
 *
 * GET /api/elevenlabs/signed-url
 *
 * Returns a short-lived signed WebSocket URL so the client can connect
 * to the ElevenLabs Conversational AI agent without exposing the API key.
 */

export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;

  if (!apiKey || !agentId) {
    return Response.json(
      { error: 'ElevenLabs not configured — set ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID' },
      { status: 500 },
    );
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
    { headers: { 'xi-api-key': apiKey } },
  );

  if (!res.ok) {
    const body = await res.text();
    console.error('[elevenlabs/signed-url] upstream error:', res.status, body);
    return Response.json(
      { error: 'Failed to get signed URL from ElevenLabs' },
      { status: res.status },
    );
  }

  const { signed_url } = (await res.json()) as { signed_url: string };
  return Response.json({ signedUrl: signed_url });
}
