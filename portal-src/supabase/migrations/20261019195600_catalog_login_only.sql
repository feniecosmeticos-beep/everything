-- Catálogo somente com login: visitantes deixam de ler produtos e preços pela API.
-- Aplicado manualmente no SQL Editor em 19/10/2026. Para alinhar o histórico da CLI:
--   supabase migration repair --status applied 20261019195600
drop policy if exists product_public on public.fenie_products;
revoke select on public.fenie_products from anon;
