import { supabaseAdmin } from '@/lib/supabase/admin';
import LeadRow from './LeadRow';

export const dynamic = 'force-dynamic';

async function loadLeads() {
  const { data } = await supabaseAdmin()
    .from('leads')
    .select('id, nome, whatsapp, email, segmento, mensagem, status, consentimento, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  return data ?? [];
}

export default async function LeadsPage() {
  const leads = await loadLeads();

  return (
    <>
      <div className="dash-page-head">
        <h1>Leads</h1>
        <p>
          {leads.length === 0
            ? 'Pedidos de demonstração enviados pelo formulário do site aparecem aqui.'
            : `${leads.length} lead(s) recebido(s) pelo site.`}
        </p>
      </div>

      {leads.length === 0 ? (
        <div className="dash-empty">
          <h2>Nenhum lead ainda</h2>
          <p>
            Quando alguém preencher &quot;Solicitar demonstração&quot; na página inicial,
            o pedido cai aqui.
          </p>
        </div>
      ) : (
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Contato</th>
                <th>Mensagem</th>
                <th>Data</th>
                <th>Status</th>
                <th><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => <LeadRow key={lead.id} lead={lead} />)}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
