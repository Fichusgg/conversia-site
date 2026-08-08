'use strict';

/**
 * POST /api/inbound
 *
 * Receives every inbound WhatsApp message for every client channel. Registered
 * automatically per number by /api/partner-events.
 *
 * Flow: look the business up by `phone_number_id`, enrich the payload with who
 * it belongs to, forward it to the Make webhook, and acknowledge.
 *
 * Auth note: this URL is called by 360dialog, which does not send our shared
 * secret. Set BRIDGE_INBOUND_SECRET and append it as `?secret=...` when
 * registering the webhook URL (PUBLIC_BASE_URL is used to build it) so the
 * endpoint is not open to the world. If the secret is unset the endpoint still
 * works, which is fine while testing but should not be the live state.
 */

const { readJson, json, safeEqual } = require('../../lib/bridge/http');
const supabase = require('../../lib/bridge/supabase');

/** Pull identifiers and a flat message summary out of a Cloud API webhook payload. */
function summarize(body) {
  const entry = (body && body.entry && body.entry[0]) || {};
  const change = (entry.changes && entry.changes[0]) || {};
  const value = change.value || {};
  const metadata = value.metadata || {};

  const message = (value.messages && value.messages[0]) || null;
  const contact = (value.contacts && value.contacts[0]) || null;
  const statusUpdate = (value.statuses && value.statuses[0]) || null;

  return {
    phoneNumberId: metadata.phone_number_id || null,
    displayPhoneNumber: metadata.display_phone_number || null,
    wabaId: entry.id || null,
    isStatusOnly: !message && !!statusUpdate,
    message: message
      ? {
          id: message.id,
          from: message.from,
          timestamp: message.timestamp,
          type: message.type,
          text: message.text ? message.text.body : null,
          // Media ids need a separate download call using the channel API key.
          media_id:
            (message.image && message.image.id) ||
            (message.audio && message.audio.id) ||
            (message.voice && message.voice.id) ||
            (message.video && message.video.id) ||
            (message.document && message.document.id) ||
            null,
          mime_type:
            (message.image && message.image.mime_type) ||
            (message.audio && message.audio.mime_type) ||
            (message.video && message.video.mime_type) ||
            (message.document && message.document.mime_type) ||
            null,
          caption: (message.image && message.image.caption) ||
                   (message.video && message.video.caption) || null,
          interactive: message.interactive || null,
          button: message.button || null
        }
      : null,
    contact: contact
      ? { wa_id: contact.wa_id, name: contact.profile ? contact.profile.name : null }
      : null,
    status: statusUpdate || null
  };
}

module.exports = async (req, res) => {
  // 360dialog sends a GET verification probe on some setups.
  if (req.method === 'GET') {
    return json(res, 200, { ok: true });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'method_not_allowed' });
  }

  const expectedSecret = process.env.BRIDGE_INBOUND_SECRET;
  if (expectedSecret) {
    const url = new URL(req.url, 'http://localhost');
    const provided = url.searchParams.get('secret') || req.headers['x-bridge-secret'] || '';
    if (!safeEqual(provided, expectedSecret)) {
      console.warn('[inbound] rejected: bad or missing secret');
      return json(res, 401, { error: 'unauthorized' });
    }
  }

  const { body } = await readJson(req);
  const summary = summarize(body);

  // Delivery receipts arrive constantly; acknowledge without waking Make.
  if (summary.isStatusOnly) {
    return json(res, 200, { received: true, forwarded: false, reason: 'status_update' });
  }

  if (!summary.message) {
    return json(res, 200, { received: true, forwarded: false, reason: 'no_message' });
  }

  if (!summary.phoneNumberId) {
    console.error('[inbound] payload without phone_number_id:', JSON.stringify(body));
    return json(res, 200, { received: true, forwarded: false, reason: 'no_phone_number_id' });
  }

  let client = null;
  try {
    client = await supabase.findOne(
      'whatsapp_clients',
      'phone_number_id',
      summary.phoneNumberId,
      'client_id,business_name,phone_number,waba_id,status'
    );
  } catch (error) {
    console.error('[inbound] Supabase lookup failed:', error.message);
  }

  if (!client) {
    console.warn('[inbound] no business registered for phone_number_id', summary.phoneNumberId);
    return json(res, 200, { received: true, forwarded: false, reason: 'unknown_business' });
  }

  const makeUrl = process.env.MAKE_WEBHOOK_URL;
  if (!makeUrl) {
    console.error('[inbound] MAKE_WEBHOOK_URL is not set — nothing to forward to');
    return json(res, 200, { received: true, forwarded: false, reason: 'no_make_webhook' });
  }

  const enriched = {
    client_id: client.client_id,
    business_name: client.business_name,
    business_phone: client.phone_number,
    waba_id: client.waba_id || summary.wabaId,
    phone_number_id: summary.phoneNumberId,
    display_phone_number: summary.displayPhoneNumber,
    contact: summary.contact,
    message: summary.message,
    received_at: new Date().toISOString()
  };

  try {
    const response = await fetch(makeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enriched)
    });

    if (!response.ok) {
      console.error('[inbound] Make webhook returned', response.status);
    }
  } catch (error) {
    // Never fail the webhook back to 360dialog — that triggers retries and
    // can get the endpoint throttled. Log and move on.
    console.error('[inbound] forwarding to Make failed:', error.message);
  }

  return json(res, 200, { received: true, forwarded: true });
};

/**
 * Next.js parses request bodies by default, which drains the stream before
 * readJson() can see the raw bytes. The 360dialog HMAC is computed over those
 * exact bytes, so the parser has to stay off for every bridge route.
 */
module.exports.config = { api: { bodyParser: false } };
