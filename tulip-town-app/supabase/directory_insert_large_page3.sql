-- Insert a large-block page like 1면 as the new 3면.
-- Existing page_number >= 3 shifts up by 1 (old 3면 → 4면, etc.).
-- Ads stay linked via slot_id; only directory_slots.page_number changes.
-- Idempotent: skips if 3면 already has exactly 3 large slots.
-- Run once in Supabase SQL editor.

DO $$
DECLARE
  cover_count int;
  inserted int;
BEGIN
  SELECT COUNT(*) INTO cover_count
  FROM directory_slots
  WHERE page_number = 3 AND size_tier = 'large';

  IF cover_count = 3
     AND (SELECT COUNT(*) FROM directory_slots WHERE page_number = 3) = 3 THEN
    RAISE NOTICE '3면 large cover already present; no changes.';
    RETURN;
  END IF;

  -- Avoid unique conflicts while shifting (page_number, position_label).
  UPDATE directory_slots
  SET page_number = page_number + 1000
  WHERE page_number >= 3;

  UPDATE directory_slots
  SET page_number = page_number - 1000 + 1
  WHERE page_number >= 1003;

  INSERT INTO directory_slots (
    page_number,
    row_index,
    col_index,
    span_cols,
    span_rows,
    position_label,
    size_tier,
    base_price_cents,
    status
  )
  SELECT
    3 AS page_number,
    s.row_index,
    s.col_index,
    s.span_cols,
    s.span_rows,
    s.position_label,
    s.size_tier,
    COALESCE(s.base_price_cents, 9000) AS base_price_cents,
    'available' AS status
  FROM directory_slots s
  WHERE s.page_number = 1
    AND s.size_tier = 'large'
  ORDER BY s.row_index, s.col_index;

  GET DIAGNOSTICS inserted = ROW_COUNT;

  IF inserted = 0 THEN
    INSERT INTO directory_slots (
      page_number, row_index, col_index, span_cols, span_rows,
      position_label, size_tier, base_price_cents, status
    ) VALUES
      (3, 0, 0, 1, 1, 'A-1', 'large', 9000, 'available'),
      (3, 1, 0, 1, 1, 'B-1', 'large', 9000, 'available'),
      (3, 2, 0, 1, 1, 'C-1', 'large', 9000, 'available');
  END IF;
END $$;
