/** Helpers for directory_slots newspaper grid. */

/** Standard compose canvas (and dense board pages). */
export const DIRECTORY_GRID_COLS = 6;
export const DIRECTORY_GRID_ROWS = 10;

export const SIZE_TIER_LABEL = {
  small: '소형',
  medium: '중형',
  large: '대형',
  ultra: '울트라',
};

/**
 * Slot size presets for free-form page composition (6×10 canvas).
 * Large = full width × 4 rows. Ultra = entire page.
 * Medium has landscape + vertical variants (same size_tier).
 */
export const SLOT_SIZE_PRESETS = {
  small: {
    id: 'small',
    sizeTier: 'small',
    spanCols: 2,
    spanRows: 2,
    label: '소형',
    hint: '2×2',
    defaultPriceCents: 1800,
  },
  medium: {
    id: 'medium',
    sizeTier: 'medium',
    spanCols: 4,
    spanRows: 2,
    label: '중형',
    hint: '4×2 가로',
    defaultPriceCents: 5000,
  },
  medium_vertical: {
    id: 'medium_vertical',
    sizeTier: 'medium',
    spanCols: 2,
    spanRows: 4,
    label: '중형(세로)',
    hint: '2×4 세로',
    defaultPriceCents: 5000,
  },
  large: {
    id: 'large',
    sizeTier: 'large',
    spanCols: 6,
    spanRows: 4,
    label: '대형',
    hint: '6×4',
    defaultPriceCents: 9000,
  },
  ultra: {
    id: 'ultra',
    sizeTier: 'ultra',
    spanCols: 6,
    spanRows: 10,
    label: '울트라(전면)',
    hint: '6×10 · 페이지 전체',
    defaultPriceCents: 18000,
  },
};

export const SLOT_SIZE_PRESET_LIST = [
  SLOT_SIZE_PRESETS.small,
  SLOT_SIZE_PRESETS.medium,
  SLOT_SIZE_PRESETS.medium_vertical,
  SLOT_SIZE_PRESETS.large,
  SLOT_SIZE_PRESETS.ultra,
];

export function formatSlotPrice(cents) {
  const n = Number(cents);
  if (!Number.isFinite(n)) return '—';
  const dollars = n / 100;
  return `$${dollars % 1 === 0 ? dollars.toFixed(0) : dollars.toFixed(2)}/월`;
}

export function sizeTierLabel(tier) {
  return SIZE_TIER_LABEL[tier] || tier || '—';
}

export function getSlotSizePreset(presetId) {
  return SLOT_SIZE_PRESETS[presetId] || null;
}

/**
 * Per-page grid size from slot occupancy, not a hardcoded 6×8.
 * cols = max(col_index + span_cols), rows = max(row_index + span_rows)
 */
export function computePageGridSize(slots = []) {
  let cols = 1;
  let rows = 1;
  for (const slot of slots || []) {
    const c = Number(slot.col_index) || 0;
    const r = Number(slot.row_index) || 0;
    const spanC = Number(slot.span_cols) || 1;
    const spanR = Number(slot.span_rows) || 1;
    cols = Math.max(cols, c + spanC);
    rows = Math.max(rows, r + spanR);
  }
  return { cols, rows };
}

const ROW_LETTERS = 'ABCDEFGHIJ';

/** New display number after 2×2 merge, e.g. row 0 col 0 → A-1. */
export function displayCellLabel(displayRow, displayCol) {
  const letter = ROW_LETTERS[Number(displayRow) || 0] || String((Number(displayRow) || 0) + 1);
  return `${letter}-${(Number(displayCol) || 0) + 1}`;
}

/** Legacy cover template: only original page 1 (1×3 large stack). */
export function isCoverPage(pageNumber) {
  return Number(pageNumber) === 1;
}

/** True when every slot is a 1×1 small cell (legacy dense board). */
export function pageUsesDenseSmallCells(slots = []) {
  if (!slots?.length) return false;
  return slots.every(
    (s) =>
      (Number(s.span_cols) || 1) === 1 &&
      (Number(s.span_rows) || 1) === 1 &&
      (s.size_tier || 'small') === 'small'
  );
}

/**
 * Dense 6×10 small boards show 2×2 groups as one cell.
 * Composed pages (spans / mixed tiers) render true spans — no merge.
 */
export function getDisplayMergeFactor(pageNumber, cols, rows, slots = []) {
  if (!pageUsesDenseSmallCells(slots)) return 1;
  if (cols >= 6 && rows >= 8) return 2;
  return 1;
}

/**
 * Merge every mergeFactor×mergeFactor block of slots into one display cell.
 * DB slots unchanged; display grid becomes cols/mergeFactor × rows/mergeFactor.
 */
export function mergeSlotsForDisplay(slots = [], mergeFactor = 1) {
  const factor = Math.max(1, Number(mergeFactor) || 1);
  if (factor <= 1) {
    return (slots || []).map((slot) => ({
      key: slot.id || `${slot.row_index}-${slot.col_index}`,
      slots: [slot],
      displayCol: Number(slot.col_index) || 0,
      displayRow: Number(slot.row_index) || 0,
      spanCols: Number(slot.span_cols) || 1,
      spanRows: Number(slot.span_rows) || 1,
      primary: slot,
      label: slot.position_label || '—',
    }));
  }

  const groups = new Map();
  for (const slot of slots || []) {
    const dc = Math.floor((Number(slot.col_index) || 0) / factor);
    const dr = Math.floor((Number(slot.row_index) || 0) / factor);
    const key = `${dr}-${dc}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(slot);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => {
      const [ar, ac] = a.split('-').map(Number);
      const [br, bc] = b.split('-').map(Number);
      if (ar !== br) return ar - br;
      return ac - bc;
    })
    .map(([key, group]) => {
      const sorted = [...group].sort((a, b) => {
        if (a.row_index !== b.row_index) return a.row_index - b.row_index;
        return a.col_index - b.col_index;
      });
      const occupied = sorted.find((s) => s.status === 'occupied');
      return {
        key,
        slots: sorted,
        displayCol: Number(key.split('-')[1]),
        displayRow: Number(key.split('-')[0]),
        spanCols: 1,
        spanRows: 1,
        primary: occupied || sorted[0],
        label: displayCellLabel(Number(key.split('-')[0]), Number(key.split('-')[1])),
      };
    });
}

function rectsOverlap(a, b) {
  return !(
    a.col + a.spanCols <= b.col ||
    b.col + b.spanCols <= a.col ||
    a.row + a.spanRows <= b.row ||
    b.row + b.spanRows <= a.row
  );
}

export function canPlaceSlot(existing = [], row, col, spanCols, spanRows, {
  cols = DIRECTORY_GRID_COLS,
  rows = DIRECTORY_GRID_ROWS,
} = {}) {
  const r = Number(row);
  const c = Number(col);
  const sc = Number(spanCols);
  const sr = Number(spanRows);
  if (![r, c, sc, sr].every((n) => Number.isFinite(n) && n >= 0)) return false;
  if (sc < 1 || sr < 1) return false;
  if (c + sc > cols || r + sr > rows) return false;
  const next = { row: r, col: c, spanCols: sc, spanRows: sr };
  return !existing.some((p) =>
    rectsOverlap(next, {
      row: Number(p.row ?? p.row_index) || 0,
      col: Number(p.col ?? p.col_index) || 0,
      spanCols: Number(p.spanCols ?? p.span_cols) || 1,
      spanRows: Number(p.spanRows ?? p.span_rows) || 1,
    })
  );
}

/**
 * Normalize composer placements → DB slot rows.
 * placement: { presetId, row, col, base_price_cents? }
 */
export function buildComposedPageSlots(pageNumber, placements = []) {
  const page = Number(pageNumber);
  if (!Number.isFinite(page) || page < 1) {
    throw new Error('Invalid page number');
  }
  if (!Array.isArray(placements) || !placements.length) {
    throw new Error('슬롯을 하나 이상 배치해 주세요.');
  }

  const normalized = [];
  for (const raw of placements) {
    const preset = getSlotSizePreset(raw.presetId || raw.preset_id);
    if (!preset) {
      throw new Error(`알 수 없는 슬롯 크기: ${raw.presetId || raw.preset_id}`);
    }
    const row = Number(raw.row);
    const col = Number(raw.col);
    if (!canPlaceSlot(normalized, row, col, preset.spanCols, preset.spanRows)) {
      throw new Error(`슬롯을 배치할 수 없습니다 (${preset.label} @ ${row},${col}).`);
    }
    const price = Number(raw.base_price_cents);
    normalized.push({
      presetId: preset.id,
      row,
      col,
      spanCols: preset.spanCols,
      spanRows: preset.spanRows,
      sizeTier: preset.sizeTier,
      base_price_cents: Number.isFinite(price) && price >= 0 ? Math.round(price) : preset.defaultPriceCents,
      label: displayCellLabel(row, col),
    });
  }

  return normalized.map((s) => ({
    page_number: page,
    row_index: s.row,
    col_index: s.col,
    span_cols: s.spanCols,
    span_rows: s.spanRows,
    position_label: s.label,
    size_tier: s.sizeTier,
    base_price_cents: s.base_price_cents,
    status: 'available',
  }));
}

function coverPageSpecs() {
  // Legacy page 1: 1×3 stack of large ads
  return [
    { row: 0, col: 0, spanCols: 1, spanRows: 1, tier: 'large', label: 'A-1' },
    { row: 1, col: 0, spanCols: 1, spanRows: 1, tier: 'large', label: 'B-1' },
    { row: 2, col: 0, spanCols: 1, spanRows: 1, tier: 'large', label: 'C-1' },
  ];
}

function boardPageSpecs() {
  // Dense 6×10 classifieds board (60 small cells)
  const specs = [];
  for (let r = 0; r < DIRECTORY_GRID_ROWS; r += 1) {
    for (let c = 0; c < DIRECTORY_GRID_COLS; c += 1) {
      specs.push({
        row: r,
        col: c,
        spanCols: 1,
        spanRows: 1,
        tier: 'small',
        label: `${ROW_LETTERS[r]}-${c + 1}`,
      });
    }
  }
  return specs;
}

/**
 * Default slot template when admin uses quick "페이지 추가" (legacy fill).
 * Page 1 = 3 large stacked ads; later pages = 6×10 small classifieds.
 */
export function buildDefaultPageSlots(pageNumber) {
  const page = Number(pageNumber);
  const cover = isCoverPage(page);
  const prices = cover
    ? { small: 2500, medium: 7000, large: 9000, ultra: 18000 }
    : { small: 1800, medium: 5000, large: 10000, ultra: 18000 };

  const specs = cover ? coverPageSpecs() : boardPageSpecs();

  return specs.map((s) => ({
    page_number: page,
    row_index: s.row,
    col_index: s.col,
    span_cols: s.spanCols,
    span_rows: s.spanRows,
    position_label: s.label,
    size_tier: s.tier,
    base_price_cents: prices[s.tier],
    status: 'available',
  }));
}

export function groupSlotsByPage(slots) {
  const map = new Map();
  for (const slot of slots || []) {
    const page = Number(slot.page_number) || 1;
    if (!map.has(page)) map.set(page, []);
    map.get(page).push(slot);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([pageNumber, pageSlots]) => ({ pageNumber, slots: pageSlots }));
}

/** Facing-page spreads: [1,2], [3], … (Crossroads-style). */
export function buildDirectorySpreads(pageNumbers = []) {
  const sorted = [...pageNumbers].sort((a, b) => a - b);
  const spreads = [];
  for (let i = 0; i < sorted.length; i += 2) {
    spreads.push({ left: sorted[i], right: sorted[i + 1] ?? null });
  }
  return spreads;
}

export function directorySpreadLabel(spread) {
  if (!spread) return '';
  if (spread.right != null) return `${spread.left}-${spread.right}면`;
  return `${spread.left}면`;
}
