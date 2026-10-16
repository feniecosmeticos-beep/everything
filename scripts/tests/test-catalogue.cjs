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
