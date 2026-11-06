const {readFileSync} = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const source = readFileSync(path.join(__dirname, '../../assets/catalogue.js'), 'utf8');
// These isolated production functions have no nested function declarations.
function loadFunction(name, context) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `Missing production function: ${name}`);
  const next = source.indexOf('function ', start + 9);
  const code = source.slice(start, next).trim().replace(/async$/, '');
  vm.runInContext(code, context);
}

test('skip link focuses existing content without changing route or rendering', () => {
  const calls = [];
  const state = vm.createContext({R: {
    scrollIntoView: options => calls.push(['scroll', options.block]),
    focus: options => calls.push(['focus', options.preventScroll])
  }});
  loadFunction('handleSkipLink', state);
  const event = {target: {closest: () => ({})}, preventDefault: () => calls.push(['prevent'])};
  assert.equal(state.handleSkipLink(event), true);
  assert.deepEqual(calls, [['prevent'], ['scroll', 'start'], ['focus', true]]);
  calls.length = 0;
  assert.equal(state.handleSkipLink({target: {closest: () => null}}), false);
  assert.equal(calls.length, 0);
});

test('unknown routes render recovery links, while valid routes keep their renderer', () => {
  const calls = [];
  const state = vm.createContext({
    B: {open: false}, k: true, route: '/inexistente', p: () => state.route,
    r: {}, m: {}, v: () => ({}), updateNavigation() {}, ZA: '/',
    window: {scrollY: 0}, u: {open: false}, M: {open: false},
    N: '', j: false, R: {innerHTML: ''}, W() {},
    uA: () => calls.push('catalogue'),
    renderHighlightsPage: () => calls.push('highlights')
  });
  loadFunction('renderNotFoundPage', state);
  loadFunction('no', state);
  state.no();
  assert.match(state.R.innerHTML, /Página não encontrada/);
  assert.match(state.R.innerHTML, /href="#\/catalogo"/);
  assert.equal(calls.length, 0);
  state.route = '/catalogo';
  state.readCatalogueFilters = () => ({query: ''});
  state.no();
  state.route = '/destaques';
  state.no();
  assert.deepEqual(calls, ['catalogue', 'highlights']);
});

test('paused combos never require promotion storage to save a normal order', () => {
  let attempts = 0;
  const state = vm.createContext({
    highlightsConfig: () => ({combosEnabled: false}),
    calculateComboDiscounts: () => ({selections: {}}),
    catalogueBaseCartSummary: () => ({items: []}),
    readComboPromotions: () => ({}), c: {}, d: [],
    localStorage: {setItem() { attempts++; throw new Error('storage full'); }}
  });
  loadFunction('saveComboPromotions', state);
  assert.equal(state.saveComboPromotions(), true);
  assert.equal(attempts, 0);
});

test('active promotion storage still reports failure rather than false success', () => {
  const state = vm.createContext({
    highlightsConfig: () => ({combosEnabled: true}),
    calculateComboDiscounts: () => ({selections: {}}),
    catalogueBaseCartSummary: () => ({items: []}),
    readComboPromotions: () => ({}), c: {}, d: [],
    localStorage: {setItem() { throw new Error('storage full'); }}
  });
  loadFunction('saveComboPromotions', state);
  assert.equal(state.saveComboPromotions(), false);
});

test('invalid quantities and expired or malicious saved carts are rejected', () => {
  const state = vm.createContext({});
  loadFunction('L', state);
  loadFunction('lA', state);
  for (const quantity of [0, -1, 1.5, 1000, NaN, Infinity, '2']) {
    assert.throws(() => state.L(quantity));
  }
  const now = 1770000000000;
  const saved = {version: 1, savedAt: now, items: [
    {id: 'SKU-1', quantity: 2}, {id: '__proto__', quantity: 3},
    {id: 'constructor', quantity: 4}, {id: 'SKU-2', quantity: 1.5}
  ]};
  assert.equal(JSON.stringify(state.lA(JSON.stringify(saved), now)), '{"SKU-1":2}');
  assert.equal(JSON.stringify(state.lA(JSON.stringify({...saved, savedAt: now - 2592000001}), now)), '{}');
  assert.equal(JSON.stringify(state.lA(JSON.stringify({...saved, savedAt: now + 1}), now)), '{}');
  assert.equal(JSON.stringify(state.lA('not JSON', now)), '{}');
});

test('cart totals use integer cents and unavailable items remain issues', () => {
  const state = vm.createContext({});
  loadFunction('L', state);
  loadFunction('catalogueBaseCartSummary', state);
  const summary = state.catalogueBaseCartSummary({A: 2, B: 1, X: 1}, [
    {id: 'A', status: 'active', priceCents: 4250},
    {id: 'B', status: 'unavailable', priceCents: 9000}
  ]);
  assert.equal(summary.totalCents, 8500);
  assert.equal(summary.count, 2);
  assert.equal(summary.issues.length, 2);
});

const data = JSON.parse(source.slice(source.indexOf('uo=')+3,source.indexOf(',lo={')));
const families = JSON.parse(source.slice(source.indexOf('co=')+3,source.indexOf(',uo=')));
test('oxidants have the 14 exact volumes, explicit family aliases and verified prices',()=>{
  const expected={'OLK-OX-BLT-900':[10,20,30,35,40],'MC-OX-900':[6,20,30,40],'DOH-OX-900':[5,10,20,30,40]};
  for(const [parent,volumes] of Object.entries(expected)){
    const options=data.products.filter(p=>p.parentSku===parent);
    assert.deepEqual(options.map(p=>parseInt(p.volumeLabel)),volumes);
    assert.ok(options.every(p=>p.image&&p.imageAlt&&p.status==='consult'&&p.priceCheckedAt==='2026-10-19'));
    const family=families.families.find(f=>f.parentSkus?.includes(parent));
    assert.equal(family.variants.length,volumes.length);
    assert.equal(data.products.find(p=>p.sku===parent).status,'hidden');
  }
  assert.equal(data.products.find(p=>p.sku==='OLK-OX-35V-900').priceCents,4900); // preço do evento Blonde Influence
  assert.equal(data.products.filter(p=>p.status!=='hidden').length,732); // 712 + 17 itens do evento + 3 kits Secret Curl
  assert.ok(data.products.filter(p=>p.parentSku==='DOH-OX-900').every(p=>p.commercialSku==='DOH-OX-900'));
});
test('WhatsApp encodes the confirmed number, selected volumes, accurate totals and salon name',()=>{
  const state=vm.createContext({I:n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n/100)});
  loadFunction('L',state);loadFunction('catalogueBaseCartSummary',state);state.J=state.catalogueBaseCartSummary;
  loadFunction('orderPaymentLabel',state);loadFunction('reviewPaymentSummary',state);loadFunction('TA',state);loadFunction('orderWhatsAppHref',state);
  const quantities={'OLK-OX-35V-900':2,'MC-OX-06V':1,'DOH-OX-900-V10':1};
  const url=new URL(state.orderWhatsAppHref(quantities,data.products,{name:'Salão A & B + teste\nCuritiba'}));
  assert.equal(url.origin,'https://wa.me');assert.equal(url.pathname,'/554198402800');
  const message=url.searchParams.get('text');
  assert.match(message,/35 Vol/);assert.match(message,/6 Vol/);assert.match(message,/10 Vol/);
  assert.match(message,/SKU: DOH-OX-900/);assert.doesNotMatch(message,/V10|DEMONSTRA/);
  assert.match(message,/189,80/);assert.match(message,/Salão A & B \+ teste Curitiba/);
  assert.throws(()=>state.orderWhatsAppHref({},data.products));
  assert.throws(()=>state.orderWhatsAppHref({'MC-OX-900':1},data.products),/Revise/);
});
test('parent SKU search finds all volumes and legacy cart requires a volume choice',()=>{
  const state=vm.createContext({D:s=>s.toLowerCase()});loadFunction('searchRelevance',state);loadFunction('bA',state);
  assert.equal(state.bA(data.products,{query:'MC-OX-900'}).length,4);
  loadFunction('L',state);loadFunction('catalogueBaseCartSummary',state);
  const summary=state.catalogueBaseCartSummary({'MC-OX-900':1},data.products);
  assert.equal(summary.items.length,0);assert.match(summary.issues[0].reason,/volumagem/);
});

test('payment choices and boleto installments are encoded in both WhatsApp and copyable message',()=>{
  const state=vm.createContext({I:n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n/100)});
  for(const name of ['L','catalogueBaseCartSummary','orderPaymentLabel','reviewPaymentSummary','TA','orderWhatsAppHref'])loadFunction(name,state);
  state.J=state.catalogueBaseCartSummary;const items={'MC-OX-06V':2};
  for(const [paymentMethod,paymentInstallments,label] of [
    ['pix','2','Pix'],['credito','2','Cartão de crédito'],['debito','2','Cartão de débito'],
    ['boleto-avista','6','Boleto à vista'],['boleto-parcelado','2','Boleto parcelado em 2x'],
    ['boleto-parcelado','6','Boleto parcelado em 6x'],['combinar','2','A combinar com o atendimento']
  ]){
    const options={paymentMethod,paymentInstallments,name:'Salão & Cia'};
    const message=state.TA(items,data.products,options);
    const url=new URL(state.orderWhatsAppHref(items,data.products,options));
    assert.equal(url.searchParams.get('text'),message);
    assert.ok(message.includes('Forma de pagamento: '+label));
    assert.match(message,/73,80/);assert.match(message,/Salão & Cia/);
    assert.equal((message.match(/Forma de pagamento:/g)||[]).length,1);
  }
  assert.equal(state.orderPaymentLabel('__proto__'),'A combinar com o atendimento');
  assert.equal(state.orderPaymentLabel('constructor'),'A combinar com o atendimento');
  assert.equal(state.orderPaymentLabel('<script>'),'A combinar com o atendimento');
  for(const invalid of ['0','1','7','2.5','6x','2\nOutra linha'])assert.equal(state.orderPaymentLabel('boleto-parcelado',invalid),'Boleto parcelado em até 6x (parcelas a confirmar)');
});
test('review changes keep WhatsApp link and open message synchronized without changing totals',()=>{
  const fields={
    '#clientName':{value:'Salão teste'},
    'input[name="paymentMethod"]:checked':{value:'boleto-parcelado'},
    '#paymentInstallments':{value:'6',disabled:true},
    '#paymentInstallmentField':{hidden:true},
    '#whatsappOrder':{href:''},'.msg-preview':{textContent:''}
  };
  const state=vm.createContext({reviewOrderDetails:{},document:{querySelector:s=>fields[s]},EA:{seller:'teste'},c:{A:1},d:[],
    orderWhatsAppHref:(c,d,o)=>JSON.stringify(o),TA:(c,d,o)=>JSON.stringify(o)});
  loadFunction('orderReviewOptions',state);loadFunction('renderReviewQuote',state);loadFunction('syncOrderReview',state);state.syncOrderReview();
  assert.equal(fields['#paymentInstallmentField'].hidden,false);assert.equal(fields['#paymentInstallments'].disabled,false);
  assert.equal(fields['#whatsappOrder'].href,fields['.msg-preview'].textContent);
  assert.equal(JSON.parse(fields['#whatsappOrder'].href).paymentInstallments,'6');
  fields['input[name="paymentMethod"]:checked'].value='pix';state.syncOrderReview();
  assert.equal(fields['#paymentInstallmentField'].hidden,true);assert.equal(fields['#paymentInstallments'].disabled,true);
  assert.equal(JSON.parse(fields['#whatsappOrder'].href).paymentMethod,'pix');
  assert.equal(state.reviewOrderDetails.name,'Salão teste');
});

test('event prices keep table, event and Pix/card values and reach the WhatsApp message',()=>{
  const ox=data.products.find(p=>p.sku==='MC-OX-06V');
  assert.deepEqual([ox.eventListCents,ox.priceCents,ox.eventPixCents],[4250,3690,3490]);
  const combo=data.products.find(p=>p.id==='EVT-BI-COMBO-01');
  assert.deepEqual([combo.eventListCents,combo.priceCents,combo.eventPixCents],[151300,120900,120900]);
  assert.equal(data.products.filter(p=>p.eventListCents).length,182);
  const event=new vm.Script(readFileSync(path.join(__dirname,'..','..','assets','event-offer.js'),'utf8'));
  const state=vm.createContext({I:n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n/100),document:{addEventListener(){}},window:{}});
  state.globalThis=state;event.runInContext(state);state.FenieEvent=state.window.FenieEvent;
  for(const name of ['L','catalogueBaseCartSummary','orderPaymentLabel','reviewPaymentSummary','TA'])loadFunction(name,state);
  state.J=state.catalogueBaseCartSummary;
  const message=state.TA({'MC-OX-06V':2},data.products,{paymentMethod:'pix'});
  assert.match(message,/Blonde Influence/);assert.match(message,/Unitário: R\$\s?34,90/);
  assert.match(message,/Total no Pix: R\$\s?69,80/);assert.doesNotMatch(message,/73,80/);assert.match(message,/Economia sobre a tabela: R\$\s?15,20/);
});

test('Secret Curl kits keep verified prices and composition without invented promotions',()=>{
  const ids=['OLK-KIT-SCT-HC','OLK-KIT-SCT-ATV','OLK-KIT-SCT-GEL'];
  const kits=ids.map(id=>data.products.find(p=>p.id===id));
  assert.deepEqual(kits.map(p=>p.priceCents),[9400,16000,16000]);
  for(const kit of kits){
    assert.equal(data.products.filter(p=>p.sku===kit.sku).length,1);
    assert.equal(kit.catalogueSection,'Lançamento Secrets');
    assert.ok(kit.image && kit.kitIncludes.length>=2);
    assert.equal(kit.eventListCents,undefined);
    assert.equal(kit.eventPixCents,undefined);
  }
  const state=vm.createContext({I:n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n/100),document:{addEventListener(){}},window:{}});
  state.globalThis=state;
  vm.runInContext(readFileSync(path.join(__dirname,'..','..','assets','event-offer.js'),'utf8'),state);
  state.FenieEvent=state.window.FenieEvent;
  for(const name of ['L','catalogueBaseCartSummary','orderPaymentLabel','reviewPaymentSummary','TA'])loadFunction(name,state);
  state.J=state.catalogueBaseCartSummary;
  const message=state.TA(Object.fromEntries(ids.map(id=>[id,1])),data.products,{paymentMethod:'pix'});
  assert.match(message,/Total no Pix: R\$\s?414,00/);
  assert.match(message,/Composição do kit:/);
  assert.match(message,/Creme Ativador Secret Curl · 250 ml/);
  assert.match(message,/Escova Secret Curl/);
  assert.doesNotMatch(message,/Economia sobre a tabela|Total no Pix\/cartão/);
  assert.match(state.FenieEvent.detail(kits[1]),/O que vem no kit/);
  assert.equal(state.FenieEvent.ribbon(kits[1]),'');
});

test('all 68 variation families validate, and one damaged family cannot disable the others',()=>{
  const state=vm.createContext({});
  loadFunction('NA',state);loadFunction('validVariationFamilies',state);
  assert.equal(state.NA(families,data.products).families.length,68);
  const checked=state.validVariationFamilies(families,data.products);
  assert.equal(checked.rejectedCount,0);
  const broken=structuredClone(families);
  broken.families[0].variants[0].brand='outdated';
  const partial=state.validVariationFamilies(broken,data.products);
  assert.equal(partial.families.length,67);
  assert.equal(partial.rejectedCount,1);
  for(const family of checked.families)for(const variant of family.variants){
    const product=data.products.find(p=>p.sku===variant.sku);
    assert.equal(variant.brand,product.brand);assert.equal(variant.size,product.size);
  }
});

test('shade and volume searches prioritize the exact option and preserve explicit SKU aliases',()=>{
  const state=vm.createContext({D:s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()});
  for(const name of ['searchRelevance','preferredSearchSku','bA'])loadFunction(name,state);
  assert.equal(state.bA(data.products,{query:'MUP 6'})[0].sku,'MUP-COL-6');
  assert.equal(state.bA(data.products,{query:'MUP 6'}).length,1);
  assert.equal(state.bA(data.products,{query:'MUP 6.1'})[0].sku,'MUP-COL-61');
  assert.equal(state.bA(data.products,{query:'oxidante MUP 6vol'})[0].sku,'MC-OX-06V');
  assert.equal(state.bA(data.products,{query:'MUP-COL-6'}).length,1);
  assert.equal(state.bA(data.products,{query:'MC-OX-900'}).length,4);
  const matches=state.bA(data.products,{query:'MUP 6'});
  assert.equal(state.preferredSearchSku({products:matches.filter(p=>p.sku.startsWith('MUP-COL-'))},'MUP 6'),'MUP-COL-6');
});

test('payment quote applies the chosen unit price once and produces one payable total',()=>{
  const state=vm.createContext({I:n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n/100),document:{addEventListener(){}},window:{}});
  state.globalThis=state;
  vm.runInContext(readFileSync(path.join(__dirname,'..','..','assets','event-offer.js'),'utf8'),state);
  state.FenieEvent=state.window.FenieEvent;
  for(const name of ['L','catalogueBaseCartSummary','reviewPaymentSummary','orderPaymentLabel','TA'])loadFunction(name,state);
  state.J=state.catalogueBaseCartSummary;
  const cart={'MUP-COL-6':2,'MC-OX-06V':1,'EVT-BI-COMBO-01':1};
  const base=state.J(cart,data.products);
  for(const [method,expected]of [['pix',128970],['credito',128970],['debito',128970],['boleto-avista',129370],['boleto-parcelado',129370],['combinar',129370]]){
    const quote=state.FenieEvent.paymentQuote(base,method);
    assert.equal(quote.totalCents,expected);
    assert.equal(state.FenieEvent.paymentQuote(quote,method).totalCents,expected);
    assert.equal(quote.items.reduce((sum,item)=>sum+item.subtotalCents,0),expected);
    const message=state.TA(cart,data.products,{paymentMethod:method,paymentInstallments:'6'});
    assert.equal((message.match(/^Total[^\n]*:/gm)||[]).length,1);
    assert.ok(message.includes(state.I(expected)));
    if(method==='pix'){
      assert.match(message,/Unitário: R\$\s?22,90/);assert.match(message,/Subtotal: R\$\s?45,80/);
      assert.doesNotMatch(message,/23,90|47,80|36,90|1\.293,70/);
      const markup=state.FenieEvent.reviewTotals(quote,method);
      assert.match(markup,/Total no Pix/);assert.match(markup,/1\.289,70/);
    }
  }
  const discounted={...base,items:base.items.map((item,i)=>({...item,discountCents:i===0?500:0}))};
  assert.equal(state.FenieEvent.paymentQuote(discounted,'pix').totalCents,128470);
  assert.equal(state.J(cart,data.products).totalCents,base.totalCents);
});

test('review exposes quantity editing and unknown packaging is not inferred from shade codes',()=>{
  const state=vm.createContext({C:String,I:n=>String(n),QA:(id,q,context)=>`<input data-context="${context}" value="${q}">`});
  for(const name of ['buyerSize','mA','reviewItemsMarkup'])loadFunction(name,state);
  for(const code of ['5L','6L','7L','8L','9L']){
    const product=data.products.find(p=>p.sku==='MUP-COL-'+code);
    if(product)assert.equal(state.buyerSize(product),'');
  }
  const product=data.products.find(p=>p.sku==='MUP-COL-6');
  const html=state.reviewItemsMarkup({items:[{product,quantity:2,unitPriceCents:2290,subtotalCents:4580}]});
  assert.match(html,/data-context="review"/);assert.match(html,/value="2"/);assert.match(html,/2290/);assert.match(html,/4580/);
  assert.doesNotMatch(html,/Embalagem a confirmar|2390/);
});

test('nine combos use the PDF perceived values without changing payable totals',()=>{
  const reference=[151300,79880,113370,117370,114370,144200,99960,100660,143200];
  const payable=[120900,68900,93900,94900,94900,109900,78900,78900,109900];
  const combos=reference.map((_,i)=>data.products.find(p=>p.id===`EVT-BI-COMBO-${String(i+1).padStart(2,'0')}`));
  assert.deepEqual(combos.map(p=>p.eventListCents),reference);
  assert.deepEqual(combos.map(p=>p.priceCents),payable);
  assert.deepEqual(combos.map(p=>p.eventPixCents),payable);
  assert.ok(combos.every(p=>p.eventReferenceType==='perceived'));
  assert.equal(data.products.filter(p=>p.eventReferenceType==='perceived').length,9);
  const state=vm.createContext({I:n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n/100),document:{addEventListener(){}},window:{}});
  state.globalThis=state;
  vm.runInContext(readFileSync(path.join(__dirname,'..','..','assets','event-offer.js'),'utf8'),state);
  state.FenieEvent=state.window.FenieEvent;
  for(const name of ['L','catalogueBaseCartSummary','orderPaymentLabel','reviewPaymentSummary','TA'])loadFunction(name,state);
  state.J=state.catalogueBaseCartSummary;
  const all=Object.fromEntries(combos.map(p=>[p.id,1]));
  const summary=state.J(all,data.products);
  assert.equal(summary.totalCents,851100);
  assert.match(state.FenieEvent.cartSavings(summary),/2\.132,10/);
  assert.match(state.FenieEvent.card(combos[0]),/Valor percebido R\$\s?1\.513,00/);
  assert.match(state.FenieEvent.detail(combos[5]),/343,00/);
  assert.match(state.FenieEvent.detail(combos[5]),/abaixo do valor percebido/);
  assert.doesNotMatch(state.FenieEvent.detail(combos[5]),/343,10|Preço de tabela/);
  assert.doesNotMatch(state.FenieEvent.detail(combos[5]),/Ver a arte do combo/);
  for(const paymentMethod of ['pix','credito','debito','boleto-avista','boleto-parcelado']){
    const message=state.TA(all,data.products,{paymentMethod,paymentInstallments:'6'});
    assert.match(message,/Total[^:\n]*: R\$\s?8\.511,00/);
    assert.match(message,/Economia sobre os valores de referência: R\$\s?2\.132,10/);
    assert.match(message,/Valor percebido: R\$\s?1\.513,00/);
    assert.doesNotMatch(message,/Economia sobre a tabela|Total no Pix\/cartão/);
  }
  const mixed=state.TA({'EVT-BI-COMBO-01':1,'MC-OX-06V':2},data.products,{paymentMethod:'pix'});
  assert.doesNotMatch(mixed,/1\.282,80/);
  assert.match(mixed,/Total no Pix: R\$\s?1\.278,80/);
  assert.match(mixed,/Economia sobre os valores de referência: R\$\s?319,20/);
});
