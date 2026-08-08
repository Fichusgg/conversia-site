import Link from 'next/link';

import { CONTACT_EMAIL } from '@/lib/site';
import { LogoMark } from './Icons';
import WaButton from './WaButton';

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Link className="logo" href="/" aria-label="ConversIA, página inicial">
            <LogoMark />
            <span className="logo-text">
              Convers<span className="logo-accent">IA</span>
            </span>
          </Link>
          <p className="footer-tagline">
            Automação de atendimento no WhatsApp com inteligência artificial para
            pequenos negócios.
          </p>
        </div>

        <nav className="footer-col" aria-label="Links do site">
          <h2 className="footer-title">Site</h2>
          <ul>
            <li><Link href="/#o-que-faz">O que faz</Link></li>
            <li><Link href="/#como-funciona">Como funciona</Link></li>
            <li><Link href="/#para-quem">Para quem</Link></li>
            <li><Link href="/#contato">Contato</Link></li>
            <li><Link href="/comecar">Começar</Link></li>
          </ul>
        </nav>

        <div className="footer-col">
          <h2 className="footer-title">Contato</h2>
          <ul>
            <li>
              <WaButton className="" showIcon={false} />
            </li>
            <li>
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h2 className="footer-title">Privacidade</h2>
          <p className="footer-privacy">
            Tratamos dados pessoais conforme a Lei Geral de Proteção de Dados
            (Lei nº 13.709/2018). Usamos seus dados apenas para responder ao seu
            contato e prestar o serviço contratado, e não os vendemos. Para
            acessar, corrigir ou excluir seus dados, fale com a gente pelo
            WhatsApp ou e-mail acima.
          </p>
        </div>
      </div>

      <div className="container footer-bottom">
        <p>© {new Date().getFullYear()} ConversIA</p>
        <p>Plataforma oficial do WhatsApp Business via provedor homologado pela Meta.</p>
      </div>
    </footer>
  );
}
