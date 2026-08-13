/** Helpers for directory_slots newspaper grid. */

export const DIRECTORY_GRID_COLS = 6;
export const DIRECTORY_GRID_ROWS = 8;

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
 * Default slot template when admin adds a new page.
 * 6×8 board (48 cells): 4 large (2×2), 6 medium (2×1), 20 small (1×1) = 30 slots.
 * Matches seeded layout density; prices are placeholders.
 */
export function buildDefaultPageSlots(pageNumber) {
  const page = Number(pageNumber);
  const page1Premium = page === 1;
  const prices = page1Premium
    ? { small: 2500, medium: 7000, large: 14000 }
    : { small: 1800, medium: 5000, large: 10000 };

  const specs = [
    // Large 2×2
    { row: 0, col: 0, spanCols: 2, spanRows: 2, tier: 'large', label: 'A-1' },
    { row: 0, col: 2, spanCols: 2, spanRows: 2, tier: 'large', label: 'A-3' },
    { row: 0, col: 4, spanCols: 2, spanRows: 2, tier: 'large', label: 'A-5' },
    { row: 2, col: 0, spanCols: 2, spanRows: 2, tier: 'large', label: 'C-1' },
    // Medium 2×1
    { row: 2, col: 2, spanCols: 2, spanRows: 1, tier: 'medium', label: 'C-3' },
    { row: 2, col: 4, spanCols: 2, spanRows: 1, tier: 'medium', label: 'C-5' },
    { row: 3, col: 2, spanCols: 2, spanRows: 1, tier: 'medium', label: 'D-3' },
    { row: 3, col: 4, spanCols: 2, spanRows: 1, tier: 'medium', label: 'D-5' },
    { row: 4, col: 0, spanCols: 2, spanRows: 1, tier: 'medium', label: 'E-1' },
    { row: 4, col: 2, spanCols: 2, spanRows: 1, tier: 'medium', label: 'E-3' },
    // Small 1×1 — E-5, E-6 + F/G/H full rows
    { row: 4, col: 4, spanCols: 1, spanRows: 1, tier: 'small', label: 'E-5' },
    { row: 4, col: 5, spanCols: 1, spanRows: 1, tier: 'small', label: 'E-6' },
    { row: 5, col: 0, spanCols: 1, spanRows: 1, tier: 'small', label: 'F-1' },
    { row: 5, col: 1, spanCols: 1, spanRows: 1, tier: 'small', label: 'F-2' },
    { row: 5, col: 2, spanCols: 1, spanRows: 1, tier: 'small', label: 'F-3' },
    { row: 5, col: 3, spanCols: 1, spanRows: 1, tier: 'small', label: 'F-4' },
    { row: 5, col: 4, spanCols: 1, spanRows: 1, tier: 'small', label: 'F-5' },
    { row: 5, col: 5, spanCols: 1, spanRows: 1, tier: 'small', label: 'F-6' },
    { row: 6, col: 0, spanCols: 1, spanRows: 1, tier: 'small', label: 'G-1' },
    { row: 6, col: 1, spanCols: 1, spanRows: 1, tier: 'small', label: 'G-2' },
    { row: 6, col: 2, spanCols: 1, spanRows: 1, tier: 'small', label: 'G-3' },
    { row: 6, col: 3, spanCols: 1, spanRows: 1, tier: 'small', label: 'G-4' },
    { row: 6, col: 4, spanCols: 1, spanRows: 1, tier: 'small', label: 'G-5' },
    { row: 6, col: 5, spanCols: 1, spanRows: 1, tier: 'small', label: 'G-6' },
    { row: 7, col: 0, spanCols: 1, spanRows: 1, tier: 'small', label: 'H-1' },
    { row: 7, col: 1, spanCols: 1, spanRows: 1, tier: 'small', label: 'H-2' },
    { row: 7, col: 2, spanCols: 1, spanRows: 1, tier: 'small', label: 'H-3' },
    { row: 7, col: 3, spanCols: 1, spanRows: 1, tier: 'small', label: 'H-4' },
    { row: 7, col: 4, spanCols: 1, spanRows: 1, tier: 'small', label: 'H-5' },
    { row: 7, col: 5, spanCols: 1, spanRows: 1, tier: 'small', label: 'H-6' },
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
