import { Plus_Jakarta_Sans } from 'next/font/google';

import './globals.css';

/**
 * next/font self-hosts the family at build time, so there is no request to
 * fonts.googleapis.com and no layout shift. The CSS variable feeds the
 * --font token that globals.css already uses.
 */
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-jakarta'
});

export const metadata = {
  metadataBase: new URL('https://conversia-site.vercel.app'),
  title: 'ConversIA — Atendimento no WhatsApp automatizado com IA',
  description:
    'A ConversIA conecta o WhatsApp do seu negócio a um assistente de IA que lê e responde seus clientes — texto, foto e áudio — 24 horas por dia, e passa para uma pessoa quando precisa.',
  openGraph: {
    title: 'ConversIA — Atendimento no WhatsApp automatizado com IA',
    description:
      'Um assistente de IA que lê e responde seus clientes no WhatsApp, 24 horas por dia.',
    type: 'website',
    locale: 'pt_BR',
    url: 'https://conversia-site.vercel.app'
  }
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#25d366' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0f0d' }
  ]
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={jakarta.variable}>
      <body>{children}</body>
    </html>
  );
}
