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
