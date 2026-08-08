import Link from 'next/link';

import { supabaseAdmin } from '@/lib/supabase/admin';
import { CLIENT_STATUSES, formatDate } from '@/lib/site';
import NewClientForm from './NewClientForm';

export const dynamic = 'force-dynamic';

async function loadClients() {
  const db = supabaseAdmin();

  // cal_api_key is selected only to derive the "agenda conectada" boolean —
  // the value itself never leaves this function.
  const [{ data: configs }, { data: channels }] = await Promise.all([
    db
      .from('client_config')
      .select('client_id, business_name, business_type, status, cal_api_key, cal_event_type_id, booking_enabled, created_at')
      .order('created_at', { ascending: false }),
    db.from('whatsapp_clients').select('client_id, phone_number, status')
  ]);

  const byId = new Map((channels ?? []).map((row) => [row.client_id, row]));

  return (configs ?? []).map((config) => ({
    client_id: config.client_id,
    business_name: config.business_name,
    business_type: config.business_type,
    status: config.status,
    booking_enabled: config.booking_enabled,
    created_at: config.created_at,
    phone_number: byId.get(config.client_id)?.phone_number ?? null,
    channel_status: byId.get(config.client_id)?.status ?? null,
    agenda_conectada: Boolean(config.cal_api_key && config.cal_event_type_id)
  }));
}

export default async function ClientesPage({ searchParams }) {
  const params = await searchParams;
  const query = (params?.q || '').toLowerCase().trim();
  const statusFilter = params?.status || '';

  const all = await loadClients();

  const clients = all.filter((client) => {
    if (statusFilter && client.status !== statusFilter) return false;
    if (!query) return true;
    return [client.business_name, client.client_id, client.business_type, client.phone_number]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(query));
  });

  return (
    <>
      <div className="dash-page-head">
        <h1>Clientes</h1>
        <p>{all.length === 0 ? 'Nenhum cliente cadastrado ainda.' : `${all.length} cliente(s) cadastrado(s).`}</p>
      </div>

      <NewClientForm />

      <form className="dash-filters" method="get">
        <div className="field">
          <label htmlFor="q">Buscar</label>
          <input
            type="search" id="q" name="q" defaultValue={params?.q || ''}
            placeholder="Nome, identificador, telefone…"
          />
        </div>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={statusFilter}>
            <option value="">Todos</option>
            {CLIENT_STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-secondary">Filtrar</button>
        {query || statusFilter ? (
          <Link className="dash-clear" href="/dashboard/clientes">Limpar</Link>
        ) : null}
      </form>

      {clients.length === 0 ? (
        <div className="dash-empty">
          <h2>{all.length === 0 ? 'Nenhum cliente ainda' : 'Nenhum resultado'}</h2>
          <p>
            {all.length === 0
              ? 'Cadastre o primeiro cliente acima, ou crie um a partir de um lead recebido pelo site.'
              : 'Nenhum cliente corresponde a esse filtro.'}
          </p>
        </div>
      ) : (
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Negócio</th>
                <th>Telefone</th>
                <th>Tipo</th>
                <th>Status</th>
                <th>Agenda</th>
                <th>Cadastrado</th>
                <th><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.client_id}>
                  <td>
                    <Link href={`/dashboard/clientes/${encodeURIComponent(client.client_id)}`}>
                      <strong>{client.business_name || client.client_id}</strong>
                    </Link>
                    <span className="dash-sub">{client.client_id}</span>
                  </td>
                  <td>{client.phone_number || '—'}</td>
                  <td>{client.business_type || '—'}</td>
                  <td><span className={`pill pill-${client.status}`}>{client.status}</span></td>
                  <td>
                    {client.agenda_conectada ? (
                      <span className="pill pill-ok">Conectada</span>
                    ) : (
                      <span className="pill pill-off">
                        {client.booking_enabled ? 'Falta configurar' : 'Não usa'}
                      </span>
                    )}
                  </td>
                  <td>{formatDate(client.created_at)}</td>
                  <td>
                    <Link
                      className="btn btn-secondary btn-sm"
                      href={`/dashboard/clientes/${encodeURIComponent(client.client_id)}`}
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
