'use client';

import {
  SELLER_CONTACT_CHANNELS,
  channelActionHref,
  displayContactPhone,
  normalizeContactChannels,
} from '../lib/sellerContact';
import { useLocale } from './LocaleProvider';

export default function ShopContactChannels({
  contact = '',
  contactChannels = null,
  showHeading = false,
}) {
  const { t } = useLocale();
  const channels = normalizeContactChannels(contactChannels);
  const phone = displayContactPhone({ contact, channels });
  const messengerRows = SELLER_CONTACT_CHANNELS.filter((channel) => {
    const item = channels[channel.id];
    return Boolean(item?.handle || item?.qr_url);
  });
  const email = channels.email || '';
  if (!phone && !messengerRows.length && !email) return null;

  return (
    <div className="shop-contact-channels" id="shop-seller-contact">
      {showHeading ? (
        <div className="shop-contact-channels-title">{t('shop.contactTitle')}</div>
      ) : null}

      {phone ? <div className="shop-contact-value">{phone}</div> : null}

      {messengerRows.length ? (
        <ul className="shop-contact-channel-list">
          {messengerRows.map((channel) => {
            const item = channels[channel.id];
            const href = channelActionHref(channel.id, item.handle);
            return (
              <li key={channel.id} className="shop-contact-channel-row">
                <div className="shop-contact-channel-meta">
                  <strong>{channel.label}</strong>
                  {item.handle ? (
                    href ? (
                      <a href={href} target="_blank" rel="noopener noreferrer">
                        {item.handle}
                      </a>
                    ) : (
                      <span>{item.handle}</span>
                    )
                  ) : (
                    <span className="hint-text">{t('shop.contactQr')}</span>
                  )}
                </div>
                {item.qr_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="shop-contact-channel-qr"
                    src={item.qr_url}
                    alt={`${channel.label} QR`}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {email ? (
        <div className="shop-contact-email">
          <strong>{t('shop.contactEmail')}</strong>
          <a href={`mailto:${email}`}>{email}</a>
        </div>
      ) : null}
    </div>
  );
}
