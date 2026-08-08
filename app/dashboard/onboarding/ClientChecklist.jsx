'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { markClientActive, saveStepNotes, toggleOnboardingStep } from '../actions';

/** One client's checklist: progress bar, toggleable steps, notes per step. */
export default function ClientChecklist({ client }) {
  const router = useRouter();
  const [steps, setSteps] = useState(client.steps);
  const [openNotes, setOpenNotes] = useState(null);
  const [, startTransition] = useTransition();

  const total = steps.length;
  const done = steps.filter((step) => step.done).length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  const allDone = total > 0 && done === total;

  function handleToggle(step) {
    const next = !step.done;

    // Optimistic: the checkbox should not lag behind the click.
    setSteps((current) =>
      current.map((item) => (item.id === step.id ? { ...item, done: next } : item))
    );

    startTransition(async () => {
      const result = await toggleOnboardingStep(step.id, next);
      if (!result.ok) {
        setSteps((current) =>
          current.map((item) => (item.id === step.id ? { ...item, done: !next } : item))
        );
        return;
      }

      // Offer the status change once the last step lands.
      const nowDone = steps.filter((item) =>
        item.id === step.id ? next : item.done
      ).length;

      if (next && nowDone === total && client.status !== 'ativo') {
        const confirmed = window.confirm(
          `Todos os passos de ${client.business_name || client.client_id} estão concluídos.\n\n` +
          'Marcar este cliente como "ativo"?'
        );
        if (confirmed) {
          await markClientActive(client.client_id);
          router.refresh();
        }
      }
    });
  }

  function handleNotes(stepId, notes) {
    setSteps((current) =>
      current.map((item) => (item.id === stepId ? { ...item, notes } : item))
    );
    startTransition(() => saveStepNotes(stepId, notes));
  }

  return (
    <section className="dash-card dash-checklist">
      <div className="dash-checklist-head">
        <div>
          <h2>
            <Link href={`/dashboard/clientes/${encodeURIComponent(client.client_id)}`}>
              {client.business_name || client.client_id}
            </Link>
          </h2>
          <p className="dash-muted">
            <code>{client.client_id}</code> ·{' '}
            <span className={`pill pill-${client.status}`}>{client.status}</span>
          </p>
        </div>
        <span className="dash-progress-text">{done}/{total} · {percent}%</span>
      </div>

      <div
        className="dash-progress" role="progressbar"
        aria-valuenow={done} aria-valuemin={0} aria-valuemax={total}
        aria-label={`Progresso do onboarding de ${client.business_name || client.client_id}`}
      >
        <span style={{ width: `${percent}%` }} />
      </div>

      {total === 0 ? (
        <p className="dash-muted">Nenhum passo criado para este cliente.</p>
      ) : (
        <ul className="dash-steps">
          {steps.map((step) => (
            <li key={step.id} className={step.done ? 'is-done' : undefined}>
              <div className="dash-step-row">
                <input
                  type="checkbox"
                  id={`step-${step.id}`}
                  checked={step.done}
                  onChange={() => handleToggle(step)}
                />
                <label htmlFor={`step-${step.id}`}>
                  <span className="dash-step-order">{step.sort_order}.</span> {step.label}
                </label>
                <button
                  type="button"
                  className="dash-notes-toggle"
                  onClick={() => setOpenNotes(openNotes === step.id ? null : step.id)}
                  aria-expanded={openNotes === step.id}
                >
                  {step.notes ? 'Nota ✎' : 'Nota +'}
                </button>
              </div>

              {openNotes === step.id ? (
                <textarea
                  className="dash-step-notes"
                  rows={2}
                  defaultValue={step.notes || ''}
                  placeholder="Observação sobre este passo…"
                  onBlur={(event) => handleNotes(step.id, event.target.value)}
                />
              ) : step.notes ? (
                <p className="dash-step-note-preview">{step.notes}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {allDone && client.status !== 'ativo' ? (
        <div className="dash-form-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() =>
              startTransition(async () => {
                await markClientActive(client.client_id);
                router.refresh();
              })
            }
          >
            Marcar cliente como ativo
          </button>
        </div>
      ) : null}
    </section>
  );
}
