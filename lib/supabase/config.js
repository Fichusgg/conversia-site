/**
 * Public Supabase connection details.
 *
 * Both values are public by design: the project URL is visible in every
 * request, and the publishable ("anon") key is meant to ship in browser code.
 * They are inlined into the client bundle at build time regardless, so keeping
 * the real values here as a fallback exposes nothing new — it just means the
 * app works without anyone having to set them first.
 *
 * What actually protects the data is in supabase/schema.sql: RLS is on for
 * every table, and the two secret columns are revoked from the anon and
 * authenticated roles at the column level.
 *
 * Set NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY to point a
 * deployment at a different project.
 *
 * The service-role key is NOT here. It is a real secret and lives only in
 * SUPABASE_SERVICE_ROLE_KEY, read server-side by lib/supabase/admin.js.
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qzgfumucqldtwevkjhji.supabase.co';

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_p0cxIvgUE1mf47rL4MxTgA_EVqWnMLU';
