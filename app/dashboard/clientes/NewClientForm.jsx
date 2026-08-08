'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { BUSINESS_TYPES } from '@/lib/site';
import { createClientConfig } from '../actions';

/** Collapsible "add a client" form above the table. */
export default function NewClientForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function handleSubmit(event) {
    event.preventDefault();
    setError('');
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createClientConfig(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.push(`/dashboard/clientes/${encodeURIComponent(result.clientId)}`);
    });
  }

  if (!open) {
    return (
      <div className="dash-actions">
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
          Novo cliente
        </button>
      </div>
    );
  }

  return (
    <form className="dash-card dash-new-client" onSubmit={handleSubmit}>
      <h2>Novo cliente</h2>
      <p className="dash-muted">
        O identificador é usado pelo bridge para ligar as mensagens a este cliente.
        Use algo curto e estável, como <code>salao-maria</code>.
      </p>

      <div className="dash-grid-2">
        <div className="field">
          <label htmlFor="client_id">Identificador (client_id)</label>
          <input
            type="text" id="client_id" name="client_id" required
            pattern="[a-zA-Z0-9._-]+"
            placeholder="salao-maria"
          />
          <p className="hint">Letras, números, ponto, hífen e sublinhado.</p>
        </div>

        <div className="field">
          <label htmlFor="business_name">Nome do negócio</label>
          <input type="text" id="business_name" name="business_name" placeholder="Salão da Maria" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="business_type">Tipo de negócio</label>
        <select id="business_type" name="business_type" defaultValue="">
          <option value="">Selecione…</option>
          {BUSINESS_TYPES.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      {error ? <p className="form-status is-error" role="alert">{error}</p> : null}

      <div className="dash-form-actions">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Criando…' : 'Criar cliente'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>

      <p className="hint">Os 10 passos de onboarding são criados automaticamente.</p>
    </form>
  );
}
