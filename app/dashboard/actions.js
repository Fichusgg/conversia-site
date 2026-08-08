'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin, supabaseServer } from '@/lib/supabase/server';

/**
 * Every write in the dashboard goes through here.
 *
 * Two rules hold throughout:
 *   1. requireAdmin() runs first, so an unauthenticated caller gets nothing.
 *   2. Writes use the service-role client, which is the only thing allowed to
 *      touch cal_api_key. That value is written but never read back to the UI.
 */

function fail(message) {
  return { ok: false, error: message };
}

/** Empty strings from a form should land as NULL, not ''. */
function clean(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export async function signOut() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect('/login');
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------
export async function saveClientConfig(clientId, formData) {
  await requireAdmin();

  const id = clean(clientId);
  if (!id) return fail('client_id ausente.');

  const patch = {
    business_name: clean(formData.get('business_name')),
    business_type: clean(formData.get('business_type')),
    timezone: clean(formData.get('timezone')) || 'America/Sao_Paulo',
    services: clean(formData.get('services')),
    hours: clean(formData.get('hours')),
    cal_event_type_id: clean(formData.get('cal_event_type_id')),
    system_prompt: clean(formData.get('system_prompt')),
    notes: clean(formData.get('notes')),
    booking_enabled: formData.get('booking_enabled') === 'on',
    status: clean(formData.get('status')) || 'onboarding'
  };

  // The key input is left blank unless the admin is deliberately replacing it,
  // so a blank submit must not wipe a working key.
  const newCalKey = clean(formData.get('cal_api_key'));
  if (newCalKey) patch.cal_api_key = newCalKey;
  if (formData.get('clear_cal_api_key') === 'on') patch.cal_api_key = null;

  const { error } = await supabaseAdmin()
    .from('client_config')
    .update(patch)
    .eq('client_id', id);

  if (error) return fail(error.message);

  revalidatePath('/dashboard/clientes');
  revalidatePath(`/dashboard/clientes/${id}`);
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function createClientConfig(formData) {
  await requireAdmin();

  const clientId = clean(formData.get('client_id'));
  const businessName = clean(formData.get('business_name'));

  if (!clientId) return fail('Informe um identificador para o cliente.');

  const { error } = await supabaseAdmin().from('client_config').insert({
    client_id: clientId,
    business_name: businessName,
    business_type: clean(formData.get('business_type')),
    status: 'onboarding'
  });

  if (error) {
    if (error.code === '23505') return fail('Já existe um cliente com esse identificador.');
    return fail(error.message);
  }

  // The insert trigger seeds the 10 onboarding steps automatically.
  revalidatePath('/dashboard/clientes');
  revalidatePath('/dashboard/onboarding');
  revalidatePath('/dashboard');
  return { ok: true, clientId };
}

// ---------------------------------------------------------------------------
// Onboarding checklist
// ---------------------------------------------------------------------------
export async function toggleOnboardingStep(stepId, done) {
  await requireAdmin();

  const { data, error } = await supabaseAdmin()
    .from('onboarding_checklist')
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq('id', stepId)
    .select('client_id')
    .single();

  if (error) return fail(error.message);

  revalidatePath('/dashboard/onboarding');
  revalidatePath(`/dashboard/clientes/${data.client_id}`);
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function saveStepNotes(stepId, notes) {
  await requireAdmin();

  const { error } = await supabaseAdmin()
    .from('onboarding_checklist')
    .update({ notes: clean(notes) })
    .eq('id', stepId);

  if (error) return fail(error.message);

  revalidatePath('/dashboard/onboarding');
  return { ok: true };
}

/** Offered once every step is ticked. */
export async function markClientActive(clientId) {
  await requireAdmin();

  const { error } = await supabaseAdmin()
    .from('client_config')
    .update({ status: 'ativo' })
    .eq('client_id', clientId);

  if (error) return fail(error.message);

  revalidatePath('/dashboard/onboarding');
  revalidatePath('/dashboard/clientes');
  revalidatePath(`/dashboard/clientes/${clientId}`);
  revalidatePath('/dashboard');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Prompt templates
// ---------------------------------------------------------------------------
export async function saveTemplate(templateId, formData) {
  await requireAdmin();

  const { error } = await supabaseAdmin()
    .from('prompt_templates')
    .update({
      name: clean(formData.get('name')),
      system_prompt: clean(formData.get('system_prompt')),
      default_services: clean(formData.get('default_services')),
      default_hours: clean(formData.get('default_hours')),
      scenario_notes: clean(formData.get('scenario_notes')),
      booking_enabled: formData.get('booking_enabled') === 'on'
    })
    .eq('id', templateId);

  if (error) return fail(error.message);

  revalidatePath('/dashboard/modelos');
  return { ok: true };
}

/**
 * Copy a template onto a client.
 *
 * Overwrites system_prompt, services, hours, booking_enabled and business_type.
 * The UI confirms before calling this, because it replaces work already done.
 */
export async function applyTemplateToClient(templateId, clientId) {
  await requireAdmin();

  const db = supabaseAdmin();

  const { data: template, error: templateError } = await db
    .from('prompt_templates')
    .select('business_type, system_prompt, default_services, default_hours, booking_enabled')
    .eq('id', templateId)
    .single();

  if (templateError) return fail(templateError.message);

  const { error } = await db
    .from('client_config')
    .update({
      business_type: template.business_type,
      // {{placeholders}} are kept as-is; they are filled at message time.
      system_prompt: template.system_prompt,
      services: template.default_services,
      hours: template.default_hours,
      booking_enabled: template.booking_enabled
    })
    .eq('client_id', clientId);

  if (error) return fail(error.message);

  revalidatePath('/dashboard/modelos');
  revalidatePath('/dashboard/clientes');
  revalidatePath(`/dashboard/clientes/${clientId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------
export async function updateLeadStatus(leadId, status) {
  await requireAdmin();

  const { error } = await supabaseAdmin()
    .from('leads')
    .update({ status })
    .eq('id', leadId);

  if (error) return fail(error.message);

  revalidatePath('/dashboard/leads');
  revalidatePath('/dashboard');
  return { ok: true };
}

/**
 * Turn a lead into a client_config row, prefilled from what the lead told us.
 * The checklist is seeded by the insert trigger.
 */
export async function createClientFromLead(leadId) {
  await requireAdmin();

  const db = supabaseAdmin();

  const { data: lead, error: leadError } = await db
    .from('leads')
    .select('id, nome, segmento, whatsapp_digits, whatsapp')
    .eq('id', leadId)
    .single();

  if (leadError) return fail(leadError.message);

  // Stable, readable client_id derived from the business name.
  const slug = (lead.nome || 'cliente')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);

  const suffix = (lead.whatsapp_digits || '').slice(-4) || String(Date.now()).slice(-4);
  const clientId = `${slug || 'cliente'}-${suffix}`;

  const { error } = await db.from('client_config').insert({
    client_id: clientId,
    business_name: lead.nome,
    business_type: null,
    status: 'onboarding',
    notes: `Criado a partir do lead ${lead.id}. Segmento informado: ${lead.segmento || '—'}. WhatsApp: ${lead.whatsapp || '—'}.`
  });

  if (error) {
    if (error.code === '23505') return fail('Já existe um cliente com esse identificador.');
    return fail(error.message);
  }

  await db.from('leads').update({ status: 'convertido' }).eq('id', leadId);

  revalidatePath('/dashboard/leads');
  revalidatePath('/dashboard/clientes');
  revalidatePath('/dashboard/onboarding');
  revalidatePath('/dashboard');

  return { ok: true, clientId };
}
