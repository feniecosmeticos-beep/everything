-- Registra quando o salão abre o envio do pedido pelo WhatsApp.
-- Só o dono do pedido marca, uma única vez; a equipe enxerga o sinal no painel.
alter table public.fenie_orders add column if not exists whatsapp_sent_at timestamptz;

create function fenie_private.mark_whatsapp(p_id text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not fenie_private.is_approved() then raise exception 'Cadastro não aprovado.' using errcode='42501'; end if;
 update public.fenie_orders
  set whatsapp_sent_at=now(),
      events=events||jsonb_build_array(jsonb_build_object('text','Mensagem aberta no WhatsApp','date',now()))
  where id=p_id and user_id=auth.uid() and whatsapp_sent_at is null;
end $$;

create function public.fenie_mark_whatsapp(p_id text) returns void language sql security invoker set search_path='' as $$
 select fenie_private.mark_whatsapp(p_id)
$$;

revoke all on function fenie_private.mark_whatsapp(text) from public,anon;
grant execute on function fenie_private.mark_whatsapp(text) to authenticated;
revoke all on function public.fenie_mark_whatsapp(text) from public,anon;
grant execute on function public.fenie_mark_whatsapp(text) to authenticated;
