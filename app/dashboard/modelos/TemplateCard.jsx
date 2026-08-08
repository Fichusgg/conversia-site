'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { applyTemplateToClient, saveTemplate } from '../actions';

/** One editable template, plus the "apply to a client" control. */
export default function TemplateCard({ template, clients }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [clientId, setClientId] = useState('');
  const [status, setStatus] = useState({ message: '', kind: null });
  const [pending, startTransition] = useTransition();

  function handleSave(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await saveTemplate(template.id, formData);
      setStatus(
        result.ok
          ? { message: 'Modelo salvo.', kind: 'success' }
          : { message: result.error, kind: 'error' }
      );
      if (result.ok) {
        setEditing(false);
        router.refresh();
      }
    });
  }

  function handleApply() {
    if (!clientId) return;

    const client = clients.find((item) => item.client_id === clientId);
    const confirmed = window.confirm(
      `Aplicar "${template.name}" a ${client?.business_name || clientId}?\n\n` +
      'Isso substitui o prompt, os serviços, os horários e a configuração de agendamento ' +
      'desse cliente. Não dá para desfazer.'
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await applyTemplateToClient(template.id, clientId);
      setStatus(
        result.ok
          ? { message: `Aplicado a ${client?.business_name || clientId}.`, kind: 'success' }
          : { message: result.error, kind: 'error' }
      );
      if (result.ok) router.refresh();
    });
  }

  return (
    <article className="dash-card dash-template">
      <div className="dash-template-head">
        <div>
          <h3>{template.name}</h3>
          <p className="dash-muted">
            {template.booking_enabled ? (
              <span className="pill pill-ok">com agendamento</span>
            ) : (
              <span className="pill pill-off">sem agendamento</span>
            )}
          </p>
        </div>
        <button
          type="button" className="btn btn-secondary btn-sm"
          onClick={() => setEditing((value) => !value)}
        >
          {editing ? 'Cancelar' : 'Editar'}
        </button>
      </div>

      {editing ? (
        <form onSubmit={handleSave}>
          <div className="field">
            <label htmlFor={`name-${template.id}`}>Nome do modelo</label>
            <input
              type="text" id={`name-${template.id}`} name="name"
              defaultValue={template.name}
            />
          </div>

          <div className="dash-grid-2">
            <div className="field">
              <label htmlFor={`services-${template.id}`}>Serviços padrão</label>
              <textarea
                id={`services-${template.id}`} name="default_services" rows={2}
                defaultValue={template.default_services || ''}
              />
            </div>
            <div className="field">
              <label htmlFor={`hours-${template.id}`}>Horários padrão</label>
              <textarea
                id={`hours-${template.id}`} name="default_hours" rows={2}
                defaultValue={template.default_hours || ''}
              />
            </div>
          </div>

          <div className="field field-check">
            <input
              type="checkbox" id={`booking-${template.id}`} name="booking_enabled"
              defaultChecked={template.booking_enabled}
            />
            <label htmlFor={`booking-${template.id}`}>Usa agendamento</label>
          </div>

          <div className="field">
            <label htmlFor={`prompt-${template.id}`}>Prompt do sistema</label>
            <textarea
              id={`prompt-${template.id}`} name="system_prompt" rows={16}
              defaultValue={template.system_prompt}
            />
          </div>

          <div className="field">
            <label htmlFor={`notes-${template.id}`}>Notas do cenário (Make)</label>
            <textarea
              id={`notes-${template.id}`} name="scenario_notes" rows={5}
              defaultValue={template.scenario_notes || ''}
            />
          </div>

          <div className="dash-form-actions">
            <button type="submit" className="btn btn-primary" disabled={pending}>
              {pending ? 'Salvando…' : 'Salvar modelo'}
            </button>
          </div>
        </form>
      ) : (
        <>
          <dl className="dash-dl">
            <dt>Serviços padrão</dt><dd>{template.default_services || '—'}</dd>
            <dt>Horários padrão</dt><dd>{template.default_hours || '—'}</dd>
          </dl>

          <details className="dash-details">
            <summary>Ver prompt</summary>
            <pre className="dash-pre">{template.system_prompt}</pre>
          </details>

          {template.scenario_notes ? (
            <details className="dash-details">
              <summary>Notas do cenário (Make)</summary>
              <pre className="dash-pre">{template.scenario_notes}</pre>
            </details>
          ) : null}
        </>
      )}

      <div className="dash-apply">
        <div className="field">
          <label htmlFor={`apply-${template.id}`}>Aplicar a cliente</label>
          <select
            id={`apply-${template.id}`} value={clientId}
            onChange={(event) => setClientId(event.target.value)}
          >
            <option value="">Selecione…</option>
            {clients.map((client) => (
              <option key={client.client_id} value={client.client_id}>
                {client.business_name || client.client_id}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button" className="btn btn-secondary"
          onClick={handleApply} disabled={!clientId || pending}
        >
          Aplicar
        </button>
      </div>

      {clients.length === 0 ? (
        <p className="hint">Cadastre um cliente para poder aplicar este modelo.</p>
      ) : null}

      {status.message ? (
        <p className={`form-status is-${status.kind}`} role="status">{status.message}</p>
      ) : null}
    </article>
  );
}
