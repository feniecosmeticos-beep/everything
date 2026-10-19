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
  assert.equal(data.products.find(p=>p.sku==='OLK-OX-35V-900').priceCents,5400);
  assert.equal(data.products.filter(p=>p.status!=='hidden').length,712);
  assert.ok(data.products.filter(p=>p.parentSku==='DOH-OX-900').every(p=>p.commercialSku==='DOH-OX-900'));
});
test('WhatsApp encodes the confirmed number, selected volumes, accurate totals and salon name',()=>{
  const state=vm.createContext({I:n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n/100)});
  loadFunction('L',state);loadFunction('catalogueBaseCartSummary',state);state.J=state.catalogueBaseCartSummary;
  loadFunction('TA',state);loadFunction('orderWhatsAppHref',state);
  const quantities={'OLK-OX-35V-900':2,'MC-OX-06V':1,'DOH-OX-900-V10':1};
  const url=new URL(state.orderWhatsAppHref(quantities,data.products,{name:'Salão A & B + teste\nCuritiba'}));
  assert.equal(url.origin,'https://wa.me');assert.equal(url.pathname,'/554198402800');
  const message=url.searchParams.get('text');
  assert.match(message,/35 Vol/);assert.match(message,/6 Vol/);assert.match(message,/10 Vol/);
  assert.match(message,/SKU: DOH-OX-900/);assert.doesNotMatch(message,/V10|DEMONSTRA/);
  assert.match(message,/205,40/);assert.match(message,/Salão A & B \+ teste Curitiba/);
  assert.throws(()=>state.orderWhatsAppHref({},data.products));
  assert.throws(()=>state.orderWhatsAppHref({'MC-OX-900':1},data.products),/Revise/);
});
test('parent SKU search finds all volumes and legacy cart requires a volume choice',()=>{
  const state=vm.createContext({D:s=>s.toLowerCase()});loadFunction('bA',state);
  assert.equal(state.bA(data.products,{query:'MC-OX-900'}).length,4);
  loadFunction('L',state);loadFunction('catalogueBaseCartSummary',state);
  const summary=state.catalogueBaseCartSummary({'MC-OX-900':1},data.products);
  assert.equal(summary.items.length,0);assert.match(summary.issues[0].reason,/volumagem/);
});
