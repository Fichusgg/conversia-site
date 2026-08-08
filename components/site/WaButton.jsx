import Link from 'next/link';

import { DEFAULT_WA_MESSAGE, waLink } from '@/lib/site';
import { WhatsAppIcon } from './Icons';

/**
 * A "Falar no WhatsApp" call to action.
 *
 * Keeps the original safety behaviour: when WHATSAPP_NUMBER is not a real
 * number, the button falls back to the on-page contact form instead of sending
 * anyone to a broken wa.me link.
 */
export default function WaButton({
  message = DEFAULT_WA_MESSAGE,
  className = 'btn btn-primary',
  fallbackHref = '/#contato',
  showIcon = true,
  children = 'Falar no WhatsApp',
  ...rest
}) {
  const href = waLink(message);

  const icon = showIcon ? (
    <span className="btn-icon" aria-hidden="true">
      <WhatsAppIcon />
    </span>
  ) : null;

  if (!href) {
    return (
      <Link className={className} href={fallbackHref} {...rest}>
        {icon}
        {children}
      </Link>
    );
  }

  return (
    <a className={className} href={href} target="_blank" rel="noopener" {...rest}>
      {icon}
      {children}
    </a>
  );
}
