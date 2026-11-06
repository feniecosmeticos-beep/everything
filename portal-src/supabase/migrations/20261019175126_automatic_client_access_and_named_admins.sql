-- Named administrators are provisioned privately; no public role assignment API.
alter table fenie_private.initial_admin rename to admin_access;
revoke all on fenie_private.admin_access from public,anon,authenticated;

create or replace function fenie_private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
 and exists(select 1 from public.fenie_profiles p join auth.users u on u.id=p.id
 join fenie_private.admin_access a on a.email=lower(u.email)
 where p.id=auth.uid() and p.role='admin' and p.status='approved'
 and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false))
$$;
create or replace function fenie_private.is_approved() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
 and exists(select 1 from public.fenie_profiles p join auth.users u on u.id=p.id
 where p.id=auth.uid() and p.role='client' and p.status='approved'
 and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false))
$$;
create or replace function fenie_private.signup() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not coalesce(new.is_anonymous,false) and
 (new.raw_user_meta_data->>'application'='fenie_portal' or exists(select 1 from fenie_private.admin_access where email=lower(new.email))) then
  insert into public.fenie_profiles(id,name,salon,phone,email)
  values(new.id,left(coalesce(nullif(new.raw_user_meta_data->>'name',''),'Equipe Fenié'),100),
   left(coalesce(nullif(new.raw_user_meta_data->>'salon',''),'Fenié Professionnel'),100),
   left(coalesce(new.raw_user_meta_data->>'phone',''),100),coalesce(new.email,''));
 end if;return new;
end $$;
create or replace function fenie_private.bootstrap_admin() returns trigger language plpgsql security definer set search_path='' as $$
declare allowed_admin boolean;
begin
 allowed_admin=new.email_confirmed_at is not null and not coalesce(new.is_anonymous,false)
 and exists(select 1 from fenie_private.admin_access where email=lower(new.email));
 update public.fenie_profiles p set email=coalesce(new.email,''),
  role=case when allowed_admin then 'admin' else 'client' end,
  status=case when new.email_confirmed_at is null or coalesce(new.is_anonymous,false) then 'pending'
   when allowed_admin then 'approved' when p.status='denied' then 'denied' else 'approved' end
 where p.id=new.id;
 return new;
end $$;
revoke all on function fenie_private.signup(),fenie_private.bootstrap_admin() from public,anon,authenticated;

-- Existing confirmed salons can use the portal immediately.
update public.fenie_profiles p set
 role=case when u.email_confirmed_at is not null and exists(select 1 from fenie_private.admin_access a where a.email=lower(u.email)) then 'admin' else 'client' end,
 status=case when u.email_confirmed_at is null then 'pending' when p.status='denied' then 'denied' else 'approved' end,
 email=coalesce(u.email,'')
from auth.users u where u.id=p.id and not coalesce(u.is_anonymous,false);

-- Retire the manual salon review workflow.
drop function public.fenie_review_client(uuid,text);
drop function fenie_private.review_client(uuid,text);
