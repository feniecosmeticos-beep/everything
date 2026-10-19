begin;
insert into auth.users(id,email,raw_user_meta_data)
values
('11111111-1111-4111-8111-111111111111','fenie-test-a@example.invalid','{"application":"fenie_portal","name":"Teste A","salon":"Salão A","role":"admin","status":"approved"}'),
('22222222-2222-4222-8222-222222222222','fenie-test-b@example.invalid','{"application":"fenie_portal","name":"Teste B","salon":"Salão B"}'),
('33333333-3333-4333-8333-333333333333','fenie-test-admin@example.invalid','{"application":"fenie_portal","name":"Equipe","salon":"Equipe"}'),
('44444444-4444-4444-8444-444444444444','fenie-test-pending@example.invalid','{"application":"fenie_portal","name":"Pendente","salon":"Pendente"}');
do $$ begin
 assert (select role='client' and status='pending' from public.fenie_profiles where id='11111111-1111-4111-8111-111111111111'),'metadata privilege escalation';
end $$;
update public.fenie_profiles set status='approved' where id in ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
update public.fenie_profiles set role='admin',status='approved' where id='33333333-3333-4333-8333-333333333333';
insert into public.fenie_addresses(id,user_id,label,street,district,city,uf,cep)
values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','Teste','Rua Teste, 1','Centro','Curitiba','PR','80000000'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','Teste B','Rua Teste, 2','Centro','Curitiba','PR','80000000');
set local role anon;
do $$ begin
 assert (select count(*)=488 from public.fenie_products),'public catalogue';
 begin perform * from public.fenie_profiles;raise exception 'anon profiles exposed';exception when insufficient_privilege then null;end;
 begin perform public.fenie_place_order('{}');raise exception 'anon RPC exposed';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","is_anonymous":false}',true);
set local role authenticated;
do $$ declare oid text;again text;payload jsonb;
begin
 assert (select count(*)=1 from public.fenie_profiles),'cross profile read';
 assert (select count(*)=1 from public.fenie_addresses),'cross address read';
 begin update public.fenie_profiles set role='admin' where id=auth.uid();raise exception 'role writable';exception when insufficient_privilege then null;end;
 begin perform public.fenie_review_client('44444444-4444-4444-8444-444444444444','approved');raise exception 'review accessible';exception when insufficient_privilege then null;end;
 begin insert into public.fenie_addresses(user_id,label,street,district,city,uf,cep) values('22222222-2222-4222-8222-222222222222','x','x','x','x','PR','80000000');raise exception 'address reassign';exception when insufficient_privilege then null;end;
 payload='{"requestId":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","addressId":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","method":"boleto-parcelado","installments":3,"notes":"Teste isolado","items":[{"productId":"family-oxidante-mup","variantId":"MC-OX-20V","quantity":2,"price":1}]}';
 oid=public.fenie_place_order(payload);
 again=public.fenie_place_order(payload);
 assert oid=again,'idempotency failed';
 assert (select count(*)=1 from public.fenie_orders),'duplicate order';
 assert (select total_cents=(select (v->>'price')::bigint*2 from public.fenie_products p,jsonb_array_elements(p.variants) v where p.id='family-oxidante-mup' and v->>'id'='MC-OX-20V') from public.fenie_orders where id=oid),'client price accepted';
 assert (select installments=3 and payment_method='boleto-parcelado' from public.fenie_orders where id=oid),'payment snapshot';
 begin perform public.fenie_place_order(jsonb_set(payload,'{items,0,quantity}','3'));raise exception 'different retry accepted';exception when raise_exception then if sqlerrm='different retry accepted' then raise;end if;end;
 begin perform public.fenie_place_order(jsonb_set(jsonb_set(payload,'{requestId}','"dddddddd-dddd-4ddd-8ddd-dddddddddddd"'),'{addressId}','"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"'));raise exception 'other address accepted';exception when raise_exception then if sqlerrm='other address accepted' then raise;end if;end;
 assert (select count(*)=0 from public.fenie_order_notes),'internal notes exposed';
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","is_anonymous":false}',true);
set local role authenticated;
do $$ begin assert (select count(*)=0 from public.fenie_orders),'cross order read';end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated","is_anonymous":false}',true);
set local role authenticated;
do $$ begin
 begin perform public.fenie_place_order('{}');raise exception 'pending can order';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated","is_anonymous":false}',true);
set local role authenticated;
do $$ declare oid text;
begin
 assert (select count(*)=4 from public.fenie_profiles),'admin listing';
 select id into oid from public.fenie_orders limit 1;
 perform public.fenie_update_order(oid,'confirmed','Somente equipe');
 assert (select count(*)=1 from public.fenie_order_notes),'admin notes';
 assert (select status='confirmed' from public.fenie_orders where id=oid),'status not changed';
 perform public.fenie_review_client('44444444-4444-4444-8444-444444444444','approved');
 assert (select status='approved' from public.fenie_profiles where id='44444444-4444-4444-8444-444444444444'),'approval';
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","is_anonymous":false}',true);
set local role authenticated;
do $$ begin assert (select count(*)=0 from public.fenie_order_notes),'client reads admin note';end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated","is_anonymous":true}',true);
set local role authenticated;
do $$ begin assert not fenie_private.is_admin(),'anonymous user admin';end $$;
reset role;
rollback;
select 'PASS: RLS, ownership, role escalation, approvals, server prices, payment, idempotency, internal notes; all fixtures rolled back' as verification;
