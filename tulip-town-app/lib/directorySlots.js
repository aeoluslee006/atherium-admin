/** Helpers for directory_slots newspaper grid. */

/** CSS fallbacks only — actual tracks come from computePageGridSize(). */
export const DIRECTORY_GRID_COLS = 6;
export const DIRECTORY_GRID_ROWS = 10;

export const SIZE_TIER_LABEL = {
  small: '소형',
  medium: '중형',
  large: '대형',
};

export function formatSlotPrice(cents) {
  const n = Number(cents);
  if (!Number.isFinite(n)) return '—';
  const dollars = n / 100;
  return `$${dollars % 1 === 0 ? dollars.toFixed(0) : dollars.toFixed(2)}/월`;
}

export function sizeTierLabel(tier) {
  return SIZE_TIER_LABEL[tier] || tier || '—';
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

/** Dense board pages (2+) show 2×2 slot groups as one cell for readability. */
export function getDisplayMergeFactor(pageNumber, cols, rows) {
  const page = Number(pageNumber) || 1;
  if (page >= 2 && cols >= 6 && rows >= 8) return 2;
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
      key: slot.id,
      slots: [slot],
      displayCol: Number(slot.col_index) || 0,
      displayRow: Number(slot.row_index) || 0,
      primary: slot,
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
        primary: occupied || sorted[0],
      };
    });
}

const ROW_LETTERS = 'ABCDEFGHIJ';

function coverPageSpecs() {
  // Page 1: 1×3 stack of large ads
  return [
    { row: 0, col: 0, spanCols: 1, spanRows: 1, tier: 'large', label: 'A-1' },
    { row: 1, col: 0, spanCols: 1, spanRows: 1, tier: 'large', label: 'B-1' },
    { row: 2, col: 0, spanCols: 1, spanRows: 1, tier: 'large', label: 'C-1' },
  ];
}

function boardPageSpecs() {
  // Pages 2+: 6×10 classifieds board (60 small cells)
  const specs = [];
  for (let r = 0; r < 10; r += 1) {
    for (let c = 0; c < 6; c += 1) {
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
 * Default slot template when admin adds a new page.
 * Page 1 = 3 large stacked ads; later pages = 6×10 small classifieds.
 */
export function buildDefaultPageSlots(pageNumber) {
  const page = Number(pageNumber);
  const page1Premium = page === 1;
  const prices = page1Premium
    ? { small: 2500, medium: 7000, large: 14000 }
    : { small: 1800, medium: 5000, large: 10000 };

  const specs = page === 1 ? coverPageSpecs() : boardPageSpecs();

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
