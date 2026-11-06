-- Portal Fenié: project isolated from the published static catalogue.
create schema if not exists fenie_private;
revoke all on schema fenie_private from public, anon;
grant usage on schema fenie_private to authenticated;
create table public.fenie_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null check(length(name) between 1 and 100),
 salon text not null check(length(salon) between 1 and 100),
 phone text not null default '' check(length(phone)<=100),
 email text not null,
 role text not null default 'client' check(role in ('client','admin')),
 status text not null default 'pending' check(status in ('pending','approved','denied')),
 created_at timestamptz not null default now()
);
alter table public.fenie_profiles enable row level security;
create function fenie_private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
 and exists(select 1 from public.fenie_profiles where id=auth.uid() and role='admin' and status='approved')
$$;
create function fenie_private.is_approved() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
 and exists(select 1 from public.fenie_profiles where id=auth.uid() and role='client' and status='approved')
$$;
create function fenie_private.signup() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.raw_user_meta_data->>'application'='fenie_portal' and not coalesce(new.is_anonymous,false) then
 insert into public.fenie_profiles(id,name,salon,phone,email)
 values(new.id,left(coalesce(nullif(new.raw_user_meta_data->>'name',''),'Cliente'),100),
 left(coalesce(nullif(new.raw_user_meta_data->>'salon',''),'Salão'),100),
 left(coalesce(new.raw_user_meta_data->>'phone',''),100),coalesce(new.email,''));
 end if; return new;
end $$;
create trigger fenie_signup after insert on auth.users for each row execute function fenie_private.signup();
create policy profile_read on public.fenie_profiles for select to authenticated
 using (id=(select auth.uid()) or (select fenie_private.is_admin()));
create policy profile_update on public.fenie_profiles for update to authenticated
 using(id=(select auth.uid())) with check(id=(select auth.uid()));
revoke all on public.fenie_profiles from anon,authenticated;
grant select on public.fenie_profiles to authenticated;
grant update(name,salon,phone) on public.fenie_profiles to authenticated;
create table public.fenie_addresses(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.fenie_profiles(id) on delete cascade,
 label text not null check(length(label) between 1 and 100),
 street text not null check(length(street) between 1 and 200),district text not null check(length(district) between 1 and 100),
 city text not null check(length(city) between 1 and 100),uf text not null check(uf ~ '^[A-Z]{2}$'),
 cep text not null check(cep ~ '^[0-9]{5}-?[0-9]{3}$'),complement text not null default '' check(length(complement)<=100)
);
create index fenie_addresses_user on public.fenie_addresses(user_id);
alter table public.fenie_addresses enable row level security;
create policy address_read on public.fenie_addresses for select to authenticated using(user_id=(select auth.uid()));
create policy address_insert on public.fenie_addresses for insert to authenticated with check(user_id=(select auth.uid()));
create policy address_update on public.fenie_addresses for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy address_delete on public.fenie_addresses for delete to authenticated using(user_id=(select auth.uid()));
revoke all on public.fenie_addresses from anon,authenticated;
grant select,insert,update,delete on public.fenie_addresses to authenticated;
create table public.fenie_products(
 id text primary key check(length(id) between 1 and 150),name text not null check(length(name) between 1 and 300),
 brand text not null,size text not null default '',category text not null default '',image text not null default '',
 active boolean not null default true,featured boolean not null default false,sort_order integer not null default 0,
 variants jsonb not null check(jsonb_typeof(variants)='array' and jsonb_array_length(variants) between 1 and 200)
);
alter table public.fenie_products enable row level security;
create policy product_public on public.fenie_products for select to anon using(active);
create policy product_read on public.fenie_products for select to authenticated using(active or (select fenie_private.is_admin()));
create policy product_update on public.fenie_products for update to authenticated using((select fenie_private.is_admin())) with check((select fenie_private.is_admin()));
revoke all on public.fenie_products from anon,authenticated;
grant select on public.fenie_products to anon,authenticated;
grant update(name,active,featured,variants) on public.fenie_products to authenticated;
create function fenie_private.validate_product() returns trigger language plpgsql security invoker set search_path='' as $$
declare v jsonb; ids text[]='{}';
begin
 for v in select value from jsonb_array_elements(new.variants) loop
 if jsonb_typeof(v->'price') is distinct from 'number' or not (v->>'price' ~ '^[0-9]+$')
 or (v->>'price')::numeric not between 1 and 100000000
 or length(coalesce(v->>'id','')) not between 1 and 150
 or length(coalesce(v->>'sku','')) not between 1 and 150
 or length(coalesce(v->>'label','')) not between 1 and 300
 or (v->>'id')=any(ids)
 then raise exception 'Opção comercial inválida.'; end if;
 ids=array_append(ids,v->>'id');
 end loop; return new;
end $$;
create trigger fenie_product_validate before insert or update on public.fenie_products for each row execute function fenie_private.validate_product();
create sequence public.fenie_order_number;
create table public.fenie_orders(
 id text primary key default ('FEN-'||lpad(nextval('public.fenie_order_number')::text,8,'0')),
 user_id uuid not null references public.fenie_profiles(id),
 request_id uuid not null,payload_hash text not null,created_at timestamptz not null default now(),
 status text not null default 'waiting' check(status in ('waiting','confirmed','separating','dispatched','delivered','cancelled')),
 payment_method text not null,installments integer not null,items jsonb not null,address jsonb not null,
 notes text not null default '',events jsonb not null,total_cents bigint not null check(total_cents>0),
 unique(user_id,request_id)
);
create index fenie_orders_date on public.fenie_orders(created_at desc);
alter table public.fenie_orders enable row level security;
create policy order_read on public.fenie_orders for select to authenticated using(user_id=(select auth.uid()) or (select fenie_private.is_admin()));
revoke all on public.fenie_orders from anon,authenticated;
grant select on public.fenie_orders to authenticated;
create table public.fenie_order_notes(
 order_id text primary key references public.fenie_orders(id) on delete cascade,
 note text not null default '' check(length(note)<=500)
);
alter table public.fenie_order_notes enable row level security;
create policy note_read on public.fenie_order_notes for select to authenticated using((select fenie_private.is_admin()));
revoke all on public.fenie_order_notes from anon,authenticated;
grant select on public.fenie_order_notes to authenticated;
create function fenie_private.place_order(p_input jsonb) returns text language plpgsql security definer set search_path='' as $$
declare uid uuid=auth.uid(); rid uuid; existing public.fenie_orders; item jsonb; p public.fenie_products; v jsonb;
 snapshots jsonb='[]'; address_snapshot jsonb; qty integer; total bigint=0; method text=p_input->>'method';
 parts integer; oid text; seen text[]='{}'; item_key text; fingerprint text=md5(p_input::text);
begin
 if uid is null or not fenie_private.is_approved() then raise exception 'Cadastro não aprovado.' using errcode='42501'; end if;
 rid=(p_input->>'requestId')::uuid;
 if rid is null then raise exception 'Identificador de solicitação obrigatório.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text||rid::text,0));
 select * into existing from public.fenie_orders where user_id=uid and request_id=rid;
 if found then
 if existing.payload_hash<>fingerprint then raise exception 'Solicitação já utilizada com outros itens.'; end if;
 return existing.id; end if;
 if jsonb_typeof(p_input->'items') is distinct from 'array' then raise exception 'Itens inválidos.'; end if;
 if jsonb_array_length(p_input->'items') not between 1 and 100 then raise exception 'Selecione entre 1 e 100 opções.'; end if;
 if method is null or method not in ('pix','credito','debito','boleto-avista','boleto-parcelado','combinar') then raise exception 'Pagamento inválido.'; end if;
 parts=case when method='boleto-parcelado' then (p_input->>'installments')::integer else 1 end;
 if parts is null or (method='boleto-parcelado' and parts not between 2 and 6) then raise exception 'Parcelamento inválido.'; end if;
 if length(coalesce(p_input->>'notes',''))>500 then raise exception 'Observação muito longa.'; end if;
 select to_jsonb(a)-'user_id'-'id' into address_snapshot from public.fenie_addresses a
 where a.id=(p_input->>'addressId')::uuid and a.user_id=uid;
 if address_snapshot is null then raise exception 'Escolha seu endereço de entrega.'; end if;
 for item in select value from jsonb_array_elements(p_input->'items') loop
 if jsonb_typeof(item->'quantity') is distinct from 'number' or not (item->>'quantity' ~ '^[0-9]+$') then raise exception 'Quantidade inválida.'; end if;
 qty=(item->>'quantity')::integer;
 if qty not between 1 and 999 then raise exception 'Quantidade inválida.'; end if;
 item_key=coalesce(item->>'productId','')||':'||coalesce(item->>'variantId','');
 if item_key=any(seen) then raise exception 'Opção repetida.'; end if; seen=array_append(seen,item_key);
 select * into p from public.fenie_products where id=item->>'productId' and active for share;
 if not found then raise exception 'Produto indisponível.'; end if;
 select value into v from jsonb_array_elements(p.variants) where value->>'id'=item->>'variantId';
 if v is null then raise exception 'Opção indisponível.'; end if;
 snapshots=snapshots||jsonb_build_array(jsonb_build_object('productId',p.id,'variantId',v->>'id','name',p.name,'brand',p.brand,
 'volume',v->>'label','size',p.size,'sku',v->>'sku','price',(v->>'price')::integer,'quantity',qty));
 total=total+(v->>'price')::bigint*qty;
 end loop;
 if total>10000000000 then raise exception 'Total acima do limite por solicitação.'; end if;
 insert into public.fenie_orders(user_id,request_id,payload_hash,payment_method,installments,items,address,notes,events,total_cents)
 values(uid,rid,fingerprint,method,parts,snapshots,address_snapshot,coalesce(p_input->>'notes',''),
 jsonb_build_array(jsonb_build_object('text','Solicitação registrada no portal','date',now())),total) returning id into oid;
 return oid;
end $$;
create function public.fenie_place_order(p_input jsonb) returns text language sql security invoker set search_path='' as $$
 select fenie_private.place_order(p_input)
$$;
create function fenie_private.review_client(p_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not fenie_private.is_admin() then raise exception 'Acesso restrito à equipe.' using errcode='42501'; end if;
 if p_status is null or p_status not in ('pending','approved','denied') then raise exception 'Situação inválida.'; end if;
 update public.fenie_profiles set status=p_status where id=p_id and role='client';
 if not found then raise exception 'Cliente não encontrado.'; end if;
end $$;
create function public.fenie_review_client(p_id uuid,p_status text) returns void language sql security invoker set search_path='' as $$
 select fenie_private.review_client(p_id,p_status)
$$;
create function fenie_private.update_order(p_id text,p_status text,p_note text) returns void language plpgsql security definer set search_path='' as $$
declare old_status text; allowed boolean;
begin
 if auth.uid() is null or not fenie_private.is_admin() then raise exception 'Acesso restrito à equipe.' using errcode='42501'; end if;
 select status into old_status from public.fenie_orders where id=p_id for update;
 if not found then raise exception 'Pedido não encontrado.'; end if;
 allowed=p_status=old_status or case old_status
 when 'waiting' then p_status in ('confirmed','cancelled')
 when 'confirmed' then p_status in ('separating','cancelled')
 when 'separating' then p_status in ('dispatched','cancelled')
 when 'dispatched' then p_status in ('delivered','cancelled') else false end;
 if not coalesce(allowed,false) then raise exception 'Avance o atendimento em ordem ou cancele a solicitação.'; end if;
 if length(coalesce(p_note,''))>500 then raise exception 'Anotação muito longa.'; end if;
 update public.fenie_orders set status=p_status,
 events=case when status<>p_status then events||jsonb_build_array(jsonb_build_object('text','Situação atualizada: '||p_status,'date',now())) else events end where id=p_id;
 insert into public.fenie_order_notes(order_id,note) values(p_id,coalesce(p_note,''))
 on conflict(order_id) do update set note=excluded.note;
end $$;
create function public.fenie_update_order(p_id text,p_status text,p_note text) returns void language sql security invoker set search_path='' as $$
 select fenie_private.update_order(p_id,p_status,p_note)
$$;
revoke all on all functions in schema fenie_private from public,anon,authenticated;
grant execute on function fenie_private.is_admin(),fenie_private.is_approved(),fenie_private.place_order(jsonb),
 fenie_private.review_client(uuid,text),fenie_private.update_order(text,text,text) to authenticated;
revoke all on function public.fenie_place_order(jsonb),public.fenie_review_client(uuid,text),public.fenie_update_order(text,text,text) from public,anon;
grant execute on function public.fenie_place_order(jsonb),public.fenie_review_client(uuid,text),public.fenie_update_order(text,text,text) to authenticated;
revoke all on sequence public.fenie_order_number from public,anon,authenticated;
