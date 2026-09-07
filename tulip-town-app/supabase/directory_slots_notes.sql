-- Optional reference / local seed notes for directory 지면 slots.
-- Production already has tables + seed; do not re-run unless needed.

-- directory_slots / directory_slot_ads are managed in Supabase.
-- Admin quick "소형 보드 페이지 추가" uses buildDefaultPageSlots().
-- Black (is_moderator) + admin compose free layouts via
-- /mypage/directory-pages → POST /api/directory-pages/compose
-- Presets: small 2×2, medium 4×2, medium_vertical 2×4, large 6×5 (half page)
-- on a 6×10 canvas (lib/directorySlots.js SLOT_SIZE_PRESETS).
