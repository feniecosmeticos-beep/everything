import postgres from 'npm:postgres@3.4.7';

const sql=postgres(Deno.env.get('SUPABASE_DB_URL')!,{prepare:false,max:1,idle_timeout:10,connect_timeout:10,ssl:'require'});
const url=Deno.env.get('SUPABASE_URL')!,serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const allowed=new Set(['https://fenie-portal.vercel.app','http://127.0.0.1:8786']);
const digest=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(v=>v.toString(16).padStart(2,'0')).join('');

Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'',headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(allowed.has(origin)?{'Access-Control-Allow-Origin':origin}:{})};
 const response=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});
 if(req.method!=='POST'||(origin&&!allowed.has(origin)))return response({message:'Acesso indisponível.'},403);
 if(Number(req.headers.get('content-length')||0)>2048)return response({message:'Solicitação inválida.'},400);
 try{
  const text=await req.text();if(text.length>2048)return response({message:'Solicitação inválida.'},400);
  const body=JSON.parse(text),phone=String(body.phone||''),password=String(body.password||'');
  if(!/^\+55[1-9]\d(?:[2-5]\d{7}|9\d{8})$/.test(phone)||!password||password.length>100)return response({message:'E-mail, telefone ou senha incorretos.'},400);
  const ip=req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()||'unknown';
  const keys=[['account',phone,8],['ip',ip,40],['global','project',120]] as const;
  const permitted=await sql.begin(async tx=>{
   for(const [scope,value,limit] of keys){
    const key=await digest(serviceKey+':'+scope+':'+value);
    const [counter]=await tx`insert into fenie_private.phone_login_limits(key) values(${key})
      on conflict(key) do update set
      attempts=case when phone_login_limits.window_start<now()-interval '5 minutes' then 1 else phone_login_limits.attempts+1 end,
      window_start=case when phone_login_limits.window_start<now()-interval '5 minutes' then now() else phone_login_limits.window_start end returning attempts`;
    if(counter.attempts>limit)return false;
   }
   await tx`delete from fenie_private.phone_login_limits where window_start<now()-interval '1 day'`;
   return true;
  });
  if(!permitted)return response({message:'Muitas tentativas. Aguarde alguns minutos e tente novamente.'},429);
  const [account]=await sql`select u.email from fenie_private.phone_logins l join auth.users u on u.id=l.user_id join public.fenie_profiles p on p.id=u.id
    where l.phone=${phone} and p.role='client' and p.status='approved' and not coalesce(u.is_anonymous,false) limit 1`;
  // Both known and unknown numbers go through Auth; never disclose account lookup results.
  const email=account?.email||'not-found-'+await digest(phone)+'@telefone.fenie.invalid';
  const auth=await fetch(url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:serviceKey,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
  if(!auth.ok)return response({message:'E-mail, telefone ou senha incorretos.'},400);
  const session=await auth.json();
  if(!account||session.user?.app_metadata?.internal_phone_login!==true)return response({message:'E-mail, telefone ou senha incorretos.'},400);
  // Return ordinary Auth credentials; the client establishes the standard Supabase session.
  return response({access_token:session.access_token,refresh_token:session.refresh_token});
 }catch{return response({message:'Não foi possível entrar. Tente novamente em instantes.'},503);}
});
