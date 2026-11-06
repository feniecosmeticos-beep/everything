-- O salão pode cancelar o próprio pedido enquanto ele ainda aguarda atendimento.
-- Depois que a equipe confirma, o cancelamento volta a ser feito pelo atendimento.
create function fenie_private.cancel_own_order(p_id text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare old_status text; reason text:=nullif(btrim(coalesce(p_reason,'')),'');
begin
 if auth.uid() is null or not fenie_private.is_approved() then raise exception 'Cadastro não aprovado.' using errcode='42501'; end if;
 if length(coalesce(reason,''))>300 then raise exception 'Motivo muito longo.'; end if;
 select status into old_status from public.fenie_orders where id=p_id and user_id=auth.uid() for update;
 if not found then raise exception 'Pedido não encontrado.'; end if;
 if old_status='cancelled' then return; end if;
 if old_status<>'waiting' then raise exception 'Este pedido já está em atendimento. Para cancelar, fale com a equipe pelo WhatsApp.'; end if;
 update public.fenie_orders
  set status='cancelled',
      events=events||jsonb_build_array(jsonb_build_object('text','Cancelado pelo salão'||coalesce(' · Motivo: '||reason,''),'date',now()))
  where id=p_id;
end $$;

create function public.fenie_cancel_order(p_id text,p_reason text default null) returns void language sql security invoker set search_path='' as $$
 select fenie_private.cancel_own_order(p_id,p_reason)
$$;

revoke all on function fenie_private.cancel_own_order(text,text) from public,anon;
grant execute on function fenie_private.cancel_own_order(text,text) to authenticated;
revoke all on function public.fenie_cancel_order(text,text) from public,anon;
grant execute on function public.fenie_cancel_order(text,text) to authenticated;
