'use strict';

/**
 * 360dialog Partner API + WABA helpers.
 *
 * ---------------------------------------------------------------------------
 * VERIFY BEFORE GOING LIVE
 * ---------------------------------------------------------------------------
 * The endpoint paths and payload shapes below follow 360dialog's Partner API v2
 * as documented at https://docs.360dialog.com/partner/. They are isolated in
 * this one file precisely because 360dialog has changed them between versions.
 * After your Partner account is approved, run through MANUAL-STEPS.md §7 and
 * confirm each of the three calls against the current docs before trusting the
 * automated flow. `/api/partner-events` logs every payload it receives, which
 * is the fastest way to see the real field names for your account.
 * ---------------------------------------------------------------------------
 */

const { requireEnv } = require('./http');

const HUB_BASE = process.env.D360_HUB_BASE || 'https://hub.360dialog.io/api/v2';
const WABA_BASE = process.env.D360_WABA_BASE || 'https://waba-v2.360dialog.io';

/** Exchange partner credentials for a short-lived bearer token. */
async function getPartnerToken() {
  requireEnv('D360_PARTNER_USERNAME', 'D360_PARTNER_PASSWORD');

  const response = await fetch(`${HUB_BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: process.env.D360_PARTNER_USERNAME,
      password: process.env.D360_PARTNER_PASSWORD
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.access_token) {
    const error = new Error(`360dialog token request failed (${response.status})`);
    error.details = data;
    throw error;
  }

  return data.access_token;
}

/**
 * Generate a permanent API key for one client channel.
 * This key is what authenticates every later call for that number.
 */
async function generateChannelApiKey(channelId, token) {
  requireEnv('D360_PARTNER_ID');

  const partnerId = process.env.D360_PARTNER_ID;
  const url = `${HUB_BASE}/partners/${encodeURIComponent(partnerId)}` +
              `/channels/${encodeURIComponent(channelId)}/api_keys`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.api_key) {
    const error = new Error(`360dialog API key generation failed (${response.status})`);
    error.details = data;
    throw error;
  }

  return data.api_key;
}

/**
 * Point one channel's inbound webhook at our /api/inbound endpoint.
 * Authenticated with that channel's own API key, not the partner token.
 */
async function setChannelWebhook(apiKey, webhookUrl) {
  const response = await fetch(`${WABA_BASE}/v1/configs/webhook`, {
    method: 'POST',
    headers: {
      'D360-API-KEY': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url: webhookUrl })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(`360dialog webhook registration failed (${response.status})`);
    error.details = data;
    throw error;
  }

  return data;
}

/** Send a WhatsApp message through one client's channel. */
async function sendMessage(apiKey, message) {
  const response = await fetch(`${WABA_BASE}/messages`, {
    method: 'POST',
    headers: {
      'D360-API-KEY': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(message)
  });

  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

module.exports = {
  HUB_BASE,
  WABA_BASE,
  getPartnerToken,
  generateChannelApiKey,
  setChannelWebhook,
  sendMessage
};
