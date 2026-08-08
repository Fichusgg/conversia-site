'use strict';

/**
 * POST /api/send
 *
 * Called by Make to reply on a client's WhatsApp. Looks up that business's
 * 360dialog API key by `client_id` and forwards the message to
 * https://waba-v2.360dialog.io/messages.
 *
 * The API key never leaves the server: Make only ever knows the `client_id`.
 *
 * Auth: `x-bridge-secret: <BRIDGE_SEND_SECRET>` or `Authorization: Bearer <...>`.
 *
 * Body — either a convenience shape:
 *   { "client_id": "...", "to": "5511999999999", "text": "Olá!" }
 *
 * or a full Cloud API message object, passed through untouched:
 *   { "client_id": "...", "message": { "messaging_product": "whatsapp", ... } }
 */

const { readJson, json, checkSharedSecret } = require('../../lib/bridge/http');
const supabase = require('../../lib/bridge/supabase');
const d360 = require('../../lib/bridge/d360');

function buildMessage(body) {
  if (body.message && typeof body.message === 'object') {
    return Object.assign({ messaging_product: 'whatsapp' }, body.message);
  }

  if (!body.to || !body.text) return null;

  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: String(body.to).replace(/\D/g, ''),
    type: 'text',
    text: { body: String(body.text), preview_url: body.preview_url === true }
  };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'method_not_allowed' });
  }

  if (!process.env.BRIDGE_SEND_SECRET) {
    console.error('[send] BRIDGE_SEND_SECRET is not set — refusing to run open');
    return json(res, 500, { error: 'server_not_configured' });
  }

  if (!checkSharedSecret(req, process.env.BRIDGE_SEND_SECRET)) {
    return json(res, 401, { error: 'unauthorized' });
  }

  const { body } = await readJson(req);
  if (!body || typeof body !== 'object') {
    return json(res, 400, { error: 'invalid_json' });
  }

  if (!body.client_id) {
    return json(res, 400, { error: 'missing_client_id' });
  }

  const message = buildMessage(body);
  if (!message) {
    return json(res, 400, { error: 'missing_message', hint: 'Send either {to,text} or {message}.' });
  }

  let client;
  try {
    client = await supabase.findOne(
      'whatsapp_clients',
      'client_id',
      String(body.client_id),
      'client_id,api_key,status'
    );
  } catch (error) {
    console.error('[send] Supabase lookup failed:', error.message);
    return json(res, 502, { error: 'lookup_failed' });
  }

  if (!client || !client.api_key) {
    return json(res, 404, { error: 'unknown_client' });
  }

  try {
    const result = await d360.sendMessage(client.api_key, message);

    if (!result.ok) {
      console.error('[send] 360dialog rejected the message:', result.status, JSON.stringify(result.data));
      return json(res, 502, { error: 'send_failed', status: result.status, details: result.data });
    }

    return json(res, 200, { sent: true, response: result.data });
  } catch (error) {
    console.error('[send] request to 360dialog failed:', error.message);
    return json(res, 502, { error: 'send_failed' });
  }
};

/**
 * Next.js parses request bodies by default, which drains the stream before
 * readJson() can see the raw bytes. The 360dialog HMAC is computed over those
 * exact bytes, so the parser has to stay off for every bridge route.
 */
module.exports.config = { api: { bodyParser: false } };
