import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=(await readFile(new URL('../app.js',import.meta.url),'utf8')).replace(/^import .*\n/,'').replace(/\}\)\(\);\s*$/,'window.testPortal={syncAccount,getState:()=>state,getSession:()=>session,render};})();');
function environment(search='',otpError=null,role='client'){
 const calls=[],events={},store=new Map(),user={id:'client-1'},profile={id:'client-1',role,status:'approved',name:'Cliente',salon:'Salão',email:'cliente@example.invalid',phone:''};
 const rows={fenie_products:[{id:'p1',name:'Produto',brand:'Fenié',size:'900 ml',image:'img',active:true,featured:true,variants:[{id:'v1',sku:'SKU',label:'20 Vol',price:4250}]}],fenie_profiles:[profile],fenie_addresses:[{id:'a1',user_id:'client-1',label:'Salão',street:'Rua, 1',district:'Centro',city:'Curitiba',uf:'PR',cep:'80000000'}],fenie_orders:[]};
 let loggedIn=false;
 const root={innerHTML:'',querySelector:()=>null},modal={open:false,showModal(){this.open=true},close(){this.open=false}},toast={};
 const backend={auth:{verifyOtp:async p=>{calls.push(['verifyOtp',p]);if(otpError)return {error:otpError};loggedIn=true;return {data:{user}}},getUser:async()=>({data:{user:loggedIn?user:null}}),onAuthStateChange(){},signInWithPassword:async p=>{calls.push(['login',p]);loggedIn=true;return {data:{user}}},signUp:async p=>{calls.push(['signup',p]);return {data:{session:null}}},resetPasswordForEmail:async(...p)=>{calls.push(['recovery',...p]);return {data:{}}},updateUser:async p=>{calls.push(['updateUser',p]);return {data:{}}},signOut:async()=>{loggedIn=false;return {data:{}}}},
 from(table){let operation='read',payload;const q={select(){return q},order(){return q},eq(){return q},range(){return q},update(p){operation='update';payload=p;return q},insert(p){operation='insert';payload=p;return q},single(){return q},then(ok,no){if(operation!=='read')calls.push([table,operation,payload]);return Promise.resolve({data:operation==='read'?rows[table]||[]:payload}).then(ok,no)}};return q},
 rpc:async(name,p)=>{calls.push([name,p]);return {data:'FEN-00000001'}}};
 const document={title:'',querySelector:s=>s==='#app'?root:s==='#modal'?modal:toast,addEventListener:(type,fn)=>{(events[type]??=[]).push(fn)}};
 const historyCalls=[];
 let browserHash='#/entrar';
 const mockLocation={search,origin:'https://protected-preview.example',pathname:'/',get hash(){return browserHash},set hash(value){browserHash=value.startsWith('#')?value:'#'+value}};
 const context={window:{PROTOTYPE_SEED:{logo:'logo'},addEventListener(){}},document,location:mockLocation,history:{replaceState(...args){historyCalls.push(args)}},localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},createClient:()=>backend,__SUPABASE_URL__:'https://example.supabase.co',__SUPABASE_KEY__:'sb_publishable_test',__AUTH_SITE_URL__:'https://fenie-portal.vercel.app/',URLSearchParams,FormData:class{constructor(f){this.data=f.data}get(k){return this.data[k]}has(k){return k in this.data}},crypto:{randomUUID:()=> 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'},setTimeout:()=>1,clearTimeout(){},navigator:{clipboard:{writeText:async()=>{}}},console};
 vm.runInNewContext(source,context);
 async function ready(){await new Promise(ok=>setImmediate(ok));if(!search.includes('token_hash'))await context.window.testPortal.syncAccount();}
 async function submit(kind,data={},extra={}){
 const errors={hidden:true,textContent:''},form={data,dataset:{form:kind,...extra},isConnected:true,querySelector:()=>errors,querySelectorAll:()=>[]};
 await events.submit[0]({target:{closest:()=>form},preventDefault(){}});return errors;
 }
 async function click(action){
  const button={dataset:{action},textContent:'Verificar aprovação',disabled:false};
  await events.click[0]({target:{closest:()=>button}});return button;
 }
 return {calls,context,rows,ready,submit,click,root,historyCalls,api:context.window.testPortal};
}
test('login usa Supabase e lê o perfil aprovado do banco',async()=>{
 const e=environment();await e.ready();await e.submit('login',{email:'cliente@example.invalid',password:'senha de teste'}, {role:'client'});
 assert.equal(e.calls[0][0],'login');assert.equal(e.api.getSession().role,'client');assert.equal(e.context.location.hash,'#/cliente');
});
test('cadastro solicita confirmação e nunca atribui papel administrativo',async()=>{
 const e=environment();await e.ready();await e.submit('register',{email:'cliente@example.invalid',password:'senha de teste',name:'Nome',salon:'Salão',phone:'(41) 0000-0000'});
 const p=e.calls.find(c=>c[0]==='signup')[1];assert.equal(p.options.data.application,'fenie_portal');assert.equal(p.options.data.role,undefined);assert.equal(p.options.data.status,undefined);assert.equal(e.api.getSession(),null);
 assert.equal(p.options.emailRedirectTo,'https://fenie-portal.vercel.app/');
});
test('recuperação usa retorno ao portal e não transmite dados de pedidos',async()=>{
 const e=environment();await e.ready();await e.submit('recover',{email:'cliente@example.invalid'});
 const call=e.calls.find(c=>c[0]==='recovery');assert.equal(call[2].redirectTo,'https://fenie-portal.vercel.app/?recovery=1');
});
test('checkout envia apenas referências e quantidades ao RPC, com pagamento e idempotência',async()=>{
 const e=environment();await e.ready();await e.submit('login',{email:'cliente@example.invalid',password:'teste'},{role:'client'});
 e.api.getState().cart={v1:2};
 await e.submit('checkout',{address:'a1',payment:'boleto-parcelado',installments:'3',notes:'Manhã'});
 const input=e.calls.find(c=>c[0]==='fenie_place_order')[1].p_input;
 assert.equal(input.method,'boleto-parcelado');assert.equal(input.installments,3);assert.equal(input.items[0].quantity,2);
 assert.equal(input.items[0].price,undefined);assert.equal(input.user_id,undefined);assert.equal(input.requestId,'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
});
test('edição de perfil não envia papel, aprovação nem e-mail',async()=>{
 const e=environment();await e.ready();await e.submit('login',{email:'cliente@example.invalid',password:'teste'},{role:'client'});
 await e.submit('profile',{name:'Nome',salon:'Salão',phone:'41',email:'outro@example.invalid',role:'admin',status:'approved'});
 const p=e.calls.find(c=>c[0]==='fenie_profiles')[2];assert.deepEqual(Object.keys(p).sort(),['name','phone','salon']);
});

test('confirmação funciona em um navegador sem o verificador PKCE original e aguarda clique',async()=>{
 const token='token_de_teste_sem_valor_real_123456';
 const e=environment('?token_hash='+token+'&type=email');await e.ready();
 assert.equal(e.calls.length,0);assert.equal(e.historyCalls[0][2],'/#/confirmar-email');
 assert.match(e.root.innerHTML,/Confirmar meu e-mail/);assert.ok(!e.root.innerHTML.includes(token));
 await e.submit('verify-email');
 assert.equal(e.calls[0][0],'verifyOtp');assert.equal(e.calls[0][1].type,'email');assert.equal(e.calls[0][1].token_hash,token);
 assert.equal(e.api.getSession().role,'client');assert.equal(e.context.location.hash,'#/cliente');
});

test('link de recuperação validado abre nova senha sem reutilizar o navegador do pedido',async()=>{
 const e=environment('?token_hash=token_de_teste_sem_valor_real_123456&type=recovery');await e.ready();await e.submit('verify-email');
 assert.equal(e.calls[0][1].type,'recovery');assert.equal(e.context.location.hash,'#/nova-senha');
});

test('link expirado apresenta caminho de recuperação sem criar sessão nem expor token',async()=>{
 const e=environment('?token_hash=token_de_teste_sem_valor_real_123456&type=email',{message:'Token expired'});await e.ready();await e.submit('verify-email');
 assert.equal(e.api.getSession(),null);assert.match(e.root.innerHTML,/expirou ou já foi utilizado/);assert.match(e.root.innerHTML,/Recuperar acesso/);assert.ok(!e.root.innerHTML.includes('token_de_teste'));
});

test('tipos de confirmação fora da lista permitida não são enviados ao Supabase',async()=>{
 const e=environment('?token_hash=token_de_teste_sem_valor_real_123456&type=email_change');await e.ready();await e.submit('verify-email');
 assert.equal(e.calls.length,0);assert.equal(e.api.getSession(),null);
});

test('salão confirmado entra direto sem aprovação manual',async()=>{
 const e=environment();await e.ready();await e.submit('login',{email:'cliente@example.invalid',password:'teste'},{role:'client'});e.api.render();
 assert.equal(e.context.location.hash,'#/cliente');assert.match(e.root.innerHTML,/Reposição sem/);assert.ok(!e.root.innerHTML.includes('Verificar aprovação'));
});
test('painel administrativo oferece gestão e não aprovação de salões',async()=>{
 const e=environment('',null,'admin');await e.ready();await e.submit('login',{email:'cliente@example.invalid',password:'teste'},{role:'admin'});e.api.render();
 assert.equal(e.context.location.hash,'#/admin');assert.match(e.root.innerHTML,/Gerenciar produtos/);assert.ok(!e.root.innerHTML.includes('Aguardando aprovação'));
});
test('convite administrativo abre definição de senha e volta ao login de gestão',async()=>{
 const e=environment('?token_hash=token_de_teste_sem_valor_real_123456&type=invite',null,'admin');await e.ready();await e.submit('verify-email');e.api.render();
 assert.equal(e.calls[0][1].type,'invite');assert.equal(e.context.location.hash,'#/nova-senha');assert.match(e.root.innerHTML,/Ative seu acesso/);
 await e.submit('reset-password',{password:'senha ficticia do teste'});assert.equal(e.context.location.hash,'#/admin/entrar');assert.ok(e.calls.some(c=>c[0]==='updateUser'));
});
