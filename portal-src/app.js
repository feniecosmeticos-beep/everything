import { createClient } from '@supabase/supabase-js';
import { loginCredentials } from './auth-identifier.js';
const backend=createClient(__SUPABASE_URL__,__SUPABASE_KEY__,{auth:{flowType:'pkce',detectSessionInUrl:true,autoRefreshToken:true,persistSession:true}});
(function(){
'use strict';
const seed=window.PROTOTYPE_SEED,root=document.querySelector('#app'),modal=document.querySelector('#modal'),STORE='fenie.portal.draft.v1';
const clone=x=>JSON.parse(JSON.stringify(x)),C=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>(n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),initials=n=>n.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
const AUTH_PHOTOS=['https://catalogofenie.vercel.app/assets/images/ox-olenka-linha-20.png','https://catalogofenie.vercel.app/assets/images/0b46351c789f3a46182a.png'];
const PHOTO_BUCKET='fenie-produtos',PHOTO_TYPES={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'},PHOTO_MAX=5*1024*1024,ADMIN_PAGE=40;
let cardQty={},session=null,cartSelections={},filters={q:'',brand:'',category:'',status:'',clientQ:'',adminQ:'',adminBrand:'',adminStatus:'',adminLimit:ADMIN_PAGE},variantRowSeq=0,newOrderId='',toastTimer;
const icons={tag:'<path d="M20 12.5 12.5 20 3 10.5V3h7.5z"/><circle cx="7.5" cy="7.5" r="1.4"/>',home:'<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7"/>',box:'<path d="m3 7 9-4 9 4v11l-9 4-9-4V7Zm0 0 9 5 9-5M12 12v10"/>',bag:'<path d="M5 7h14l1 14H4L5 7ZM8 8V6a4 4 0 0 1 8 0v2"/>',users:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 6"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',pin:'<path d="M19 10c0 6-7 12-7 12S5 16 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',search:'<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>'};
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
  const rows=user?await allRows('fenie_products','*','sort_order'):[];
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
 if(/invalid login/i.test(text))return 'E-mail, telefone ou senha incorretos.';
 if(/already registered|already been registered|already exists/i.test(text))return 'Este e-mail já tem cadastro. Entre com sua senha ou toque em “Esqueci minha senha”.';
 if(/phone logins are disabled/i.test(text))return 'O acesso por telefone está em preparação. Entre em contato com a Fenié.';
 if(/phone not confirmed/i.test(text))return 'Seu acesso por telefone precisa ser revisado pela Fenié.';
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
function publicHead(){return '<header class="public-head"><a href="#/entrar" aria-label="Fenié — início">'+logo()+'</a><nav><a href="#/entrar">Entrar</a><a href="#/cadastro">Cadastrar meu salão</a><a class="secondary-nav" href="#/admin/entrar">Área administrativa ↗</a></nav></header>';}
function publicFoot(){return '<footer class="public-foot"><span>Fenié Professionnel · Produtos profissionais. Atendimento próximo.</span><span>Portal do salão · Fenié Professionnel</span></footer>';}
function input(name,label,value='',type='text',required=true){return '<div class="field"><label for="f-'+name+'">'+label+'</label><input id="f-'+name+'" name="'+name+'" type="'+type+'" value="'+C(value)+'" '+(required?'required':'')+' maxlength="100"></div>';}
function authScreen(mode){
 const admin=mode==='admin',register=mode==='cadastro',recover=mode==='recuperar',first=mode==='primeiro-acesso',reset=mode==='nova-senha'||first;
 const title=register?'Seu próximo capítulo.':first?'Uma senha só sua.':reset?(inviteMode?'Ative seu acesso.':'Crie sua nova senha.'):recover?'Vamos recuperar seu acesso.':admin?'Tudo no seu lugar.':'Que bom ter você aqui.';
 const desc=register?'Cadastre seu salão e já comece a montar seus pedidos. Seu acesso é liberado na hora.':first?'Seu cadastro já está pronto. Para começar, substitua a senha inicial por uma senha pessoal com pelo menos 10 caracteres.':reset?'Escolha uma senha com pelo menos 10 caracteres.':recover?'Enviaremos as instruções para o e-mail cadastrado.':admin?'Gerencie produtos, dados, pedidos e destaques do catálogo. Acesso reservado à equipe autorizada.':'Entre com seu e-mail ou telefone cadastrado para acompanhar os pedidos e simplificar a reposição do salão.';
 const password='<div class="field"><label for="f-password">'+(reset?'Nova senha':'Senha')+'</label><input id="f-password" name="password" type="password" required minlength="'+(register||reset?'10':'1')+'" maxlength="100" autocomplete="'+(register||reset?'new-password':'current-password')+'"></div>';
 let fields=register?input('salon','Nome do salão')+'<div class="form-grid">'+input('name','Seu nome')+input('phone','WhatsApp com DDD','','tel')+'</div>':'';
 if(!reset)fields+=!register&&!recover?'<div class="field"><label for="f-identifier">'+(admin?'E-mail':'E-mail ou telefone')+'</label><input id="f-identifier" name="identifier" type="'+(admin?'email':'text')+'" required maxlength="254" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="'+(admin?'seu@email.com':'E-mail ou telefone com DDD')+'"></div>':input('email','E-mail','','email');
 if(first)fields+='<div class="field"><label for="f-current-password">Senha atual</label><input id="f-current-password" name="currentPassword" type="password" required maxlength="100" autocomplete="current-password"></div>';
 if(!recover)fields+=password;
 if(first)fields+='<div class="field"><label for="f-password-confirm">Confirme a nova senha</label><input id="f-password-confirm" name="passwordConfirm" type="password" required minlength="10" maxlength="100" autocomplete="new-password"></div>';
 const kind=register?'register':recover?'recover':first?'first-password':reset?'reset-password':'login';
 const label=register?'Solicitar cadastro':recover?'Enviar link de recuperação':reset?'Salvar nova senha':'Entrar';
 const body='<form data-form="'+kind+'" data-role="'+(admin?'admin':'client')+'">'+fields+'<p class="form-error" data-form-error role="alert" hidden></p><button class="btn primary full" type="submit">'+label+' '+icon('arrow')+'</button></form>'+
 (!register&&!recover&&!reset?'<p class="center-note"><a href="#/recuperar">Esqueci minha senha</a></p>':'')+
 (!admin&&!reset?'<p class="center-note">'+(register||recover?'<a href="#/entrar">← Voltar para entrar</a>':'Novo por aqui? <a href="#/cadastro"><strong>Cadastre seu salão</strong></a>')+'</p>':'')+
 (first?'<p class="center-note"><button class="text-btn" type="button" data-action="logout">Sair da conta</button></p>':'')+
 (recover?'<p class="center-note">Seu acesso é por telefone? <a href="https://wa.me/554198402800?text=Preciso%20recuperar%20meu%20acesso%20ao%20Portal%20Feni%C3%A9" target="_blank" rel="noopener noreferrer"><strong>Fale com a Fenié</strong></a>.</p>':'');
 const story='<section class="auth-story" aria-labelledby="auth-story-title"><div class="auth-story-copy"><p class="eyebrow"><span class="auth-brand-rule" aria-hidden="true"></span>FENIÉ · '+(admin?'GESTÃO DO CATÁLOGO':'PORTAL DO SALÃO')+'</p><h1 id="auth-story-title">Seu talento.<br><em>Nosso cuidado.</em></h1><p class="auth-story-intro">Uma conexão que vai além dos produtos.<br> Feita para acompanhar o seu salão.</p></div><div class="auth-showcase"><div class="auth-orbit" aria-hidden="true"></div><span class="auth-showcase-note">Cuidado em cada detalhe.</span><div class="auth-product auth-product-tall"><img src="'+C(AUTH_PHOTOS[0])+'" alt="Creme oxidante profissional Olenka" width="180" height="235" fetchpriority="high" decoding="async"></div><div class="auth-product auth-product-low"><img src="'+C(AUTH_PHOTOS[1])+'" alt="Máscara profissional Royal Finish" width="180" height="185" decoding="async"></div><span class="auth-showcase-star" aria-hidden="true">✳</span></div><div class="auth-story-signoff"><span>Profissional, como você.</span><span class="auth-signoff-line" aria-hidden="true"></span><span>Fenié Professionnel</span></div></section>';
 return publicHead()+'<main id="main" tabindex="-1" class="auth-layout auth-premium">'+story+'<section class="auth-form" aria-label="Acesso ao portal"><nav class="role-tabs" aria-label="Tipo de acesso"><a href="#/entrar" class="'+(!admin?'active':'')+'">Sou cliente</a><a href="#/admin/entrar" class="'+(admin?'active':'')+'">Sou administrador</a></nav><p class="eyebrow auth-form-eyebrow">'+(admin?'ÁREA ADMINISTRATIVA':'BEM-VINDO À FENIÉ')+'</p><h2>'+title+'</h2><p class="sub">'+desc+'</p>'+body+'</section></main>'+publicFoot();
}
function pendingScreen(){const c=client();return publicHead()+'<main id="main" tabindex="-1" style="max-width:620px;margin:50px auto;padding:0 20px"><section class="card empty"><p class="eyebrow">SUA CONTA</p><h1>'+C(c.salon)+'</h1>'+badge(c.status)+'<p>'+(c.status==='denied'?'Entre em contato com o atendimento para revisar seu acesso.':'Confirme o link enviado ao seu e-mail para entrar. O acesso é liberado automaticamente após a confirmação.')+'</p><button class="btn primary" data-action="refresh-access">Atualizar acesso</button><button class="btn ghost" data-action="logout">Sair da conta</button></section></main>'+publicFoot();}
const clientNav=[['/cliente','home','Minha área'],['/cliente/catalogo','box','Explorar catálogo'],['/cliente/marcas','tag','Marcas'],['/cliente/pedidos','bag','Meus pedidos'],['/cliente/reposicao','star','Minha reposição'],['/cliente/enderecos','pin','Endereços'],['/cliente/perfil','user','Meu cadastro']],adminNav=[['/admin','home','Visão geral'],['/admin/pedidos','bag','Pedidos'],['/admin/clientes','users','Clientes'],['/admin/catalogo','box','Catálogo'],['/admin/destaques','star','Destaques']];
function isActive(path,target){return path===target||target.split('/').length>2&&path.startsWith(target+'/');}
function shell(content,admin=false){
 const path=route(),nav=admin?adminNav:clientNav,c=client(),person=admin?'Equipe Fenié':c?.name||'Cliente',salon=admin?'Administrador':c?.salon||'',active=nav.find(([url])=>isActive(path,url));
 const links=nav.map(([url,n,label])=>'<a href="#'+url+'" class="'+(isActive(path,url)?'active':'')+'" '+(isActive(path,url)?'aria-current="page"':'')+'>'+icon(n)+'<span>'+label+'</span></a>').join(''),mobile=admin?nav:clientNav.filter(([u])=>['/cliente','/cliente/catalogo','/cliente/marcas','/cliente/pedidos','/cliente/perfil'].includes(u));
 return '<div class="app-shell"><aside class="sidebar"><a class="side-brand" href="#'+(admin?'/admin':'/cliente')+'">'+logo(true)+'<span class="side-caption">'+(admin?'Gestão do catálogo':'Portal do salão')+'</span></a><nav class="side-nav" aria-label="Navegação '+(admin?'administrativa':'do cliente')+'">'+links+'</nav><div class="side-tail"><div class="profile-chip"><span class="avatar">'+initials(person)+'</span><div><strong>'+C(person)+'</strong><small>'+C(salon)+'</small></div></div><button data-action="logout">Sair da conta ↗</button></div></aside><div class="workspace"><header class="app-head"><img class="mobile-brand" src="'+seed.logo+'" alt="Fenié"><span class="crumb">'+(admin?'Gestão Fenié':'Portal do salão')+' &nbsp; / &nbsp; <strong>'+C(active?.[2]||(path.startsWith('/cliente/produto/')?'Produto':'Pedido'))+'</strong></span><div class="row"><div class="account-info">'+C(salon)+'<small>'+C(person)+'</small></div>'+(admin?'<button class="btn small" data-action="logout">Sair da conta</button>':'<a class="btn small" href="#/cliente/carrinho">'+icon('bag')+'Pedido · '+cartCount()+'</a>')+'</div></header><main id="main" tabindex="-1" class="content">'+content+'</main></div><nav class="mobile-nav" aria-label="Navegação principal">'+mobile.map(([url,n,label])=>'<a href="#'+url+'" class="'+(isActive(path,url)?'active':'')+'" '+(isActive(path,url)?'aria-current="page"':'')+'>'+icon(n)+'<span>'+C({'Explorar catálogo':'Catálogo','Minha área':'Início','Meus pedidos':'Pedidos','Minha reposição':'Reposição','Meu cadastro':'Cadastro','Visão geral':'Início'}[label]||label)+'</span></a>').join('')+'</nav></div>';
}
function heading(k,title,sub,actions=''){return '<div class="page-title"><div><p class="eyebrow">'+k+'</p><h1>'+title+'</h1>'+(sub?'<p class="sub">'+sub+'</p>':'')+'</div>'+actions+'</div>';}
function orderTotal(o){return o.items.reduce((n,i)=>n+i.price*i.quantity,0);}
function canCancel(o){return o.status==='waiting';}
function unsent(o){return o.status==='waiting'&&!o.whatsapp_sent_at;}
function waLink(o,label,cls='btn primary'){return '<a class="'+cls+'" target="_blank" rel="noopener noreferrer" data-wa-order="'+C(o.id)+'" href="'+'https://wa.me/554198402800?text='+encodeURIComponent(messageFor(o))+'">'+label+'</a>';}
function orderTag(o,admin){return unsent(o)?'<span class="tag-warn">Não enviado pelo WhatsApp</span>':(admin&&o.whatsapp_sent_at&&o.status==='waiting'?'<span class="tag-ok">WhatsApp aberto</span>':'');}
function filterOrders(list){return list.filter(o=>!filters.status||(filters.status==='unsent'?unsent(o):o.status===filters.status));}
function orderRows(orders,admin=false){return orders.length?orders.map(o=>{const c=state.clients.find(c=>c.id===o.clientId);return '<div class="order-row"><div><strong>'+C(o.id)+'</strong><small>'+C(admin?c?.salon:o.date)+' · '+o.items.reduce((n,i)=>n+i.quantity,0)+' unidades</small>'+orderTag(o,admin)+'</div><strong class="row-amount">'+money(orderTotal(o))+'</strong>'+badge(o.status)+'<a class="btn small" href="#/'+(admin?'admin':'cliente')+'/pedidos/'+o.id+'">Ver pedido ↗</a></div>';}).join(''):'<div class="empty"><h2>Ainda não há pedidos.</h2><p>Seu histórico aparecerá depois da primeira solicitação.</p></div>';}
const BRANDS=[['OLENKA','Olenka','olenka.png'],['RIGOLIM','Rigolim','rigolim.png'],['GLYNETT','Glynett','glynett.png'],['MUP COLOR','MUP Color','mup-color.png'],['SPA DO FIO','Spa do Fio','spa-do-fio.png'],['PROHALL','Prohall','prohall.png'],['MUP MAKEUP','MUP Makeup','mup-makeup.png'],['DOHA','Doha','doha.png']];
function brandName(b){const f=BRANDS.find(x=>x[0]===b);if(f)return f[1];return String(b||'').toLowerCase().replace(/(^|\s)\S/g,c=>c.toUpperCase()).replace(/\bMup\b/g,'MUP').replace(/\bDo\b/g,'do');}
function brandLogo(b){const f=BRANDS.find(x=>x[0]===b);return f?'brand-logos/'+f[2]:'';}
function productHref(p){return '#/cliente/produto/'+encodeURIComponent(p.id);}
function plural(n,one,many){return n+' '+(n===1?one:many);}
function brandStats(b){const list=state.products.filter(p=>p.active&&p.brand===b);return {products:list.length,options:list.reduce((n,p)=>n+p.variants.length,0)};}
function brandGrid(){
 const cards=BRANDS.filter(([b])=>brandStats(b).products).map(([b,name,file])=>{const st=brandStats(b);return '<button type="button" class="brand-card'+(b==='OLENKA'?' brand-dark':'')+'" data-action="brand-open" data-brand="'+C(b)+'" aria-label="Ver produtos '+C(name)+'"><span class="brand-logo"><img src="brand-logos/'+file+'" alt="'+C(name)+'" loading="lazy"></span><small>'+plural(st.products,'produto','produtos')+' · '+plural(st.options,'opção','opções')+' <i aria-hidden="true">↗</i></small></button>';}).join('');
 return '<section class="brands"><div class="section-title"><div><p class="eyebrow">AS MARCAS DA FENIÉ</p><h2>Encontre a sua preferida.</h2></div><a href="#/cliente/marcas">'+BRANDS.filter(([b])=>brandStats(b).products).length+' marcas ↗</a></div><div class="brand-grid">'+cards+'</div></section>';
}
function brandsPage(){
 const others=[...new Set(state.products.filter(p=>p.active).map(p=>p.brand))].filter(b=>!BRANDS.some(x=>x[0]===b)&&!/a confirmar/i.test(b)).sort();
 return heading('AS MARCAS DA FENIÉ','Encontre a sua preferida.','Marcas que você conhece, com a curadoria da Fenié para a rotina do salão.')+'<div class="brand-grid">'+brandGrid().split('<div class="brand-grid">')[1].replace(/<\/div><\/section>$/,'')+'</div>'+(others.length?'<div class="section-title"><h2>Também no catálogo</h2></div><div class="chips">'+others.map(b=>'<button type="button" class="chip" data-action="brand-open" data-brand="'+C(b)+'">'+C(brandName(b))+' <span>'+brandStats(b).products+'</span></button>').join('')+'</div>':'');
}
function brandBanner(){
 if(!filters.brand)return '';const st=brandStats(filters.brand),logoSrc=brandLogo(filters.brand);
 return '<section class="brand-banner'+(filters.brand==='OLENKA'?' brand-dark':'')+'">'+(logoSrc?'<span class="brand-logo"><img src="'+logoSrc+'" alt="'+C(brandName(filters.brand))+'"></span>':'<h2>'+C(brandName(filters.brand))+'</h2>')+'<div><strong>'+plural(st.products,'produto','produtos')+' · '+plural(st.options,'opção','opções')+'</strong><a href="#/cliente/marcas">Ver todas as marcas ↗</a></div></section>';
}
function productPage(id){
 const p=product(id);
 if(!p||!p.active)return '<a class="text-btn" href="#/cliente/catalogo">← Voltar ao catálogo</a><section class="card empty"><h2>Produto indisponível.</h2><p>Este produto saiu do catálogo ou o link está incorreto.</p><a class="btn primary" href="#/cliente/catalogo">Explorar catálogo →</a></section>';
 const selected=cartSelections[p.id]||p.variants[0]?.id,v=p.variants.find(x=>x.id===selected)||p.variants[0],saved=state.saved.includes(p.id),qty=cardQty[p.id]||1,b=brandName(p.brand);
 const related=state.products.filter(x=>x.active&&x.id!==p.id&&x.brand===p.brand).sort((a,c)=>(c.category===p.category)-(a.category===p.category)).slice(0,4);
 const desc=p.description?p.description.split(/\n+/).filter(Boolean).map(l=>'<p>'+C(l)+'</p>').join(''):'<p>Indicação, benefícios e modo de uso deste produto estão em preparação. Fale com o atendimento Fenié para receber orientação de uso.</p>';
 const options=p.variants.length>1?'<fieldset class="pdp-options"><legend>Escolha a opção <small>'+p.variants.length+' disponíveis</small></legend><div class="option-list">'+p.variants.map(x=>'<label class="option-chip'+(x.id===v.id?' active':'')+'"><input type="radio" name="pdp-variant" value="'+C(x.id)+'" data-variant="'+C(p.id)+'" '+(x.id===v.id?'checked':'')+'><span>'+C(x.label)+'</span><small>'+money(x.price)+'</small></label>').join('')+'</div></fieldset>':'';
 const spec=[['Marca',b],['Categoria',p.category||'—'],['Embalagem',p.size||v.label],['Opções da linha',p.variants.length>1?String(p.variants.length):'Unidade de venda'],['Código','<span data-sku>'+C(v.sku)+'</span>']];
 return '<a class="text-btn back-link" href="#/cliente/catalogo">← Voltar ao catálogo</a><nav class="breadcrumb" aria-label="Você está em"><a href="#/cliente/catalogo">Catálogo</a><span>/</span><button type="button" data-action="brand-open" data-brand="'+C(p.brand)+'">'+C(b)+'</button>'+(p.category?'<span>/</span><button type="button" data-action="category-open" data-category="'+C(p.category)+'">'+C(p.category)+'</button>':'')+'</nav>'
 +'<div class="pdp" data-product="'+C(p.id)+'"><div class="pdp-gallery"><button type="button" class="pdp-photo" data-action="photo-zoom" data-id="'+C(p.id)+'" aria-label="Ampliar foto de '+C(p.name)+'"><img src="'+p.image+'" alt="'+C(p.name)+'"><span class="zoom-hint">⤢ Ampliar foto</span></button></div>'
 +'<div class="pdp-info"><button type="button" class="eyebrow brand-link" data-action="brand-open" data-brand="'+C(p.brand)+'">'+C(b)+'</button><h1>'+C(p.name)+'</h1><p class="pdp-meta">'+C(p.size||'')+(p.size?' · ':'')+'Código <span data-sku>'+C(v.sku)+'</span></p>'
 +'<div class="pdp-price"><span class="price">'+money(v.price)+'</span><small>por unidade · preço da tabela Fenié</small></div>'+options
 +(p.active?'<div class="pdp-buy"><div class="stepper" role="group" aria-label="Quantidade"><button type="button" data-action="card-qty" data-id="'+C(p.id)+'" data-delta="-1" aria-label="Diminuir quantidade">−</button><span data-qty aria-live="polite">'+qty+'</span><button type="button" data-action="card-qty" data-id="'+C(p.id)+'" data-delta="1" aria-label="Aumentar quantidade">+</button></div><button class="btn primary" data-action="add-product" data-id="'+C(p.id)+'">Adicionar ao pedido +</button></div>':'')
 +'<button type="button" class="text-btn save-link'+(saved?' saved':'')+'" data-action="save-product" data-id="'+C(p.id)+'" aria-pressed="'+saved+'">'+(saved?'★ Salvo na minha reposição':'☆ Salvar na minha reposição')+'</button>'
 +'<div class="rule"></div><h2>Conheça o produto</h2><div class="pdp-desc">'+desc+'</div><h2>Embalagem e identificação</h2><dl class="spec">'+spec.map(([k,val])=>'<div><dt>'+k+'</dt><dd>'+(k==='Código'?val:C(val))+'</dd></div>').join('')+'</dl><div class="pdp-help"><strong>Atendimento Fenié</strong><p>Disponibilidade, frete e condições são confirmados pela equipe quando você envia o pedido pelo WhatsApp.</p></div></div></div>'
 +(related.length?'<div class="section-title"><h2>Mais de '+C(b)+'</h2><button type="button" class="text-btn" data-action="brand-open" data-brand="'+C(p.brand)+'">Ver todos os produtos '+C(b)+' ↗</button></div><div class="catalog-grid">'+related.map(productCard).join('')+'</div>':'');
}
function productCard(p){
 const selected=cartSelections[p.id]||p.variants[0]?.id||'',v=p.variants.find(v=>v.id===selected)||p.variants[0],saved=state.saved.includes(p.id),qty=cardQty[p.id]||1;
 return '<article class="product" data-product="'+C(p.id)+'"><button class="save-btn '+(saved?'saved':'')+'" data-action="save-product" data-id="'+C(p.id)+'" aria-label="'+(saved?'Remover da':'Adicionar à')+' lista de reposição: '+C(p.name)+'" aria-pressed="'+saved+'">'+(saved?'★':'☆')+'</button><a class="photo" href="'+productHref(p)+'" aria-label="Ver detalhes de '+C(p.name)+'"><img src="'+p.image+'" alt="'+C(p.name)+'" loading="lazy"></a><div class="product-info"><p class="eyebrow">'+C(brandName(p.brand))+'</p><h3><a href="'+productHref(p)+'">'+C(p.name)+'</a></h3><div class="product-meta">'+C(p.size)+' · '+(p.variants.length>1?p.variants.length+' opções da linha':'Unidade de venda')+'</div>'+(p.description?'<p class="product-desc">'+C(p.description)+'</p>':'')+'<a class="text-btn product-more" href="'+productHref(p)+'">Ver detalhes →</a>'+'<div class="price">'+money(v.price)+'</div>'+(p.variants.length>1?'<label class="field-label" for="variant-'+C(p.id)+'" style="font-size:12px;margin-bottom:6px">Opção</label><select id="variant-'+C(p.id)+'" data-variant="'+C(p.id)+'">'+p.variants.map(v=>'<option value="'+C(v.id)+'" '+(selected===v.id?'selected':'')+'>'+C(v.label)+' · '+money(v.price)+'</option>').join('')+'</select>':'')+(p.active?'<div class="card-buy"><div class="stepper" role="group" aria-label="Quantidade"><button type="button" data-action="card-qty" data-id="'+C(p.id)+'" data-delta="-1" aria-label="Diminuir quantidade">−</button><span data-qty aria-live="polite">'+qty+'</span><button type="button" data-action="card-qty" data-id="'+C(p.id)+'" data-delta="1" aria-label="Aumentar quantidade">+</button></div><button class="btn primary" data-action="add-product" data-id="'+C(p.id)+'">Adicionar +</button></div>':'<button class="btn primary" disabled>Indisponível</button>')+'</div></article>';
}
function customerHome(){
 const c=client(),orders=state.orders.filter(o=>o.clientId===c.id),pending=orders.filter(o=>!['delivered','cancelled'].includes(o.status)).length;
 const pendingWa=orders.filter(unsent);
 const waBanner=pendingWa.length?'<section class="wa-banner"><div><strong>'+(pendingWa.length>1?pendingWa.length+' pedidos ainda não foram enviados':'Seu pedido '+C(pendingWa[0].id)+' ainda não foi enviado')+' pelo WhatsApp.</strong><span>O pedido só é realizado após o envio da mensagem.</span></div><div class="actions">'+waLink(pendingWa[0],'Enviar agora ↗')+(pendingWa.length===1?'<button class="btn ghost" data-action="order-cancel" data-id="'+C(pendingWa[0].id)+'">Cancelar pedido</button>':'')+(pendingWa.length>1?'<a class="btn ghost" href="#/cliente/pedidos" data-unsent-link>Ver todos</a>':'')+'</div></section>':'';
 return heading('BEM-VINDA À FENIÉ','Olá, '+C(c.name.split(' ')[0])+'.','Seu salão, suas escolhas e seus pedidos em um só lugar.')+waBanner+'<section class="hero-panel"><div><p class="eyebrow">SEU PRÓXIMO CUIDADO</p><h2>Reposição sem<br><em>perder o ritmo.</em></h2><p>Escolha o que faz sentido para a sua rotina. A Fenié cuida dos próximos passos com você.</p><div class="actions"><a class="btn primary" href="#/cliente/catalogo">Montar um novo pedido '+icon('arrow')+'</a>'+(orders[0]?'<button class="btn" data-action="reorder" data-id="'+C(orders[0].id)+'">Repetir último pedido ↻</button>':'')+'</div></div><div class="hero-photo"><img src="'+C(state.products.find(p=>p.id==='OLK-MSK-FNS-500')?.image||seed.logo)+'" alt="Máscara Royal Finish Olenka"></div></section><div class="stats"><div class="stat"><label>Pedidos em andamento</label><span class="value">'+pending+'</span><small>Solicitações registradas</small></div><div class="stat"><label>Seu histórico</label><span class="value">'+orders.length+'</span><small>Pedidos registrados</small></div><div class="stat"><label>Minha reposição</label><span class="value">'+state.saved.length+'</span><small>Produtos salvos</small></div><div class="stat"><label>Seu cadastro</label><span class="value" style="font-size:25px">Ativo</span><small>'+C(c.salon)+'</small></div></div>'+brandGrid()+'<div class="section-title"><h2>Seus últimos pedidos</h2><a href="#/cliente/pedidos">Ver todos ↗</a></div><section class="card">'+orderRows(orders.slice(0,3))+'</section><div class="section-title"><h2>Para a rotina do salão.</h2><a href="#/cliente/catalogo">Explorar catálogo ↗</a></div><div class="catalog-grid">'+state.products.filter(p=>p.active&&p.featured).slice(0,3).map(productCard).join('')+'</div>';
}
function normalize(s){return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function catalogPage(savedOnly=false,publicView=false){
 const products=state.products.filter(p=>p.active&&(!savedOnly||state.saved.includes(p.id))&&(!filters.brand||p.brand===filters.brand)&&(!filters.category||p.category===filters.category)&&(!filters.q||normalize([p.name,p.brand,p.category,p.id,...p.variants.map(v=>v.sku+' '+v.label)].join(' ')).includes(normalize(filters.q))));
 return heading(savedOnly?'MINHA REPOSIÇÃO':'SELEÇÃO PROFISSIONAL',savedOnly?'Os seus essenciais.':'Escolhas para o seu salão.','Consulte as opções e os preços atuais. Disponibilidade, frete e condições serão confirmados pela equipe.',publicView?'<a class="btn primary" href="#/entrar">Entrar →</a>':'<div class="actions">'+(savedOnly&&products.length?'<button class="btn" data-action="add-saved">Adicionar todos ao pedido +</button>':'')+'<a class="btn primary" href="#/cliente/carrinho">Ver pedido · '+cartCount()+'</a></div>')+(savedOnly?'':brandBanner())+'<form class="filterbar" data-form="catalog-search"><div class="search-wrap">'+icon('search')+'<input class="search-input" type="search" name="q" value="'+C(filters.q)+'" placeholder="Buscar produto, marca ou código" aria-label="Buscar produto, marca ou código"></div><select class="filter-select" name="brand" aria-label="Filtrar por marca"><option value="">Marcas</option>'+[...new Set(state.products.map(p=>p.brand))].map(b=>'<option '+(filters.brand===b?'selected':'')+'>'+C(b)+'</option>').join('')+'</select><input type="hidden" name="category" value="'+C(filters.category)+'"><button class="btn ghost" type="button" data-action="clear-filters">Limpar</button></form>'+categoryChips()+''+(products.length?'<div class="catalog-grid">'+products.slice(((filters.page||1)-1)*24,(filters.page||1)*24).map(productCard).join('')+'</div><div class="actions" style="margin-top:24px"><span>'+products.length+' produtos · página '+(filters.page||1)+' de '+Math.max(1,Math.ceil(products.length/24))+'</span>'+((filters.page||1)>1?'<button class="btn" data-action="catalog-page" data-page="'+((filters.page||1)-1)+'">← Anterior</button>':'')+((filters.page||1)*24<products.length?'<button class="btn" data-action="catalog-page" data-page="'+((filters.page||1)+1)+'">Próxima →</button>':'')+'</div>':'<section class="card empty"><h2>Nenhum produto por aqui.</h2><p>'+(savedOnly?'Toque na estrela de um produto no catálogo para salvar sua reposição.':'Tente outra marca, nome ou código.')+'</p><a class="btn" href="#/cliente/catalogo">Explorar catálogo →</a></section>');
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
function orderFilters(){return '<div class="filterbar"><select class="filter-select" data-status-filter aria-label="Filtrar pedidos por situação"><option value="">Todas as situações</option><option value="unsent" '+(filters.status==='unsent'?'selected':'')+'>Não enviados pelo WhatsApp</option>'+Object.entries(statusNames).map(([v,l])=>'<option value="'+v+'" '+(filters.status===v?'selected':'')+'>'+l+'</option>').join('')+'</select></div>';}
function customerOrders(){return heading('HISTÓRICO DO SALÃO','Meus pedidos.','Acompanhe cada etapa e monte a próxima reposição.','<a class="btn primary" href="#/cliente/catalogo">Novo pedido +</a>')+orderFilters()+'<section class="card">'+orderRows(filterOrders(state.orders.filter(o=>o.clientId===client().id)))+'</section>';}
function messageFor(o){const c=state.clients.find(c=>c.id===o.clientId);return ['Olá! Registrei uma solicitação no Portal Fenié.','','Pedido: '+o.id,'Salão: '+c.salon,'Contato: '+c.name,'',...o.items.flatMap(i=>[i.quantity+' × '+i.name+' · '+i.volume,'SKU: '+i.sku+' · Unitário: '+money(i.price),'Subtotal: '+money(i.price*i.quantity),'']),'Total dos produtos: '+money(orderTotal(o)),'Forma de pagamento: '+o.payment,'','Entrega: '+o.address.street+' · '+o.address.city+'/'+o.address.uf,...(o.notes?['Observações: '+o.notes]:[]),'','Gostaria de confirmar disponibilidade, frete e condições comerciais.'].join('\n');}
function orderDetail(id,admin=false){
 const o=state.orders.find(o=>o.id===id&&(admin||o.clientId===client().id));if(!o)return notFound();
 const c=state.clients.find(c=>c.id===o.clientId),success=newOrderId===o.id&&!admin?'<section class="success-head"><p class="eyebrow">ÚLTIMO PASSO</p><h2>Agora é só enviar pelo WhatsApp.</h2><p>Seu pedido '+C(o.id)+' foi salvo. Ele é realizado assim que você envia a mensagem para o nosso atendimento no WhatsApp.</p>'+waLink(o,'Enviar para o WhatsApp ↗','btn primary wa-cta')+'</section>':'';
 return '<a class="text-btn" href="#/'+(admin?'admin':'cliente')+'/pedidos">← '+(admin?'Todos os pedidos':'Meus pedidos')+'</a>'+heading('PEDIDO DO SALÃO',C(o.id),C(c.salon)+' · '+o.date,badge(o.status))+success+'<div class="checkout-grid"><div class="stack"><section class="card"><h2 style="font-size:25px">Produtos escolhidos</h2>'+o.items.map(i=>'<div class="order-row" style="grid-template-columns:1fr auto"><div><strong>'+i.quantity+' × '+C(i.name)+'</strong><small>'+C(i.volume)+' · '+C(i.sku)+' · '+money(i.price)+' / un.</small></div><strong>'+money(i.price*i.quantity)+'</strong></div>').join('')+'<div class="summary-line total"><span>Total dos produtos</span><span>'+money(orderTotal(o))+'</span></div></section><section class="card"><h2 style="font-size:25px">Acompanhe o pedido</h2><div class="timeline">'+o.events.map(e=>'<div class="timeline-row"><strong>'+C(e.text)+'</strong><small>'+C(e.date)+'</small></div>').join('')+'</div></section>'+(admin?'<section class="card"><h2 style="font-size:25px">Atualizar atendimento</h2><form data-form="order-status" data-id="'+o.id+'" style="margin-top:20px"><div class="field"><label for="statusUpdate">Situação do pedido</label><select id="statusUpdate" name="status">'+Object.entries(statusNames).map(([v,l])=>'<option value="'+v+'" '+(o.status===v?'selected':'')+'>'+l+'</option>').join('')+'</select></div><div class="field"><label for="internalNote">Anotação interna</label><textarea name="note" id="internalNote" maxlength="500" placeholder="Visível apenas para a equipe">'+C(o.adminNote)+'</textarea></div><button class="btn primary">Salvar atualização →</button></form></section>':'')+'</div><aside class="card checkout-summary"><p class="eyebrow">DETALHES DA SOLICITAÇÃO</p><dl class="detail-list"><div><dt>Salão</dt><dd>'+C(c.salon)+'</dd></div><div><dt>Forma de pagamento</dt><dd>'+C(o.payment)+'</dd></div><div><dt>Endereço de entrega</dt><dd>'+addressText(o.address)+'</dd></div><div><dt>Observações do cliente</dt><dd>'+C(o.notes||'Nenhuma observação.')+'</dd></div></dl><div class="rule"></div><div class="stack">'+(!admin?(o.status==='cancelled'?'<p class="wa-note">Este pedido foi cancelado e não será atendido.</p>':waLink(o,'Enviar para o WhatsApp ↗')+'<p class="wa-note">O pedido só é realizado após o envio da mensagem pelo WhatsApp.</p><button class="text-btn" data-action="message-open" data-id="'+o.id+'">Conferir ou copiar a mensagem</button>')+'<button class="btn" data-action="reorder" data-id="'+o.id+'">Comprar novamente +</button>'+(canCancel(o)?'<button class="btn ghost danger" data-action="order-cancel" data-id="'+o.id+'">Cancelar pedido</button>':o.status!=='cancelled'&&o.status!=='delivered'?'<p class="metric-note">Pedido já em atendimento. Para cancelar, fale com a equipe pelo WhatsApp.</p>':''):(o.status==='waiting'?'<button class="btn primary" data-action="order-received" data-id="'+o.id+'">Recebido no WhatsApp ✓</button>':'')+'<button class="btn" data-action="message-open" data-id="'+o.id+'">Conferir mensagem do pedido</button>')+'</div>'+(admin?'<p class="metric-note">A abertura da mensagem não confirma recebimento nem pagamento.</p>':'')+'</aside></div>';
}
function customerAddresses(){const c=client();return heading('DADOS DE ENTREGA','Onde o cuidado chega.','Mantenha os endereços do seu salão organizados.','<button class="btn primary" data-action="address-open">Novo endereço +</button>')+'<div class="address-grid">'+c.addresses.map(a=>'<section class="card address-card"><div class="row between"><h3>'+C(a.label)+'</h3>'+icon('pin')+'</div><p>'+addressText(a)+'</p><button class="text-btn" data-action="address-open" data-id="'+a.id+'">Editar endereço ↗</button></section>').join('')+'</div>'+(c.addresses.length?'':'<section class="card empty"><h2>Seu primeiro endereço.</h2><p>Adicione um local de entrega para testar o fechamento do pedido.</p></section>');}
function profilePage(){const c=client();return heading('MEU CADASTRO','Tudo sobre o seu salão.','Atualize os dados do cadastro e mantenha o atendimento próximo.')+'<section class="card" style="max-width:820px"><div class="row between"><div class="row"><span class="avatar">'+initials(c.name)+'</span><div><h3>'+C(c.salon)+'</h3><small>Cliente Fenié</small></div></div>'+badge(c.status)+'</div><div class="rule"></div><form data-form="profile"><div class="form-grid">'+input('salon','Nome do salão',c.salon)+input('name','Seu nome',c.name)+'<div class="field"><label>E-mail de acesso</label><input value="'+C(c.email)+'" type="email" readonly><small>Para alterar seu e-mail, fale com a equipe.</small></div>'+input('phone','WhatsApp',c.phone,'tel')+'</div><p class="form-error" data-form-error role="alert" hidden></p><div class="actions"><button class="btn primary">Salvar dados →</button><a class="btn" href="#/cliente/enderecos">Meus endereços</a><button class="text-btn" type="button" data-action="logout">Sair da conta</button></div></form><p class="metric-note">Seu cadastro é salvo com segurança no portal.</p></section>';}

function adminHome(){
 const waiting=state.orders.filter(o=>o.status==='waiting'),salons=state.clients.filter(c=>c.role==='client'),total=state.orders.filter(o=>o.status!=='cancelled').reduce((sum,o)=>sum+orderTotal(o),0);
 return heading('GESTÃO FENIÉ','Seu catálogo, bem cuidado.','Produtos, dados e atendimento em um só painel.','<a class="btn primary" href="#/admin/catalogo">Gerenciar produtos ↗</a>')+'<div class="stats"><div class="stat"><label>Novas solicitações</label><span class="value">'+waiting.length+'</span><small>'+state.orders.filter(unsent).length+' sem envio pelo WhatsApp</small></div><div class="stat"><label>Valor solicitado</label><span class="value" style="font-size:28px">'+money(total)+'</span><small>Solicitações · não é faturamento</small></div><div class="stat"><label>Salões cadastrados</label><span class="value">'+salons.length+'</span><small>Acesso automático após confirmar o e-mail</small></div><div class="stat"><label>Produtos publicados</label><span class="value">'+state.products.filter(p=>p.active).length+'</span><small>Catálogo do portal</small></div></div><div class="split"><section class="card"><div class="row between"><h2 style="font-size:27px">Últimos pedidos</h2><a class="text-btn" href="#/admin/pedidos">Ver todos ↗</a></div>'+orderRows(state.orders.slice(0,5),true)+'</section><section class="card"><p class="eyebrow">CONTROLE DO CATÁLOGO</p><h2 style="margin-top:10px">O que vamos cuidar hoje?</h2><div class="attention"><p><strong>Produtos e preços</strong><br><span class="muted">Atualize valores, opções e disponibilidade.</span></p><a href="#/admin/catalogo" class="text-btn">Editar catálogo ↗</a></div><div class="attention"><p><strong>Vitrine e destaques</strong><br><span class="muted">Escolha o que aparece primeiro para os salões.</span></p><a href="#/admin/destaques" class="text-btn">Organizar destaques ↗</a></div><div class="attention"><p><strong>'+waiting.length+' solicitações aguardando atendimento</strong></p><a class="text-btn" href="#/admin/pedidos">Abrir pedidos ↗</a></div></section></div><div class="section-title"><h2>Como estão os pedidos?</h2><small>Dados registrados no portal</small></div><section class="card"><div class="mini-bars">'+Object.entries(statusNames).filter(([s])=>state.orders.some(o=>o.status===s)).map(([s,label])=>{const n=state.orders.filter(o=>o.status===s).length;return '<div><div class="bar-head"><span>'+label+'</span><strong>'+n+' pedido'+(n>1?'s':'')+'</strong></div><div class="bar-track"><div class="bar-fill" style="width:'+n/Math.max(1,state.orders.length)*100+'%"></div></div></div>';}).join('')+'</div></section>';
}
function adminOrders(){return heading('ATENDIMENTO','Cada pedido, de perto.','Confira produtos, pagamento, endereço e situação da solicitação.')+orderFilters()+'<section class="card">'+orderRows(filterOrders(state.orders),true)+'</section>';}
function adminClients(){
 const clients=state.clients.filter(c=>c.role==='client').filter(c=>normalize(c.salon+' '+c.name+' '+c.email).includes(normalize(filters.clientQ)));
 return heading('RELACIONAMENTO','Os salões da Fenié.','Consulte os dados e acompanhe o histórico de cada cliente.')+'<form data-form="client-search" class="filterbar"><div class="search-wrap">'+icon('search')+'<input class="search-input" name="q" value="'+C(filters.clientQ)+'" placeholder="Buscar salão, contato ou e-mail" aria-label="Buscar salão, contato ou e-mail"></div><button class="btn">Buscar</button><button class="btn ghost" type="button" data-action="clear-client-search">Limpar</button></form><section class="card table-wrap"><table class="table"><thead><tr><th>Salão / contato</th><th>E-mail</th><th>Situação</th><th>Atendimento</th></tr></thead><tbody>'+clients.map(c=>'<tr><td><strong>'+C(c.salon)+'</strong><small>'+C(c.name)+' · '+C(c.phone)+'</small></td><td>'+C(c.email)+'</td><td>'+badge(c.status)+'</td><td><div class="actions">'+'<button class="btn small" data-action="client-open" data-id="'+c.id+'">Ver cadastro ↗</button></div></td></tr>').join('')+'</tbody></table>'+(clients.length?'':'<p class="muted" style="padding:20px 0">Nenhum cadastro encontrado.</p>')+'</section>';
}
function priceRange(p){const prices=p.variants.map(v=>v.price),min=Math.min(...prices),max=Math.max(...prices);return money(min)+(min!==max?' — '+money(max):'');}
function adminProducts(){
 const q=normalize(filters.adminQ||''),st=filters.adminStatus;
 return state.products.filter(p=>{
  if(filters.adminBrand&&p.brand!==filters.adminBrand)return false;
  if(st==='published'&&!p.active||st==='hidden'&&p.active||st==='nophoto'&&p.image||st==='nobrand'&&!/a confirmar/i.test(p.brand)||st==='nocategory'&&p.category&&!/n[ãa]o informado/i.test(p.category))return false;
  return !q||normalize(p.name+' '+p.brand+' '+p.category+' '+p.size+' '+p.variants.map(v=>v.sku+' '+v.label).join(' ')).includes(q);
 });
}
function categoryChips(){
 const counts={};for(const p of state.products)if(p.active&&p.category&&!/n[ãa]o informado/i.test(p.category)&&(!filters.brand||p.brand===filters.brand))counts[p.category]=(counts[p.category]||0)+1;
 const cats=Object.keys(counts).sort((a,b)=>counts[b]-counts[a]||a.localeCompare(b,'pt-BR'));
 const chip=(value,label,n)=>'<button type="button" class="chip'+(filters.category===value?' active':'')+'" data-action="category-chip" data-category="'+C(value)+'" aria-pressed="'+(filters.category===value)+'">'+C(label)+(n!=null?' <span>'+n+'</span>':'')+'</button>';
 return '<nav class="chips" aria-label="Categorias">'+chip('','Todas')+cats.map(c=>chip(c,c,counts[c])).join('')+'</nav>';
}
function categoryOptions(selected){return [...new Set(state.products.filter(p=>p.active).map(p=>p.category).filter(c=>c&&!/n[ãa]o informado/i.test(c)))].sort((a,b)=>a.localeCompare(b,'pt-BR')).map(c=>'<option value="'+C(c)+'" '+(selected===c?'selected':'')+'>'+C(c)+'</option>').join('');}
const LIVE_FILTERS={'catalog-search':f=>{filters.q=f('q');filters.brand=f('brand');filters.category=f('category');filters.page=1;},'admin-product-search':f=>{filters.adminQ=f('q');filters.adminBrand=f('brand');filters.adminStatus=f('status');filters.adminLimit=ADMIN_PAGE;},'client-search':f=>{filters.clientQ=f('q');}};
let liveFilterTimer;
function applyLiveFilter(form,focusName){
 const kind=form.dataset.form,apply=LIVE_FILTERS[kind];if(!apply)return;
 const data=new FormData(form);apply(n=>String(data.get(n)||'').trim());
 const active=focusName&&form.querySelector('[name="'+focusName+'"]'),caret=active?.selectionStart;
 render();
 if(focusName){const again=root.querySelector('[data-form="'+kind+'"] [name="'+focusName+'"]');if(again){again.focus();try{again.setSelectionRange(caret,caret);}catch{}}}
}
function photoThumb(src){return src?'<img class="table-photo" src="'+C(src)+'" alt="" loading="lazy">':'<span class="table-photo photo-missing" aria-hidden="true">sem foto</span>';}
function adminCatalog(){
 const list=adminProducts(),shown=list.slice(0,filters.adminLimit||ADMIN_PAGE),brands=[...new Set(state.products.map(p=>p.brand))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
 const statuses=[['','Todos os produtos'],['published','Publicados'],['hidden','Ocultos'],['nophoto','Sem foto'],['nobrand','Marca a confirmar'],['nocategory','Sem categoria']];
 return heading('CATÁLOGO PROFISSIONAL','Painel de produtos.','Edite nome, foto, marca, categoria, embalagem, opções e preços. As alterações aparecem no portal assim que você salva.','<button class="btn primary" data-action="product-new">+ Novo produto</button>')
 +'<form data-form="admin-product-search" class="filterbar"><div class="search-wrap">'+icon('search')+'<input class="search-input" type="search" name="q" value="'+C(filters.adminQ)+'" placeholder="Buscar nome, marca, categoria ou código" aria-label="Buscar produtos"></div>'
 +'<select class="filter-select" name="brand" aria-label="Filtrar por marca"><option value="">Todas as marcas</option>'+brands.map(b=>'<option value="'+C(b)+'" '+(filters.adminBrand===b?'selected':'')+'>'+C(b)+'</option>').join('')+'</select>'
 +'<select class="filter-select" name="status" aria-label="Filtrar por situação">'+statuses.map(([v,l])=>'<option value="'+v+'" '+(filters.adminStatus===v?'selected':'')+'>'+l+'</option>').join('')+'</select>'
 +'<button class="btn ghost" type="button" data-action="clear-admin-products">Limpar</button></form>'
 +'<section class="card table-wrap"><table class="table"><thead><tr><th>Produto</th><th>Categoria</th><th>Opções</th><th>Preço</th><th>Visibilidade</th><th></th></tr></thead><tbody>'
 +shown.map(p=>'<tr><td><div class="row">'+photoThumb(p.image)+'<div><strong>'+C(p.name)+'</strong><small>'+C(p.brand)+(p.size?' · '+C(p.size):'')+(p.featured?' · ★ destaque':'')+'</small></div></div></td><td>'+C(p.category||'—')+'</td><td>'+p.variants.length+'</td><td>'+(p.variants.length===1?'<form data-form="inline-price" data-id="'+C(p.id)+'" class="inline-price"><span>R$</span><input name="price" type="number" min="0.01" max="1000000" step="0.01" value="'+(p.variants[0].price/100).toFixed(2)+'" aria-label="Preço de '+C(p.name)+'" data-inline-price></form>':priceRange(p)+'<small>editar na ficha</small>')+'</td><td><button class="btn small" data-action="toggle-product" data-id="'+C(p.id)+'" aria-label="'+(p.active?'Ocultar':'Publicar')+' '+C(p.name)+'">'+(p.active?'Publicado':'Oculto')+'</button></td><td><button class="btn small" data-action="product-open" data-id="'+C(p.id)+'">Editar ↗</button></td></tr>').join('')
 +'</tbody></table>'+(list.length?'':'<p class="muted" style="padding:20px 0">Nenhum produto encontrado com esses filtros.</p>')+'</section>'
 +'<div class="actions" style="margin-top:18px"><span class="small-label">Mostrando '+shown.length+' de '+list.length+' produtos ('+state.products.length+' no total)</span>'+(shown.length<list.length?'<button class="btn" data-action="admin-more">Mostrar mais</button>':'')+'</div>';
}
function adminHighlights(){
 const featured=state.products.filter(p=>p.featured&&p.active);
 return heading('CURADORIA DO CATÁLOGO','Destaques com intenção.','Escolha os produtos da vitrine inicial do cliente. Esta seleção define a vitrine inicial do portal.')+'<div class="split"><section class="card"><h2 style="font-size:26px">Vitrine do salão</h2><p class="sub" style="font-size:12px">Os três primeiros produtos ativos selecionados aparecem na área do cliente.</p>'+state.products.map(p=>'<div class="switch-row"><label for="feature-'+C(p.id)+'"><strong>'+C(p.name)+'</strong><small style="display:block">'+C(p.brand)+(p.active?'':' · Oculto no catálogo')+'</small></label><input id="feature-'+C(p.id)+'" type="checkbox" data-feature="'+C(p.id)+'" '+(p.featured?'checked':'')+' aria-label="Destacar '+C(p.name)+'"></div>').join('')+'</section><section class="card"><p class="eyebrow">PRÉVIA DA SELEÇÃO</p><h2 style="margin:10px 0 16px">Para a rotina do salão.</h2>'+featured.slice(0,3).map(p=>'<div class="row" style="padding:16px 0;border-bottom:1px solid var(--line)"><img class="table-photo" src="'+p.image+'" alt=""><div><h3>'+C(p.name)+'</h3><small>'+priceRange(p)+'</small></div></div>').join('')+(featured.length?'':'<p class="muted">Selecione ao menos um produto para preencher a vitrine.</p>')+'<p class="metric-note">'+featured.length+' produtos ativos selecionados.</p><button class="btn ghost" style="margin-top:18px" data-action="logout">Testar como cliente ↗</button></section></div>';
}
function notFound(){return '<section class="card empty"><p class="eyebrow">ESTE CAMINHO NÃO EXISTE</p><h1>Vamos encontrar sua próxima tela.</h1><a class="btn primary" href="#/entrar">Voltar ao início →</a></section>';}
function showModal(title,body){modal.innerHTML='<div class="modal-head"><h2 id="modalTitle">'+C(title)+'</h2><button class="close" data-action="modal-close" aria-label="Fechar">×</button></div>'+body;modal.showModal();}
let cepLookup='';
async function fillByCep(el){
 const cep=String(el.value||'').replace(/\D/g,'').slice(0,8),form=el.closest('[data-form="address"]'),status=form?.querySelector('[data-cep-status]');
 if(cep.length===8&&el.value!==cep.slice(0,5)+'-'+cep.slice(5))el.value=cep.slice(0,5)+'-'+cep.slice(5);
 if(!form||cep.length!==8||cep===cepLookup)return;cepLookup=cep;
 const set=(n,v)=>{const f=form.querySelector('[name="'+n+'"]');if(f&&v)f.value=v;};
 if(status)status.textContent='Buscando endereço…';
 try{
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),6000);
  const res=await fetch('https://viacep.com.br/ws/'+cep+'/json/',{signal:ctrl.signal});clearTimeout(timer);
  const d=res.ok?await res.json():{erro:true};
  if(cepLookup!==cep)return;
  if(d.erro){if(status)status.textContent='CEP não encontrado. Confira o número ou preencha o endereço manualmente.';return;}
  const street=form.querySelector('[name="street"]');
  if(d.logradouro&&street&&!street.value.toLowerCase().startsWith(d.logradouro.toLowerCase()))street.value=d.logradouro+', ';
  set('district',d.bairro);set('city',d.localidade);set('uf',d.uf);
  if(status)status.textContent=d.logradouro?'Endereço encontrado. Complete com o número.':'CEP geral da cidade. Preencha rua e bairro.';
  if(street){street.focus();const n=street.value.length;try{street.setSelectionRange(n,n);}catch{}}
 }catch{if(cepLookup===cep)cepLookup='';if(status)status.textContent='Não foi possível buscar o CEP agora. Preencha o endereço manualmente.';}
}
function addressModal(id){cepLookup='';
 const a=client().addresses.find(a=>a.id===id)||{label:'',street:'',district:'',city:'Curitiba',uf:'PR',cep:'',complement:''};
 showModal(id?'Editar endereço':'Novo endereço de entrega','<form data-form="address" data-id="'+C(id||'')+'">'+input('label','Nome do endereço',a.label)+'<div class="field"><label for="f-cep">CEP</label><input id="f-cep" name="cep" type="text" inputmode="numeric" autocomplete="postal-code" placeholder="00000-000" value="'+C(a.cep)+'" required maxlength="9" data-cep><small data-cep-status aria-live="polite">Digite o CEP para preencher o endereço automaticamente.</small></div>'+input('street','Rua, número',a.street)+input('complement','Complemento',a.complement,'text',false)+'<div class="form-grid">'+input('district','Bairro',a.district)+input('city','Cidade',a.city)+input('uf','UF',a.uf)+'</div><p class="form-error" data-form-error role="alert" hidden></p><button class="btn primary full">Salvar endereço →</button></form>');
}
function clientModal(id){
 const c=state.clients.find(c=>c.id===id);if(!c)return;
 const orders=state.orders.filter(o=>o.clientId===id);
 showModal(c.salon,'<p class="eyebrow">CADASTRO DO SALÃO</p><dl class="detail-list"><div><dt>Contato</dt><dd>'+C(c.name)+'</dd></div><div><dt>E-mail</dt><dd>'+C(c.email)+'</dd></div><div><dt>WhatsApp</dt><dd>'+C(c.phone)+'</dd></div><div><dt>Histórico</dt><dd>'+orders.length+' pedido'+(orders.length!==1?'s':'')+' · '+money(orders.reduce((sum,o)=>sum+orderTotal(o),0))+'</dd></div></dl>'+(orders.length?'<div class="rule"></div><h3>Pedidos deste salão</h3>'+orders.map(o=>'<div class="attention"><a class="text-btn" href="#/admin/pedidos/'+o.id+'">'+o.id+' ↗</a> '+badge(o.status)+'</div>').join(''):''));
}
function variantRow(v={id:'',sku:'',label:'',price:0}){
 const n=++variantRowSeq;
 return '<div class="variant-row" data-variant-row><input type="hidden" name="variant_id" value="'+C(v.id)+'">'
 +'<div class="field"><label for="vl-'+n+'">Opção</label><input id="vl-'+n+'" name="variant_label" value="'+C(v.label)+'" placeholder="Ex.: 900 ml" maxlength="300" required></div>'
 +'<div class="field"><label for="vs-'+n+'">Código (SKU)</label><input id="vs-'+n+'" name="variant_sku" value="'+C(v.sku)+'" maxlength="150" required></div>'
 +'<div class="field"><label for="vp-'+n+'">Preço (R$)</label><input id="vp-'+n+'" name="variant_price" type="number" min="0.01" max="1000000" step="0.01" value="'+(v.price?(v.price/100).toFixed(2):'')+'" required></div>'
 +'<button type="button" class="close variant-remove" data-action="variant-remove" aria-label="Remover esta opção">×</button></div>';
}
function textField(name,label,value,{max=100,required=true,type='text',list='',placeholder='',help=''}={}){
 return '<div class="field"><label for="f-'+name+'">'+label+'</label><input id="f-'+name+'" name="'+name+'" type="'+type+'" value="'+C(value)+'" maxlength="'+max+'"'+(required?' required':'')+(list?' list="'+list+'"':'')+(placeholder?' placeholder="'+C(placeholder)+'"':'')+'>'+(help?'<small>'+help+'</small>':'')+'</div>';
}
function productModal(id){
 const p=id?product(id):{id:'',name:'',brand:'',size:'',category:'',description:'',image:'',active:true,featured:false,variants:[{id:'',sku:'',label:'',price:0}]};if(!p)return;
 const uniq=key=>[...new Set(state.products.map(x=>x[key]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR')).map(x=>'<option value="'+C(x)+'"></option>').join('');
 showModal(id?'Editar produto':'Novo produto','<form data-form="product" data-id="'+C(p.id)+'">'
 +'<div class="photo-edit"><div class="photo-frame">'+(p.image?'<img data-photo-preview src="'+C(p.image)+'" alt="Foto atual do produto">':'<img data-photo-preview alt="Prévia da foto" hidden><span class="photo-missing" data-photo-empty>sem foto</span>')+'</div>'
 +'<div class="photo-fields"><div class="field"><label for="f-photo">'+(p.image?'Trocar foto':'Enviar foto')+'</label><input id="f-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" data-photo-input><small>JPG, PNG ou WEBP com até 5 MB. Fundo branco funciona melhor.</small></div>'
 +textField('image','Ou cole o link da foto',p.image,{max:1000,required:false,type:'url',placeholder:'https://…'})+'</div></div>'
 +textField('name','Nome do produto',p.name,{max:300})
 +'<div class="form-grid">'+textField('brand','Marca',p.brand,{list:'brandOptions'})+textField('category','Categoria',p.category,{required:false,list:'categoryOptions'})+'</div>'
 +textField('size','Embalagem / tamanho',p.size,{required:false,placeholder:'Ex.: 1 L, 300 g, kit'})
 +'<div class="field"><label for="f-description">Descrição do produto</label><textarea id="f-description" name="description" maxlength="2000" rows="5" placeholder="Para que serve, principais ativos, modo de uso e resultado esperado no salão." data-count="descriptionCount">'+C(p.description||'')+'</textarea><small><span id="descriptionCount">'+(p.description||'').length+'</span>/2000 caracteres. Quebras de linha são mantidas.</small></div>'
 +'<datalist id="brandOptions">'+uniq('brand')+'</datalist><datalist id="categoryOptions">'+uniq('category')+'</datalist>'
 +'<div class="rule"></div><div class="section-mini"><h3>Opções comerciais</h3><small>Cada opção tem seu próprio código e preço. O cliente escolhe a opção no pedido.</small></div>'
 +'<div data-variant-list>'+p.variants.map(variantRow).join('')+'</div><button type="button" class="btn small ghost" data-action="variant-add">+ Adicionar opção</button>'
 +'<div class="rule"></div><label class="checkbox-line"><input type="checkbox" name="active" '+(p.active?'checked':'')+'>Publicado no catálogo</label><label class="checkbox-line"><input type="checkbox" name="featured" '+(p.featured?'checked':'')+'>Mostrar nos destaques</label>'
 +'<p class="form-error" data-form-error role="alert" hidden></p><button class="btn primary full" style="margin-top:12px">'+(id?'Salvar alterações →':'Cadastrar produto →')+'</button>'
 +(id?'<button type="button" class="btn ghost full danger" style="margin-top:10px" data-action="product-delete" data-id="'+C(p.id)+'">Excluir produto</button><p class="metric-note">Para tirar um produto do ar sem perder o cadastro, desmarque “Publicado no catálogo”.</p>':'')
 +'</form>');
}
function slugify(t){return normalize(t).replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90)||'produto';}
function readVariants(data,existing){
 const all=n=>(data.getAll?data.getAll(n):[].concat(data.get(n)??[])).map(x=>String(x??'').trim());
 const labels=all('variant_label'),skus=all('variant_sku'),prices=all('variant_price'),ids=all('variant_id');
 if(!labels.length)throw new Error('Inclua ao menos uma opção comercial.');
 const used=new Set();
 return labels.map((label,i)=>{
  const sku=skus[i]||'',price=Math.round(Number(String(prices[i]||'').replace(',','.'))*100);
  if(!label||!sku)throw new Error('Preencha a opção e o código de todas as linhas.');
  if(!Number.isSafeInteger(price)||price<1||price>100000000)throw new Error('Informe um preço válido em todas as opções.');
  let id=ids[i]||sku.toUpperCase().replace(/[^A-Z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,140)||'OPCAO';
  if(used.has(id)){let n=2;while(used.has(id+'-'+n))n++;id=id+'-'+n;}used.add(id);
  return {...(existing?.variants.find(v=>v.id===id)||{}),id,sku,label,price};
 });
}
async function uploadPhoto(file,productId){
 const ext=PHOTO_TYPES[file.type];if(!ext)throw new Error('Envie a foto em JPG, PNG ou WEBP.');
 if(file.size>PHOTO_MAX)throw new Error('A foto passa de 5 MB. Reduza o tamanho e tente de novo.');
 const path=slugify(productId).slice(0,80)+'/'+Date.now().toString(36)+'.'+ext,bucket=backend.storage.from(PHOTO_BUCKET);
 checked(await bucket.upload(path,file,{contentType:file.type,cacheControl:'31536000',upsert:false}));
 return bucket.getPublicUrl(path).data.publicUrl;
}
function error(form,text){const el=form.querySelector('[data-form-error]');if(el){el.textContent=text;el.hidden=false;}else toast(text);}
function render(){
 if(emailLink){emailLinkScreen();return;}
 const path=route();if(loading)return;if(modal.open)modal.close();
 if(session&&client()?.must_change_password&&path!=='/primeiro-acesso'){go('/primeiro-acesso');return;}
 if(path==='/primeiro-acesso'&&!session){go('/entrar');return;}
 if(path==='/primeiro-acesso'&&session&&!client()?.must_change_password){go(session.role==='admin'?'/admin':'/cliente');return;}
 if(path.startsWith('/admin')&&path!=='/admin/entrar'&&session?.role!=='admin'){go('/admin/entrar');return;}
 if(path.startsWith('/cliente')&&session?.role!=='client'){go('/entrar');return;}
 if(path.startsWith('/cliente')&&client()?.status!=='approved'&&path!=='/cliente/aguardando'){go('/cliente/aguardando');return;}
 let html;
 if(['/entrar','/admin/entrar','/cadastro','/recuperar','/nova-senha','/primeiro-acesso'].includes(path))html=authScreen(path==='/admin/entrar'?'admin':path.slice(1));
 else if(path==='/catalogo'){go(session?.role==='client'?'/cliente/catalogo':'/entrar');return;}
 else if(path==='/cliente/aguardando'){if(client().status==='approved'){go('/cliente');return;}html=pendingScreen();}
 else if(path==='/cliente')html=shell(customerHome());
 else if(path==='/cliente/catalogo')html=shell(catalogPage());
 else if(path==='/cliente/reposicao')html=shell(catalogPage(true));
 else if(path==='/cliente/marcas')html=shell(brandsPage());
 else if(path.startsWith('/cliente/produto/'))html=shell(productPage(decodeURIComponent(path.slice(17))));
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
 if(kind==='order-cancel'){
  checked(await backend.rpc('fenie_cancel_order',{p_id:form.dataset.id,p_reason:get('reason')||null}));modal.close();await syncAccount();toast('Pedido cancelado.');return;
 }
 if(kind==='login'){
  const credentials=loginCredentials(get('identifier'),String(data.get('password')||''),form.dataset.role==='admin');
  if(credentials.phone){
   const response=await fetch(__SUPABASE_URL__+'/functions/v1/fenie-phone-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(credentials)});
   const result=await response.json();if(!response.ok)throw new Error(result.message||'Não foi possível entrar.');
   checked(await backend.auth.setSession({access_token:result.access_token,refresh_token:result.refresh_token}));
  }else checked(await backend.auth.signInWithPassword(credentials));
  await syncAccount();
  if(form.dataset.role!==session?.role)throw new Error('Sua conta não tem acesso a esta área. Use a área correspondente ao seu perfil.');
  go(session.role==='admin'?'/admin':client().status==='approved'?'/cliente':'/cliente/aguardando');return;
 }
 if(kind==='first-password'){
  if(!session||!client()?.must_change_password)throw new Error('Entre novamente para atualizar sua senha.');
  const password=String(data.get('password')||''),currentPassword=String(data.get('currentPassword')||'');
  if(password.length<10)throw new Error('Escolha uma senha com pelo menos 10 caracteres.');
  if(password!==String(data.get('passwordConfirm')||''))throw new Error('A confirmação não corresponde à nova senha.');
  if(password===currentPassword)throw new Error('Escolha uma senha diferente da senha inicial.');
  const authSession=checked(await backend.auth.getSession());
  const response=await fetch(__SUPABASE_URL__+'/functions/v1/fenie-password-change',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+authSession.session.access_token},body:JSON.stringify({password,currentPassword})});
  const changed=await response.json();if(!response.ok)throw new Error(changed.message||'Não foi possível atualizar sua senha.');
  await syncAccount(true);toast('Sua senha pessoal foi salva. Bem-vindo ao portal!');return;
 }
 if(kind==='register'){
  let phone;try{phone=loginCredentials(get('phone'),'x').phone;}catch{}
  if(!phone)throw new Error('Informe o WhatsApp completo, com DDD. Ex.: (41) 99999-1234.');
  const taken=await backend.rpc('fenie_phone_taken',{p_phone:phone});
  if(taken&&!taken.error&&taken.data===true)throw new Error('Este telefone já tem cadastro. Entre com ele e sua senha, ou fale com a Fenié.');
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
 if(kind==='catalog-search'){filters.q=get('q');filters.brand=get('brand');filters.category=get('category');filters.page=1;render();return;}
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
  const a={user_id:session.clientId};for(const n of ['label','street','district','city','uf','cep','complement'])a[n]=get(n);a.uf=a.uf.toUpperCase();a.cep=String(a.cep||'').replace(/\D/g,'');a.street=String(a.street||'').trim().replace(/,$/,'');
  const id=form.dataset.id;const q=id?backend.from('fenie_addresses').update(a).eq('id',id):backend.from('fenie_addresses').insert(a);
  const saved=checked(await q.select().single());state.checkout.addressId=saved.id;persist();await syncAccount();modal.close();toast('Endereço salvo.');return;
 }
 if(kind==='order-status'&&session?.role==='admin'){
  checked(await backend.rpc('fenie_update_order',{p_id:form.dataset.id,p_status:get('status'),p_note:get('note')}));await syncAccount();toast('Atendimento atualizado.');return;
 }
 if(kind==='inline-price'&&session?.role==='admin'){
  const p=product(form.dataset.id),price=Math.round(Number(String(get('price')).replace(',','.'))*100);if(!p||p.variants.length!==1)return;
  if(!Number.isSafeInteger(price)||price<1||price>100000000)throw new Error('Informe um preço válido.');
  if(price===p.variants[0].price)return;
  checked(await backend.from('fenie_products').update({variants:[{...p.variants[0],price}]}).eq('id',p.id).select().single());
  p.variants=[{...p.variants[0],price}];toast('Preço de '+p.name+' atualizado para '+money(price)+'.');return;
 }
 if(kind==='admin-product-search'&&session?.role==='admin'){filters.adminQ=get('q');filters.adminBrand=get('brand');filters.adminStatus=get('status');filters.adminLimit=ADMIN_PAGE;render();return;}
 if(kind==='product'&&session?.role==='admin'){
  const existing=form.dataset.id?product(form.dataset.id):null,name=get('name'),brand=get('brand');
  if(form.dataset.id&&!existing)throw new Error('Este produto não existe mais. Atualize a página.');
  if(!name)throw new Error('Informe o nome do produto.');if(!brand)throw new Error('Informe a marca.');
  const variants=readVariants(data,existing),id=existing?.id||slugify(name)+'-'+Date.now().toString(36);
  let image=get('image');const file=data.get('photo');
  if(file&&typeof file==='object'&&file.size>0)image=await uploadPhoto(file,id);
  if(image&&!/^https:\/\/\S+$/.test(image))throw new Error('Use um link de foto que comece com https://.');
  const description=String(data.get('description')||'').replace(/\r\n/g,'\n').trim();if(description.length>2000)throw new Error('A descrição passa de 2.000 caracteres.');
  const row={name,brand,size:get('size'),category:get('category'),description,image,variants,active:data.has('active'),featured:data.has('featured')};
  if(existing)checked(await backend.from('fenie_products').update(row).eq('id',id).select().single());
  else checked(await backend.from('fenie_products').insert({id,...row,sort_order:Math.max(0,...state.products.map(p=>p.sort_order||0))+1}).select().single());
  await syncAccount();modal.close();toast(existing?'Produto atualizado.':'Produto cadastrado.');return;
 }
 }catch(e){error(form,friendly(e));if(!form.isConnected)toast(friendly(e));}
 finally{delete form.dataset.busy;setBusy(form,false);}
});
document.addEventListener('change',async event=>{
 const el=event.target;
 if(el.dataset.variant){cartSelections[el.dataset.variant]=el.value;const p=product(el.dataset.variant),v=p?.variants.find(v=>v.id===el.value),card=el.closest('[data-product]');if(card&&v){card.querySelector('.price').textContent=money(v.price);const sku=card.querySelectorAll?card.querySelectorAll('[data-sku]'):[];for(const n of sku)n.textContent=v.sku;for(const ch of card.querySelectorAll?card.querySelectorAll('.option-chip'):[])ch.classList.toggle('active',ch.querySelector('input')?.value===v.id);}return;}
 if(el.hasAttribute('data-status-filter')){filters.status=el.value;render();return;}
 if(el.hasAttribute&&el.hasAttribute('data-inline-price')){el.form?.requestSubmit();return;}
 if(el.tagName==='SELECT'){const form=el.closest('[data-form]');if(form&&LIVE_FILTERS[form.dataset.form]){applyLiveFilter(form);return;}}
 if(el.hasAttribute&&el.hasAttribute('data-photo-input')){const file=el.files?.[0],img=modal.querySelector('[data-photo-preview]');if(!file||!img)return;if(!PHOTO_TYPES[file.type]){toast('Envie a foto em JPG, PNG ou WEBP.');el.value='';return;}if(file.size>PHOTO_MAX){toast('A foto passa de 5 MB.');el.value='';return;}img.src=URL.createObjectURL(file);img.hidden=false;modal.querySelector('[data-photo-empty]')?.remove();return;}
 if(el.name==='payment'){state.checkout.method=el.value;document.querySelector('#installmentsField').hidden=el.value!=='boleto-parcelado';persist();return;}
 if(el.name==='installments'){state.checkout.installments=el.value;persist();return;}
 if(el.name==='address'){state.checkout.addressId=el.value;persist();return;}
 if(el.dataset.editVariant){const v=product(el.dataset.editVariant)?.variants.find(v=>v.id===el.value);if(v)document.querySelector('#editPrice').value=(v.price/100).toFixed(2);return;}
 if(el.dataset.feature&&session?.role==='admin'){try{checked(await backend.from('fenie_products').update({featured:el.checked}).eq('id',el.dataset.feature).select().single());await syncAccount();toast('Destaque atualizado.');}catch(e){el.checked=!el.checked;toast(friendly(e));}}

});
document.addEventListener('input',event=>{if(event.target.id==='orderNotes')state.checkout.notes=event.target.value;
 if(event.target.dataset?.cep!==undefined){fillByCep(event.target);return;}
 if(event.target.name==='q'){const form=event.target.closest?.('[data-form]');if(form&&LIVE_FILTERS[form.dataset.form]){clearTimeout(liveFilterTimer);liveFilterTimer=setTimeout(()=>applyLiveFilter(form,'q'),250);}}const counter=event.target.dataset?.count&&document.getElementById(event.target.dataset.count);if(counter)counter.textContent=event.target.value.length;});
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
 if(action==='clear-filters'){filters.q='';filters.brand='';filters.category='';filters.page=1;render();return;}
 if(action==='clear-client-search'){filters.clientQ='';render();return;}
 if(action==='catalog-page'){filters.page=Number(button.dataset.page)||1;render();document.querySelector('#main')?.scrollIntoView();return;}
 if(action==='save-product'){if(!session){go('/entrar');return;}if(!product(id))return;state.saved=state.saved.includes(id)?state.saved.filter(s=>s!==id):[...state.saved,id];persist();render();toast('Lista de reposição atualizada.');return;}
 if(action==='add-product'){
  if(!session||session.role!=='client'){go('/entrar');return;}if(client().status!=='approved'){go('/cliente/aguardando');return;}
  const p=product(id);if(!p?.active)return;const variantId=(p.variants.find(v=>v.id===cartSelections[id])||p.variants[0]).id,qty=cardQty[id]||1;
  state.cart[variantId]=Math.min(999,(state.cart[variantId]||0)+qty);cardQty[id]=1;persist();render();toast(qty>1?qty+' unidades adicionadas ao pedido.':'Produto adicionado ao pedido.');return;
 }
 if(action==='brand-open'){filters.brand=button.dataset.brand||'';filters.category='';filters.q='';filters.page=1;go('/cliente/catalogo');return;}
 if(action==='category-open'){filters.category=button.dataset.category||'';filters.brand='';filters.q='';filters.page=1;go('/cliente/catalogo');return;}
 if(action==='photo-zoom'){const p=product(id);if(!p)return;showModal(p.name,'<div class="zoom-wrap"><img src="'+C(p.image)+'" alt="'+C(p.name)+'"></div>');return;}
 if(action==='category-chip'){filters.category=button.dataset.category||'';filters.page=1;render();return;}
 if(action==='add-saved'&&session?.role==='client'){let n=0;for(const pid of state.saved){const p=product(pid);if(!p?.active)continue;const v=p.variants.find(v=>v.id===cartSelections[pid])||p.variants[0];state.cart[v.id]=Math.min(999,(state.cart[v.id]||0)+1);n++;}persist();render();toast(n?n+' produtos da reposição adicionados ao pedido.':'Nenhum produto disponível na reposição.');return;}
 if(action==='card-qty'){const q=Math.min(999,Math.max(1,(cardQty[id]||1)+Number(button.dataset.delta)));cardQty[id]=q;const span=button.closest('[data-product]')?.querySelector('[data-qty]');if(span)span.textContent=q;return;}
 if(action==='quantity'&&session?.role==='client'){const q=(state.cart[id]||0)+Number(button.dataset.delta);if(q<1||q>999)return;state.cart[id]=q;persist();render();return;}
 if(action==='remove-item'&&session?.role==='client'){delete state.cart[id];persist();render();return;}
 if(action==='address-open'&&session?.role==='client'){const checkout=root.querySelector('[data-form="checkout"]');if(checkout)saveCheckout(checkout);addressModal(id);return;}
 if(action==='client-open'&&session?.role==='admin'){clientModal(id);return;}
 if(action==='order-cancel'&&session?.role==='client'){const o=state.orders.find(o=>o.id===id&&o.clientId===client().id);if(!o||!canCancel(o))return;showModal('Cancelar pedido '+o.id,'<form data-form="order-cancel" data-id="'+C(o.id)+'"><p class="note" style="margin-bottom:18px">O pedido de '+money(orderTotal(o))+' será cancelado e não será atendido.'+(o.whatsapp_sent_at?' Como a mensagem já foi aberta no WhatsApp, a equipe verá o cancelamento no painel.':'')+'</p><div class="field"><label for="cancelReason">Motivo <small>(opcional)</small></label><textarea id="cancelReason" name="reason" maxlength="300" placeholder="Ex.: pedi produtos errados"></textarea></div><p class="form-error" data-form-error role="alert" hidden></p><div class="actions"><button class="btn primary danger">Confirmar cancelamento</button><button type="button" class="btn ghost" data-action="modal-close">Manter pedido</button></div></form>');return;}
 if(action==='order-received'&&session?.role==='admin'){const o=state.orders.find(o=>o.id===id);if(!o)return;checked(await backend.rpc('fenie_update_order',{p_id:id,p_status:'confirmed',p_note:o.adminNote||''}));await syncAccount();toast('Pedido confirmado como recebido.');return;}
 if(action==='product-details'){const p=product(id);if(!p)return;showModal(p.name,'<div class="detail-head"><img src="'+C(p.image)+'" alt=""><div><p class="eyebrow">'+C(p.brand)+'</p><small>'+C([p.size,p.category].filter(Boolean).join(' · '))+'</small></div></div><p class="detail-text">'+C(p.description)+'</p><div class="rule"></div><h3 style="margin-bottom:10px">Opções</h3>'+p.variants.map(v=>'<div class="summary-line"><span>'+C(v.label)+' <small>'+C(v.sku)+'</small></span><strong>'+money(v.price)+'</strong></div>').join(''));return;}
 if(action==='product-open'&&session?.role==='admin'){productModal(id);return;}
 if(action==='product-new'&&session?.role==='admin'){productModal(null);return;}
 if(action==='admin-more'&&session?.role==='admin'){filters.adminLimit=(filters.adminLimit||ADMIN_PAGE)+ADMIN_PAGE;render();return;}
 if(action==='clear-admin-products'&&session?.role==='admin'){filters.adminQ='';filters.adminBrand='';filters.adminStatus='';filters.adminLimit=ADMIN_PAGE;render();return;}
 if(action==='variant-add'&&session?.role==='admin'){const list=modal.querySelector('[data-variant-list]');if(list)list.insertAdjacentHTML('beforeend',variantRow());return;}
 if(action==='variant-remove'&&session?.role==='admin'){const rows=modal.querySelectorAll('[data-variant-row]');if(rows.length<2){toast('O produto precisa de ao menos uma opção.');return;}button.closest('[data-variant-row]')?.remove();return;}
 if(action==='product-delete'&&session?.role==='admin'){
  if(button.dataset.confirm!=='1'){button.dataset.confirm='1';button.textContent='Confirmar exclusão definitiva';toast('Clique novamente para excluir. Essa ação não pode ser desfeita.');return;}
  const p=product(id);if(!p)return;const removed=checked(await backend.from('fenie_products').delete().eq('id',id).select());
  if(!removed?.length)throw new Error('Não foi possível excluir. Confira seu acesso de administrador.');
  await syncAccount();modal.close();toast('Produto excluído.');return;
 }
 if(action==='toggle-product'&&session?.role==='admin'){const p=product(id);checked(await backend.from('fenie_products').update({active:!p.active}).eq('id',id).select().single());await syncAccount();toast('Publicação atualizada.');return;}
 if(action==='message-open'){
  const o=state.orders.find(o=>o.id===id&&(session?.role==='admin'||o.clientId===client()?.id));if(!o)return;
  const message=messageFor(o);showModal('Mensagem do pedido','<p class="note" style="margin-bottom:18px">Confira a mensagem abaixo. O pedido só é realizado quando você a envia para o nosso atendimento no WhatsApp.</p><pre class="message" id="messageText">'+C(message)+'</pre><div class="actions"><a class="btn primary" target="_blank" rel="noopener noreferrer" '+(session?.role==='client'?'data-wa-order="'+C(o.id)+'" ':'')+'href="https://wa.me/554198402800?text='+encodeURIComponent(message)+'">Enviar para o WhatsApp ↗</a><button class="btn" data-action="copy-message">Copiar mensagem</button></div>');return;
 }
 if(action==='copy-message'){await navigator.clipboard.writeText(document.querySelector('#messageText').textContent);toast('Mensagem copiada.');return;}
 if(action==='reorder'&&session?.role==='client'){
  const o=state.orders.find(o=>o.id===id&&o.clientId===client().id);if(!o)return;let skipped=0;
  for(const i of o.items){const m=variant(i.variantId);if(!m?.p.active){skipped++;continue;}state.cart[i.variantId]=Math.min(999,(state.cart[i.variantId]||0)+i.quantity);}
  persist();go('/cliente/carrinho');toast(skipped?'Alguns itens indisponíveis não foram adicionados.':'Itens adicionados com os preços atuais.');return;
 }
 }catch(e){toast(friendly(e));}finally{delete button.dataset.busy;}
});
document.addEventListener('click',event=>{const a=event.target.closest?.('[data-wa-order]');if(!a||session?.role!=='client')return;const o=state.orders.find(o=>o.id===a.dataset.waOrder);if(!o||o.whatsapp_sent_at)return;o.whatsapp_sent_at=new Date().toISOString();backend.rpc('fenie_mark_whatsapp',{p_id:o.id}).then(r=>{if(r?.error)o.whatsapp_sent_at=null;}).catch(()=>{o.whatsapp_sent_at=null;});});
window.addEventListener('hashchange',()=>{render();window.scrollTo(0,0);document.querySelector('#main')?.focus({preventScroll:true});});
document.addEventListener('click',event=>{const link=event.target.closest('a[href="#main"]');if(link){event.preventDefault();document.querySelector('#main')?.focus();}});
root.innerHTML='<main class="content"><p role="status">Carregando o Portal Fenié…</p></main>';
backend.auth.onAuthStateChange((event)=>{if(event==='PASSWORD_RECOVERY')recoveryMode=true;if(!emailLink&&['SIGNED_OUT','PASSWORD_RECOVERY'].includes(event))setTimeout(()=>syncAccount().catch(()=>{}),0);});
if(emailLink)emailLinkScreen();else syncAccount().catch(()=>{});
})();
