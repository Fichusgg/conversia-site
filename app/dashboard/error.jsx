'use client';

/**
 * Dashboard error boundary.
 *
 * The overwhelmingly likely cause in a fresh deployment is a missing
 * SUPABASE_SERVICE_ROLE_KEY, so say that plainly instead of showing a bare 500.
 */
export default function DashboardError({ error, reset }) {
  const missingKey = /SUPABASE_SERVICE_ROLE_KEY|SUPABASE_URL/i.test(error?.message || '');

  return (
    <div className="dash-empty">
      <h2>Não foi possível carregar o painel</h2>

      {missingKey ? (
        <>
          <p>
            O servidor não está configurado para acessar o banco de dados. Falta a
            variável <code>SUPABASE_SERVICE_ROLE_KEY</code> (e possivelmente{' '}
            <code>SUPABASE_URL</code>) nas variáveis de ambiente da Vercel.
          </p>
          <p className="dash-muted">
            Vercel → Settings → Environment Variables → adicione a chave{' '}
            <code>service_role</code> do Supabase e refaça o deploy.
          </p>
        </>
      ) : (
        <p>
          Algo deu errado ao buscar os dados. Tente de novo; se continuar, verifique
          os logs em Vercel → Runtime Logs.
        </p>
      )}

      <button type="button" className="btn btn-primary" onClick={() => reset()}>
        Tentar de novo
      </button>
    </div>
  );
}
