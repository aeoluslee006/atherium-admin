'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  SELLER_CONTACT_CHANNELS,
  emptyContactChannels,
  normalizeContactChannels,
} from '../lib/sellerContact';

const QR_BUCKET = 'post-images';

export default function ShopContactChannelsEditor({
  value,
  onChange,
  phone = '',
  onPhoneChange,
  disabled = false,
  showPhone = true,
}) {
  const channels = normalizeContactChannels(value || emptyContactChannels());
  const [uploadingKey, setUploadingKey] = useState('');
  const [uploadError, setUploadError] = useState('');

  function patchChannel(channelId, patch) {
    onChange(
      normalizeContactChannels({
        ...channels,
        [channelId]: {
          ...channels[channelId],
          ...patch,
        },
      })
    );
  }

  function patchEmail(next) {
    onChange(
      normalizeContactChannels({
        ...channels,
        email: next,
      })
    );
  }

  async function uploadQr(channelId, file) {
    if (!file) return;
    setUploadError('');
    setUploadingKey(channelId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid) throw new Error('로그인이 필요합니다.');

      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const path = `seller-contact-qr/${uid}/${channelId}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(QR_BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      });
      if (error) throw error;
      const { data: pub } = supabase.storage.from(QR_BUCKET).getPublicUrl(path);
      patchChannel(channelId, { qr_url: pub?.publicUrl || '' });
    } catch (err) {
      setUploadError(err.message || 'QR 업로드에 실패했습니다.');
    } finally {
      setUploadingKey('');
    }
  }

  return (
    <div className="shop-contact-editor">
      {showPhone ? (
        <>
          <label htmlFor="seller-phone">전화 / 문자 (선택)</label>
          <input
            id="seller-phone"
            value={phone}
            onChange={(e) => onPhoneChange?.(e.target.value)}
            placeholder="예: 616-555-0100"
            disabled={disabled}
          />
        </>
      ) : null}

      <p className="hint-text" style={{ marginTop: showPhone ? 8 : 0 }}>
        WhatsApp · WeChat · Telegram · 카카오톡 아이디 또는 QR 코드를 넣을 수 있습니다. 이메일은 아래에
        따로 적어 주세요.
      </p>

      <div className="shop-contact-editor-grid">
        {SELLER_CONTACT_CHANNELS.map((channel) => {
          const item = channels[channel.id] || { handle: '', qr_url: '' };
          return (
            <div key={channel.id} className="shop-contact-editor-card">
              <div className="shop-contact-editor-card-head">{channel.label}</div>
              <label htmlFor={`contact-${channel.id}-handle`}>아이디</label>
              <input
                id={`contact-${channel.id}-handle`}
                value={item.handle || ''}
                onChange={(e) => patchChannel(channel.id, { handle: e.target.value })}
                placeholder={channel.placeholder}
                disabled={disabled}
              />
              <label htmlFor={`contact-${channel.id}-qr`}>QR 코드 (선택)</label>
              <input
                id={`contact-${channel.id}-qr`}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                disabled={disabled || uploadingKey === channel.id}
                onChange={(e) => uploadQr(channel.id, e.target.files?.[0])}
              />
              {uploadingKey === channel.id ? (
                <p className="hint-text">업로드 중…</p>
              ) : null}
              {item.qr_url ? (
                <div className="shop-contact-editor-qr">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.qr_url} alt={`${channel.label} QR`} />
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={disabled}
                    onClick={() => patchChannel(channel.id, { qr_url: '' })}
                  >
                    QR 삭제
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <label htmlFor="seller-email" style={{ marginTop: 12 }}>
        이메일
      </label>
      <input
        id="seller-email"
        type="email"
        value={channels.email || ''}
        onChange={(e) => patchEmail(e.target.value)}
        placeholder="예: seller@email.com"
        disabled={disabled}
      />

      {uploadError ? <div className="error-text">{uploadError}</div> : null}
    </div>
  );
}
