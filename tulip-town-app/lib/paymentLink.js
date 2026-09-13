/** Allowed seller payment-link hosts (phishing allowlist). */
const ALLOWED_HOSTS = [
  'square.link',
  'squareup.com',
  'paypal.me',
  'paypal.com',
  'buy.stripe.com',
  'venmo.com',
];

export const PAYMENT_LINK_ERROR = 'Square, PayPal, Stripe, Venmo 링크만 등록할 수 있습니다.';

function hostAllowed(hostname) {
  const host = String(hostname || '')
    .toLowerCase()
    .replace(/^www\./, '');
  if (!host) return false;
  return ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

/**
 * Normalize / validate an optional external payment link.
 * Empty → null (ok). Invalid domain → rejected.
 */
export function normalizePaymentLink(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return { ok: true, value: null };

  let url;
  try {
    url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
  } catch {
    return { ok: false, error: PAYMENT_LINK_ERROR };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, error: PAYMENT_LINK_ERROR };
  }

  if (!hostAllowed(url.hostname)) {
    return { ok: false, error: PAYMENT_LINK_ERROR };
  }

  return { ok: true, value: url.toString() };
}

export function paymentLinkHostname(link) {
  try {
    return new URL(link).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
