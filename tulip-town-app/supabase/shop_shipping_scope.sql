-- Tulip shop phase 4: shipping scope for local vs nationwide filtering
alter table public.products
  add column if not exists shipping_scope text;

do $$
begin
  update public.products
  set shipping_scope = 'local'
  where shipping_scope is null;

  alter table public.products
    alter column shipping_scope set default 'local';

  -- Allow only local / nationwide when constraint is missing
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_shipping_scope_check'
  ) then
    alter table public.products
      add constraint products_shipping_scope_check
      check (shipping_scope in ('local', 'nationwide'));
  end if;
exception
  when others then
    raise notice 'shipping_scope setup skipped: %', sqlerrm;
end $$;

comment on column public.products.shipping_scope is
  'local = meetup/local delivery, nationwide = ships across US';
