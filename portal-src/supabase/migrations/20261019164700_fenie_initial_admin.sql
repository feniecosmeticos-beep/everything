create table fenie_private.initial_admin (
 email text primary key,created_at timestamptz not null default now()
);
alter table fenie_private.initial_admin enable row level security;
revoke all on fenie_private.initial_admin from public,anon,authenticated;
-- The first administrator e-mail is provisioned privately after explicit owner authorization.
create function fenie_private.bootstrap_admin() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.email_confirmed_at is not null and not coalesce(new.is_anonymous,false)
 and exists(select 1 from fenie_private.initial_admin where email=lower(new.email))
 and exists(select 1 from public.fenie_profiles where id=new.id) then
  update public.fenie_profiles set role='admin',status='approved' where id=new.id;
  delete from fenie_private.initial_admin where email=lower(new.email);
 end if; return new;
end $$;
revoke all on function fenie_private.bootstrap_admin() from public,anon,authenticated;
create trigger fenie_z_bootstrap_admin after insert or update of email_confirmed_at,email on auth.users for each row execute function fenie_private.bootstrap_admin();
