-- Descrição do produto, editável pela equipe no painel e exibida ao salão.
alter table public.fenie_products add column if not exists description text not null default '' check(length(description)<=2000);
grant update(description) on public.fenie_products to authenticated;
grant insert(description) on public.fenie_products to authenticated;
