-- Cadastro: avisa quando o telefone já está ligado a outra conta, para evitar salão duplicado.
-- Revela apenas se o número tem cadastro (sim/não); nenhum dado da conta é devolvido.
create function public.fenie_phone_taken(p_phone text) returns boolean language sql stable security definer set search_path='' as $$
 select length(coalesce(p_phone,''))<=40
  and exists(select 1 from fenie_private.phone_logins where phone=fenie_private.normalize_br_phone(p_phone))
$$;
revoke all on function public.fenie_phone_taken(text) from public;
grant execute on function public.fenie_phone_taken(text) to anon,authenticated;
