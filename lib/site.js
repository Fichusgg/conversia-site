/**
 * Site-wide constants shared by the marketing pages.
 *
 * The WhatsApp number used to live in script.js because the old static site had
 * no build step. Next.js does, so it now comes from the environment with the
 * previous value as the fallback — set NEXT_PUBLIC_WHATSAPP_NUMBER in Vercel to
 * change it without touching code.
 *
 * International format, digits only: country code + area code + number.
 *   Brazil, (11) 98765-4321  ->  '5511987654321'
 */
export const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '19787375032';

export const DEFAULT_WA_MESSAGE =
  'Olá! Quero saber mais sobre o atendimento automatizado da ConversIA.';

export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'contato@conversia.com.br';

/** A wa.me URL, or null when the number has not been configured. */
export function waLink(message = DEFAULT_WA_MESSAGE) {
  if (!/^\d{10,15}$/.test(WHATSAPP_NUMBER)) return null;
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export const BUSINESS_TYPES = [
  'Salão de beleza / Barbearia',
  'Clínica / Consultório',
  'Estética / Spa',
  'Restaurante / Delivery',
  'Loja / Varejo',
  'Academia / Personal / Estúdio',
  'Prestador de serviço',
  'Imobiliária'
];

export const CLIENT_STATUSES = ['onboarding', 'ativo', 'pausado', 'cancelado'];

export const LEAD_STATUSES = [
  'novo',
  'contatado',
  'qualificado',
  'convertido',
  'descartado'
];

export function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  }).format(new Date(value));
}
