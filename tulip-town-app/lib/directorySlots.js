/** Helpers for directory_slots newspaper grid. */

export const DIRECTORY_GRID_COLS = 4;
export const DIRECTORY_GRID_ROWS = 6;

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

/** Default slot template when admin adds a new page (matches seeded layout intent). */
export function buildDefaultPageSlots(pageNumber) {
  const page = Number(pageNumber);
  const page1Premium = page === 1;
  const prices = page1Premium
    ? { small: 2500, medium: 7000, large: 14000 }
    : { small: 1800, medium: 5000, large: 10000 };

  // 4x6 board: 2 large (2x3), 2 medium (2x2), 4 small (1x1) — 8 sellable slots.
  const specs = [
    { row: 0, col: 0, spanCols: 2, spanRows: 3, tier: 'large', label: 'A-1' },
    { row: 0, col: 2, spanCols: 2, spanRows: 3, tier: 'large', label: 'A-3' },
    { row: 3, col: 0, spanCols: 2, spanRows: 2, tier: 'medium', label: 'D-1' },
    { row: 3, col: 2, spanCols: 2, spanRows: 2, tier: 'medium', label: 'D-3' },
    { row: 5, col: 0, spanCols: 1, spanRows: 1, tier: 'small', label: 'F-1' },
    { row: 5, col: 1, spanCols: 1, spanRows: 1, tier: 'small', label: 'F-2' },
    { row: 5, col: 2, spanCols: 1, spanRows: 1, tier: 'small', label: 'F-3' },
    { row: 5, col: 3, spanCols: 1, spanRows: 1, tier: 'small', label: 'F-4' },
  ];

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
