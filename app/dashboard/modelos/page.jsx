import { supabaseAdmin } from '@/lib/supabase/admin';
import TemplateCard from './TemplateCard';

export const dynamic = 'force-dynamic';

async function loadTemplates() {
  const db = supabaseAdmin();

  const [{ data: templates }, { data: clients }] = await Promise.all([
    db
      .from('prompt_templates')
      .select('*')
      .order('business_type')
      .order('name'),
    db
      .from('client_config')
      .select('client_id, business_name')
      .order('business_name')
  ]);

  const grouped = new Map();
  (templates ?? []).forEach((template) => {
    if (!grouped.has(template.business_type)) grouped.set(template.business_type, []);
    grouped.get(template.business_type).push(template);
  });

  return { grouped: [...grouped.entries()], clients: clients ?? [] };
}

export default async function ModelosPage() {
  const { grouped, clients } = await loadTemplates();

  return (
    <>
      <div className="dash-page-head">
        <h1>Modelos</h1>
        <p>
          Prompts iniciais por tipo de negócio. Edite aqui e aplique a um cliente —
          os marcadores <code>{'{{business_name}}'}</code>, <code>{'{{services}}'}</code> e{' '}
          <code>{'{{hours}}'}</code> são preenchidos no atendimento.
        </p>
      </div>

      {grouped.length === 0 ? (
        <div className="dash-empty">
          <h2>Nenhum modelo cadastrado</h2>
          <p>Rode <code>supabase/schema.sql</code> para criar os modelos iniciais.</p>
        </div>
      ) : (
        grouped.map(([businessType, items]) => (
          <section className="dash-section" key={businessType}>
            <div className="dash-section-head">
              <h2>{businessType}</h2>
            </div>
            {items.map((template) => (
              <TemplateCard key={template.id} template={template} clients={clients} />
            ))}
          </section>
        ))
      )}
    </>
  );
}
