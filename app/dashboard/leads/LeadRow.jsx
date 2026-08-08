'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { LEAD_STATUSES, formatDate } from '@/lib/site';
import { createClientFromLead, updateLeadStatus } from '../actions';

export default function LeadRow({ lead }) {
  const router = useRouter();
  const [status, setStatus] = useState(lead.status);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function handleStatusChange(event) {
    const next = event.target.value;
    const previous = status;
    setStatus(next);
    setError('');

    startTransition(async () => {
      const result = await updateLeadStatus(lead.id, next);
      if (!result.ok) {
        setStatus(previous);
        setError(result.error);
      }
    });
  }

  function handleCreateClient() {
    const confirmed = window.confirm(
      `Criar um cliente a partir de "${lead.nome}"?\n\n` +
      'Um novo cadastro é criado com os 10 passos de onboarding, e este lead passa ' +
      'para o status "convertido".'
    );
    if (!confirmed) return;

    setError('');
    startTransition(async () => {
      const result = await createClientFromLead(lead.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/dashboard/clientes/${encodeURIComponent(result.clientId)}`);
    });
  }

  return (
    <tr>
      <td>
        <strong>{lead.nome}</strong>
        <span className="dash-sub">{lead.segmento || 'segmento não informado'}</span>
        {!lead.consentimento ? (
          <span className="pill pill-off">sem opt-in</span>
        ) : null}
      </td>
      <td>
        <span className="dash-nowrap">{lead.whatsapp}</span>
        {lead.email ? <span className="dash-sub">{lead.email}</span> : null}
      </td>
      <td className="dash-message">{lead.mensagem || '—'}</td>
      <td className="dash-nowrap">{formatDate(lead.created_at)}</td>
      <td>
        <label className="sr-only" htmlFor={`status-${lead.id}`}>Status do lead</label>
        <select
          id={`status-${lead.id}`} value={status}
          onChange={handleStatusChange} disabled={pending}
        >
          {LEAD_STATUSES.map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
        {error ? <span className="dash-error">{error}</span> : null}
      </td>
      <td>
        <button
          type="button" className="btn btn-secondary btn-sm"
          onClick={handleCreateClient} disabled={pending}
        >
          Criar cliente
        </button>
      </td>
    </tr>
  );
}
