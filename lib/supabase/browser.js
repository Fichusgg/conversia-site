'use client';

import { createBrowserClient } from '@supabase/ssr';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

/**
 * Browser Supabase client — used only for signing in and out.
 *
 * All dashboard data is fetched server-side, so this client never reads
 * business tables. The publishable key it carries is public by design; RLS and
 * the column grants in supabase/schema.sql are what protect the data.
 */
let cached = null;

export function supabaseBrowser() {
  if (cached) return cached;

  cached = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  return cached;
}
