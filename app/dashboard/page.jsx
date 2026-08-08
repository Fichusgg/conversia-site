import Link from 'next/link';

import { supabaseAdmin } from '@/lib/supabase/admin';
import { formatDate } from '@/lib/site';

export const dynamic = 'force-dynamic';

async function loadOverview() {
  const db = supabaseAdmin();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // head:true asks PostgREST for the count only — no rows come back.
  const [ativos, onboarding, leadsNovos, mensagens, ultimosLeads] = await Promise.all([
    db.from('client_config').select('client_id', { count: 'exact', head: true }).eq('status', 'ativo'),
    db.from('client_config').select('client_id', { count: 'exact', head: true }).eq('status', 'onboarding'),
    db.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'novo'),
    db.from('conversations').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    db.from('leads').select('id, nome, segmento, status, created_at').order('created_at', { ascending: false }).limit(5)
  ]);

  return {
    ativos: ativos.count ?? 0,
    onboarding: onboarding.count ?? 0,
    leadsNovos: leadsNovos.count ?? 0,
    mensagens: mensagens.count ?? 0,
    ultimosLeads: ultimosLeads.data ?? []
  };
}

function StatCard({ value, label, hint, href }) {
  const body = (
    <>
      <strong className="dash-stat-value">{value}</strong>
      <span className="dash-stat-label">{label}</span>
      {hint ? <span className="dash-stat-hint">{hint}</span> : null}
    </>
  );

  return href ? (
    <Link className="dash-stat" href={href}>{body}</Link>
  ) : (
    <div className="dash-stat">{body}</div>
  );
}

export default async function OverviewPage() {
  const data = await loadOverview();
  const semDados =
    data.ativos === 0 && data.onboarding === 0 && data.leadsNovos === 0 && data.mensagens === 0;

  return (
    <>
      <div className="dash-page-head">
        <h1>Visão geral</h1>
        <p>Como está a operação agora.</p>
      </div>

      <div className="dash-stats">
        <StatCard value={data.ativos} label="Clientes ativos" href="/dashboard/clientes?status=ativo" />
        <StatCard value={data.onboarding} label="Em onboarding" href="/dashboard/clientes?status=onboarding" />
        <StatCard value={data.leadsNovos} label="Leads novos" href="/dashboard/leads" />
        <StatCard
          value={data.mensagens}
          label="Mensagens (7 dias)"
          hint={data.mensagens === 0 ? 'Nenhuma conversa registrada ainda' : undefined}
        />
      </div>

      {semDados ? (
        <div className="dash-empty">
          <h2>Ainda não há dados</h2>
          <p>
            Assim que o primeiro lead chegar pelo site ou o primeiro número for conectado,
            os números aparecem aqui. Nada nesta tela é simulado.
          </p>
          <Link className="btn btn-primary" href="/dashboard/clientes">Cadastrar um cliente</Link>
        </div>
      ) : null}

      <section className="dash-section">
        <div className="dash-section-head">
          <h2>Últimos leads</h2>
          <Link href="/dashboard/leads">Ver todos</Link>
        </div>

        {data.ultimosLeads.length === 0 ? (
          <p className="dash-muted">Nenhum lead recebido até agora.</p>
        ) : (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Segmento</th>
                  <th>Status</th>
                  <th>Recebido</th>
                </tr>
              </thead>
              <tbody>
                {data.ultimosLeads.map((lead) => (
                  <tr key={lead.id}>
                    <td>{lead.nome}</td>
                    <td>{lead.segmento || '—'}</td>
                    <td><span className={`pill pill-${lead.status}`}>{lead.status}</span></td>
                    <td>{formatDate(lead.created_at)}</td>
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
