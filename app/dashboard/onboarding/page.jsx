import Link from 'next/link';

import { supabaseAdmin } from '@/lib/supabase/admin';
import ClientChecklist from './ClientChecklist';

export const dynamic = 'force-dynamic';

async function loadChecklists(clientFilter) {
  const db = supabaseAdmin();

  const { data: configs } = await db
    .from('client_config')
    .select('client_id, business_name, status')
    .order('created_at', { ascending: false });

  let stepsQuery = db
    .from('onboarding_checklist')
    .select('id, client_id, step_key, label, sort_order, done, done_at, notes')
    .order('sort_order');

  if (clientFilter) stepsQuery = stepsQuery.eq('client_id', clientFilter);

  const { data: steps } = await stepsQuery;

  const grouped = new Map();
  (steps ?? []).forEach((step) => {
    if (!grouped.has(step.client_id)) grouped.set(step.client_id, []);
    grouped.get(step.client_id).push(step);
  });

  return (configs ?? [])
    .filter((config) => !clientFilter || config.client_id === clientFilter)
    .map((config) => ({
      ...config,
      steps: grouped.get(config.client_id) ?? []
    }));
}

export default async function OnboardingPage({ searchParams }) {
  const params = await searchParams;
  const clientFilter = params?.cliente || '';

  const clients = await loadChecklists(clientFilter);

  return (
    <>
      <div className="dash-page-head">
        <h1>Onboarding</h1>
        <p>
          {clientFilter
            ? <>Checklist de <code>{clientFilter}</code>. <Link href="/dashboard/onboarding">Ver todos</Link></>
            : 'Os 10 passos de cada cliente, do Meta ao go-live.'}
        </p>
      </div>

      {clients.length === 0 ? (
        <div className="dash-empty">
          <h2>Nenhum cliente em onboarding</h2>
          <p>Cadastre um cliente e os passos são criados automaticamente.</p>
          <Link className="btn btn-primary" href="/dashboard/clientes">Ir para Clientes</Link>
        </div>
      ) : (
        clients.map((client) => <ClientChecklist key={client.client_id} client={client} />)
      )}
    </>
  );
}
