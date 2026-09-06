# Member tier phase 2 — shop management

## App routes

- `/mypage/shop` — login required; edit shop profile + products (reuses `/api/seller/*`)
- `/mypage` — includes **내 매장 관리** link
- Stripe shop checkout success/cancel returns to `/mypage/shop`

## APIs reused / extended

- `GET/PATCH /api/seller/me` — shop profile read/update (`business_name`, `city`, `description`, `contact`, `image_url`, `website_url`)
- `GET/POST/PATCH/DELETE /api/seller/products` — product CRUD (approved shops only)
- `POST /api/seller/subscribe` — Stripe checkout; metadata includes `user_id`

## Subscriptions sync

On Stripe shop checkout / invoice / cancel, webhook upserts `subscriptions` with:

- `product_type = 'tulip_shop'`
- `profile_id = metadata.user_id`

Directory slot checkout similarly upserts `directory_listing`.

No new SQL required beyond phase 1 `member_tier_schema.sql`.

## Out of scope (later)

- Moderator (black) tools
- Atherium admin member controls
- Tier badges on board/comment bylines
