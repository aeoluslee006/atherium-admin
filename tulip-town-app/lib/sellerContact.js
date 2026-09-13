/** Structured seller contact channels for tulip shop. */

export const SELLER_CONTACT_CHANNELS = [
  { id: 'whatsapp', label: 'WhatsApp', placeholder: '번호 또는 아이디' },
  { id: 'wechat', label: 'WeChat', placeholder: 'WeChat ID' },
  { id: 'telegram', label: 'Telegram', placeholder: '@username' },
  { id: 'kakao', label: '카카오톡', placeholder: '카카오톡 ID' },
];

function cleanText(value) {
  const text = String(value || '').trim();
  return text || '';
}

function cleanUrl(value) {
  const text = cleanText(value);
  if (!text) return '';
  try {
    const url = new URL(text.includes('://') ? text : `https://${text}`);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.toString();
  } catch {
    return '';
  }
}

function cleanEmail(value) {
  const text = cleanText(value).toLowerCase();
  if (!text) return '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return '';
  return text;
}

export function emptyContactChannels() {
  return {
    phone: '',
    whatsapp: { handle: '', qr_url: '' },
    wechat: { handle: '', qr_url: '' },
    telegram: { handle: '', qr_url: '' },
    kakao: { handle: '', qr_url: '' },
    email: '',
  };
}

/** Normalize API/form payload into a stable contact_channels object. */
export function normalizeContactChannels(raw) {
  const base = emptyContactChannels();
  if (!raw || typeof raw !== 'object') return base;

  base.phone = cleanText(raw.phone);

  for (const channel of SELLER_CONTACT_CHANNELS) {
    const incoming = raw[channel.id];
    if (!incoming || typeof incoming !== 'object') continue;
    base[channel.id] = {
      handle: cleanText(incoming.handle || incoming.id || incoming.value),
      qr_url: cleanUrl(incoming.qr_url || incoming.qrUrl || incoming.qr),
    };
  }

  base.email = cleanEmail(raw.email || raw.contact_email);
  return base;
}

export function contactChannelsHaveAny(channels) {
  const normalized = normalizeContactChannels(channels);
  if (normalized.phone || normalized.email) return true;
  return SELLER_CONTACT_CHANNELS.some((channel) => {
    const item = normalized[channel.id];
    return Boolean(item?.handle || item?.qr_url);
  });
}

export function contactChannelsSummary(channels) {
  const normalized = normalizeContactChannels(channels);
  const parts = [];
  if (normalized.phone) parts.push(normalized.phone);
  for (const channel of SELLER_CONTACT_CHANNELS) {
    const item = normalized[channel.id];
    if (item?.handle) parts.push(`${channel.label}: ${item.handle}`);
    else if (item?.qr_url) parts.push(`${channel.label}: QR`);
  }
  if (normalized.email) parts.push(`이메일: ${normalized.email}`);
  return parts.join(' · ');
}

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

export function channelActionHref(channelId, handle) {
  const value = cleanText(handle);
  if (!value) return '';

  if (channelId === 'whatsapp') {
    const digits = digitsOnly(value);
    if (digits.length >= 8) return `https://wa.me/${digits}`;
    return '';
  }
  if (channelId === 'telegram') {
    const username = value.replace(/^@/, '');
    if (/^[a-zA-Z0-9_]{5,}$/.test(username)) return `https://t.me/${username}`;
    return '';
  }
  if (channelId === 'kakao') {
    // Kakao IDs are usually search-only; keep as plain display unless URL was pasted.
    if (/^https?:\/\//i.test(value)) return cleanUrl(value);
    return '';
  }
  if (channelId === 'wechat') {
    if (/^https?:\/\//i.test(value)) return cleanUrl(value);
    return '';
  }
  return '';
}

/** Prefer phone-only in sponsors.contact so structured channels are not duplicated on display. */
export function buildLegacyContactText({ phone = '', channels = null } = {}) {
  const normalized = normalizeContactChannels(channels);
  const phoneText = cleanText(phone) || normalized.phone;
  if (phoneText) return phoneText;
  // Older UIs that only read `contact` still get a readable fallback when phone is empty.
  return contactChannelsSummary(normalized) || null;
}

/** Resolve display phone from structured channels or legacy contact string. */
export function displayContactPhone({ contact = '', channels = null } = {}) {
  const normalized = normalizeContactChannels(channels);
  if (normalized.phone) return normalized.phone;
  const raw = cleanText(contact);
  if (!raw) return '';
  if (contactChannelsHaveAny(normalized) && /WhatsApp|WeChat|Telegram|카카오|이메일/.test(raw)) {
    return '';
  }
  return raw;
}

/** Best primary CTA target: email → messenger deep link → phone → page anchor. */
export function primaryContactHref({ contact = '', channels = null } = {}) {
  const normalized = normalizeContactChannels(channels);
  if (normalized.email) return `mailto:${normalized.email}`;

  for (const channel of SELLER_CONTACT_CHANNELS) {
    const href = channelActionHref(channel.id, normalized[channel.id]?.handle);
    if (href) return href;
  }

  const phone = displayContactPhone({ contact, channels: normalized });
  if (phone) {
    const emailMatch = phone.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    if (emailMatch) return `mailto:${emailMatch[0]}`;
    const digits = phone.replace(/[^\d+]/g, '');
    if (digits.replace(/\D/g, '').length >= 7) return `tel:${digits}`;
  }

  return '#shop-seller-contact';
}
