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
  return `${p.presetId}-${p.row}-${p.col}`;
}

export default function DirectoryPageComposer({ onCreated }) {
  const [presetId, setPresetId] = useState('small');
  const [placements, setPlacements] = useState([]);
  const [hover, setHover] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const preset = getSlotSizePreset(presetId);

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

  function placeAt(row, col) {
    setError('');
    setMessage('');
    const existing = cellUnderPlacement(row, col);
    if (existing) {
      setPlacements((prev) => prev.filter((p) => placementKey(p) !== placementKey(existing)));
      return;
    }
    if (!preset || !canPlaceSlot(placements, row, col, preset.spanCols, preset.spanRows)) {
      setError('여기에는 선택한 크기를 놓을 수 없습니다.');
      return;
    }
    setPlacements((prev) => [
      ...prev,
      {
        presetId: preset.id,
        row,
        col,
        base_price_cents: preset.defaultPriceCents,
      },
    ]);
  }

  async function savePage() {
    if (!placements.length) {
      setError('슬롯을 하나 이상 배치해 주세요.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch('/api/directory-pages/compose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session?.access_token || ''}`,
        },
        body: JSON.stringify({
          action: 'create_composed_page',
          placements,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || '페이지 추가 실패');
      setPlacements([]);
      setMessage(`${payload.page_number}면이 추가되었습니다.`);
      onCreated?.(payload);
    } catch (err) {
      setError(err.message || '페이지 추가 실패');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dir-composer">
      <div className="dir-composer-toolbar">
        <div className="dir-composer-presets" role="radiogroup" aria-label="슬롯 크기">
          {SLOT_SIZE_PRESET_LIST.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={presetId === p.id}
              className={`dir-composer-preset${presetId === p.id ? ' is-active' : ''}`}
              onClick={() => setPresetId(p.id)}
            >
              <strong>{p.label}</strong>
              <span>{p.hint}</span>
              <span>{formatSlotPrice(p.defaultPriceCents)}</span>
            </button>
          ))}
        </div>
        <div className="dir-composer-actions">
          <button
            type="button"
            className="btn btn-outline"
            disabled={!placements.length || busy}
            onClick={() => setPlacements([])}
          >
            모두 지우기
          </button>
          <button type="button" className="btn" disabled={busy || !placements.length} onClick={savePage}>
            {busy ? '저장 중…' : '이 배치로 페이지 추가'}
          </button>
        </div>
      </div>

      <p className="hint-text dir-composer-hint">
        크기를 고른 뒤 칸을 클릭해 배치하세요. 이미 놓은 슬롯을 다시 클릭하면 제거됩니다. 캔버스는{' '}
        {DIRECTORY_GRID_COLS}×{DIRECTORY_GRID_ROWS}입니다.
      </p>

      {error ? <div className="error-text">{error}</div> : null}
      {message ? <div className="hint-text">{message}</div> : null}

      <div
        className="dir-composer-grid"
        style={{
          '--dir-cols': DIRECTORY_GRID_COLS,
          '--dir-rows': DIRECTORY_GRID_ROWS,
        }}
        onMouseLeave={() => setHover(null)}
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

      <p className="hint-text">배치된 슬롯 {placements.length}개</p>
    </div>
  );
}
