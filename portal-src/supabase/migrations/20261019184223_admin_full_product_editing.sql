-- Painel administrativo: edição completa de produtos e fotos próprias.
-- Somente administradores aprovados (fenie_private.is_admin) escrevem; clientes e visitantes continuam só lendo.

-- 1. Campos editáveis, cadastro e exclusão de produtos
grant update(name,brand,size,category,image,active,featured,sort_order,variants) on public.fenie_products to authenticated;
grant insert(id,name,brand,size,category,image,active,featured,sort_order,variants) on public.fenie_products to authenticated;
grant delete on public.fenie_products to authenticated;

create policy product_insert on public.fenie_products for insert to authenticated
 with check((select fenie_private.is_admin()));
create policy product_delete on public.fenie_products for delete to authenticated
 using((select fenie_private.is_admin()));

alter table public.fenie_products
 add constraint fenie_products_brand_len check(length(brand) between 1 and 100) not valid,
 add constraint fenie_products_size_len check(length(size)<=100) not valid,
 add constraint fenie_products_category_len check(length(category)<=100) not valid,
 add constraint fenie_products_image_len check(length(image)<=1000) not valid;

-- 2. Fotos de produtos: leitura pública, envio e troca só pela equipe
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('fenie-produtos','fenie-produtos',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy fenie_product_photo_insert on storage.objects for insert to authenticated
 with check(bucket_id='fenie-produtos' and (select fenie_private.is_admin()));
create policy fenie_product_photo_update on storage.objects for update to authenticated
 using(bucket_id='fenie-produtos' and (select fenie_private.is_admin()))
 with check(bucket_id='fenie-produtos' and (select fenie_private.is_admin()));
create policy fenie_product_photo_delete on storage.objects for delete to authenticated
 using(bucket_id='fenie-produtos' and (select fenie_private.is_admin()));
