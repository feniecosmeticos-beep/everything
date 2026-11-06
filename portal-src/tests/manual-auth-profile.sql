begin;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
values
 ('66666666-6666-4666-8666-666666666666','fenie-manual-profile@example.invalid',now(),'{}'),
 ('77777777-7777-4777-8777-777777777777','fenie-unverified-manual@example.invalid',null,'{"name":"Manual","role":"admin","status":"approved"}');
do $$ begin
 assert (select role='client' and status='approved' from public.fenie_profiles where id='66666666-6666-4666-8666-666666666666'),'confirmed manual account missing profile';
 assert (select role='client' and status='pending' from public.fenie_profiles where id='77777777-7777-4777-8777-777777777777'),'metadata grants role or bypasses email confirmation';
end $$;
select set_config('request.jwt.claims','{"sub":"66666666-6666-4666-8666-666666666666","role":"authenticated","is_anonymous":false}',true);
set local role authenticated;
do $$ begin
 assert (select count(*)=1 from public.fenie_profiles),'manual account cannot read own profile or reads others';
 assert fenie_private.is_approved(),'manual account lacks client access';
 assert not fenie_private.is_admin(),'manual account unexpectedly admin';
end $$;
reset role;
update auth.users set email_confirmed_at=now() where id='77777777-7777-4777-8777-777777777777';
do $$ begin
 assert (select role='client' and status='approved' from public.fenie_profiles where id='77777777-7777-4777-8777-777777777777'),'manual account not activated after email confirmation';
end $$;
insert into auth.users(id,email,email_confirmed_at,is_anonymous,raw_user_meta_data)
values('88888888-8888-4888-8888-888888888888','fenie-anonymous-profile@example.invalid',now(),true,'{}');
do $$ begin
 assert not exists(select 1 from public.fenie_profiles where id='88888888-8888-4888-8888-888888888888'),'anonymous profile created';
end $$;
rollback;
select 'PASS: manual Auth creation, own profile access, confirmed clients, unverified denial, metadata escalation and anonymous denial; fixtures rolled back' as verification;
