-- Run in a transaction; this leaves no users or customer data behind.
insert into auth.users(id,instance_id,aud,role,phone,phone_confirmed_at,encrypted_password,raw_app_meta_data,raw_user_meta_data,is_anonymous,created_at,updated_at)
values('7f452f15-03bb-4bfa-ac36-dc5fb05dce53','00000000-0000-0000-0000-000000000000','authenticated','authenticated','5511990000000',now(),'test-initial-opaque',
 '{"provider":"phone","providers":["phone"],"must_change_password":true}',
 '{"name":"Teste temporário","salon":"Salão temporário","role":"admin","must_change_password":false}',false,now(),now());
insert into public.fenie_addresses(user_id,label,street,district,city,uf,cep)
values('7f452f15-03bb-4bfa-ac36-dc5fb05dce53','Teste','Rua de teste, 1','Centro','Curitiba','PR','80000000');
do $$begin
 if not exists(select 1 from public.fenie_profiles where id='7f452f15-03bb-4bfa-ac36-dc5fb05dce53' and role='client' and status='approved' and must_change_password) then raise exception 'Phone profile or password gate incorrect';end if;
end$$;
set local request.jwt.claims='{"sub":"7f452f15-03bb-4bfa-ac36-dc5fb05dce53","role":"authenticated","is_anonymous":false}';
set local role authenticated;
do $$begin
 if fenie_private.is_admin() or fenie_private.is_approved() or fenie_private.password_is_current() then raise exception 'Initial credential bypassed access gate';end if;
 if exists(select 1 from public.fenie_products) or exists(select 1 from public.fenie_addresses) then raise exception 'Business data visible before rotation';end if;
 if (select count(*) from public.fenie_profiles)<>1 then raise exception 'Profile isolation failed';end if;
 begin
  update public.fenie_profiles set must_change_password=false where id=auth.uid();
  raise exception 'Client changed protected password flag';
 exception when insufficient_privilege then null;
 end;
end$$;
reset role;
update auth.users set encrypted_password='test-changed-opaque' where id='7f452f15-03bb-4bfa-ac36-dc5fb05dce53';
do $$begin
 if not exists(select 1 from public.fenie_profiles where id='7f452f15-03bb-4bfa-ac36-dc5fb05dce53' and must_change_password) then raise exception 'Password hash update bypassed explicit rotation';end if;
end$$;
-- Simulate the trusted endpoint after it has completed password proof/update.
update public.fenie_profiles set must_change_password=false where id='7f452f15-03bb-4bfa-ac36-dc5fb05dce53';
set local role authenticated;
do $$begin
 if not fenie_private.is_approved() or not fenie_private.password_is_current() then raise exception 'Password rotation did not unlock client';end if;
 if fenie_private.is_admin() then raise exception 'Client elevated after rotation';end if;
 if not exists(select 1 from public.fenie_products) then raise exception 'Catalogue unavailable after rotation';end if;
 if (select count(*) from public.fenie_addresses)<>1 then raise exception 'Address isolation failed after rotation';end if;
end$$;
reset role;
