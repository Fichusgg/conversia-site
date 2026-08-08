'use strict';

/**
 * Minimal Supabase client over the PostgREST HTTP API.
 *
 * Deliberately dependency-free: the site has no build step and no package.json,
 * so functions talk to Supabase with global fetch (Node 18+) instead of pulling
 * in @supabase/supabase-js. Keeps deploys instant and the free tier untouched.
 *
 * SUPABASE_SERVICE_ROLE_KEY bypasses row level security and must never reach
 * the browser. It is only ever read here, inside serverless functions.
 */

const { requireEnv } = require('./http');

function baseUrl() {
  requireEnv('SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY');
  return process.env.SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1';
}

function headers(extra) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Object.assign(
    {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    extra || {}
  );
}

async function request(path, options = {}) {
  const response = await fetch(baseUrl() + path, {
    method: options.method || 'GET',
    headers: headers(options.headers),
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      data = text;
    }
  }

  if (!response.ok) {
    const error = new Error(
      `Supabase ${options.method || 'GET'} ${path} failed (${response.status}): ` +
      (typeof data === 'string' ? data : JSON.stringify(data))
    );
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
}

/** Insert rows. Returns the inserted rows. */
async function insert(table, rows) {
  return request(`/${table}`, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: Array.isArray(rows) ? rows : [rows]
  });
}

/**
 * Insert or update on conflict with `onConflict` column.
 * Requires a unique constraint on that column.
 */
async function upsert(table, rows, onConflict) {
  const query = onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : '';
  return request(`/${table}${query}`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: Array.isArray(rows) ? rows : [rows]
  });
}

/**
 * Fetch a single row matching an exact column value, or null.
 *
 *   findOne('whatsapp_clients', 'phone_number_id', '123', 'client_id,api_key')
 */
async function findOne(table, column, value, select = '*') {
  const query =
    `?${encodeURIComponent(column)}=eq.${encodeURIComponent(value)}` +
    `&select=${encodeURIComponent(select)}&limit=1`;

  const rows = await request(`/${table}${query}`);
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

module.exports = { request, insert, upsert, findOne };
