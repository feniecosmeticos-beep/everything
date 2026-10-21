-- Login por telefone para todos os salões (não só os importados sem e-mail).
-- O telefone do cadastro vira um apelido de login da conta: a senha continua sendo a da conta.
-- Cada número aponta para uma única conta; número já usado por outra conta não é reatribuído.

-- Normaliza para +55DDNNNNNNNN(N). Celular antigo de 8 dígitos (começa com 6-9) ganha o nono dígito,
-- que é como o cliente digita hoje. Número sem DDD ou com mais de um telefone no campo fica de fora.
create function fenie_private.normalize_br_phone(p text) returns text language plpgsql immutable set search_path='' as $$
declare d text:=regexp_replace(coalesce(p,''),'\D','','g');
begin
 if d like '00%' then d:=substr(d,3); end if;
 if length(d) in (12,13) and d like '55%' then d:=substr(d,3); end if;
 if length(d) in (11,12) and d like '0%' then d:=substr(d,2); end if;
 if length(d)=10 and substr(d,3,1) in ('6','7','8','9') then d:=substr(d,1,2)||'9'||substr(d,3); end if;
 if d ~ '^[1-9][0-9](?:[2-5][0-9]{7}|9[0-9]{8})$' then return '+55'||d; end if;
 return null;
end $$;
revoke all on function fenie_private.normalize_br_phone(text) from public,anon,authenticated;

-- Mantém o mapeamento quando o salão se cadastra ou altera o telefone em "Meu cadastro".
-- Contas importadas só por telefone (internal_phone_login) não são tocadas: o telefone é a identidade delas.
create function fenie_private.sync_phone_login() returns trigger language plpgsql security definer set search_path='' as $$
declare tel text:=fenie_private.normalize_br_phone(new.phone);
begin
 if new.role<>'client' then return new; end if;
 if exists(select 1 from auth.users u where u.id=new.id and u.raw_app_meta_data->>'internal_phone_login'='true') then return new; end if;
 if tg_op='UPDATE' and new.phone is not distinct from old.phone and new.role is not distinct from old.role then return new; end if;
 delete from fenie_private.phone_logins where user_id=new.id and phone is distinct from tel;
 if tel is not null then
  insert into fenie_private.phone_logins(phone,user_id) values(tel,new.id) on conflict do nothing;
 end if;
 return new;
end $$;
revoke all on function fenie_private.sync_phone_login() from public,anon,authenticated;
create trigger fenie_sync_phone_login after insert or update of phone,role on public.fenie_profiles
 for each row execute function fenie_private.sync_phone_login();

-- Carga inicial: salões existentes com telefone válido e que nenhuma outra conta usa.
insert into fenie_private.phone_logins(phone,user_id)
select tel,id from (
 select p.id,fenie_private.normalize_br_phone(p.phone) tel,count(*) over (partition by fenie_private.normalize_br_phone(p.phone)) n
 from public.fenie_profiles p
 where p.role='client' and not exists(select 1 from fenie_private.phone_logins l where l.user_id=p.id)
) c
where tel is not null and n=1
on conflict do nothing;
