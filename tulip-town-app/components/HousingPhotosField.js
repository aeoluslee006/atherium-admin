'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const MAX_EDGE = 1400;
const JPEG_QUALITY = 0.84;
const MAX_PHOTOS = 12;

async function fileToCompressedBlob(file) {
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
  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  const res = await fetch(dataUrl);
  return res.blob();
}

async function uploadOrEmbed(file, userId) {
  const blob = await fileToCompressedBlob(file);
  try {
    const path = `${userId || 'anon'}/housing-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
    const { error } = await supabase.storage.from('post-images').upload(path, blob, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'image/jpeg',
    });
    if (!error) {
      const { data } = supabase.storage.from('post-images').getPublicUrl(path);
      if (data?.publicUrl) return data.publicUrl;
    }
  } catch {
    // fall through
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('이미지 읽기 실패'));
    reader.readAsDataURL(blob);
  });
}

/** Multi-photo picker for housing listings (URLs stored separately from body). */
export default function HousingPhotosField({ value = [], onChange, disabled }) {
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState('');
  const photos = Array.isArray(value) ? value : [];

  async function ingest(fileList) {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      setHint(`사진은 최대 ${MAX_PHOTOS}장까지입니다.`);
      return;
    }
    setBusy(true);
    setHint('사진 올리는 중…');
    try {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      const next = [...photos];
      for (const file of files.slice(0, room)) {
        const src = await uploadOrEmbed(file, userId);
        next.push(src);
      }
      onChange?.(next);
      setHint(`${next.length}장 등록됨`);
    } catch (err) {
      setHint(err.message || '사진 올리기에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  function removeAt(index) {
    onChange?.(photos.filter((_, i) => i !== index));
  }

  function move(index, dir) {
    const j = index + dir;
    if (j < 0 || j >= photos.length) return;
    const next = [...photos];
    const [item] = next.splice(index, 1);
    next.splice(j, 0, item);
    onChange?.(next);
  }

  return (
    <div className="housing-photos-field">
      {photos.length ? (
        <ul className="housing-photos-grid">
          {photos.map((src, i) => (
            <li key={`${src.slice(0, 48)}-${i}`} className="housing-photos-item">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" />
              <div className="housing-photos-item-actions">
                <button type="button" onClick={() => move(i, -1)} disabled={disabled || busy || i === 0}>
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={disabled || busy || i === photos.length - 1}
                >
                  →
                </button>
                <button type="button" onClick={() => removeAt(i)} disabled={disabled || busy}>
                  삭제
                </button>
              </div>
              {i === 0 ? <span className="housing-photos-cover">대표</span> : null}
            </li>
          ))}
        </ul>
      ) : null}

      <label className={`housing-photos-drop${busy ? ' is-busy' : ''}`}>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={disabled || busy || photos.length >= MAX_PHOTOS}
          onChange={(e) => {
            ingest(e.target.files);
            e.target.value = '';
          }}
        />
        <span>{busy ? '올리는 중…' : '사진 추가 (여러 장 가능)'}</span>
        <small>최대 {MAX_PHOTOS}장 · 첫 장이 대표 사진</small>
      </label>
      {hint ? <p className="field-help">{hint}</p> : null}
    </div>
  );
}
