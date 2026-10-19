import { createClient } from '@supabase/supabase-js';
const backend=createClient(__SUPABASE_URL__,__SUPABASE_KEY__,{auth:{flowType:'pkce',detectSessionInUrl:true,autoRefreshToken:true,persistSession:true}});
(function(){
'use strict';
const seed=window.PROTOTYPE_SEED,root=document.querySelector('#app'),modal=document.querySelector('#modal'),STORE='fenie.portal.draft.v1';
const clone=x=>JSON.parse(JSON.stringify(x)),C=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>(n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),initials=n=>n.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
let session=null,cartSelections={},filters={q:'',brand:'',status:'',clientQ:''},newOrderId='',toastTimer;
const icons={home:'<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7"/>',box:'<path d="m3 7 9-4 9 4v11l-9 4-9-4V7Zm0 0 9 5 9-5M12 12v10"/>',bag:'<path d="M5 7h14l1 14H4L5 7ZM8 8V6a4 4 0 0 1 8 0v2"/>',users:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 6"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',pin:'<path d="M19 10c0 6-7 12-7 12S5 16 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',search:'<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>'};
function icon(n){return '<span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24">'+(icons[n]||icons.box)+'</svg></span>';}
function product(id){return state.products.find(p=>p.id===id);}
function variant(id){for(const p of state.products){const v=p.variants.find(v=>v.id===id);if(v)return {p,v};}return null;}
function client(){return state.clients.find(c=>c.id===session?.clientId);}
function payment(m,n){const labels={pix:'Pix',credito:'Cartão de crédito',debito:'Cartão de débito','boleto-avista':'Boleto à vista',combinar:'A combinar com o atendimento'};return m==='boleto-parcelado'?'Boleto parcelado em '+(Number.isInteger(Number(n))&&n>=2&&n<=6?Number(n):2)+'x':labels[m]||labels.combinar;}
const statusNames={waiting:'Aguardando atendimento',confirmed:'Confirmado',separating:'Em separação',dispatched:'Em entrega',delivered:'Entregue',cancelled:'Cancelado'};
function badge(s){const label=statusNames[s]||{pending:'Confirme seu e-mail',approved:'Ativo',denied:'Acesso indisponível'}[s]||s,cls=['delivered','confirmed','approved'].includes(s)?'approved':['waiting','pending'].includes(s)?'waiting':['cancelled','denied'].includes(s)?'cancelled':'separating';return '<span class="badge '+cls+'">'+C(label)+'</span>';}
function makeState(){return {products:[],clients:[],orders:[],cart:{},saved:[],checkout:{addressId:'',method:'combinar',installments:'2',notes:''}};}
let state=makeState(),loading=true,syncVersion=0,recoveryMode=new URLSearchParams(location.search).has('recovery'),inviteMode=false,lastSync=0;
const emailParams=new URLSearchParams(location.search);
let emailLink=emailParams.has('token_hash')?{token:emailParams.get('token_hash'),type:emailParams.get('type')}:null;
if(emailLink)history.replaceState(null,'',location.pathname+'#/confirmar-email');
function emailLinkScreen(message=''){
 const valid=emailLink&&['email','recovery','invite'].includes(emailLink.type)&&/^[a-zA-Z0-9_-]{20,256}$/.test(emailLink.token||''),recover=emailLink?.type==='recovery',invite=emailLink?.type==='invite';
 root.innerHTML=publicHead()+'<main id="main" tabindex="-1" style="max-width:620px;margin:50px auto;padding:0 20px"><section class="card empty"><p class="eyebrow">PORTAL FENIÉ</p><h1>'+(invite?'Seu acesso à gestão Fenié.':recover?'Recupere seu acesso.':'Confirme seu e-mail.')+'</h1><p>'+(message||(invite?'Você foi convidado para administrar o catálogo. Continue para criar sua senha.':'Para continuar, confirme que você solicitou este '+(recover?'link de recuperação.':'cadastro.')))+'</p>'+(valid&&!message?'<form data-form="verify-email"><p class="form-error" data-form-error role="alert" hidden></p><button class="btn primary" type="submit">'+(invite?'Ativar meu acesso':recover?'Continuar para nova senha':'Confirmar meu e-mail')+'</button></form>':'<p role="alert">Solicite um novo link ou entre com sua senha caso já tenha confirmado o e-mail.</p><a class="btn primary" href="#/recuperar" data-action="email-link-leave">Recuperar acesso</a><a class="btn ghost" href="#/entrar" data-action="email-link-leave">Voltar para entrar</a>')+'</section></main>'+publicFoot();
}
function draftKey(){return STORE+'.'+(session?.clientId||'visitor');}
function readDraft(){try{const d=JSON.parse(localStorage.getItem(draftKey()));state.cart=d?.cart||{};state.saved=d?.saved||[];state.checkout=d?.checkout||{addressId:'',method:'combinar',installments:'2',notes:''};}catch{state.cart={};state.saved=[];}}
function persist(){try{localStorage.setItem(draftKey(),JSON.stringify({cart:state.cart,saved:state.saved,checkout:state.checkout}));}catch{toast('A seleção ficará disponível apenas nesta aba.');}}
function checked(result){if(result.error)throw result.error;return result.data;}
async function allRows(table,query='*',order='id'){
 let data=[];for(let from=0;;from+=500){const part=checked(await backend.from(table).select(query).order(order).range(from,from+499));data.push(...part);if(part.length<500)return data;}
}
function dateLabel(iso){return new Date(iso).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'});}
async function syncAccount(redirect=false){
 const version=++syncVersion;loading=true;
 try{
  const auth=await backend.auth.getUser();if(auth.error&&auth.error.name!=='AuthSessionMissingError')throw auth.error;
  const user=auth.data?.user;
  const rows=await allRows('fenie_products','*','sort_order');
  let profiles=[],addresses=[],orders=[],notes=[];
  if(user){
   profiles=await allRows('fenie_profiles');const me=profiles.find(c=>c.id===user.id);
   if(!me)throw new Error('Seu usuário ainda não possui cadastro neste portal. Entre em contato com a Fenié.');
   session={role:me.role,clientId:user.id};
   [addresses,orders]=await Promise.all([allRows('fenie_addresses'),allRows('fenie_orders','*','created_at')]);
   if(me.role==='admin')notes=await allRows('fenie_order_notes','*','order_id');
  }else session=null;
  if(version!==syncVersion)return;
  state.products=rows;state.clients=profiles.map(c=>({...c,addresses:addresses.filter(a=>a.user_id===c.id)}));
  state.orders=orders.reverse().map(o=>({...o,clientId:o.user_id,date:dateLabel(o.created_at),payment:payment(o.payment_method,o.installments),adminNote:notes.find(n=>n.order_id===o.id)?.note||'',events:o.events.map(e=>({...e,date:dateLabel(e.date),text:e.text.startsWith('Situação atualizada: ')?'Situação atualizada: '+(statusNames[e.text.slice(21)]||e.text.slice(21)):e.text}))}));
  readDraft();loading=false;lastSync=Date.now();
  if(recoveryMode&&user){go('/nova-senha');return;}
  if(redirect&&session){go(session.role==='admin'?'/admin':client().status==='approved'?'/cliente':'/cliente/aguardando');return;}
  render();
 }catch(e){if(version!==syncVersion)return;loading=false;session=null;state.clients=[];state.orders=[];root.innerHTML=publicHead()+'<main class="content"><section class="card empty"><h1>Não foi possível carregar o portal.</h1><p role="alert">'+C(friendly(e))+'</p><button class="btn primary" data-action="refresh">Tentar novamente</button></section></main>';throw e;}
}
function friendly(e){const text=e?.message||'Não foi possível concluir. Tente novamente.';
 if(/invalid login/i.test(text))return 'E-mail ou senha incorretos.';
 if(/email not confirmed/i.test(text))return 'Confirme seu e-mail antes de entrar.';
 if(/rate limit/i.test(text))return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
 if(/fetch|network/i.test(text))return 'Confira sua conexão e tente novamente.';
 return text;
}
async function signOut(){syncVersion++;checked(await backend.auth.signOut());session=null;state=makeState();await syncAccount();go('/entrar');}
function setBusy(form,busy){form.querySelectorAll('button[type="submit"],button:not([type])').forEach(b=>b.disabled=busy);}
function toast(text){clearTimeout(toastTimer);const el=document.querySelector('#toast');el.textContent=text;el.hidden=false;toastTimer=setTimeout(()=>el.hidden=true,3500);}
function route(){try{return decodeURIComponent(location.hash.slice(1)||'/entrar').split('?')[0];}catch{return '/invalido';}}
function go(path){if(route()===path)render();else location.hash=path;}
function logo(light=false){return '<img class="logo'+(light?' light':'')+'" src="'+seed.logo+'" alt="Fenié Professionnel">';}
function publicHead(){return '<header class="public-head"><a href="#/entrar" aria-label="Fenié — início">'+logo()+'</a><nav><a href="#/catalogo">Explorar produtos</a><a class="secondary-nav" href="https://catalogofenie.vercel.app/" target="_blank" rel="noopener noreferrer">Catálogo publicado ↗</a><a href="#/admin/entrar">Área administrativa ↗</a></nav></header>';}
function publicFoot(){return '<footer class="public-foot"><span>Fenié Professionnel · Produtos profissionais. Atendimento próximo.</span><span>Portal do salão · Fenié Professionnel</span></footer>';}
function input(name,label,value='',type='text',required=true){return '<div class="field"><label for="f-'+name+'">'+label+'</label><input id="f-'+name+'" name="'+name+'" type="'+type+'" value="'+C(value)+'" '+(required?'required':'')+' maxlength="100"></div>';}
function authScreen(mode){
 const admin=mode==='admin',register=mode==='cadastro',recover=mode==='recuperar',reset=mode==='nova-senha';
 const title=register?'Seu próximo capítulo.':reset?(inviteMode?'Ative seu acesso.':'Crie sua nova senha.'):recover?'Vamos recuperar seu acesso.':admin?'Tudo no seu lugar.':'Que bom ter você aqui.';
 const desc=register?'Cadastre seu salão e confirme seu e-mail para começar. Seu acesso é liberado automaticamente.':reset?'Escolha uma senha com pelo menos 10 caracteres.':recover?'Enviaremos as instruções para o e-mail cadastrado.':admin?'Gerencie produtos, dados, pedidos e destaques do catálogo. Acesso reservado à equipe autorizada.':'Entre para acompanhar seus pedidos e simplificar a reposição do salão.';
 const password='<div class="field"><label for="f-password">'+(reset?'Nova senha':'Senha')+'</label><input id="f-password" name="password" type="password" required minlength="'+(register||reset?'10':'1')+'" maxlength="100" autocomplete="'+(register||reset?'new-password':'current-password')+'"></div>';
 let fields=register?input('salon','Nome do salão')+'<div class="form-grid">'+input('name','Seu nome')+input('phone','WhatsApp','','tel')+'</div>':'';
 if(!reset)fields+=input('email','E-mail','','email');
 if(!recover)fields+=password;
 const kind=register?'register':recover?'recover':reset?'reset-password':'login';
 const label=register?'Solicitar cadastro':recover?'Enviar link de recuperação':reset?'Salvar nova senha':'Entrar';
 const body='<form data-form="'+kind+'" data-role="'+(admin?'admin':'client')+'">'+fields+'<p class="form-error" data-form-error role="alert" hidden></p><button class="btn primary full" type="submit">'+label+' '+icon('arrow')+'</button></form>'+
 (!register&&!recover&&!reset?'<p class="center-note"><a href="#/recuperar">Esqueci minha senha</a></p>':'')+
 (!admin&&!reset?'<p class="center-note">'+(register||recover?'<a href="#/entrar">← Voltar para entrar</a>':'Novo por aqui? <a href="#/cadastro"><strong>Cadastre seu salão</strong></a>')+'</p>':'');
 return publicHead()+'<main id="main" tabindex="-1" class="auth-layout"><section class="auth-story"><div><p class="eyebrow">'+(admin?'GESTÃO FENIÉ':'PORTAL DO SALÃO')+'</p><h1 style="margin:18px 0">Seu salão.<br>Mais perto<br><em>da Fenié.</em></h1><p>Uma experiência pensada para quem transforma cuidado em profissão.</p></div><div class="auth-still"><img src="'+C(state.products.find(p=>/oxidante-olenka/.test(p.id))?.image||state.products[0]?.image||seed.logo)+'" alt="Produtos profissionais Fenié"><img src="'+C(state.products.find(p=>p.id==='OLK-MSK-FNS-500')?.image||state.products[4]?.image||seed.logo)+'" alt="Seleção Fenié"></div><span class="auth-story-bottom">Escolher · Repor · Acompanhar</span></section><section class="auth-form"><nav class="role-tabs" aria-label="Tipo de acesso"><a href="#/entrar" class="'+(!admin?'active':'')+'">Sou cliente</a><a href="#/admin/entrar" class="'+(admin?'active':'')+'">Sou administrador</a></nav><h2>'+title+'</h2><p class="sub">'+desc+'</p>'+body+'</section></main>'+publicFoot();
}
function pendingScreen(){const c=client();return publicHead()+'<main id="main" tabindex="-1" style="max-width:620px;margin:50px auto;padding:0 20px"><section class="card empty"><p class="eyebrow">SUA CONTA</p><h1>'+C(c.salon)+'</h1>'+badge(c.status)+'<p>'+(c.status==='denied'?'Entre em contato com o atendimento para revisar seu acesso.':'Confirme o link enviado ao seu e-mail para entrar. O acesso é liberado automaticamente após a confirmação.')+'</p><button class="btn primary" data-action="refresh-access">Atualizar acesso</button><button class="btn ghost" data-action="logout">Sair da conta</button></section></main>'+publicFoot();}
const clientNav=[['/cliente','home','Minha área'],['/cliente/catalogo','box','Explorar catálogo'],['/cliente/pedidos','bag','Meus pedidos'],['/cliente/reposicao','star','Minha reposição'],['/cliente/enderecos','pin','Endereços'],['/cliente/perfil','user','Meu cadastro']],adminNav=[['/admin','home','Visão geral'],['/admin/pedidos','bag','Pedidos'],['/admin/clientes','users','Clientes'],['/admin/catalogo','box','Catálogo'],['/admin/destaques','star','Destaques']];
function isActive(path,target){return path===target||target.split('/').length>2&&path.startsWith(target+'/');}
function shell(content,admin=false){
 const path=route(),nav=admin?adminNav:clientNav,c=client(),person=admin?'Equipe Fenié':c?.name||'Cliente',salon=admin?'Administrador':c?.salon||'',active=nav.find(([url])=>isActive(path,url));
 const links=nav.map(([url,n,label])=>'<a href="#'+url+'" class="'+(isActive(path,url)?'active':'')+'" '+(isActive(path,url)?'aria-current="page"':'')+'>'+icon(n)+'<span>'+label+'</span></a>').join(''),mobile=admin?nav:[clientNav[0],clientNav[1],clientNav[2],clientNav[3],clientNav[5]];
 return '<div class="app-shell"><aside class="sidebar"><a class="side-brand" href="#'+(admin?'/admin':'/cliente')+'">'+logo(true)+'<span class="side-caption">'+(admin?'Gestão do catálogo':'Portal do salão')+'</span></a><nav class="side-nav" aria-label="Navegação '+(admin?'administrativa':'do cliente')+'">'+links+'</nav><div class="side-tail"><div class="profile-chip"><span class="avatar">'+initials(person)+'</span><div><strong>'+C(person)+'</strong><small>'+C(salon)+'</small></div></div><a href="https://catalogofenie.vercel.app/" target="_blank" rel="noopener noreferrer">Catálogo publicado ↗</a><button data-action="logout">Sair da conta ↗</button></div></aside><div class="workspace"><header class="app-head"><img class="mobile-brand" src="'+seed.logo+'" alt="Fenié"><span class="crumb">'+(admin?'Gestão Fenié':'Portal do salão')+' &nbsp; / &nbsp; <strong>'+C(active?.[2]||'Pedido')+'</strong></span><div class="row"><div class="account-info">'+C(salon)+'<small>'+C(person)+'</small></div>'+(admin?'<button class="btn small" data-action="logout">Sair da conta</button>':'<a class="btn small" href="#/cliente/carrinho">'+icon('bag')+'Pedido · '+cartCount()+'</a>')+'</div></header><main id="main" tabindex="-1" class="content">'+content+'</main></div><nav class="mobile-nav" aria-label="Navegação principal">'+mobile.map(([url,n,label])=>'<a href="#'+url+'" class="'+(isActive(path,url)?'active':'')+'" '+(isActive(path,url)?'aria-current="page"':'')+'>'+icon(n)+'<span>'+C({'Explorar catálogo':'Catálogo','Minha área':'Início','Meus pedidos':'Pedidos','Minha reposição':'Reposição','Meu cadastro':'Cadastro','Visão geral':'Início'}[label]||label)+'</span></a>').join('')+'</nav></div>';
}
function heading(k,title,sub,actions=''){return '<div class="page-title"><div><p class="eyebrow">'+k+'</p><h1>'+title+'</h1>'+(sub?'<p class="sub">'+sub+'</p>':'')+'</div>'+actions+'</div>';}
function orderTotal(o){return o.items.reduce((n,i)=>n+i.price*i.quantity,0);}
function orderRows(orders,admin=false){return orders.length?orders.map(o=>{const c=state.clients.find(c=>c.id===o.clientId);return '<div class="order-row"><div><strong>'+C(o.id)+'</strong><small>'+C(admin?c?.salon:o.date)+' · '+o.items.reduce((n,i)=>n+i.quantity,0)+' unidades</small></div><strong class="row-amount">'+money(orderTotal(o))+'</strong>'+badge(o.status)+'<a class="btn small" href="#/'+(admin?'admin':'cliente')+'/pedidos/'+o.id+'">Ver pedido ↗</a></div>';}).join(''):'<div class="empty"><h2>Ainda não há pedidos.</h2><p>Seu histórico aparecerá depois da primeira solicitação.</p></div>';}
function productCard(p){
 const selected=cartSelections[p.id]||'',v=p.variants.find(v=>v.id===selected),min=Math.min(...p.variants.map(v=>v.price)),saved=state.saved.includes(p.id);
 return '<article class="product" data-product="'+C(p.id)+'"><button class="save-btn '+(saved?'saved':'')+'" data-action="save-product" data-id="'+C(p.id)+'" aria-label="'+(saved?'Remover da':'Adicionar à')+' lista de reposição: '+C(p.name)+'" aria-pressed="'+saved+'">'+(saved?'★':'☆')+'</button><div class="photo"><img src="'+p.image+'" alt="'+C(p.name)+'" loading="lazy"></div><div class="product-info"><p class="eyebrow">'+C(p.brand)+'</p><h3>'+C(p.name)+'</h3><div class="product-meta">'+C(p.size)+' · '+(p.variants.length>1?p.variants.length+' opções da linha':'Unidade de venda')+'</div><div class="price">'+(p.variants.length>1&&!v?'<small>A partir de</small>':'')+money(v?.price||min)+'</div>'+(p.variants.length>1?'<label class="field-label" for="variant-'+C(p.id)+'" style="font-size:10px;margin-bottom:6px">Opção</label><select id="variant-'+C(p.id)+'" data-variant="'+C(p.id)+'"><option value="">Escolher opção</option>'+p.variants.map(v=>'<option value="'+C(v.id)+'" '+(selected===v.id?'selected':'')+'>'+C(v.label)+' · '+money(v.price)+'</option>').join('')+'</select>':'')+'<button class="btn primary" data-action="add-product" data-id="'+C(p.id)+'" '+(!p.active?'disabled':'')+'>'+(p.active?'Adicionar ao pedido +':'Indisponível')+'</button></div></article>';
}
function customerHome(){
 const c=client(),orders=state.orders.filter(o=>o.clientId===c.id),pending=orders.filter(o=>!['delivered','cancelled'].includes(o.status)).length;
 return heading('BEM-VINDA À FENIÉ','Olá, '+C(c.name.split(' ')[0])+'.','Seu salão, suas escolhas e seus pedidos em um só lugar.')+'<section class="hero-panel"><div><p class="eyebrow">SEU PRÓXIMO CUIDADO</p><h2>Reposição sem<br><em>perder o ritmo.</em></h2><p>Escolha o que faz sentido para a sua rotina. A Fenié cuida dos próximos passos com você.</p><a class="btn primary" href="#/cliente/catalogo">Montar um novo pedido '+icon('arrow')+'</a></div><div class="hero-photo"><img src="'+C(state.products.find(p=>p.id==='OLK-MSK-FNS-500')?.image||seed.logo)+'" alt="Máscara Royal Finish Olenka"></div></section><div class="stats"><div class="stat"><label>Pedidos em andamento</label><span class="value">'+pending+'</span><small>Solicitações registradas</small></div><div class="stat"><label>Seu histórico</label><span class="value">'+orders.length+'</span><small>Pedidos registrados</small></div><div class="stat"><label>Minha reposição</label><span class="value">'+state.saved.length+'</span><small>Produtos salvos</small></div><div class="stat"><label>Seu cadastro</label><span class="value" style="font-size:25px">Ativo</span><small>'+C(c.salon)+'</small></div></div><div class="section-title"><h2>Seus últimos pedidos</h2><a href="#/cliente/pedidos">Ver todos ↗</a></div><section class="card">'+orderRows(orders.slice(0,3))+'</section><div class="section-title"><h2>Para a rotina do salão.</h2><a href="#/cliente/catalogo">Explorar catálogo ↗</a></div><div class="catalog-grid">'+state.products.filter(p=>p.active&&p.featured).slice(0,3).map(productCard).join('')+'</div>';
}
function normalize(s){return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function catalogPage(savedOnly=false,publicView=false){
 const products=state.products.filter(p=>p.active&&(!savedOnly||state.saved.includes(p.id))&&(!filters.brand||p.brand===filters.brand)&&(!filters.q||normalize([p.name,p.brand,p.id,...p.variants.map(v=>v.sku)].join(' ')).includes(normalize(filters.q))));
 return heading(savedOnly?'MINHA REPOSIÇÃO':'SELEÇÃO PROFISSIONAL',savedOnly?'Os seus essenciais.':'Escolhas para o seu salão.','Consulte as opções e os preços atuais. Disponibilidade, frete e condições serão confirmados pela equipe.',publicView?'<a class="btn primary" href="#/entrar">Entrar →</a>':'<a class="btn primary" href="#/cliente/carrinho">Ver pedido · '+cartCount()+'</a>')+'<form class="filterbar" data-form="catalog-search"><div class="search-wrap">'+icon('search')+'<input class="search-input" type="search" name="q" value="'+C(filters.q)+'" placeholder="Buscar produto, marca ou código" aria-label="Buscar produto, marca ou código"></div><select class="filter-select" name="brand" aria-label="Filtrar por marca"><option value="">Todas as marcas</option>'+[...new Set(state.products.map(p=>p.brand))].map(b=>'<option '+(filters.brand===b?'selected':'')+'>'+C(b)+'</option>').join('')+'</select><button class="btn">Buscar</button><button class="btn ghost" type="button" data-action="clear-filters">Limpar</button></form>'+(products.length?'<div class="catalog-grid">'+products.slice(((filters.page||1)-1)*24,(filters.page||1)*24).map(productCard).join('')+'</div><div class="actions" style="margin-top:24px"><span>'+products.length+' produtos · página '+(filters.page||1)+' de '+Math.max(1,Math.ceil(products.length/24))+'</span>'+((filters.page||1)>1?'<button class="btn" data-action="catalog-page" data-page="'+((filters.page||1)-1)+'">← Anterior</button>':'')+((filters.page||1)*24<products.length?'<button class="btn" data-action="catalog-page" data-page="'+((filters.page||1)+1)+'">Próxima →</button>':'')+'</div>':'<section class="card empty"><h2>Nenhum produto por aqui.</h2><p>'+(savedOnly?'Toque na estrela de um produto no catálogo para salvar sua reposição.':'Tente outra marca, nome ou código.')+'</p><a class="btn" href="#/cliente/catalogo">Explorar catálogo →</a></section>');
}
function itemSnapshot(id,quantity){const m=variant(id);return m?{productId:m.p.id,variantId:id,name:m.p.name,brand:m.p.brand,volume:m.v.label,size:m.p.size,sku:m.v.sku,price:m.v.price,quantity}:null;}
function cartItems(){return Object.entries(state.cart).map(([id,q])=>itemSnapshot(id,q)).filter(Boolean);}
function cartCount(){return Object.values(state.cart).reduce((n,q)=>n+q,0);}
function cartTotal(){return cartItems().reduce((n,i)=>n+i.price*i.quantity,0);}
function cartPage(){
 const items=cartItems();if(!items.length)return heading('SEU PEDIDO','Tudo começa com uma escolha.','Adicione os produtos da rotina do salão.')+'<section class="card empty">'+icon('bag')+'<h2>Seu pedido está vazio.</h2><a class="btn primary" href="#/cliente/catalogo">Explorar catálogo →</a></section>';
 return heading('SEU SALÃO, SEU PEDIDO','Minha seleção.',cartCount()+' unidades · confira produtos e opções.','<a class="btn ghost" href="#/cliente/catalogo">Continuar escolhendo ↗</a>')+'<div class="checkout-grid"><section class="card">'+items.map(i=>'<article class="cart-product"><img src="'+product(i.productId).image+'" alt="'+C(i.name)+'"><div><h3>'+C(i.name)+'</h3><p class="meta">'+C(i.volume)+' · '+C(i.sku)+'</p><div class="stepper"><button data-action="quantity" data-id="'+C(i.variantId)+'" data-delta="-1" aria-label="Diminuir '+C(i.name)+'">−</button><span>'+i.quantity+'</span><button data-action="quantity" data-id="'+C(i.variantId)+'" data-delta="1" aria-label="Aumentar '+C(i.name)+'">+</button></div></div><div class="cart-right"><strong>'+money(i.price*i.quantity)+'</strong><button data-action="remove-item" data-id="'+C(i.variantId)+'">Remover</button></div></article>').join('')+'</section><aside class="card checkout-summary"><p class="eyebrow">RESUMO</p><div class="summary-line"><span>Produtos</span><span>'+cartCount()+' unidades</span></div><div class="summary-line"><span>Frete</span><span>A confirmar</span></div><div class="summary-line total"><span>Total</span><span>'+money(cartTotal())+'</span></div><a class="btn primary full" href="#/cliente/finalizar">Revisar pedido →</a><p class="metric-note">Disponibilidade e condições confirmadas pelo atendimento.</p></aside></div>';
}
function addressText(a){return C(a.street)+(a.complement?' · '+C(a.complement):'')+'<br>'+C(a.district)+' · '+C(a.city)+'/'+C(a.uf)+'<br>CEP '+C(a.cep);}
function checkoutPage(){
 const c=client();if(!cartItems().length){go('/cliente/carrinho');return '';}
 if(!c.addresses.some(a=>a.id===state.checkout.addressId))state.checkout.addressId=c.addresses[0]?.id||'';
 const methods=[['pix','Pix'],['credito','Cartão de crédito'],['debito','Cartão de débito'],['boleto-avista','Boleto à vista'],['boleto-parcelado','Boleto parcelado · até 6x'],['combinar','Definir com atendimento']];
 return heading('ÚLTIMA CONFERÊNCIA','Só mais alguns detalhes.','Confira a entrega e indique como prefere pagar. O pagamento será combinado com o atendimento.','<a class="btn ghost" href="#/cliente/carrinho">← Editar seleção</a>')+'<form data-form="checkout"><div class="checkout-grid"><div class="stack"><section class="card"><div class="row between"><h2 style="font-size:25px">Onde vamos entregar?</h2><button class="text-btn" type="button" data-action="address-open">+ Novo endereço</button></div><div class="stack" style="margin-top:20px">'+(c.addresses.length?c.addresses.map(a=>'<label class="select-card"><input type="radio" name="address" value="'+C(a.id)+'" '+(state.checkout.addressId===a.id?'checked':'')+' required><span><strong>'+C(a.label)+'</strong><small>'+addressText(a)+'</small></span></label>').join(''):'<p class="muted">Adicione um endereço de entrega para continuar.</p>')+'</div></section><section class="card"><h2 style="font-size:25px">Forma de pagamento</h2><p class="sub" style="font-size:12px">Sua preferência acompanha a solicitação enviada à equipe.</p><div class="payment-grid">'+methods.map(([v,l])=>'<label class="select-card"><input type="radio" name="payment" value="'+v+'" '+(state.checkout.method===v?'checked':'')+'><span>'+l+'</span></label>').join('')+'</div><div class="field" id="installmentsField" '+(state.checkout.method==='boleto-parcelado'?'':'hidden')+'><label for="installments">Número de parcelas do boleto</label><select name="installments" id="installments">'+[2,3,4,5,6].map(n=>'<option value="'+n+'" '+(String(n)===state.checkout.installments?'selected':'')+'>'+n+' parcelas</option>').join('')+'</select></div></section><section class="card"><div class="field" style="margin:0"><label for="orderNotes">Observações <small>(opcional)</small></label><textarea id="orderNotes" name="notes" maxlength="500" placeholder="Ex.: melhor período para receber">'+C(state.checkout.notes)+'</textarea></div></section></div><aside class="card checkout-summary"><p class="eyebrow">SUA SOLICITAÇÃO</p>'+cartItems().map(i=>'<div class="summary-line"><span>'+i.quantity+' × '+C(i.name)+'<small style="display:block">'+C(i.volume)+'</small></span><span>'+money(i.price*i.quantity)+'</span></div>').join('')+'<div class="summary-line total"><span>Total dos produtos</span><span>'+money(cartTotal())+'</span></div><p class="note" style="margin:18px 0">Ao registrar, sua solicitação será salva no portal. Depois você poderá enviá-la ao atendimento pelo WhatsApp.</p><p class="form-error" data-form-error role="alert" hidden></p><button class="btn primary full">Registrar solicitação →</button></aside></div></form>';
}
function orderFilters(){return '<div class="filterbar"><select class="filter-select" data-status-filter aria-label="Filtrar pedidos por situação"><option value="">Todas as situações</option>'+Object.entries(statusNames).map(([v,l])=>'<option value="'+v+'" '+(filters.status===v?'selected':'')+'>'+l+'</option>').join('')+'</select></div>';}
function customerOrders(){return heading('HISTÓRICO DO SALÃO','Meus pedidos.','Acompanhe cada etapa e monte a próxima reposição.','<a class="btn primary" href="#/cliente/catalogo">Novo pedido +</a>')+orderFilters()+'<section class="card">'+orderRows(state.orders.filter(o=>o.clientId===client().id&&(!filters.status||o.status===filters.status)))+'</section>';}
function messageFor(o){const c=state.clients.find(c=>c.id===o.clientId);return ['Olá! Registrei uma solicitação no Portal Fenié.','','Pedido: '+o.id,'Salão: '+c.salon,'Contato: '+c.name,'',...o.items.flatMap(i=>[i.quantity+' × '+i.name+' · '+i.volume,'SKU: '+i.sku+' · Unitário: '+money(i.price),'Subtotal: '+money(i.price*i.quantity),'']),'Total dos produtos: '+money(orderTotal(o)),'Forma de pagamento: '+o.payment,'','Entrega: '+o.address.street+' · '+o.address.city+'/'+o.address.uf,...(o.notes?['Observações: '+o.notes]:[]),'','Gostaria de confirmar disponibilidade, frete e condições comerciais.'].join('\n');}
function orderDetail(id,admin=false){
 const o=state.orders.find(o=>o.id===id&&(admin||o.clientId===client().id));if(!o)return notFound();
 const c=state.clients.find(c=>c.id===o.clientId),success=newOrderId===o.id&&!admin?'<section class="success-head"><p class="eyebrow">SOLICITAÇÃO REGISTRADA</p><h2>Seu pedido já tem um número.</h2><p>Sua solicitação foi salva. Confira a mensagem para enviar ao atendimento e acompanhe as atualizações pelo portal.</p></section>':'';
 return '<a class="text-btn" href="#/'+(admin?'admin':'cliente')+'/pedidos">← '+(admin?'Todos os pedidos':'Meus pedidos')+'</a>'+heading('PEDIDO DO SALÃO',C(o.id),C(c.salon)+' · '+o.date,badge(o.status))+success+'<div class="checkout-grid"><div class="stack"><section class="card"><h2 style="font-size:25px">Produtos escolhidos</h2>'+o.items.map(i=>'<div class="order-row" style="grid-template-columns:1fr auto"><div><strong>'+i.quantity+' × '+C(i.name)+'</strong><small>'+C(i.volume)+' · '+C(i.sku)+' · '+money(i.price)+' / un.</small></div><strong>'+money(i.price*i.quantity)+'</strong></div>').join('')+'<div class="summary-line total"><span>Total dos produtos</span><span>'+money(orderTotal(o))+'</span></div></section><section class="card"><h2 style="font-size:25px">Acompanhe o pedido</h2><div class="timeline">'+o.events.map(e=>'<div class="timeline-row"><strong>'+C(e.text)+'</strong><small>'+C(e.date)+'</small></div>').join('')+'</div></section>'+(admin?'<section class="card"><h2 style="font-size:25px">Atualizar atendimento</h2><form data-form="order-status" data-id="'+o.id+'" style="margin-top:20px"><div class="field"><label for="statusUpdate">Situação do pedido</label><select id="statusUpdate" name="status">'+Object.entries(statusNames).map(([v,l])=>'<option value="'+v+'" '+(o.status===v?'selected':'')+'>'+l+'</option>').join('')+'</select></div><div class="field"><label for="internalNote">Anotação interna</label><textarea name="note" id="internalNote" maxlength="500" placeholder="Visível apenas para a equipe">'+C(o.adminNote)+'</textarea></div><button class="btn primary">Salvar atualização →</button></form></section>':'')+'</div><aside class="card checkout-summary"><p class="eyebrow">DETALHES DA SOLICITAÇÃO</p><dl class="detail-list"><div><dt>Salão</dt><dd>'+C(c.salon)+'</dd></div><div><dt>Forma de pagamento</dt><dd>'+C(o.payment)+'</dd></div><div><dt>Endereço de entrega</dt><dd>'+addressText(o.address)+'</dd></div><div><dt>Observações do cliente</dt><dd>'+C(o.notes||'Nenhuma observação.')+'</dd></div></dl><div class="rule"></div><div class="stack">'+(!admin?'<button class="btn primary" data-action="message-open" data-id="'+o.id+'">Ver mensagem do WhatsApp ↗</button><button class="btn" data-action="reorder" data-id="'+o.id+'">Comprar novamente +</button>':'<button class="btn" data-action="message-open" data-id="'+o.id+'">Conferir mensagem do pedido</button>')+'</div><p class="metric-note">A abertura da mensagem não confirma recebimento nem pagamento.</p></aside></div>';
}
function customerAddresses(){const c=client();return heading('DADOS DE ENTREGA','Onde o cuidado chega.','Mantenha os endereços do seu salão organizados.','<button class="btn primary" data-action="address-open">Novo endereço +</button>')+'<div class="address-grid">'+c.addresses.map(a=>'<section class="card address-card"><div class="row between"><h3>'+C(a.label)+'</h3>'+icon('pin')+'</div><p>'+addressText(a)+'</p><button class="text-btn" data-action="address-open" data-id="'+a.id+'">Editar endereço ↗</button></section>').join('')+'</div>'+(c.addresses.length?'':'<section class="card empty"><h2>Seu primeiro endereço.</h2><p>Adicione um local de entrega para testar o fechamento do pedido.</p></section>');}
function profilePage(){const c=client();return heading('MEU CADASTRO','Tudo sobre o seu salão.','Atualize os dados do cadastro e mantenha o atendimento próximo.')+'<section class="card" style="max-width:820px"><div class="row between"><div class="row"><span class="avatar">'+initials(c.name)+'</span><div><h3>'+C(c.salon)+'</h3><small>Cliente Fenié</small></div></div>'+badge(c.status)+'</div><div class="rule"></div><form data-form="profile"><div class="form-grid">'+input('salon','Nome do salão',c.salon)+input('name','Seu nome',c.name)+'<div class="field"><label>E-mail de acesso</label><input value="'+C(c.email)+'" type="email" readonly><small>Para alterar seu e-mail, fale com a equipe.</small></div>'+input('phone','WhatsApp',c.phone,'tel')+'</div><p class="form-error" data-form-error role="alert" hidden></p><div class="actions"><button class="btn primary">Salvar dados →</button><a class="btn" href="#/cliente/enderecos">Meus endereços</a><button class="text-btn" type="button" data-action="logout">Sair da conta</button></div></form><p class="metric-note">Seu cadastro é salvo com segurança no portal.</p></section>';}

function adminHome(){
 const waiting=state.orders.filter(o=>o.status==='waiting'),salons=state.clients.filter(c=>c.role==='client'),total=state.orders.filter(o=>o.status!=='cancelled').reduce((sum,o)=>sum+orderTotal(o),0);
 return heading('GESTÃO FENIÉ','Seu catálogo, bem cuidado.','Produtos, dados e atendimento em um só painel.','<a class="btn primary" href="#/admin/catalogo">Gerenciar produtos ↗</a>')+'<div class="stats"><div class="stat"><label>Novas solicitações</label><span class="value">'+waiting.length+'</span><small>Aguardando atendimento</small></div><div class="stat"><label>Valor solicitado</label><span class="value" style="font-size:28px">'+money(total)+'</span><small>Solicitações · não é faturamento</small></div><div class="stat"><label>Salões cadastrados</label><span class="value">'+salons.length+'</span><small>Acesso automático após confirmar o e-mail</small></div><div class="stat"><label>Produtos publicados</label><span class="value">'+state.products.filter(p=>p.active).length+'</span><small>Catálogo do portal</small></div></div><div class="split"><section class="card"><div class="row between"><h2 style="font-size:27px">Últimos pedidos</h2><a class="text-btn" href="#/admin/pedidos">Ver todos ↗</a></div>'+orderRows(state.orders.slice(0,5),true)+'</section><section class="card"><p class="eyebrow">CONTROLE DO CATÁLOGO</p><h2 style="margin-top:10px">O que vamos cuidar hoje?</h2><div class="attention"><p><strong>Produtos e preços</strong><br><span class="muted">Atualize valores, opções e disponibilidade.</span></p><a href="#/admin/catalogo" class="text-btn">Editar catálogo ↗</a></div><div class="attention"><p><strong>Vitrine e destaques</strong><br><span class="muted">Escolha o que aparece primeiro para os salões.</span></p><a href="#/admin/destaques" class="text-btn">Organizar destaques ↗</a></div><div class="attention"><p><strong>'+waiting.length+' solicitações aguardando atendimento</strong></p><a class="text-btn" href="#/admin/pedidos">Abrir pedidos ↗</a></div></section></div><div class="section-title"><h2>Como estão os pedidos?</h2><small>Dados registrados no portal</small></div><section class="card"><div class="mini-bars">'+Object.entries(statusNames).filter(([s])=>state.orders.some(o=>o.status===s)).map(([s,label])=>{const n=state.orders.filter(o=>o.status===s).length;return '<div><div class="bar-head"><span>'+label+'</span><strong>'+n+' pedido'+(n>1?'s':'')+'</strong></div><div class="bar-track"><div class="bar-fill" style="width:'+n/Math.max(1,state.orders.length)*100+'%"></div></div></div>';}).join('')+'</div></section>';
}
function adminOrders(){return heading('ATENDIMENTO','Cada pedido, de perto.','Confira produtos, pagamento, endereço e situação da solicitação.')+orderFilters()+'<section class="card">'+orderRows(state.orders.filter(o=>!filters.status||o.status===filters.status),true)+'</section>';}
function adminClients(){
 const clients=state.clients.filter(c=>c.role==='client').filter(c=>normalize(c.salon+' '+c.name+' '+c.email).includes(normalize(filters.clientQ)));
 return heading('RELACIONAMENTO','Os salões da Fenié.','Consulte os dados e acompanhe o histórico de cada cliente.')+'<form data-form="client-search" class="filterbar"><div class="search-wrap">'+icon('search')+'<input class="search-input" name="q" value="'+C(filters.clientQ)+'" placeholder="Buscar salão, contato ou e-mail" aria-label="Buscar salão, contato ou e-mail"></div><button class="btn">Buscar</button><button class="btn ghost" type="button" data-action="clear-client-search">Limpar</button></form><section class="card table-wrap"><table class="table"><thead><tr><th>Salão / contato</th><th>E-mail</th><th>Situação</th><th>Atendimento</th></tr></thead><tbody>'+clients.map(c=>'<tr><td><strong>'+C(c.salon)+'</strong><small>'+C(c.name)+' · '+C(c.phone)+'</small></td><td>'+C(c.email)+'</td><td>'+badge(c.status)+'</td><td><div class="actions">'+'<button class="btn small" data-action="client-open" data-id="'+c.id+'">Ver cadastro ↗</button></div></td></tr>').join('')+'</tbody></table>'+(clients.length?'':'<p class="muted" style="padding:20px 0">Nenhum cadastro encontrado.</p>')+'</section>';
}
function priceRange(p){const prices=p.variants.map(v=>v.price),min=Math.min(...prices),max=Math.max(...prices);return money(min)+(min!==max?' — '+money(max):'');}
function adminCatalog(){
 return heading('CATÁLOGO PROFISSIONAL','Uma seleção bem cuidada.','Gerencie preços por opção e a publicação dos produtos neste portal.')+'<section class="card table-wrap"><table class="table"><thead><tr><th>Produto</th><th>Opções</th><th>Preço de referência</th><th>Visibilidade</th><th></th></tr></thead><tbody>'+state.products.map(p=>'<tr><td><div class="row"><img class="table-photo" src="'+p.image+'" alt=""><div><strong>'+C(p.name)+'</strong><small>'+C(p.brand)+' · '+C(p.size)+'</small></div></div></td><td>'+p.variants.length+'</td><td>'+priceRange(p)+'</td><td><button class="btn small" data-action="toggle-product" data-id="'+C(p.id)+'" aria-label="'+(p.active?'Ocultar':'Publicar')+' '+C(p.name)+'">'+(p.active?'Publicado':'Oculto')+'</button></td><td><button class="btn small" data-action="product-open" data-id="'+C(p.id)+'">Editar ↗</button></td></tr>').join('')+'</tbody></table></section>';
}
function adminHighlights(){
 const featured=state.products.filter(p=>p.featured&&p.active);
 return heading('CURADORIA DO CATÁLOGO','Destaques com intenção.','Escolha os produtos da vitrine inicial do cliente. Esta seleção define a vitrine inicial do portal.')+'<div class="split"><section class="card"><h2 style="font-size:26px">Vitrine do salão</h2><p class="sub" style="font-size:12px">Os três primeiros produtos ativos selecionados aparecem na área do cliente.</p>'+state.products.map(p=>'<div class="switch-row"><label for="feature-'+C(p.id)+'"><strong>'+C(p.name)+'</strong><small style="display:block">'+C(p.brand)+(p.active?'':' · Oculto no catálogo')+'</small></label><input id="feature-'+C(p.id)+'" type="checkbox" data-feature="'+C(p.id)+'" '+(p.featured?'checked':'')+' aria-label="Destacar '+C(p.name)+'"></div>').join('')+'</section><section class="card"><p class="eyebrow">PRÉVIA DA SELEÇÃO</p><h2 style="margin:10px 0 16px">Para a rotina do salão.</h2>'+featured.slice(0,3).map(p=>'<div class="row" style="padding:16px 0;border-bottom:1px solid var(--line)"><img class="table-photo" src="'+p.image+'" alt=""><div><h3>'+C(p.name)+'</h3><small>'+priceRange(p)+'</small></div></div>').join('')+(featured.length?'':'<p class="muted">Selecione ao menos um produto para preencher a vitrine.</p>')+'<p class="metric-note">'+featured.length+' produtos ativos selecionados.</p><button class="btn ghost" style="margin-top:18px" data-action="logout">Testar como cliente ↗</button></section></div>';
}
function notFound(){return '<section class="card empty"><p class="eyebrow">ESTE CAMINHO NÃO EXISTE</p><h1>Vamos encontrar sua próxima tela.</h1><a class="btn primary" href="#/entrar">Voltar ao início →</a></section>';}
function showModal(title,body){modal.innerHTML='<div class="modal-head"><h2 id="modalTitle">'+C(title)+'</h2><button class="close" data-action="modal-close" aria-label="Fechar">×</button></div>'+body;modal.showModal();}
function addressModal(id){
 const a=client().addresses.find(a=>a.id===id)||{label:'',street:'',district:'',city:'Curitiba',uf:'PR',cep:'',complement:''};
 showModal(id?'Editar endereço':'Novo endereço de entrega','<form data-form="address" data-id="'+C(id||'')+'">'+input('label','Nome do endereço',a.label)+input('street','Rua, número',a.street)+input('complement','Complemento',a.complement,'text',false)+'<div class="form-grid">'+input('district','Bairro',a.district)+input('city','Cidade',a.city)+input('uf','UF',a.uf)+input('cep','CEP',a.cep)+'</div><p class="form-error" data-form-error role="alert" hidden></p><button class="btn primary full">Salvar endereço →</button></form>');
}
function clientModal(id){
 const c=state.clients.find(c=>c.id===id);if(!c)return;
 const orders=state.orders.filter(o=>o.clientId===id);
 showModal(c.salon,'<p class="eyebrow">CADASTRO DO SALÃO</p><dl class="detail-list"><div><dt>Contato</dt><dd>'+C(c.name)+'</dd></div><div><dt>E-mail</dt><dd>'+C(c.email)+'</dd></div><div><dt>WhatsApp</dt><dd>'+C(c.phone)+'</dd></div><div><dt>Histórico</dt><dd>'+orders.length+' pedido'+(orders.length!==1?'s':'')+' · '+money(orders.reduce((sum,o)=>sum+orderTotal(o),0))+'</dd></div></dl>'+(orders.length?'<div class="rule"></div><h3>Pedidos deste salão</h3>'+orders.map(o=>'<div class="attention"><a class="text-btn" href="#/admin/pedidos/'+o.id+'">'+o.id+' ↗</a> '+badge(o.status)+'</div>').join(''):''));
}
function productModal(id){
 const p=product(id);if(!p)return;const v=p.variants[0];
 showModal('Editar produto','<div class="row" style="margin-bottom:22px"><img class="table-photo" src="'+p.image+'" alt=""><div><h3>'+C(p.name)+'</h3><small>'+C(p.brand)+'</small></div></div><form data-form="product" data-id="'+C(id)+'">'+input('name','Nome do produto',p.name)+'<div class="field"><label for="editVariant">Opção comercial</label><select id="editVariant" name="variant" data-edit-variant="'+C(id)+'">'+p.variants.map(v=>'<option value="'+C(v.id)+'">'+C(v.label)+' · '+C(v.sku)+'</option>').join('')+'</select></div><div class="field"><label for="editPrice">Preço desta opção (R$)</label><input id="editPrice" name="price" type="number" min="0.01" max="1000000" step="0.01" value="'+(v.price/100).toFixed(2)+'" required></div><label class="checkbox-line"><input type="checkbox" name="active" '+(p.active?'checked':'')+'>Publicado no catálogo</label><p class="note">A imagem e os códigos foram reaproveitados da base. A edição atualiza o catálogo do portal.</p><p class="form-error" data-form-error role="alert" hidden></p><button class="btn primary full" style="margin-top:18px">Salvar produto →</button></form>');
}
function error(form,text){const el=form.querySelector('[data-form-error]');if(el){el.textContent=text;el.hidden=false;}else toast(text);}
function render(){
 if(emailLink){emailLinkScreen();return;}
 const path=route();if(loading)return;if(modal.open)modal.close();
 if(path.startsWith('/admin')&&path!=='/admin/entrar'&&session?.role!=='admin'){go('/admin/entrar');return;}
 if(path.startsWith('/cliente')&&session?.role!=='client'){go('/entrar');return;}
 if(path.startsWith('/cliente')&&client()?.status!=='approved'&&path!=='/cliente/aguardando'){go('/cliente/aguardando');return;}
 let html;
 if(['/entrar','/admin/entrar','/cadastro','/recuperar','/nova-senha'].includes(path))html=authScreen(path==='/admin/entrar'?'admin':path.slice(1));
 else if(path==='/catalogo')html=publicHead()+'<main id="main" tabindex="-1" class="content public-catalog">'+catalogPage(false,true)+'</main>'+publicFoot();
 else if(path==='/cliente/aguardando'){if(client().status==='approved'){go('/cliente');return;}html=pendingScreen();}
 else if(path==='/cliente')html=shell(customerHome());
 else if(path==='/cliente/catalogo')html=shell(catalogPage());
 else if(path==='/cliente/reposicao')html=shell(catalogPage(true));
 else if(path==='/cliente/carrinho')html=shell(cartPage());
 else if(path==='/cliente/finalizar'){if(!cartItems().length){go('/cliente/carrinho');return;}html=shell(checkoutPage());}
 else if(path==='/cliente/pedidos')html=shell(customerOrders());
 else if(path.startsWith('/cliente/pedidos/'))html=shell(orderDetail(path.split('/')[3]));
 else if(path==='/cliente/enderecos')html=shell(customerAddresses());
 else if(path==='/cliente/perfil')html=shell(profilePage());
 else if(path==='/admin')html=shell(adminHome(),true);
 else if(path==='/admin/pedidos')html=shell(adminOrders(),true);
 else if(path.startsWith('/admin/pedidos/'))html=shell(orderDetail(path.split('/')[3],true),true);
 else if(path==='/admin/clientes')html=shell(adminClients(),true);
 else if(path==='/admin/catalogo')html=shell(adminCatalog(),true);
 else if(path==='/admin/destaques')html=shell(adminHighlights(),true);
 else html=publicHead()+'<main id="main" tabindex="-1" class="content">'+notFound()+'</main>'+publicFoot();
 root.innerHTML=html;document.title=(path.startsWith('/admin')?'Gestão Fenié':path.startsWith('/cliente')?'Portal do salão':'Fenié · Entre no portal')+' · Fenié';
}
function saveCheckout(form){const data=new FormData(form);state.checkout={addressId:String(data.get('address')||''),method:String(data.get('payment')||'combinar'),installments:String(data.get('installments')||'2'),notes:String(data.get('notes')||'').slice(0,500)};}
document.addEventListener('submit',async event=>{
 const form=event.target.closest('[data-form]');if(!form)return;event.preventDefault();if(form.dataset.busy)return;
 const kind=form.dataset.form,data=new FormData(form),get=n=>String(data.get(n)||'').trim();
 form.dataset.busy='1';setBusy(form,true);
 try{
 if(kind==='verify-email'){
  if(!emailLink||!['email','recovery','invite'].includes(emailLink.type)||!/^[a-zA-Z0-9_-]{20,256}$/.test(emailLink.token||''))throw new Error('Link inválido. Solicite um novo e-mail.');
  const link=emailLink;
  try{checked(await backend.auth.verifyOtp({token_hash:link.token,type:link.type}));}
  catch(e){emailLinkScreen('Este link expirou ou já foi utilizado.');return;}
  emailLink=null;inviteMode=link.type==='invite';recoveryMode=['recovery','invite'].includes(link.type);await syncAccount(true);return;
 }
 if(kind==='login'){
  checked(await backend.auth.signInWithPassword({email:get('email'),password:String(data.get('password')||'')}));await syncAccount();
  if(form.dataset.role!==session?.role)throw new Error('Sua conta não tem acesso a esta área. Use a área correspondente ao seu perfil.');
  go(session.role==='admin'?'/admin':client().status==='approved'?'/cliente':'/cliente/aguardando');return;
 }
 if(kind==='register'){
  const result=checked(await backend.auth.signUp({email:get('email'),password:String(data.get('password')||''),options:{emailRedirectTo:__AUTH_SITE_URL__,data:{application:'fenie_portal',name:get('name'),salon:get('salon'),phone:get('phone')}}}));
  if(result.session){await syncAccount(true);}else showModal('Confirme seu e-mail','<p>Confira sua caixa de entrada para confirmar o endereço e depois entre no portal. Se o e-mail já estiver cadastrado, use a recuperação de senha.</p><a class="btn primary" href="#/entrar">Voltar para entrar</a>');return;
 }
 if(kind==='recover'){
  checked(await backend.auth.resetPasswordForEmail(get('email'),{redirectTo:__AUTH_SITE_URL__+'?recovery=1'}));
  showModal('Confira seu e-mail','<p>Se houver uma conta vinculada a este e-mail, você receberá as instruções para recuperar o acesso.</p><button class="btn primary" data-action="recover-done">Voltar para entrar</button>');return;
 }
 if(kind==='reset-password'){
  checked(await backend.auth.updateUser({password:String(data.get('password')||'')}));const destination=inviteMode?'/admin/entrar':'/entrar';recoveryMode=false;inviteMode=false;history.replaceState(null,'',location.pathname+'#'+destination);await signOut();go(destination);toast('Senha salva. Entre com sua nova senha.');return;
 }
 if(kind==='catalog-search'){filters.q=get('q');filters.brand=get('brand');filters.page=1;render();return;}
 if(kind==='client-search'&&session?.role==='admin'){filters.clientQ=get('q');render();return;}
 if(kind==='checkout'&&session?.role==='client'){
  saveCheckout(form);persist();const items=cartItems().map(i=>({productId:i.productId,variantId:i.variantId,quantity:i.quantity}));
  const payload={items,addressId:state.checkout.addressId,method:state.checkout.method,installments:Number(state.checkout.installments),notes:state.checkout.notes};
  const key=draftKey()+'.request',serialized=JSON.stringify(payload);let request;try{request=JSON.parse(localStorage.getItem(key));}catch{}
  if(request?.serialized!==serialized)request={serialized,id:crypto.randomUUID()};localStorage.setItem(key,JSON.stringify(request));
  const id=checked(await backend.rpc('fenie_place_order',{p_input:{...payload,requestId:request.id}}));
  state.cart={};state.checkout.notes='';persist();localStorage.removeItem(key);await syncAccount();newOrderId=id;go('/cliente/pedidos/'+id);return;
 }
 if(kind==='profile'&&session?.role==='client'){
  checked(await backend.from('fenie_profiles').update({name:get('name'),salon:get('salon'),phone:get('phone')}).eq('id',session.clientId).select().single());await syncAccount();toast('Cadastro atualizado.');return;
 }
 if(kind==='address'&&session?.role==='client'){
  const a={user_id:session.clientId};for(const n of ['label','street','district','city','uf','cep','complement'])a[n]=get(n);a.uf=a.uf.toUpperCase();
  const id=form.dataset.id;const q=id?backend.from('fenie_addresses').update(a).eq('id',id):backend.from('fenie_addresses').insert(a);
  const saved=checked(await q.select().single());state.checkout.addressId=saved.id;persist();await syncAccount();modal.close();toast('Endereço salvo.');return;
 }
 if(kind==='order-status'&&session?.role==='admin'){
  checked(await backend.rpc('fenie_update_order',{p_id:form.dataset.id,p_status:get('status'),p_note:get('note')}));await syncAccount();toast('Atendimento atualizado.');return;
 }
 if(kind==='product'&&session?.role==='admin'){
  const p=product(form.dataset.id),price=Math.round(Number(get('price'))*100);if(!Number.isSafeInteger(price)||price<1||price>100000000)throw new Error('Informe um preço válido.');
  const variants=p.variants.map(v=>v.id===get('variant')?{...v,price}:v);
  checked(await backend.from('fenie_products').update({name:get('name'),variants,active:data.has('active')}).eq('id',p.id).select().single());await syncAccount();modal.close();toast('Produto atualizado.');return;
 }
 }catch(e){error(form,friendly(e));if(!form.isConnected)toast(friendly(e));}
 finally{delete form.dataset.busy;setBusy(form,false);}
});
document.addEventListener('change',async event=>{
 const el=event.target;
 if(el.dataset.variant){cartSelections[el.dataset.variant]=el.value;const p=product(el.dataset.variant),v=p?.variants.find(v=>v.id===el.value),card=el.closest('[data-product]');if(card)card.querySelector('.price').innerHTML=(v?'':'<small>A partir de</small>')+money(v?.price||Math.min(...p.variants.map(v=>v.price)));return;}
 if(el.hasAttribute('data-status-filter')){filters.status=el.value;render();return;}
 if(el.name==='payment'){state.checkout.method=el.value;document.querySelector('#installmentsField').hidden=el.value!=='boleto-parcelado';persist();return;}
 if(el.name==='installments'){state.checkout.installments=el.value;persist();return;}
 if(el.name==='address'){state.checkout.addressId=el.value;persist();return;}
 if(el.dataset.editVariant){const v=product(el.dataset.editVariant)?.variants.find(v=>v.id===el.value);if(v)document.querySelector('#editPrice').value=(v.price/100).toFixed(2);return;}
 if(el.dataset.feature&&session?.role==='admin'){try{checked(await backend.from('fenie_products').update({featured:el.checked}).eq('id',el.dataset.feature).select().single());await syncAccount();toast('Destaque atualizado.');}catch(e){el.checked=!el.checked;toast(friendly(e));}}

});
document.addEventListener('input',event=>{if(event.target.id==='orderNotes')state.checkout.notes=event.target.value;});
document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-action]');if(!button)return;const action=button.dataset.action,id=button.dataset.id;
 if(button.dataset.busy)return;button.dataset.busy='1';
 try{
 if(action==='email-link-leave'){emailLink=null;await syncAccount();return;}
 if(action==='refresh'){await syncAccount();return;}
 if(action==='refresh-access'){await syncAccount(true);return;}
 if(action==='modal-close'){modal.close();return;}
 if(action==='logout'){persist();await signOut();return;}
 if(action==='recover-done'){modal.close();go('/entrar');return;}
 if(action==='clear-filters'){filters.q='';filters.brand='';filters.page=1;render();return;}
 if(action==='clear-client-search'){filters.clientQ='';render();return;}
 if(action==='catalog-page'){filters.page=Number(button.dataset.page)||1;render();document.querySelector('#main')?.scrollIntoView();return;}
 if(action==='save-product'){if(!session){go('/entrar');return;}if(!product(id))return;state.saved=state.saved.includes(id)?state.saved.filter(s=>s!==id):[...state.saved,id];persist();render();toast('Lista de reposição atualizada.');return;}
 if(action==='add-product'){
  if(!session||session.role!=='client'){go('/entrar');return;}if(client().status!=='approved'){go('/cliente/aguardando');return;}
  const p=product(id);if(!p?.active)return;const variantId=p.variants.length===1?p.variants[0].id:cartSelections[id];
  if(!variantId){toast('Escolha a opção antes de adicionar.');document.getElementById('variant-'+id)?.focus();return;}
  state.cart[variantId]=Math.min(999,(state.cart[variantId]||0)+1);persist();render();toast('Produto adicionado ao pedido.');return;
 }
 if(action==='quantity'&&session?.role==='client'){const q=(state.cart[id]||0)+Number(button.dataset.delta);if(q<1||q>999)return;state.cart[id]=q;persist();render();return;}
 if(action==='remove-item'&&session?.role==='client'){delete state.cart[id];persist();render();return;}
 if(action==='address-open'&&session?.role==='client'){const checkout=root.querySelector('[data-form="checkout"]');if(checkout)saveCheckout(checkout);addressModal(id);return;}
 if(action==='client-open'&&session?.role==='admin'){clientModal(id);return;}
 if(action==='product-open'&&session?.role==='admin'){productModal(id);return;}
 if(action==='toggle-product'&&session?.role==='admin'){const p=product(id);checked(await backend.from('fenie_products').update({active:!p.active}).eq('id',id).select().single());await syncAccount();toast('Publicação atualizada.');return;}
 if(action==='message-open'){
  const o=state.orders.find(o=>o.id===id&&(session?.role==='admin'||o.clientId===client()?.id));if(!o)return;
  const message=messageFor(o);showModal('Mensagem do pedido','<p class="note" style="margin-bottom:18px">Confira a solicitação. O WhatsApp abrirá com a mensagem preenchida para você enviar ao atendimento.</p><pre class="message" id="messageText">'+C(message)+'</pre><div class="actions"><a class="btn primary" target="_blank" rel="noopener noreferrer" href="https://wa.me/554198402800?text='+encodeURIComponent(message)+'">Continuar no WhatsApp ↗</a><button class="btn" data-action="copy-message">Copiar mensagem</button></div>');return;
 }
 if(action==='copy-message'){await navigator.clipboard.writeText(document.querySelector('#messageText').textContent);toast('Mensagem copiada.');return;}
 if(action==='reorder'&&session?.role==='client'){
  const o=state.orders.find(o=>o.id===id&&o.clientId===client().id);if(!o)return;let skipped=0;
  for(const i of o.items){const m=variant(i.variantId);if(!m?.p.active){skipped++;continue;}state.cart[i.variantId]=Math.min(999,(state.cart[i.variantId]||0)+i.quantity);}
  persist();go('/cliente/carrinho');toast(skipped?'Alguns itens indisponíveis não foram adicionados.':'Itens adicionados com os preços atuais.');return;
 }
 }catch(e){toast(friendly(e));}finally{delete button.dataset.busy;}
});
window.addEventListener('hashchange',()=>{render();window.scrollTo(0,0);document.querySelector('#main')?.focus({preventScroll:true});});
document.addEventListener('click',event=>{const link=event.target.closest('a[href="#main"]');if(link){event.preventDefault();document.querySelector('#main')?.focus();}});
root.innerHTML='<main class="content"><p role="status">Carregando o Portal Fenié…</p></main>';
backend.auth.onAuthStateChange((event)=>{if(event==='PASSWORD_RECOVERY')recoveryMode=true;if(!emailLink&&['SIGNED_OUT','PASSWORD_RECOVERY'].includes(event))setTimeout(()=>syncAccount().catch(()=>{}),0);});
if(emailLink)emailLinkScreen();else syncAccount().catch(()=>{});
})();
