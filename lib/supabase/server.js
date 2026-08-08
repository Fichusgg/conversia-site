import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

/**
 * Auth-scoped Supabase client for Server Components, Server Actions and Route
 * Handlers. Reads the session from cookies and is bound to the signed-in admin,
 * so it is subject to RLS — unlike `supabaseAdmin()`.
 *
 * Uses the publishable key, which is safe to expose; the session cookie is what
 * actually grants access.
 */
export async function supabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // Middleware refreshes the session, so this is safe to ignore.
          }
        }
      }
    }
  );
}

/**
 * The signed-in user, or null.
 *
 * Always uses getUser(), which revalidates the token with Supabase. Never trust
 * getSession() for authorisation — it only decodes the cookie, which the
 * browser controls.
 */
export async function getAdminUser() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user ?? null;
}

/**
 * Guard for route handlers. Returns the user, or throws a 401-shaped error.
 */
export async function requireAdmin() {
  const user = await getAdminUser();
  if (!user) {
    const error = new Error('Não autenticado');
    error.status = 401;
    throw error;
  }
  return user;
}
