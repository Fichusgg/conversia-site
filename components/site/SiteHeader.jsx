'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { LogoMark } from './Icons';
import WaButton from './WaButton';

const NAV = [
  { href: '/#o-que-faz', id: 'o-que-faz', label: 'O que faz' },
  { href: '/#como-funciona', id: 'como-funciona', label: 'Como funciona' },
  { href: '/#para-quem', id: 'para-quem', label: 'Para quem' },
  { href: '/#contato', id: 'contato', label: 'Contato' }
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState(null);

  // Sticky-header shadow, exactly as the old script.js did it.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Highlight the section currently in view.
  useEffect(() => {
    const sections = NAV.map((item) => document.getElementById(item.id)).filter(Boolean);
    if (!sections.length || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  // Escape closes the mobile menu.
  useEffect(() => {
    if (!open) return;
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className={`site-header${scrolled ? ' is-scrolled' : ''}`} id="topo">
      <div className="container header-inner">
        <Link className="logo" href="/" aria-label="ConversIA, página inicial">
          <LogoMark />
          <span className="logo-text">
            Convers<span className="logo-accent">IA</span>
          </span>
        </Link>

        <nav
          className={`site-nav${open ? ' is-open' : ''}`}
          id="menu-principal"
          aria-label="Navegação principal"
        >
          <ul className="nav-list">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={active === item.id ? 'is-active' : undefined}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <WaButton
            className="btn btn-primary btn-sm nav-cta"
            onClick={() => setOpen(false)}
          />
        </nav>

        <button
          className="nav-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="menu-principal"
          aria-label={open ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="nav-toggle-bar" aria-hidden="true" />
          <span className="nav-toggle-bar" aria-hidden="true" />
          <span className="nav-toggle-bar" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
