import Link from 'next/link';
import { notFound } from 'next/navigation';

import { maskSecret, supabaseAdmin } from '@/lib/supabase/admin';
import { formatDate } from '@/lib/site';
import ClientForm from './ClientForm';

export const dynamic = 'force-dynamic';

async function loadClient(clientId) {
  const db = supabaseAdmin();

  const { data: config } = await db
    .from('client_config')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle();

  if (!config) return null;

  const [{ data: channel }, { data: conversations }, { data: steps }, { data: templates }] =
    await Promise.all([
      db
        .from('whatsapp_clients')
        .select('phone_number, phone_number_id, status, webhook_registered_at')
        .eq('client_id', clientId)
        .maybeSingle(),
      db
        .from('conversations')
        .select('id, wa_id, role, content, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(25),
      db
        .from('onboarding_checklist')
        .select('id, done')
        .eq('client_id', clientId),
      db
        .from('prompt_templates')
        .select('id, business_type, name')
        .order('business_type')
    ]);

  const total = steps?.length ?? 0;
  const done = (steps ?? []).filter((step) => step.done).length;

  return {
    // Never pass the raw key to the client component — only whether it is set
    // and its last four characters.
    config: { ...config, cal_api_key: undefined },
    calKey: maskSecret(config.cal_api_key),
    channel: channel ?? null,
    conversations: conversations ?? [],
    templates: templates ?? [],
    progress: { done, total }
  };
}

export default async function ClientDetailPage({ params }) {
  const { client_id: rawId } = await params;
  const clientId = decodeURIComponent(rawId);

  const data = await loadClient(clientId);
  if (!data) notFound();

  const { config, calKey, channel, conversations, templates, progress } = data;

  return (
    <>
      <div className="dash-page-head">
        <Link className="dash-back" href="/dashboard/clientes">← Clientes</Link>
        <h1>{config.business_name || config.client_id}</h1>
        <p>
          <code>{config.client_id}</code>
          {channel?.phone_number ? <> · {channel.phone_number}</> : null}
          {' · '}
          <span className={`pill pill-${config.status}`}>{config.status}</span>
        </p>
      </div>

      <div className="dash-detail">
        <div className="dash-detail-main">
          <ClientForm config={config} calKey={calKey} templates={templates} />
        </div>

        <aside className="dash-detail-side">
          <div className="dash-card">
            <h2>Onboarding</h2>
            <p className="dash-progress-text">
              {progress.done} de {progress.total} passos concluídos
            </p>
            <div
              className="dash-progress" role="progressbar"
              aria-valuenow={progress.done} aria-valuemin={0} aria-valuemax={progress.total}
            >
              <span style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
            </div>
            <Link className="btn btn-secondary btn-block" href={`/dashboard/onboarding?cliente=${encodeURIComponent(config.client_id)}`}>
              Ver onboarding
            </Link>
          </div>

          <div className="dash-card">
            <h2>Canal WhatsApp</h2>
            {channel ? (
              <dl className="dash-dl">
                <dt>Telefone</dt><dd>{channel.phone_number || '—'}</dd>
                <dt>phone_number_id</dt><dd><code>{channel.phone_number_id || '—'}</code></dd>
                <dt>Status</dt><dd>{channel.status}</dd>
                <dt>Webhook</dt>
                <dd>{channel.webhook_registered_at ? formatDate(channel.webhook_registered_at) : 'não registrado'}</dd>
              </dl>
            ) : (
              <p className="dash-muted">
                Nenhum canal conectado ainda. Ele aparece aqui automaticamente quando o
                cliente concluir o Embedded Signup.
              </p>
            )}
          </div>
        </aside>
      </div>

      <section className="dash-section">
        <div className="dash-section-head">
          <h2>Conversas recentes</h2>
          <span className="dash-muted">somente leitura · últimas 25</span>
        </div>

        {conversations.length === 0 ? (
          <p className="dash-muted">Nenhuma mensagem registrada para este cliente ainda.</p>
        ) : (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Contato</th>
                  <th>De</th>
                  <th>Mensagem</th>
                </tr>
              </thead>
              <tbody>
                {conversations.map((message) => (
                  <tr key={message.id}>
                    <td className="dash-nowrap">{formatDate(message.created_at)}</td>
                    <td><code>{message.wa_id}</code></td>
                    <td><span className={`pill pill-${message.role}`}>{message.role}</span></td>
                    <td className="dash-message">{message.content || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
