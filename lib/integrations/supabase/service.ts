/**
 * Canary — Supabase service-role client for backend operations.
 *
 * Unlike the cookie-based server client, this uses the service role key
 * and does NOT depend on request context (cookies). Safe to use from
 * agent tool execute functions, background jobs, and anywhere outside
 * the Next.js request/response cycle.
 */

import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: ReturnType<typeof createClient<any>> | null = null;

export function createServiceClient() {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars",
    );
  }

  // Use `any` for the Database generic — we handle row mapping manually in lib/db
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _client = createClient<any>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return _client;
}
