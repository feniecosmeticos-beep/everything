-- The Admin API can attach app_metadata after its initial user INSERT.
-- Apply the trusted import marker throughout provisioning, before confirmation.
create function fenie_private.mark_imported_credential() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.raw_app_meta_data->>'must_change_password'='true'
 and not exists(select 1 from fenie_private.client_migrations where user_id=new.id) then
  update public.fenie_profiles set must_change_password=true,
   email=case when new.raw_app_meta_data->>'internal_phone_login'='true' then '' else coalesce(new.email,'') end
  where id=new.id and role='client';
 end if;
 return new;
end $$;
revoke all on function fenie_private.mark_imported_credential() from public,anon,authenticated;
create trigger fenie_zz_mark_imported_credential after insert or update of raw_app_meta_data on auth.users for each row execute function fenie_private.mark_imported_credential();
