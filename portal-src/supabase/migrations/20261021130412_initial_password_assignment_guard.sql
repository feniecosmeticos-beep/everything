-- Creating a credential is not a password rotation. Auth may assign the first
-- password in a follow-up UPDATE after the initial user row is inserted.
create or replace function fenie_private.password_rotated() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if nullif(old.encrypted_password,'') is not null and nullif(new.encrypted_password,'') is not null
 and new.encrypted_password is distinct from old.encrypted_password then
  update public.fenie_profiles set must_change_password=false where id=new.id and must_change_password;
 end if;
 return new;
end $$;
revoke all on function fenie_private.password_rotated() from public,anon,authenticated;

-- Explicit deny policies document the non-public nature of these tables.
create policy client_migrations_deny on fenie_private.client_migrations for all to authenticated using(false) with check(false);
create policy phone_logins_deny on fenie_private.phone_logins for all to authenticated using(false) with check(false);
create policy phone_login_limits_deny on fenie_private.phone_login_limits for all to authenticated using(false) with check(false);
