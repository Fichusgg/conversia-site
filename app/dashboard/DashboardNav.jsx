'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/dashboard', label: 'Visão geral' },
  { href: '/dashboard/clientes', label: 'Clientes' },
  { href: '/dashboard/onboarding', label: 'Onboarding' },
  { href: '/dashboard/modelos', label: 'Modelos' },
  { href: '/dashboard/leads', label: 'Leads' }
];

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="dash-nav" aria-label="Navegação do painel">
      {LINKS.map((link) => {
        const active =
          link.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={active ? 'is-active' : undefined}
            aria-current={active ? 'page' : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
