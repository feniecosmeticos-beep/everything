import postgres from 'npm:postgres@3.4.7';
const sql=postgres(Deno.env.get('SUPABASE_DB_URL')!,{prepare:false,max:1,idle_timeout:10,connect_timeout:10,ssl:'require'});
const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_ANON_KEY')!;
const allowed=new Set(['https://fenie-portal.vercel.app','http://127.0.0.1:8786']);
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'',headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(allowed.has(origin)?{'Access-Control-Allow-Origin':origin}:{})};
 const reply=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization'}});
 if(req.method!=='POST'||(origin&&!allowed.has(origin)))return reply({message:'Acesso indisponível.'},403);
 const authorization=req.headers.get('authorization')||'';
 if(!authorization.startsWith('Bearer '))return reply({message:'Entre novamente para atualizar sua senha.'},401);
 let proofToken='';
 try{
  const identity=await fetch(url+'/auth/v1/user',{headers:{apikey:key,Authorization:authorization}});
  if(!identity.ok)return reply({message:'Entre novamente para atualizar sua senha.'},401);
  const user=await identity.json();
  const [profile]=await sql`select role,must_change_password from public.fenie_profiles where id=${user.id}`;
  if(!profile||profile.role!=='client'||!profile.must_change_password)return reply({message:'Esta conta não exige troca da senha inicial.'},403);
  const text=await req.text();if(text.length>2048)return reply({message:'Solicitação inválida.'},400);
  const body=JSON.parse(text),current=String(body.currentPassword||''),password=String(body.password||'');
  if(!current||current.length>100||password.length<10||password.length>100||password===current)return reply({message:'Escolha uma senha diferente da atual, com pelo menos 10 caracteres.'},400);
  const [counter]=await sql`insert into fenie_private.phone_login_limits(key) values(${'password:'+user.id}) on conflict(key) do update set
   attempts=case when phone_login_limits.window_start<now()-interval '5 minutes' then 1 else phone_login_limits.attempts+1 end,
   window_start=case when phone_login_limits.window_start<now()-interval '5 minutes' then now() else phone_login_limits.window_start end returning attempts`;
  if(counter.attempts>8)return reply({message:'Muitas tentativas. Aguarde alguns minutos.'},429);
  // Check the current password through Auth. Never compare or read stored hashes.
  const proof=await fetch(url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({...user.email?{email:user.email}:{phone:user.phone},password:current})});
  if(!proof.ok)return reply({message:'A senha atual está incorreta.'},400);
  const verified=await proof.json();proofToken=verified.access_token||'';
  if(verified.user?.id!==user.id)return reply({message:'Não foi possível validar sua conta.'},401);
  const changed=await fetch(url+'/auth/v1/user',{method:'PUT',headers:{apikey:key,Authorization:authorization,'Content-Type':'application/json'},body:JSON.stringify({password})});
  if(!changed.ok)return reply({message:'Não foi possível salvar a nova senha. Escolha outra senha e tente novamente.'},400);
  await sql`update public.fenie_profiles set must_change_password=false where id=${user.id} and role='client'`;
  return reply({success:true});
 }catch{return reply({message:'Não foi possível concluir. Se a senha já foi atualizada, use-a no campo de senha atual e tente novamente.'},503);}
 finally{if(proofToken)await fetch(url+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+proofToken}}).catch(()=>{});}
});
