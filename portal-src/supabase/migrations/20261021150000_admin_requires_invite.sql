-- Cadastro de salão sem confirmação de e-mail ("Confirm email" desligado no Supabase Auth).
-- Sem a confirmação, o e-mail deixa de provar que a pessoa é dona do endereço. Para que
-- ninguém se cadastre com o e-mail de um administrador que ainda não tem conta, o papel
-- de administrador passa a exigir conta criada por convite (invited_at, preenchido pelo
-- Supabase ao enviar o convite). Clientes não mudam: e-mail ou telefone confirmado.
-- Base: versões de 20261021125935_client_migration_phone_login.sql (login por telefone).
create or replace function fenie_private.bootstrap_admin() returns trigger language plpgsql security definer set search_path='' as $$
declare allowed_admin boolean;
begin
 allowed_admin=new.email_confirmed_at is not null and new.invited_at is not null and not coalesce(new.is_anonymous,false)
 and exists(select 1 from fenie_private.admin_access where email=lower(new.email));
 update public.fenie_profiles p set email=case when new.raw_app_meta_data->>'internal_phone_login'='true' then '' else coalesce(new.email,'') end,
  role=case when allowed_admin then 'admin' else 'client' end,
  status=case when (new.email_confirmed_at is null and new.phone_confirmed_at is null) or coalesce(new.is_anonymous,false) then 'pending'
   when allowed_admin then 'approved' when p.status='denied' then 'denied' else 'approved' end
 where p.id=new.id;
 return new;
end $$;
revoke all on function fenie_private.bootstrap_admin() from public,anon,authenticated;

create or replace function fenie_private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
 and exists(select 1 from public.fenie_profiles p join auth.users u on u.id=p.id
 join fenie_private.admin_access a on a.email=lower(u.email)
 where p.id=auth.uid() and p.role='admin' and p.status='approved'
 and u.email_confirmed_at is not null and u.invited_at is not null and not coalesce(u.is_anonymous,false))
$$;
