'use client';

import { useMemo, useState } from 'react';
import {
  DIRECTORY_GRID_COLS,
  DIRECTORY_GRID_ROWS,
  SLOT_SIZE_PRESET_LIST,
  canPlaceSlot,
  formatSlotPrice,
  getSlotSizePreset,
} from '../lib/directorySlots';
import { supabase } from '../lib/supabaseClient';

function placementKey(p) {
  return `${p.presetId}-${p.row}-${p.col}-${p._id || ''}`;
}

let placementSeq = 0;

/**
 * Inline compose canvas for black/admin: drag presets onto the page, then SUBMIT.
 * mode: 'plus' shows big +, 'edit' shows grid after + is pressed.
 */
export default function DirectoryPageComposer({
  onCreated,
  onCancel,
  autoStart = false,
}) {
  const [started, setStarted] = useState(Boolean(autoStart));
  const [presetId, setPresetId] = useState('small');
  const [placements, setPlacements] = useState([]);
  const [hover, setHover] = useState(null);
  const [dragPresetId, setDragPresetId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const activePresetId = dragPresetId || presetId;
  const preset = getSlotSizePreset(activePresetId);

  const occupiedMeta = useMemo(() => {
    const map = new Map();
    for (const p of placements) {
      const pr = getSlotSizePreset(p.presetId);
      if (!pr) continue;
      for (let r = p.row; r < p.row + pr.spanRows; r += 1) {
        for (let c = p.col; c < p.col + pr.spanCols; c += 1) {
          map.set(`${r}-${c}`, {
            placement: p,
            preset: pr,
            isOrigin: r === p.row && c === p.col,
          });
        }
      }
    }
    return map;
  }, [placements]);

  const hoverValid =
    hover &&
    preset &&
    canPlaceSlot(placements, hover.row, hover.col, preset.spanCols, preset.spanRows);

  function cellUnderPlacement(row, col) {
    return occupiedMeta.get(`${row}-${col}`)?.placement || null;
  }

  function placeAt(row, col, forcePresetId) {
    setError('');
    const useId = forcePresetId || activePresetId;
    const usePreset = getSlotSizePreset(useId);
    const existing = cellUnderPlacement(row, col);
    if (existing && !forcePresetId) {
      setPlacements((prev) => prev.filter((p) => placementKey(p) !== placementKey(existing)));
      return;
    }
    if (!usePreset || !canPlaceSlot(placements, row, col, usePreset.spanCols, usePreset.spanRows)) {
      setError('여기에는 선택한 크기를 놓을 수 없습니다.');
      return;
    }
    placementSeq += 1;
    setPlacements((prev) => [
      ...prev,
      {
        _id: placementSeq,
        presetId: usePreset.id,
        row,
        col,
        base_price_cents: usePreset.defaultPriceCents,
      },
    ]);
  }

  function onDragStartPreset(e, id) {
    setDragPresetId(id);
    setPresetId(id);
    try {
      e.dataTransfer.setData('text/preset-id', id);
      e.dataTransfer.effectAllowed = 'copy';
    } catch {
      /* ignore */
    }
  }

  function onDragEndPreset() {
    setDragPresetId(null);
    setHover(null);
  }

  function onDropCell(e, row, col) {
    e.preventDefault();
    let id = dragPresetId || presetId;
    try {
      const fromData = e.dataTransfer.getData('text/preset-id');
      if (fromData) id = fromData;
    } catch {
      /* ignore */
    }
    placeAt(row, col, id);
    setDragPresetId(null);
    setHover(null);
  }

  async function submitPage() {
    if (!placements.length) {
      setError('슬롯을 하나 이상 배치해 주세요.');
      return;
    }
    setBusy(true);
    setError('');
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller
      ? setTimeout(() => controller.abort(), 25000)
      : null;
    try {
      // Avoid awaiting supabase.auth.getSession() here — it can hang on navigator locks
      // while DirectoryPagesView also reads the session. Cookie auth on the API is enough.
      let token = '';
      try {
        const sessionPromise = supabase.auth.getSession();
        const timed = await Promise.race([
          sessionPromise,
          new Promise((resolve) => {
            setTimeout(() => resolve({ data: { session: null }, timedOut: true }), 2500);
          }),
        ]);
        if (!timed?.timedOut) {
          token = timed?.data?.session?.access_token || '';
        }
      } catch {
        token = '';
      }

      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('/api/directory-pages/compose', {
        method: 'POST',
        headers,
        credentials: 'same-origin',
        signal: controller?.signal,
        body: JSON.stringify({
          action: 'create_composed_page',
          placements: placements.map(({ presetId: pid, row, col, base_price_cents }) => ({
            presetId: pid,
            row,
            col,
            base_price_cents,
          })),
        }),
      });

      const text = await res.text();
      let payload = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(
          res.ok ? '서버 응답을 읽을 수 없습니다.' : `페이지 추가 실패 (${res.status})`
        );
      }
      if (!res.ok) {
        throw new Error(payload.error || `페이지 추가 실패 (${res.status})`);
      }
      setPlacements([]);
      setStarted(false);
      onCreated?.(payload);
    } catch (err) {
      const msg =
        err?.name === 'AbortError'
          ? '저장 시간이 초과되었습니다. 다시 시도해 주세요.'
          : err.message || '페이지 추가 실패';
      setError(msg);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setBusy(false);
    }
  }

  if (!started) {
    return (
      <div className="dir-spread-paper">
        <div className="dir-paper dir-paper--compose-plus">
          <button
            type="button"
            className="dir-compose-plus-btn"
            onClick={() => setStarted(true)}
            aria-label="새 지면 페이지 추가"
          >
            <span className="dir-compose-plus-icon" aria-hidden="true">
              +
            </span>
            <span className="dir-compose-plus-text">새 페이지 추가</span>
            <span className="dir-compose-plus-sub">블랙 레벨 · 슬롯을 드래그해 배치</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dir-spread-paper dir-compose-inline">
      <div
        className="dir-paper dir-paper--compose"
        style={{
          '--dir-cols': DIRECTORY_GRID_COLS,
          '--dir-rows': DIRECTORY_GRID_ROWS,
        }}
      >
        <div className="dir-paper-label">새 면 · 슬롯 배치</div>

        <div className="dir-compose-palette" aria-label="슬롯 크기">
          {SLOT_SIZE_PRESET_LIST.map((p) => (
            <button
              key={p.id}
              type="button"
              draggable
              className={`dir-compose-chip${presetId === p.id ? ' is-active' : ''}`}
              onClick={() => setPresetId(p.id)}
              onDragStart={(e) => onDragStartPreset(e, p.id)}
              onDragEnd={onDragEndPreset}
            >
              <strong>{p.label}</strong>
              <span>{p.hint}</span>
              <span>{formatSlotPrice(p.defaultPriceCents)}</span>
            </button>
          ))}
        </div>

        <p className="dir-compose-inline-hint">
          슬롯을 드래그하거나 선택한 뒤 칸을 눌러 배치하세요. 놓은 슬롯을 다시 누르면 제거됩니다.
        </p>

        {error ? <div className="error-text">{error}</div> : null}

        <div
          className="dir-composer-grid dir-composer-grid--inline"
          onMouseLeave={() => setHover(null)}
          onDragLeave={() => setHover(null)}
        >
          {Array.from({ length: DIRECTORY_GRID_ROWS * DIRECTORY_GRID_COLS }, (_, i) => {
            const row = Math.floor(i / DIRECTORY_GRID_COLS);
            const col = i % DIRECTORY_GRID_COLS;
            const meta = occupiedMeta.get(`${row}-${col}`);
            const inHover =
              hoverValid &&
              hover &&
              row >= hover.row &&
              row < hover.row + preset.spanRows &&
              col >= hover.col &&
              col < hover.col + preset.spanCols;

            return (
              <button
                key={`${row}-${col}`}
                type="button"
                className={[
                  'dir-composer-cell',
                  meta ? 'is-filled' : '',
                  meta?.isOrigin ? 'is-origin' : '',
                  inHover ? 'is-hover' : '',
                  `tier-${meta?.preset?.sizeTier || 'empty'}`,
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ gridColumn: col + 1, gridRow: row + 1 }}
                onMouseEnter={() => setHover({ row, col })}
                onDragOver={(e) => {
                  e.preventDefault();
                  setHover({ row, col });
                }}
                onDrop={(e) => onDropCell(e, row, col)}
                onClick={() => placeAt(row, col)}
                aria-label={`${row + 1}행 ${col + 1}열`}
              >
                {meta?.isOrigin ? (
                  <span className="dir-composer-slot-label">
                    {meta.preset.label}
                    <small>{formatSlotPrice(meta.placement.base_price_cents)}</small>
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="dir-compose-submit-bar">
          <button
            type="button"
            className="btn btn-outline"
            disabled={busy}
            onClick={() => {
              setPlacements([]);
              setStarted(false);
              setError('');
              onCancel?.();
            }}
          >
            취소
          </button>
          <button
            type="button"
            className="btn btn-outline"
            disabled={!placements.length || busy}
            onClick={() => setPlacements([])}
          >
            모두 지우기
          </button>
          <button
            type="button"
            className="btn dir-compose-submit"
            disabled={busy || !placements.length}
            onClick={submitPage}
          >
            {busy ? '저장 중…' : 'SUBMIT'}
          </button>
        </div>
      </div>
    </div>
  );
}
