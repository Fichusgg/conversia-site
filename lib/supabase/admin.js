import 'server-only';

import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client.
 *
 * Bypasses Row Level Security, so it must never be imported from a Client
 * Component. The `server-only` import above turns a mistake here into a build
 * error rather than a leaked key.
 *
 * Used by the dashboard's server code and by the WhatsApp bridge routes.
 */
let cached = null;

export function supabaseAdmin() {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set both in Vercel → Settings → Environment Variables.'
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  return cached;
}

/**
 * Columns that must never be sent to the browser in full.
 *
 * The dashboard shows only the last four characters so an admin can tell
 * whether a key is set and which one it is, without the value ever leaving
 * the server.
 */
export function maskSecret(value) {
  if (!value) return null;
  const text = String(value);
  return { set: true, hint: `••••${text.slice(-4)}` };
}
