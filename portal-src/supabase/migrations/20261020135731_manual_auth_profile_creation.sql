-- This dedicated portal must also create profiles for users provisioned in Auth.
-- Display metadata never grants administrative privileges.
create or replace function fenie_private.signup() returns trigger
language plpgsql security definer set search_path='' as $$
declare admin_email boolean;
begin
 if not coalesce(new.is_anonymous,false) and nullif(new.email,'') is not null then
  admin_email=exists(select 1 from fenie_private.admin_access where email=lower(new.email));
  insert into public.fenie_profiles(id,name,salon,phone,email)
  values(new.id,
   left(coalesce(nullif(new.raw_user_meta_data->>'name',''),nullif(new.raw_user_meta_data->>'full_name',''),case when admin_email then 'Equipe Fenié' else 'Cliente' end),100),
   left(coalesce(nullif(new.raw_user_meta_data->>'salon',''),case when admin_email then 'Fenié Professionnel' else 'Salão' end),100),
   left(coalesce(new.raw_user_meta_data->>'phone',''),100),new.email);
 end if;
 return new;
end $$;
revoke all on function fenie_private.signup() from public,anon,authenticated;
