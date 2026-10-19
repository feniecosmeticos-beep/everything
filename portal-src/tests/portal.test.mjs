import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=(await readFile(new URL('../app.js',import.meta.url),'utf8')).replace(/^import .*\n/,'').replace(/\}\)\(\);\s*$/,'window.testPortal={syncAccount,getState:()=>state,getSession:()=>session,render};})();');
function environment(search='',otpError=null,role='client'){
 const calls=[],events={},store=new Map(),user={id:'client-1'},profile={id:'client-1',role,status:'approved',name:'Cliente',salon:'Salão',email:'cliente@example.invalid',phone:''};
 const rows={fenie_products:[{id:'p1',name:'Produto',brand:'Fenié',size:'900 ml',category:'Oxidantes',image:'img',active:true,featured:true,variants:[{id:'v1',sku:'SKU',label:'20 Vol',price:4250}]},{id:'p2',name:'Máscara Nutrição',brand:'Olenka',size:'500 g',category:'Máscaras',image:'img',active:true,featured:false,variants:[{id:'v2',sku:'MSK',label:'500 g',price:9000}]}],fenie_profiles:[profile],fenie_addresses:[{id:'a1',user_id:'client-1',label:'Salão',street:'Rua, 1',district:'Centro',city:'Curitiba',uf:'PR',cep:'80000000'}],fenie_orders:[]};
 let loggedIn=false;
 const root={innerHTML:'',querySelector:()=>null},modal={open:false,showModal(){this.open=true},close(){this.open=false}},toast={};
 const backend={auth:{verifyOtp:async p=>{calls.push(['verifyOtp',p]);if(otpError)return {error:otpError};loggedIn=true;return {data:{user}}},getUser:async()=>({data:{user:loggedIn?user:null}}),onAuthStateChange(){},signInWithPassword:async p=>{calls.push(['login',p]);loggedIn=true;return {data:{user}}},signUp:async p=>{calls.push(['signup',p]);return {data:{session:null}}},resetPasswordForEmail:async(...p)=>{calls.push(['recovery',...p]);return {data:{}}},updateUser:async p=>{calls.push(['updateUser',p]);return {data:{}}},signOut:async()=>{loggedIn=false;return {data:{}}}},
 from(table){let operation='read',payload;const q={select(){return q},order(){return q},eq(){return q},range(){return q},update(p){operation='update';payload=p;return q},insert(p){operation='insert';payload=p;return q},delete(){operation='delete';payload=null;return q},single(){return q},then(ok,no){if(operation!=='read')calls.push([table,operation,payload]);return Promise.resolve({data:operation==='read'?rows[table]||[]:operation==='delete'?[{}]:payload}).then(ok,no)}};return q},
 storage:{from:bucket=>({upload:async(path,file,opts)=>{calls.push(['upload',bucket,path,opts]);return {data:{path}}},getPublicUrl:path=>({data:{publicUrl:'https://example.supabase.co/storage/v1/object/public/'+bucket+'/'+path}})})},
 rpc:async(name,p)=>{calls.push([name,p]);return {data:'FEN-00000001'}}};
 const document={title:'',querySelector:s=>s==='#app'?root:s==='#modal'?modal:toast,addEventListener:(type,fn)=>{(events[type]??=[]).push(fn)},dispatchClick:button=>events.click[0]({target:{closest:()=>button}})};
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
 async function change(target){await events.change[0]({target});}
 return {calls,context,rows,ready,submit,click,change,root,historyCalls,api:context.window.testPortal};
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

test('admin edita todos os campos do produto, preserva o código da opção e adiciona nova opção',async()=>{
 const e=environment('',null,'admin');await e.ready();await e.submit('login',{email:'equipe@example.invalid',password:'teste'},{role:'admin'});
 await e.submit('product',{name:'Produto novo nome',brand:'Olenka',category:'Finalizadores',size:'1 L',image:'https://cdn.example.invalid/foto.webp',active:'on',featured:'on',variant_id:['v1',''],variant_label:['1 L','Kit 2 un'],variant_sku:['SKU-1L','sku kit 2'],variant_price:['42,50','80.00']},{id:'p1'});
 const [,op,row]=e.calls.find(c=>c[0]==='fenie_products');
 assert.equal(op,'update');assert.equal(row.name,'Produto novo nome');assert.equal(row.brand,'Olenka');assert.equal(row.category,'Finalizadores');assert.equal(row.size,'1 L');assert.equal(row.image,'https://cdn.example.invalid/foto.webp');assert.equal(row.featured,true);
 assert.equal(JSON.stringify(row.variants.map(v=>[v.id,v.sku,v.price])),JSON.stringify([['v1','SKU-1L',4250],['SKU-KIT-2','sku kit 2',8000]]));
});
test('admin envia foto para o armazenamento e grava o link público',async()=>{
 const e=environment('',null,'admin');await e.ready();await e.submit('login',{email:'equipe@example.invalid',password:'teste'},{role:'admin'});
 const photo={size:1000,type:'image/webp',name:'foto.webp'};
 await e.submit('product',{name:'Produto',brand:'Fenié',image:'',photo,variant_id:'v1',variant_label:'900 ml',variant_sku:'SKU',variant_price:'42.50'},{id:'p1'});
 const up=e.calls.find(c=>c[0]==='upload');assert.equal(up[1],'fenie-produtos');assert.match(up[2],/^p1\/[a-z0-9]+\.webp$/);assert.equal(up[3].upsert,false);
 assert.match(e.calls.find(c=>c[0]==='fenie_products')[2].image,/^https:\/\/example\.supabase\.co\/storage\/v1\/object\/public\/fenie-produtos\/p1\//);
});
test('foto em formato ou tamanho inválido é recusada sem gravar',async()=>{
 const e=environment('',null,'admin');await e.ready();await e.submit('login',{email:'equipe@example.invalid',password:'teste'},{role:'admin'});
 const err=await e.submit('product',{name:'Produto',brand:'Fenié',photo:{size:9e6,type:'image/webp'},variant_id:'v1',variant_label:'900 ml',variant_sku:'SKU',variant_price:'42.50'},{id:'p1'});
 assert.match(err.textContent,/5 MB/);assert.equal(e.calls.some(c=>c[0]==='upload'||c[0]==='fenie_products'),false);
});
test('admin cadastra produto novo com identificador gerado',async()=>{
 const e=environment('',null,'admin');await e.ready();await e.submit('login',{email:'equipe@example.invalid',password:'teste'},{role:'admin'});
 await e.submit('product',{name:'Máscara Reconstrução',brand:'Spa do Fio',category:'Máscaras e tratamentos',size:'500 g',image:'',variant_id:'',variant_label:'500 g',variant_sku:'SDF-MSC-500',variant_price:'99.90'},{id:''});
 const [,op,row]=e.calls.find(c=>c[0]==='fenie_products');
 assert.equal(op,'insert');assert.match(row.id,/^mascara-reconstrucao-[a-z0-9]+$/);assert.equal(row.variants[0].id,'SDF-MSC-500');assert.equal(row.variants[0].price,9990);assert.equal(row.active,false);
});
test('cliente não consegue gravar produto pelo formulário do painel',async()=>{
 const e=environment();await e.ready();await e.submit('login',{email:'cliente@example.invalid',password:'teste'},{role:'client'});
 await e.submit('product',{name:'X',brand:'X',variant_label:'X',variant_sku:'X',variant_price:'1'},{id:'p1'});
 assert.equal(e.calls.some(c=>c[0]==='fenie_products'),false);
});
test('exclusão exige segundo clique de confirmação',async()=>{
 const e=environment('',null,'admin');await e.ready();await e.submit('login',{email:'equipe@example.invalid',password:'teste'},{role:'admin'});
 const button={dataset:{action:'product-delete',id:'p1'},textContent:'Excluir produto'};
 await e.context.document.dispatchClick(button);
 assert.equal(e.calls.some(c=>c[1]==='delete'),false);assert.equal(button.dataset.confirm,'1');
 await e.context.document.dispatchClick(button);
 assert.equal(e.calls.filter(c=>c[1]==='delete').length,1);
});

test('visitante sem login não carrega produtos e a vitrine pública leva ao login',async()=>{
 const e=environment();await e.ready();
 assert.equal(e.api.getState().products.length,0);
 e.context.location.hash='#/catalogo';e.api.render();
 assert.equal(e.context.location.hash,'#/entrar');
 assert.doesNotMatch(e.root.innerHTML,/Explorar produtos/);
});

test('admin grava a descrição do produto e o salão vê o texto no card',async()=>{
 const e=environment('',null,'admin');await e.ready();await e.submit('login',{email:'equipe@example.invalid',password:'teste'},{role:'admin'});
 await e.submit('product',{name:'Produto',brand:'Fenié',description:'  Reconstrução profunda.\r\nUso semanal.  ',variant_id:'v1',variant_label:'900 ml',variant_sku:'SKU',variant_price:'42.50'},{id:'p1'});
 assert.equal(e.calls.find(c=>c[0]==='fenie_products')[2].description,'Reconstrução profunda.\nUso semanal.');
 const err=await e.submit('product',{name:'Produto',brand:'Fenié',description:'x'.repeat(2001),variant_id:'v1',variant_label:'900 ml',variant_sku:'SKU',variant_price:'42.50'},{id:'p1'});
 assert.match(err.textContent,/2\.000/);
});

test('pedido do salão tem botão Enviar para o WhatsApp e aviso de que só vale após o envio',async()=>{
 const e=environment();
 e.rows.fenie_orders=[{id:'FEN-00000009',user_id:'client-1',created_at:'2026-10-19T12:00:00Z',status:'waiting',payment_method:'pix',installments:1,items:[{productId:'p1',variantId:'v1',name:'Produto',label:'20 Vol',sku:'SKU',price:4250,quantity:2}],address:{label:'Salão',street:'Rua, 1',district:'Centro',city:'Curitiba',uf:'PR',cep:'80000000',complement:''},notes:'',events:[{date:'2026-10-19T12:00:00Z',text:'Solicitação registrada'}],total_cents:8500}];
 await e.ready();await e.submit('login',{email:'cliente@example.invalid',password:'teste'},{role:'client'});
 e.context.location.hash='#/cliente/pedidos/FEN-00000009';e.api.render();
 assert.match(e.root.innerHTML,/href="https:\/\/wa\.me\/554198402800\?text=[^"]+">Enviar para o WhatsApp/);
 assert.match(e.root.innerHTML,/só é realizado após o envio da mensagem pelo WhatsApp/);
 assert.doesNotMatch(e.root.innerHTML,/Ver mensagem do WhatsApp/);
});

test('trocar categoria ou marca filtra na hora, sem botão Buscar',async()=>{
 const e=environment();await e.ready();await e.submit('login',{email:'cliente@example.invalid',password:'teste'},{role:'client'});
 e.context.location.hash='#/cliente/catalogo';e.api.render();
 assert.doesNotMatch(e.root.innerHTML,/>Buscar</);assert.match(e.root.innerHTML,/>Categorias</);
 const form={dataset:{form:'catalog-search'},data:{q:'',brand:'',category:'Máscaras'},querySelector:()=>null};
 const select={tagName:'SELECT',dataset:{},name:'category',hasAttribute:()=>false,closest:()=>form};
 await e.change(select);
 assert.match(e.root.innerHTML,/Máscara Nutrição/);assert.doesNotMatch(e.root.innerHTML,/<h3>Produto<\/h3>/);
});
