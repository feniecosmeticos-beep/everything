import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const authIdentifier=(await readFile(new URL('../auth-identifier.js',import.meta.url),'utf8')).replace(/^export /gm,'');
const source=authIdentifier+(await readFile(new URL('../app.js',import.meta.url),'utf8')).replace(/^import .*\n/gm,'').replace(/\}\)\(\);\s*$/,'window.testPortal={syncAccount,getState:()=>state,getSession:()=>session,render};})();');
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
 async function typed(target){for(const fn of events.input||[])await fn({target});for(let k=0;k<5;k++)await new Promise(ok=>setImmediate(ok));}
 async function clickAll(target){for(const fn of events.click)await fn({target,preventDefault(){}});}
 return {calls,context,rows,ready,submit,click,change,typed,clickAll,root,historyCalls,api:context.window.testPortal};
}
test('login usa Supabase e lê o perfil aprovado do banco',async()=>{
 const e=environment();await e.ready();await e.submit('login',{identifier:'cliente@example.invalid',password:'senha de teste'}, {role:'client'});
 assert.equal(e.calls[0][0],'login');assert.equal(e.api.getSession().role,'client');assert.equal(e.context.location.hash,'#/cliente');
});
test('cadastro solicita confirmação e nunca atribui papel administrativo',async()=>{
 const e=environment();await e.ready();await e.submit('register',{email:'cliente@example.invalid',password:'senha de teste',name:'Nome',salon:'Salão',phone:'(41) 99999-0000'});
 const p=e.calls.find(c=>c[0]==='signup')[1];assert.equal(p.options.data.application,'fenie_portal');assert.equal(p.options.data.role,undefined);assert.equal(p.options.data.status,undefined);assert.equal(e.api.getSession(),null);
 assert.equal(p.options.emailRedirectTo,'https://fenie-portal.vercel.app/');
});
test('recuperação usa retorno ao portal e não transmite dados de pedidos',async()=>{
 const e=environment();await e.ready();await e.submit('recover',{email:'cliente@example.invalid'});
 const call=e.calls.find(c=>c[0]==='recovery');assert.equal(call[2].redirectTo,'https://fenie-portal.vercel.app/?recovery=1');
});
test('checkout envia apenas referências e quantidades ao RPC, com pagamento e idempotência',async()=>{
 const e=environment();await e.ready();await e.submit('login',{identifier:'cliente@example.invalid',password:'teste'},{role:'client'});
 e.api.getState().cart={v1:2};
 await e.submit('checkout',{address:'a1',payment:'boleto-parcelado',installments:'3',notes:'Manhã'});
 const input=e.calls.find(c=>c[0]==='fenie_place_order')[1].p_input;
 assert.equal(input.method,'boleto-parcelado');assert.equal(input.installments,3);assert.equal(input.items[0].quantity,2);
 assert.equal(input.items[0].price,undefined);assert.equal(input.user_id,undefined);assert.equal(input.requestId,'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
});
test('edição de perfil não envia papel, aprovação nem e-mail',async()=>{
 const e=environment();await e.ready();await e.submit('login',{identifier:'cliente@example.invalid',password:'teste'},{role:'client'});
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
 const e=environment();await e.ready();await e.submit('login',{identifier:'cliente@example.invalid',password:'teste'},{role:'client'});e.api.render();
 assert.equal(e.context.location.hash,'#/cliente');assert.match(e.root.innerHTML,/Reposição sem/);assert.ok(!e.root.innerHTML.includes('Verificar aprovação'));
});
test('painel administrativo oferece gestão e não aprovação de salões',async()=>{
 const e=environment('',null,'admin');await e.ready();await e.submit('login',{identifier:'cliente@example.invalid',password:'teste'},{role:'admin'});e.api.render();
 assert.equal(e.context.location.hash,'#/admin');assert.match(e.root.innerHTML,/Gerenciar produtos/);assert.ok(!e.root.innerHTML.includes('Aguardando aprovação'));
});
test('convite administrativo abre definição de senha e volta ao login de gestão',async()=>{
 const e=environment('?token_hash=token_de_teste_sem_valor_real_123456&type=invite',null,'admin');await e.ready();await e.submit('verify-email');e.api.render();
 assert.equal(e.calls[0][1].type,'invite');assert.equal(e.context.location.hash,'#/nova-senha');assert.match(e.root.innerHTML,/Ative seu acesso/);
 await e.submit('reset-password',{password:'senha ficticia do teste'});assert.equal(e.context.location.hash,'#/admin/entrar');assert.ok(e.calls.some(c=>c[0]==='updateUser'));
});

test('admin edita todos os campos do produto, preserva o código da opção e adiciona nova opção',async()=>{
 const e=environment('',null,'admin');await e.ready();await e.submit('login',{identifier:'equipe@example.invalid',password:'teste'},{role:'admin'});
 await e.submit('product',{name:'Produto novo nome',brand:'Olenka',category:'Finalizadores',size:'1 L',image:'https://cdn.example.invalid/foto.webp',active:'on',featured:'on',variant_id:['v1',''],variant_label:['1 L','Kit 2 un'],variant_sku:['SKU-1L','sku kit 2'],variant_price:['42,50','80.00']},{id:'p1'});
 const [,op,row]=e.calls.find(c=>c[0]==='fenie_products');
 assert.equal(op,'update');assert.equal(row.name,'Produto novo nome');assert.equal(row.brand,'Olenka');assert.equal(row.category,'Finalizadores');assert.equal(row.size,'1 L');assert.equal(row.image,'https://cdn.example.invalid/foto.webp');assert.equal(row.featured,true);
 assert.equal(JSON.stringify(row.variants.map(v=>[v.id,v.sku,v.price])),JSON.stringify([['v1','SKU-1L',4250],['SKU-KIT-2','sku kit 2',8000]]));
});
test('admin envia foto para o armazenamento e grava o link público',async()=>{
 const e=environment('',null,'admin');await e.ready();await e.submit('login',{identifier:'equipe@example.invalid',password:'teste'},{role:'admin'});
 const photo={size:1000,type:'image/webp',name:'foto.webp'};
 await e.submit('product',{name:'Produto',brand:'Fenié',image:'',photo,variant_id:'v1',variant_label:'900 ml',variant_sku:'SKU',variant_price:'42.50'},{id:'p1'});
 const up=e.calls.find(c=>c[0]==='upload');assert.equal(up[1],'fenie-produtos');assert.match(up[2],/^p1\/[a-z0-9]+\.webp$/);assert.equal(up[3].upsert,false);
 assert.match(e.calls.find(c=>c[0]==='fenie_products')[2].image,/^https:\/\/example\.supabase\.co\/storage\/v1\/object\/public\/fenie-produtos\/p1\//);
});
test('foto em formato ou tamanho inválido é recusada sem gravar',async()=>{
 const e=environment('',null,'admin');await e.ready();await e.submit('login',{identifier:'equipe@example.invalid',password:'teste'},{role:'admin'});
 const err=await e.submit('product',{name:'Produto',brand:'Fenié',photo:{size:9e6,type:'image/webp'},variant_id:'v1',variant_label:'900 ml',variant_sku:'SKU',variant_price:'42.50'},{id:'p1'});
 assert.match(err.textContent,/5 MB/);assert.equal(e.calls.some(c=>c[0]==='upload'||c[0]==='fenie_products'),false);
});
test('admin cadastra produto novo com identificador gerado',async()=>{
 const e=environment('',null,'admin');await e.ready();await e.submit('login',{identifier:'equipe@example.invalid',password:'teste'},{role:'admin'});
 await e.submit('product',{name:'Máscara Reconstrução',brand:'Spa do Fio',category:'Máscaras e tratamentos',size:'500 g',image:'',variant_id:'',variant_label:'500 g',variant_sku:'SDF-MSC-500',variant_price:'99.90'},{id:''});
 const [,op,row]=e.calls.find(c=>c[0]==='fenie_products');
 assert.equal(op,'insert');assert.match(row.id,/^mascara-reconstrucao-[a-z0-9]+$/);assert.equal(row.variants[0].id,'SDF-MSC-500');assert.equal(row.variants[0].price,9990);assert.equal(row.active,false);
});
test('cliente não consegue gravar produto pelo formulário do painel',async()=>{
 const e=environment();await e.ready();await e.submit('login',{identifier:'cliente@example.invalid',password:'teste'},{role:'client'});
 await e.submit('product',{name:'X',brand:'X',variant_label:'X',variant_sku:'X',variant_price:'1'},{id:'p1'});
 assert.equal(e.calls.some(c=>c[0]==='fenie_products'),false);
});
test('exclusão exige segundo clique de confirmação',async()=>{
 const e=environment('',null,'admin');await e.ready();await e.submit('login',{identifier:'equipe@example.invalid',password:'teste'},{role:'admin'});
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
 const e=environment('',null,'admin');await e.ready();await e.submit('login',{identifier:'equipe@example.invalid',password:'teste'},{role:'admin'});
 await e.submit('product',{name:'Produto',brand:'Fenié',description:'  Reconstrução profunda.\r\nUso semanal.  ',variant_id:'v1',variant_label:'900 ml',variant_sku:'SKU',variant_price:'42.50'},{id:'p1'});
 assert.equal(e.calls.find(c=>c[0]==='fenie_products')[2].description,'Reconstrução profunda.\nUso semanal.');
 const err=await e.submit('product',{name:'Produto',brand:'Fenié',description:'x'.repeat(2001),variant_id:'v1',variant_label:'900 ml',variant_sku:'SKU',variant_price:'42.50'},{id:'p1'});
 assert.match(err.textContent,/2\.000/);
});

test('pedido do salão tem botão Enviar para o WhatsApp e aviso de que só vale após o envio',async()=>{
 const e=environment();
 e.rows.fenie_orders=[{id:'FEN-00000009',user_id:'client-1',created_at:'2026-10-19T12:00:00Z',status:'waiting',payment_method:'pix',installments:1,items:[{productId:'p1',variantId:'v1',name:'Produto',label:'20 Vol',sku:'SKU',price:4250,quantity:2}],address:{label:'Salão',street:'Rua, 1',district:'Centro',city:'Curitiba',uf:'PR',cep:'80000000',complement:''},notes:'',events:[{date:'2026-10-19T12:00:00Z',text:'Solicitação registrada'}],total_cents:8500}];
 await e.ready();await e.submit('login',{identifier:'cliente@example.invalid',password:'teste'},{role:'client'});
 e.context.location.hash='#/cliente/pedidos/FEN-00000009';e.api.render();
 assert.match(e.root.innerHTML,/href="https:\/\/wa\.me\/554198402800\?text=[^"]+">Enviar para o WhatsApp/);
 assert.match(e.root.innerHTML,/só é realizado após o envio da mensagem pelo WhatsApp/);
 assert.doesNotMatch(e.root.innerHTML,/Ver mensagem do WhatsApp/);
});

test('categorias em botões filtram com um toque e a marca filtra na hora',async()=>{
 const e=environment();await e.ready();await e.submit('login',{identifier:'cliente@example.invalid',password:'teste'},{role:'client'});
 e.context.location.hash='#/cliente/catalogo';e.api.render();
 assert.doesNotMatch(e.root.innerHTML,/>Buscar</);assert.match(e.root.innerHTML,/data-action="category-chip" data-category="Máscaras"/);
 const chip={dataset:{action:'category-chip',category:'Máscaras'}};chip.closest=sel=>sel==='[data-action]'?chip:null;await e.clickAll(chip);
 assert.match(e.root.innerHTML,/Máscara Nutrição/);assert.doesNotMatch(e.root.innerHTML,/<h3><a[^>]*>Produto<\/a><\/h3>/);
 const form={dataset:{form:'catalog-search'},data:{q:'',brand:'Fenié',category:''},querySelector:()=>null};
 await e.change({tagName:'SELECT',dataset:{},name:'brand',hasAttribute:()=>false,closest:()=>form});
 assert.match(e.root.innerHTML,/<h3><a[^>]*>Produto<\/a><\/h3>/);assert.doesNotMatch(e.root.innerHTML,/Máscara Nutrição/);
});

const ORDER=()=>({id:'FEN-00000009',user_id:'client-1',created_at:'2026-10-19T12:00:00Z',status:'waiting',whatsapp_sent_at:null,payment_method:'pix',installments:1,items:[{productId:'p1',variantId:'v1',name:'Produto',volume:'900 ml',sku:'SKU',price:4250,quantity:2}],address:{label:'Salão',street:'Rua, 1',district:'Centro',city:'Curitiba',uf:'PR',cep:'80000000',complement:''},notes:'',events:[{date:'2026-10-19T12:00:00Z',text:'Solicitação registrada'}],total_cents:8500});
test('pedido não enviado aparece no início do salão e o clique em enviar fica registrado',async()=>{
 const e=environment();e.rows.fenie_orders=[ORDER()];await e.ready();await e.submit('login',{identifier:'cliente@example.invalid',password:'teste'},{role:'client'});
 e.context.location.hash='#/cliente';e.api.render();
 assert.match(e.root.innerHTML,/ainda não foi enviado pelo WhatsApp/);assert.match(e.root.innerHTML,/data-wa-order="FEN-00000009"/);
 const anchor={dataset:{waOrder:'FEN-00000009'}};anchor.closest=sel=>sel==='[data-wa-order]'?anchor:null;
 await e.clickAll(anchor);
 assert.equal(e.calls.filter(c=>c[0]==='fenie_mark_whatsapp').length,1);
 e.api.render();assert.doesNotMatch(e.root.innerHTML,/ainda não foi enviado/);
 await e.clickAll(anchor);assert.equal(e.calls.filter(c=>c[0]==='fenie_mark_whatsapp').length,1);
});
test('admin filtra não enviados e confirma recebimento pelo WhatsApp',async()=>{
 const e=environment('',null,'admin');const sent={...ORDER(),id:'FEN-00000010',whatsapp_sent_at:'2026-10-19T12:05:00Z'};e.rows.fenie_orders=[ORDER(),sent];
 e.rows.fenie_profiles.push({id:'client-x',role:'client',status:'approved',name:'X',salon:'Salão X',email:'x@example.invalid',phone:''});
 await e.ready();await e.submit('login',{identifier:'equipe@example.invalid',password:'teste'},{role:'admin'});
 e.context.location.hash='#/admin/pedidos';e.api.render();
 assert.match(e.root.innerHTML,/Não enviados pelo WhatsApp/);assert.match(e.root.innerHTML,/WhatsApp aberto/);
 await e.change({tagName:'SELECT',dataset:{},hasAttribute:n=>n==='data-status-filter',value:'unsent',closest:()=>null});
 assert.match(e.root.innerHTML,/FEN-00000009/);assert.doesNotMatch(e.root.innerHTML,/FEN-00000010/);
 const b={dataset:{action:'order-received',id:'FEN-00000009'}};b.closest=sel=>sel==='[data-action]'?b:null;await e.clickAll(b);
 const call=e.calls.find(c=>c[0]==='fenie_update_order');assert.equal(call[1].p_status,'confirmed');
});

test('card já vem com a primeira opção e adiciona a quantidade escolhida',async()=>{
 const e=environment();e.rows.fenie_products[1].variants.push({id:'v3',sku:'MSK-1K',label:'1 kg',price:15000});
 await e.ready();await e.submit('login',{identifier:'cliente@example.invalid',password:'teste'},{role:'client'});
 e.context.location.hash='#/cliente/catalogo';e.api.render();
 assert.doesNotMatch(e.root.innerHTML,/Escolher opção/);
 const card={querySelector:()=>({textContent:''})};
 const btn=(action,delta)=>{const b={dataset:{action,id:'p2',delta}};b.closest=sel=>sel==='[data-action]'?b:sel==='[data-product]'?card:null;return b;};
 await e.clickAll(btn('card-qty','1'));await e.clickAll(btn('card-qty','1'));
 await e.clickAll(btn('add-product'));
 assert.equal(e.api.getState().cart.v2,3);
});

test('início oferece repetir o último pedido e a reposição adiciona tudo de uma vez',async()=>{
 const e=environment();e.rows.fenie_orders=[ORDER()];await e.ready();await e.submit('login',{identifier:'cliente@example.invalid',password:'teste'},{role:'client'});
 e.context.location.hash='#/cliente';e.api.render();
 assert.match(e.root.innerHTML,/data-action="reorder" data-id="FEN-00000009">Repetir último pedido/);
 e.api.getState().saved=['p1','p2'];e.context.location.hash='#/cliente/reposicao';e.api.render();
 assert.match(e.root.innerHTML,/Adicionar todos ao pedido/);
 const b={dataset:{action:'add-saved'}};b.closest=sel=>sel==='[data-action]'?b:null;await e.clickAll(b);
 assert.equal(e.api.getState().cart.v1,1);assert.equal(e.api.getState().cart.v2,1);
});

test('admin altera o preço direto na tabela para produto de opção única',async()=>{
 const e=environment('',null,'admin');await e.ready();await e.submit('login',{identifier:'equipe@example.invalid',password:'teste'},{role:'admin'});
 e.context.location.hash='#/admin/catalogo';e.api.render();
 assert.match(e.root.innerHTML,/data-form="inline-price" data-id="p1"/);
 await e.submit('inline-price',{price:'49,90'},{id:'p1'});
 const [,op,row]=e.calls.find(c=>c[0]==='fenie_products');assert.equal(op,'update');assert.equal(row.variants[0].price,4990);assert.equal(row.variants[0].id,'v1');
 const err=await e.submit('inline-price',{price:'0'},{id:'p1'});assert.match(err.textContent,/preço válido/);
});
test('salão cancela pedido aguardando atendimento com motivo opcional',async()=>{
 const e=environment();e.rows.fenie_orders=[ORDER()];await e.ready();await e.submit('login',{identifier:'cliente@example.invalid',password:'teste'},{role:'client'});
 e.context.location.hash='#/cliente';e.api.render();assert.match(e.root.innerHTML,/data-action="order-cancel" data-id="FEN-00000009"/);
 e.context.location.hash='#/cliente/pedidos/FEN-00000009';e.api.render();assert.match(e.root.innerHTML,/data-action="order-cancel"/);
 const b={dataset:{action:'order-cancel',id:'FEN-00000009'}};b.closest=sel=>sel==='[data-action]'?b:null;await e.clickAll(b);
 const modal=e.context.document.querySelector('#modal');assert.ok(modal.open);assert.match(modal.innerHTML,/Confirmar cancelamento/);
 assert.equal(e.calls.filter(c=>c[0]==='fenie_cancel_order').length,0);
 e.rows.fenie_orders=[{...ORDER(),status:'cancelled'}];
 await e.submit('order-cancel',{reason:'Pedi errado'},{id:'FEN-00000009'});
 const call=e.calls.find(c=>c[0]==='fenie_cancel_order');assert.deepEqual(JSON.parse(JSON.stringify(call[1])),{p_id:'FEN-00000009',p_reason:'Pedi errado'});
 e.api.render();assert.match(e.root.innerHTML,/foi cancelado/);assert.doesNotMatch(e.root.innerHTML,/>Enviar para o WhatsApp/);assert.doesNotMatch(e.root.innerHTML,/data-action="order-cancel"/);
});
test('pedido já confirmado não oferece cancelamento pelo salão',async()=>{
 const e=environment();e.rows.fenie_orders=[{...ORDER(),status:'confirmed'}];await e.ready();await e.submit('login',{identifier:'cliente@example.invalid',password:'teste'},{role:'client'});
 e.context.location.hash='#/cliente/pedidos/FEN-00000009';e.api.render();
 assert.doesNotMatch(e.root.innerHTML,/data-action="order-cancel"/);assert.match(e.root.innerHTML,/Para cancelar, fale com a equipe/);
 const b={dataset:{action:'order-cancel',id:'FEN-00000009'}};b.closest=sel=>sel==='[data-action]'?b:null;await e.clickAll(b);
 assert.ok(!e.context.document.querySelector('#modal').open);
});
test('CEP preenche rua, bairro, cidade e UF e salva só os números',async()=>{
 const e=environment();await e.ready();await e.submit('login',{identifier:'cliente@example.invalid',password:'teste'},{role:'client'});
 const urls=[];e.context.AbortController=AbortController;e.context.fetch=async u=>{urls.push(u);return {ok:true,json:async()=>({logradouro:'Rua XV de Novembro',bairro:'Centro',localidade:'Curitiba',uf:'PR'})}};
 const fields={};for(const n of ['street','district','city','uf'])fields[n]={name:n,value:'',focus(){this.focused=true},setSelectionRange(){}};
 const status={textContent:''},form={querySelector:s=>s==='[data-cep-status]'?status:fields[s.match(/name="(\w+)"/)?.[1]]};
 const cep={value:'8002031',dataset:{cep:''},closest:()=>form};
 await e.typed(cep);assert.equal(urls.length,0);
 cep.value='80020310';await e.typed(cep);
 assert.equal(urls[0],'https://viacep.com.br/ws/80020310/json/');assert.equal(cep.value,'80020-310');
 assert.equal(fields.street.value,'Rua XV de Novembro, ');assert.equal(fields.district.value,'Centro');assert.equal(fields.city.value,'Curitiba');assert.equal(fields.uf.value,'PR');
 assert.ok(fields.street.focused);assert.match(status.textContent,/Complete com o número/);
 await e.typed(cep);assert.equal(urls.length,1);
 await e.submit('address',{label:'Salão',street:'Rua XV de Novembro, 100',complement:'',district:'Centro',city:'Curitiba',uf:'pr',cep:'80020-310'});
 const saved=e.calls.find(c=>c[0]==='fenie_addresses');assert.equal(saved[2].cep,'80020310');assert.equal(saved[2].uf,'PR');
});
test('CEP inexistente avisa e deixa preencher à mão',async()=>{
 const e=environment();await e.ready();await e.submit('login',{identifier:'cliente@example.invalid',password:'teste'},{role:'client'});
 e.context.AbortController=AbortController;e.context.fetch=async()=>({ok:true,json:async()=>({erro:true})});
 const street={value:'',focus(){}},status={textContent:''},form={querySelector:s=>s==='[data-cep-status]'?status:street};
 await e.typed({value:'99999999',dataset:{cep:''},closest:()=>form});
 assert.equal(street.value,'');assert.match(status.textContent,/CEP não encontrado/);
});
test('cadastro recusa telefone já usado e telefone sem DDD antes de criar a conta',async()=>{
 const e=environment();await e.ready();
 const rpc=e.context.createClient().rpc;
 let err=await e.submit('register',{email:'novo@example.invalid',password:'senha de teste',name:'Nome',salon:'Salão',phone:'99999-0000'});
 assert.match(err.textContent,/WhatsApp completo, com DDD/);assert.ok(!e.calls.some(c=>c[0]==='signup'));
 const backend=e.context.createClient();backend.rpc=async(name,p)=>{e.calls.push([name,p]);return name==='fenie_phone_taken'?{data:true}:{data:null}};
 err=await e.submit('register',{email:'novo@example.invalid',password:'senha de teste',name:'Nome',salon:'Salão',phone:'(41) 99999-0000'});
 assert.match(err.textContent,/Este telefone já tem cadastro/);assert.deepEqual(JSON.parse(JSON.stringify(e.calls.find(c=>c[0]==='fenie_phone_taken')[1])),{p_phone:'+5541999990000'});
 assert.ok(!e.calls.some(c=>c[0]==='signup'));
});
test('e-mail já cadastrado mostra mensagem em português com caminho de recuperação',async()=>{
 const e=environment();await e.ready();
 const backend=e.context.createClient();backend.auth.signUp=async()=>({error:{message:'User already registered'}});
 const err=await e.submit('register',{email:'cliente@example.invalid',password:'senha de teste',name:'Nome',salon:'Salão',phone:'(41) 99999-0000'});
 assert.match(err.textContent,/Este e-mail já tem cadastro/);assert.doesNotMatch(err.textContent,/already/);
});
test('produto tem página própria com opções, quantidade, descrição e produtos da mesma marca',async()=>{
 const e=environment();e.rows.fenie_products.push({id:'p3',name:'Shampoo Nutrição',brand:'Olenka',size:'1 L',category:'Shampoos',image:'img',active:true,featured:false,variants:[{id:'v3a',sku:'SH-1',label:'1 L',price:15900},{id:'v3b',sku:'SH-250',label:'250 ml',price:5900}],description:'Limpa sem ressecar.\nModo de uso: aplicar e enxaguar.'});
 await e.ready();await e.submit('login',{identifier:'cliente@example.invalid',password:'teste'},{role:'client'});
 e.context.location.hash='#/cliente/catalogo';e.api.render();assert.match(e.root.innerHTML,/href="#\/cliente\/produto\/p3"/);
 e.context.location.hash='#/cliente/produto/p3';e.api.render();const h=e.root.innerHTML;
 assert.match(h,/<h1>Shampoo Nutrição<\/h1>/);assert.match(h,/Conheça o produto/);assert.match(h,/<p>Modo de uso: aplicar e enxaguar.<\/p>/);
 assert.match(h,/name="pdp-variant" value="v3b"/);assert.match(h,/Adicionar ao pedido/);assert.match(h,/Mais de Olenka/);assert.match(h,/data-product="p2"/);
 assert.match(h,/<strong>Produto<\/strong>/);
 const add={dataset:{action:'add-product',id:'p3'}};add.closest=sel=>sel==='[data-action]'?add:null;await e.clickAll(add);
 const ch={dataset:{variant:'p3'},value:'v3b',closest:()=>null};await e.change(ch);await e.clickAll(add);
 assert.equal(e.api.getState().cart.v3a,1);assert.equal(e.api.getState().cart.v3b,1);
});
test('produto inexistente mostra aviso e vitrine de marcas leva ao catálogo filtrado',async()=>{
 const e=environment();e.rows.fenie_products.push({id:'p4',name:'Máscara Glynett',brand:'GLYNETT',size:'500 g',category:'Máscaras',image:'img',active:true,featured:false,variants:[{id:'v4',sku:'G4',label:'500 g',price:8900}]});
 await e.ready();await e.submit('login',{identifier:'cliente@example.invalid',password:'teste'},{role:'client'});
 e.context.location.hash='#/cliente/produto/nao-existe';e.api.render();assert.match(e.root.innerHTML,/Produto indisponível/);
 e.context.location.hash='#/cliente';e.api.render();assert.match(e.root.innerHTML,/AS MARCAS DA FENIÉ/);assert.match(e.root.innerHTML,/brand-logos\/glynett.png/);
 e.context.location.hash='#/cliente/marcas';e.api.render();assert.match(e.root.innerHTML,/data-action="brand-open" data-brand="GLYNETT"/);
 const b={dataset:{action:'brand-open',brand:'GLYNETT'}};b.closest=sel=>sel==='[data-action]'?b:null;await e.clickAll(b);
 e.context.location.hash='#/cliente/catalogo';e.api.render();assert.match(e.root.innerHTML,/brand-banner/);assert.match(e.root.innerHTML,/Máscara Glynett/);assert.doesNotMatch(e.root.innerHTML,/Máscara Nutrição/);
});
