import Link from 'next/link';

import { getAdminUser } from '@/lib/supabase/server';
import { LogoMark } from '@/components/site/Icons';
import { signOut } from './actions';
import DashboardNav from './DashboardNav';

export const metadata = {
  title: 'Painel — ConversIA',
  robots: { index: false, follow: false }
};

// Always render fresh: the dashboard is live operational data.
export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }) {
  // middleware.js already redirected anonymous visitors; this is the second
  // line of defence and gives us the email for the header.
  const user = await getAdminUser();

  return (
    <div className="dash">
      <header className="dash-header">
        <div className="dash-header-inner">
          <Link className="logo" href="/dashboard" aria-label="Painel ConversIA">
            <LogoMark />
            <span className="logo-text">
              Convers<span className="logo-accent">IA</span>
            </span>
            <span className="dash-badge">Painel</span>
          </Link>

          <div className="dash-user">
            {user?.email ? <span className="dash-email">{user.email}</span> : null}
            <form action={signOut}>
              <button type="submit" className="btn btn-secondary btn-sm">Sair</button>
            </form>
          </div>
        </div>

        <DashboardNav />
      </header>

      <main className="dash-main">{children}</main>
    </div>
  );
}
