'use strict';

/**
 * POST /api/partner-events
 *
 * 360dialog Partner webhook. Set this URL in the Partner Hub under
 * Organization > Webhooks (see MANUAL-STEPS.md §7).
 *
 * When a client's channel goes live we:
 *   1. generate that channel's API key via the Partner API,
 *   2. register OUR /api/inbound as that number's inbound webhook,
 *   3. upsert the client into Supabase `whatsapp_clients`.
 *
 * Every payload is logged in full. On the first real event, read the Vercel
 * function log and confirm the field names below match what your account
 * actually sends — 360dialog's partner payload shape varies by event type.
 */

const crypto = require('crypto');
const { readJson, json, requireEnv } = require('./_lib/http');
const supabase = require('./_lib/supabase');
const d360 = require('./_lib/d360');

/**
 * Verify the HMAC-SHA256 signature 360dialog sends with partner webhooks.
 *
 * The header name is configurable because 360dialog has used more than one.
 * Both hex and base64 digests are accepted, with or without a "sha256=" prefix.
 * Fails closed unless D360_ALLOW_UNSIGNED === 'true', which exists only so you
 * can capture the first payload and see the real header before locking it down.
 */
function verifySignature(req, raw, rawIsAuthentic) {
  const secret = process.env.D360_PARTNER_WEBHOOK_SECRET;
  const allowUnsigned = process.env.D360_ALLOW_UNSIGNED === 'true';

  if (!secret) {
    return allowUnsigned
      ? { ok: true, reason: 'no_secret_configured_but_unsigned_allowed' }
      : { ok: false, reason: 'no_secret_configured' };
  }

  if (!rawIsAuthentic) {
    return allowUnsigned
      ? { ok: true, reason: 'raw_body_unavailable_but_unsigned_allowed' }
      : { ok: false, reason: 'raw_body_unavailable' };
  }

  const headerName = (process.env.D360_SIGNATURE_HEADER || 'x-360dialog-signature').toLowerCase();
  const received = req.headers[headerName];

  if (!received) {
    return allowUnsigned
      ? { ok: true, reason: `header_${headerName}_missing_but_unsigned_allowed` }
      : { ok: false, reason: `header_${headerName}_missing` };
  }

  const provided = String(received).replace(/^sha256=/i, '').trim();

  // An Hmac cannot be reused or copied, so digest into each encoding separately.
  const digest = (encoding) =>
    crypto.createHmac('sha256', secret).update(raw).digest(encoding);
  const candidates = [digest('hex'), digest('base64')];

  const matched = candidates.some((expected) => {
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(provided, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  });

  return matched ? { ok: true, reason: 'signature_valid' } : { ok: false, reason: 'signature_mismatch' };
}

/** Pull the fields we need out of a partner event, tolerating shape differences. */
function extractChannel(body) {
  const payload = body || {};
  const source = payload.data || payload.channel || payload.payload || payload;

  const pick = (...keys) => {
    for (const key of keys) {
      const value = source[key] !== undefined ? source[key] : payload[key];
      if (value !== undefined && value !== null && value !== '') return String(value);
    }
    return null;
  };

  return {
    event: pick('event', 'event_type', 'type', 'status'),
    channelId: pick('channel_id', 'channelId', 'id'),
    clientId: pick('client_id', 'clientId', 'partner_client_id'),
    wabaId: pick('waba_id', 'wabaId', 'waba_account_id'),
    phoneNumber: pick('phone_number', 'phoneNumber', 'number'),
    phoneNumberId: pick('phone_number_id', 'phoneNumberId'),
    businessName: pick('client_name', 'business_name', 'name')
  };
}

function isChannelLive(event) {
  if (!event) return false;
  const normalized = String(event).toLowerCase().replace(/[\s_-]+/g, '');
  return normalized.includes('channellive') || normalized === 'live' || normalized.includes('running');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'method_not_allowed' });
  }

  const { raw, body, rawIsAuthentic } = await readJson(req);

  const verdict = verifySignature(req, raw, rawIsAuthentic);
  if (!verdict.ok) {
    console.warn('[partner-events] rejected:', verdict.reason);
    // raw_* are setup diagnostics, not secrets: they only report whether the
    // request stream was readable, which is what HMAC verification depends on.
    return json(res, 401, {
      error: 'invalid_signature',
      reason: verdict.reason,
      raw_bytes: raw.length,
      raw_authentic: rawIsAuthentic
    });
  }

  // Full payload logging — this is how you discover the real field names.
  console.log('[partner-events] payload:', JSON.stringify(body));

  const channel = extractChannel(body);
  console.log('[partner-events] extracted:', JSON.stringify(channel));

  // Acknowledge fast; 360dialog retries on slow or failed responses.
  if (!isChannelLive(channel.event)) {
    return json(res, 200, { received: true, handled: false, event: channel.event });
  }

  if (!channel.channelId) {
    console.error('[partner-events] channel live but no channel id in payload');
    return json(res, 200, { received: true, handled: false, error: 'missing_channel_id' });
  }

  try {
    requireEnv('D360_PARTNER_ID', 'PUBLIC_BASE_URL');

    const token = await d360.getPartnerToken();
    const apiKey = await d360.generateChannelApiKey(channel.channelId, token);

    const inboundUrl = process.env.PUBLIC_BASE_URL.replace(/\/+$/, '') + '/api/inbound';
    await d360.setChannelWebhook(apiKey, inboundUrl);

    await supabase.upsert(
      'whatsapp_clients',
      {
        client_id: channel.clientId || channel.channelId,
        channel_id: channel.channelId,
        phone_number_id: channel.phoneNumberId,
        waba_id: channel.wabaId,
        phone_number: channel.phoneNumber,
        business_name: channel.businessName,
        api_key: apiKey,
        webhook_registered_at: new Date().toISOString(),
        status: 'live',
        updated_at: new Date().toISOString()
      },
      'client_id'
    );

    console.log('[partner-events] channel provisioned:', channel.channelId);
    return json(res, 200, { received: true, handled: true, channel_id: channel.channelId });
  } catch (error) {
    // Still 200: a 5xx makes 360dialog retry, and the failure is ours to fix.
    console.error('[partner-events] provisioning failed:', error.message, error.details || '');
    return json(res, 200, { received: true, handled: false, error: 'provisioning_failed' });
  }
};
