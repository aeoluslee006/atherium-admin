'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const MAX_EDGE = 1200;
const JPEG_QUALITY = 0.82;

async function fileToCompressedDataUrl(file) {
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

async function uploadOrEmbedImage(file, userId) {
  // Prefer Storage when bucket exists; otherwise embed compressed data URL inline.
  try {
    const ext = (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    const path = `${userId || 'anon'}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
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
    // fall through to data URL
  }
  return fileToCompressedDataUrl(file);
}

function insertHtmlAtSelection(root, html) {
  root.focus();
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) {
    root.innerHTML += html;
    return;
  }
  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) {
    root.innerHTML += html;
    return;
  }
  range.deleteContents();
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const frag = document.createDocumentFragment();
  let node;
  let last = null;
  while ((node = temp.firstChild)) {
    last = frag.appendChild(node);
  }
  range.insertNode(frag);
  if (last) {
    range.setStartAfter(last);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

/**
 * Inline body editor: paste/drop images into the content (not file attachments).
 */
export default function MarketBodyEditor({ value, onChange, disabled }) {
  const ref = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [hint, setHint] = useState('');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (el.innerHTML !== (value || '')) {
      el.innerHTML = value || '';
    }
  }, [value]);

  function emitChange() {
    const html = ref.current?.innerHTML || '';
    onChange?.(html);
  }

  async function ingestFiles(fileList) {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    setUploading(true);
    setHint('사진 넣는 중…');
    try {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      for (const file of files) {
        const src = await uploadOrEmbedImage(file, userId);
        insertHtmlAtSelection(
          ref.current,
          `<p><img src="${src}" alt="" class="market-inline-image" /></p><p><br/></p>`
        );
      }
      emitChange();
      setHint('사진을 본문에 붙였습니다.');
    } catch (err) {
      setHint(err.message || '사진 넣기에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  }

  async function handlePaste(e) {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItems = items.filter((item) => item.type.startsWith('image/'));
    if (!imageItems.length) return;
    e.preventDefault();
    const files = imageItems.map((item) => item.getAsFile()).filter(Boolean);
    await ingestFiles(files);
  }

  async function handleDrop(e) {
    e.preventDefault();
    await ingestFiles(e.dataTransfer?.files);
  }

  return (
    <div className="market-editor">
      <div
        ref={ref}
        className="market-editor-canvas"
        contentEditable={!disabled && !uploading}
        role="textbox"
        aria-multiline="true"
        aria-label="중고장터 본문"
        data-placeholder="내용을 입력하세요. 사진은 Ctrl+V로 바로 붙일 수 있습니다."
        onInput={emitChange}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        suppressContentEditableWarning
      />
      <p className="field-help">
        첨부파일 버튼 없이, 본문에 사진을 <strong>붙여넣기(Ctrl+V)</strong> 하거나 끌어다 놓으세요.
        {hint ? ` · ${hint}` : ''}
      </p>
    </div>
  );
}
