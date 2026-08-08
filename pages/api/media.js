'use strict';

/**
 * POST /api/media
 *
 * Downloads an inbound image or audio file on Make's behalf, so the channel's
 * 360dialog API key never has to be configured inside Make.
 *
 * Needed because the site promises the assistant understands photos and voice
 * notes: /api/inbound forwards only a `media_id`, and turning that into bytes
 * for Groq (vision / Whisper) requires the key held in Supabase.
 *
 * Auth: same shared secret as /api/send — `x-bridge-secret` or `Bearer`.
 *
 * Body: { "client_id": "...", "media_id": "..." }
 * Reply: { "ok": true, "mime_type": "audio/ogg", "size": 12345, "base64": "..." }
 *
 * ---------------------------------------------------------------------------
 * VERIFY BEFORE GOING LIVE — same caveat as api/_lib/d360.js. This follows the
 * WhatsApp Cloud API two-step pattern (GET the media id for a URL, then GET the
 * URL with the key). Confirm against https://docs.360dialog.com/ for your
 * account; the response logs the shape it got back to make that quick.
 * ---------------------------------------------------------------------------
 */

const { readJson, json, checkSharedSecret } = require('../../lib/bridge/http');
const supabase = require('../../lib/bridge/supabase');
const d360 = require('../../lib/bridge/d360');

// Vercel Hobby functions have a modest response budget; refuse anything that
// would not survive base64 expansion rather than failing opaquely.
const MAX_BYTES = 4 * 1024 * 1024;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'method_not_allowed' });
  }

  if (!process.env.BRIDGE_SEND_SECRET) {
    console.error('[media] BRIDGE_SEND_SECRET is not set — refusing to run open');
    return json(res, 500, { error: 'server_not_configured' });
  }

  if (!checkSharedSecret(req, process.env.BRIDGE_SEND_SECRET)) {
    return json(res, 401, { error: 'unauthorized' });
  }

  const { body } = await readJson(req);
  if (!body || !body.client_id || !body.media_id) {
    return json(res, 400, { error: 'missing_client_id_or_media_id' });
  }

  let client;
  try {
    client = await supabase.findOne(
      'whatsapp_clients', 'client_id', String(body.client_id), 'client_id,api_key'
    );
  } catch (error) {
    console.error('[media] Supabase lookup failed:', error.message);
    return json(res, 502, { error: 'lookup_failed' });
  }

  if (!client || !client.api_key) {
    return json(res, 404, { error: 'unknown_client' });
  }

  const key = client.api_key;
  const mediaId = encodeURIComponent(String(body.media_id));

  try {
    // Step 1 — resolve the media id to a download URL.
    const metaResponse = await fetch(`${d360.WABA_BASE}/${mediaId}`, {
      headers: { 'D360-API-KEY': key }
    });
    const meta = await metaResponse.json().catch(() => ({}));

    if (!metaResponse.ok || !meta.url) {
      console.error('[media] metadata lookup failed:', metaResponse.status, JSON.stringify(meta));
      return json(res, 502, { error: 'media_lookup_failed', status: metaResponse.status, details: meta });
    }

    // Step 2 — fetch the bytes. 360dialog serves media from its own host, so
    // rewrite whatever host the metadata returned onto WABA_BASE.
    const downloadUrl = String(meta.url).replace(/^https?:\/\/[^/]+/, d360.WABA_BASE);

    const fileResponse = await fetch(downloadUrl, { headers: { 'D360-API-KEY': key } });
    if (!fileResponse.ok) {
      console.error('[media] download failed:', fileResponse.status);
      return json(res, 502, { error: 'media_download_failed', status: fileResponse.status });
    }

    const buffer = Buffer.from(await fileResponse.arrayBuffer());

    if (buffer.length > MAX_BYTES) {
      return json(res, 413, { error: 'media_too_large', size: buffer.length, max: MAX_BYTES });
    }

    return json(res, 200, {
      ok: true,
      media_id: body.media_id,
      mime_type: meta.mime_type || fileResponse.headers.get('content-type') || null,
      size: buffer.length,
      base64: buffer.toString('base64')
    });
  } catch (error) {
    console.error('[media] request failed:', error.message);
    return json(res, 502, { error: 'media_failed' });
  }
};

/**
 * Next.js parses request bodies by default, which drains the stream before
 * readJson() can see the raw bytes. The 360dialog HMAC is computed over those
 * exact bytes, so the parser has to stay off for every bridge route.
 */
module.exports.config = { api: { bodyParser: false } };
