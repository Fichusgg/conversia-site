'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { BUSINESS_TYPES, CLIENT_STATUSES } from '@/lib/site';
import { applyTemplateToClient, saveClientConfig } from '../../actions';

/**
 * Edit form for one client's assistant configuration.
 *
 * `calKey` arrives as { set, hint } — never the real value. Leaving the key
 * field blank keeps whatever is stored; the checkbox is the only way to clear it.
 */
export default function ClientForm({ config, calKey, templates }) {
  const router = useRouter();
  const [status, setStatus] = useState({ message: '', kind: null });
  const [pending, startTransition] = useTransition();
  const [applying, setApplying] = useState(false);
  const [templateId, setTemplateId] = useState('');
  const [booking, setBooking] = useState(Boolean(config.booking_enabled));

  function handleSubmit(event) {
    event.preventDefault();
    setStatus({ message: '', kind: null });
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await saveClientConfig(config.client_id, formData);
      setStatus(
        result.ok
          ? { message: 'Alterações salvas.', kind: 'success' }
          : { message: result.error, kind: 'error' }
      );
      if (result.ok) router.refresh();
    });
  }

  function handleApplyTemplate() {
    if (!templateId) return;

    const template = templates.find((item) => item.id === templateId);
    const confirmed = window.confirm(
      `Aplicar "${template?.name}" a este cliente?\n\n` +
      'Isso substitui o prompt, os serviços, os horários e a configuração de agendamento ' +
      'que estiverem preenchidos agora. Não dá para desfazer.'
    );
    if (!confirmed) return;

    setApplying(true);
    startTransition(async () => {
      const result = await applyTemplateToClient(templateId, config.client_id);
      setApplying(false);
      setStatus(
        result.ok
          ? { message: 'Modelo aplicado. Revise os campos abaixo.', kind: 'success' }
          : { message: result.error, kind: 'error' }
      );
      if (result.ok) router.refresh();
    });
  }

  return (
    <>
      <div className="dash-card">
        <h2>Aplicar modelo</h2>
        <p className="dash-muted">
          Copia o prompt, os serviços e os horários padrão do modelo escolhido para este cliente.
        </p>
        <div className="dash-apply">
          <div className="field">
            <label htmlFor="template">Modelo</label>
            <select
              id="template" value={templateId}
              onChange={(event) => setTemplateId(event.target.value)}
            >
              <option value="">Selecione…</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.business_type} — {template.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button" className="btn btn-secondary"
            onClick={handleApplyTemplate}
            disabled={!templateId || applying || pending}
          >
            {applying ? 'Aplicando…' : 'Aplicar'}
          </button>
        </div>
      </div>

      <form className="dash-card" onSubmit={handleSubmit}>
        <h2>Configuração do assistente</h2>

        <div className="dash-grid-2">
          <div className="field">
            <label htmlFor="business_name">Nome do negócio</label>
            <input
              type="text" id="business_name" name="business_name"
              defaultValue={config.business_name || ''}
            />
          </div>

          <div className="field">
            <label htmlFor="business_type">Tipo de negócio</label>
            <select id="business_type" name="business_type" defaultValue={config.business_type || ''}>
              <option value="">Selecione…</option>
              {BUSINESS_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="timezone">Fuso horário</label>
            <input
              type="text" id="timezone" name="timezone"
              defaultValue={config.timezone || 'America/Sao_Paulo'}
            />
          </div>

          <div className="field">
            <label htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={config.status || 'onboarding'}>
              {CLIENT_STATUSES.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="services">Serviços e valores</label>
          <textarea
            id="services" name="services" rows={3}
            defaultValue={config.services || ''}
            placeholder="Corte R$40, Barba R$30…"
          />
          <p className="hint">Entra no prompt como <code>{'{{services}}'}</code>.</p>
        </div>

        <div className="field">
          <label htmlFor="hours">Horário de funcionamento</label>
          <input
            type="text" id="hours" name="hours"
            defaultValue={config.hours || ''}
            placeholder="Ter-Sáb 9h-19h"
          />
          <p className="hint">Entra no prompt como <code>{'{{hours}}'}</code>.</p>
        </div>

        <fieldset className="dash-fieldset">
          <legend>Agendamento</legend>

          <div className="field field-check">
            <input
              type="checkbox" id="booking_enabled" name="booking_enabled"
              checked={booking} onChange={(event) => setBooking(event.target.checked)}
            />
            <label htmlFor="booking_enabled">
              Este cliente usa agendamento (check_availability e book_appointment)
            </label>
          </div>

          <div className="dash-grid-2">
            <div className="field">
              <label htmlFor="cal_api_key">Chave da API do Cal.com</label>
              <input
                type="password" id="cal_api_key" name="cal_api_key"
                autoComplete="off" placeholder={calKey?.set ? calKey.hint : 'cal_live_…'}
              />
              <p className="hint">
                {calKey?.set
                  ? `Uma chave já está salva (${calKey.hint}). Deixe em branco para mantê-la.`
                  : 'Nenhuma chave salva. O valor nunca é exibido depois de gravado.'}
              </p>
            </div>

            <div className="field">
              <label htmlFor="cal_event_type_id">Event type ID</label>
              <input
                type="text" id="cal_event_type_id" name="cal_event_type_id"
                defaultValue={config.cal_event_type_id || ''}
                placeholder="123456"
              />
            </div>
          </div>

          {calKey?.set ? (
            <div className="field field-check">
              <input type="checkbox" id="clear_cal_api_key" name="clear_cal_api_key" />
              <label htmlFor="clear_cal_api_key">Remover a chave salva</label>
            </div>
          ) : null}
        </fieldset>

        <div className="field">
          <label htmlFor="system_prompt">Prompt do sistema</label>
          <textarea
            id="system_prompt" name="system_prompt" rows={16}
            defaultValue={config.system_prompt || ''}
            placeholder="Você é o assistente virtual de {{business_name}}…"
          />
          <p className="hint">
            Mantenha os marcadores <code>{'{{business_name}}'}</code>,{' '}
            <code>{'{{services}}'}</code> e <code>{'{{hours}}'}</code> — eles são
            substituídos na hora do atendimento.
          </p>
        </div>

        <div className="field">
          <label htmlFor="notes">Observações internas</label>
          <textarea id="notes" name="notes" rows={3} defaultValue={config.notes || ''} />
        </div>

        {status.message ? (
          <p className={`form-status is-${status.kind}`} role="status">{status.message}</p>
        ) : null}

        <div className="dash-form-actions">
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </div>
      </form>
    </>
  );
}
