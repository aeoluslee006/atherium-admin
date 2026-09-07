# Member tier + My Page (phase 1)

## Apply DB migration

In Supabase Dashboard → SQL Editor, run:

`supabase/member_tier_schema.sql`

This adds:
- `profiles.account_type`, `is_moderator`, `post_count`, `last_post_at`
- `subscriptions` table
- `member_tier_view` (computed tier)
- trigger to bump `post_count` / `last_post_at` on post insert
- one-time backfill of post counters

## App routes

- `/mypage` — login required, read-only (tier badge, subscriptions, my posts, comments on my posts)
- Header shows **마이페이지** when logged in

## Out of scope (later phases)

- Shop management UI
- Moderator tools
- Atherium admin member controls
- Tier badges on board/comment bylines
