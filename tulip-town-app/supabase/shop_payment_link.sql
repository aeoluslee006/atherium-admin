-- Optional seller payment link (Square / PayPal / Stripe / Venmo).
-- Platform does not process payments; buyers open the seller's external link.
alter table public.products
  add column if not exists payment_link text;
