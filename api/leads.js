'use strict';

/**
 * POST /api/leads
 *
 * Backs the "Solicitar demonstração" form on the marketing site. Writes to the
 * Supabase `leads` table — no paid form service involved.
 *
 * Public by design (anyone can submit the form), so it validates hard, drops
 * honeypot hits, and caps field lengths before touching the database.
 */

const { readJson, json, clientIp } = require('./_lib/http');
const supabase = require('./_lib/supabase');

const LIMITS = { nome: 120, whatsapp: 32, email: 160, segmento: 60, mensagem: 2000 };

function clean(value, max) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function validate(body) {
  const errors = {};

  const nome = clean(body.nome, LIMITS.nome);
  if (nome.length < 2) errors.nome = 'Informe seu nome.';

  const whatsapp = clean(body.whatsapp, LIMITS.whatsapp);
  const digits = whatsapp.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 13) errors.whatsapp = 'Informe o WhatsApp com DDD.';

  const email = clean(body.email, LIMITS.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = 'E-mail inválido.';

  const segmento = clean(body.segmento, LIMITS.segmento);
  if (!segmento) errors.segmento = 'Escolha o tipo de negócio.';

  if (body.consentimento !== true) errors.consentimento = 'Consentimento obrigatório.';

  return {
    errors,
    values: {
      nome,
      whatsapp,
      whatsapp_digits: digits,
      email: email || null,
      segmento,
      mensagem: clean(body.mensagem, LIMITS.mensagem) || null
    }
  };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'method_not_allowed' });
  }

  const { body } = await readJson(req);
  if (!body || typeof body !== 'object') {
    return json(res, 400, { error: 'invalid_json' });
  }

  // Honeypot: real people never fill a visually hidden field. Answer 200 so
  // bots see success and do not retry, but write nothing.
  if (typeof body.site === 'string' && body.site.trim() !== '') {
    console.log('[leads] honeypot triggered, discarding submission');
    return json(res, 200, { ok: true });
  }

  const { errors, values } = validate(body);
  if (Object.keys(errors).length) {
    return json(res, 400, { error: 'validation_failed', fields: errors });
  }

  try {
    await supabase.insert('leads', {
      nome: values.nome,
      whatsapp: values.whatsapp,
      whatsapp_digits: values.whatsapp_digits,
      email: values.email,
      segmento: values.segmento,
      mensagem: values.mensagem,
      consentimento: true,
      origem: 'site',
      user_agent: String(req.headers['user-agent'] || '').slice(0, 300),
      ip: clientIp(req)
    });
  } catch (error) {
    console.error('[leads] insert failed:', error.message);
    return json(res, 502, { error: 'storage_failed' });
  }

  return json(res, 201, { ok: true });
};
