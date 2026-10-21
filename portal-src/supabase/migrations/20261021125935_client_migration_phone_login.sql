-- Imported clients may use confirmed e-mail or confirmed phone credentials.
-- Password rotation is controlled by trusted Auth metadata and database policy.
alter table public.fenie_profiles add column must_change_password boolean not null default false;

create or replace function fenie_private.signup() returns trigger language plpgsql security definer set search_path='' as $$
declare admin_email boolean;
begin
 if not coalesce(new.is_anonymous,false) and (nullif(new.email,'') is not null or nullif(new.phone,'') is not null) then
  admin_email=exists(select 1 from fenie_private.admin_access where email=lower(new.email));
  insert into public.fenie_profiles(id,name,salon,phone,email,must_change_password)
  values(new.id,
   left(coalesce(nullif(new.raw_user_meta_data->>'name',''),nullif(new.raw_user_meta_data->>'full_name',''),case when admin_email then 'Equipe Fenié' else 'Cliente' end),100),
   left(coalesce(nullif(new.raw_user_meta_data->>'salon',''),case when admin_email then 'Fenié Professionnel' else 'Salão' end),100),
   left(coalesce(nullif(new.phone,''),new.raw_user_meta_data->>'phone',''),100),
   case when new.raw_app_meta_data->>'internal_phone_login'='true' then '' else coalesce(new.email,'') end,
   coalesce(new.raw_app_meta_data->>'must_change_password','false')='true');
 end if;
 return new;
end $$;

create or replace function fenie_private.bootstrap_admin() returns trigger language plpgsql security definer set search_path='' as $$
declare allowed_admin boolean;
begin
 allowed_admin=new.email_confirmed_at is not null and not coalesce(new.is_anonymous,false)
 and exists(select 1 from fenie_private.admin_access where email=lower(new.email));
 update public.fenie_profiles p set email=case when new.raw_app_meta_data->>'internal_phone_login'='true' then '' else coalesce(new.email,'') end,
  role=case when allowed_admin then 'admin' else 'client' end,
  status=case when (new.email_confirmed_at is null and new.phone_confirmed_at is null) or coalesce(new.is_anonymous,false) then 'pending'
   when allowed_admin then 'approved' when p.status='denied' then 'denied' else 'approved' end
 where p.id=new.id;
 return new;
end $$;
drop trigger fenie_z_bootstrap_admin on auth.users;
create trigger fenie_z_bootstrap_admin after insert or update of email_confirmed_at,phone_confirmed_at,email,phone on auth.users for each row execute function fenie_private.bootstrap_admin();

create function fenie_private.password_is_current() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
 and exists(select 1 from public.fenie_profiles where id=auth.uid() and not must_change_password)
$$;
revoke all on function fenie_private.password_is_current() from public,anon;
grant execute on function fenie_private.password_is_current() to authenticated;

create or replace function fenie_private.is_approved() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
 and exists(select 1 from public.fenie_profiles p join auth.users u on u.id=p.id
 where p.id=auth.uid() and p.role='client' and p.status='approved' and not p.must_change_password
 and (u.email_confirmed_at is not null or u.phone_confirmed_at is not null) and not coalesce(u.is_anonymous,false))
$$;

create function fenie_private.password_rotated() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if nullif(new.encrypted_password,'') is not null and new.encrypted_password is distinct from old.encrypted_password then
  update public.fenie_profiles set must_change_password=false where id=new.id and must_change_password;
 end if;
 return new;
end $$;
revoke all on function fenie_private.password_rotated() from public,anon,authenticated;
create trigger fenie_password_rotated after update of encrypted_password on auth.users for each row execute function fenie_private.password_rotated();

create policy migration_password_products on public.fenie_products as restrictive for all to authenticated
 using ((select fenie_private.password_is_current())) with check ((select fenie_private.password_is_current()));
create policy migration_password_addresses on public.fenie_addresses as restrictive for all to authenticated
 using ((select fenie_private.password_is_current())) with check ((select fenie_private.password_is_current()));
create policy migration_password_orders on public.fenie_orders as restrictive for all to authenticated
 using ((select fenie_private.password_is_current())) with check ((select fenie_private.password_is_current()));
create policy migration_password_notes on public.fenie_order_notes as restrictive for all to authenticated
 using ((select fenie_private.password_is_current())) with check ((select fenie_private.password_is_current()));
create policy migration_password_profile_update on public.fenie_profiles as restrictive for update to authenticated
 using ((select fenie_private.password_is_current())) with check ((select fenie_private.password_is_current()));

create table fenie_private.client_migrations(
 source_key text primary key check(source_key ~ '^[a-f0-9]{64}$'),
 user_id uuid not null unique references auth.users(id),
 batch_id text not null,
 created_at timestamptz not null default now()
);
alter table fenie_private.client_migrations enable row level security;
revoke all on fenie_private.client_migrations from public,anon,authenticated;
revoke all on function fenie_private.signup(),fenie_private.bootstrap_admin() from public,anon,authenticated;

-- Internal phone identifiers never become client contact e-mail addresses.
create table fenie_private.phone_logins(
 phone text primary key check(phone ~ '^\+55[0-9]{10,11}$'),
 user_id uuid not null unique references public.fenie_profiles(id)
);
alter table fenie_private.phone_logins enable row level security;
revoke all on fenie_private.phone_logins from public,anon,authenticated;
create table fenie_private.phone_login_limits(
 key text primary key,
 window_start timestamptz not null default now(),
 attempts integer not null default 1 check(attempts>0)
);
create index phone_login_limits_window on fenie_private.phone_login_limits(window_start);
alter table fenie_private.phone_login_limits enable row level security;
revoke all on fenie_private.phone_login_limits from public,anon,authenticated;
