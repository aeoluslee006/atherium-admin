'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const MAX_EDGE = 480;
const JPEG_QUALITY = 0.85;

async function compressToDataUrl(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

async function uploadOrEmbed(file, userId) {
  try {
    const ext = (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    const path = `${userId || 'anon'}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('post-images').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'image/jpeg',
    });
    if (!error) {
      const { data } = supabase.storage.from('post-images').getPublicUrl(path);
      if (data?.publicUrl) return data.publicUrl;
    }
  } catch {
    // fall through
  }
  return compressToDataUrl(file);
}

/** Single company logo field — paste or drop one image (not a busy gallery). */
export default function JobLogoField({ value, onChange, disabled }) {
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState('');

  async function ingest(fileList) {
    const file = Array.from(fileList || []).find((f) => f.type.startsWith('image/'));
    if (!file) return;
    setBusy(true);
    setHint('로고 넣는 중…');
    try {
      const { data } = await supabase.auth.getSession();
      const src = await uploadOrEmbed(file, data.session?.user?.id);
      onChange?.(src);
      setHint('로고가 들어갔습니다.');
    } catch (err) {
      setHint(err.message || '로고 넣기에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="job-logo-field">
      <div
        className={`job-logo-drop${value ? ' has-logo' : ''}`}
        onPaste={async (e) => {
          const items = Array.from(e.clipboardData?.items || []).filter((i) =>
            i.type.startsWith('image/')
          );
          if (!items.length) return;
          e.preventDefault();
          await ingest(items.map((i) => i.getAsFile()).filter(Boolean));
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={async (e) => {
          e.preventDefault();
          await ingest(e.dataTransfer?.files);
        }}
        tabIndex={0}
        role="button"
        aria-label="회사 로고 붙여넣기"
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="회사 로고" className="job-logo-preview" />
        ) : (
          <span className="job-logo-placeholder">
            회사 로고
            <small>Ctrl+V 또는 끌어다 놓기</small>
          </span>
        )}
      </div>
      <div className="job-logo-actions">
        <label className="btn btn-outline job-logo-file-btn">
          파일 선택
          <input
            type="file"
            accept="image/*"
            hidden
            disabled={disabled || busy}
            onChange={(e) => ingest(e.target.files)}
          />
        </label>
        {value ? (
          <button type="button" className="btn btn-outline" onClick={() => onChange?.('')} disabled={disabled || busy}>
            제거
          </button>
        ) : null}
      </div>
      <p className="field-help">
        목록에서 회사 옆에 작게 보입니다. 사진 여러 장 붙이지 말고 로고 하나만 넣어 주세요.
        {hint ? ` · ${hint}` : ''}
      </p>
    </div>
  );
}
