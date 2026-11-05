"""Aplica os preços do evento Blonde Influence em assets/catalogue.js.

Uso: python scripts/apply-event-prices.py
Fonte: content/evento-blonde-influence.json (TABELA, EVENTO e PIX/CARTÃO do talonário).
Executa uma vez sobre o catálogo sem preços de evento. Para encerrar, reverta o commit.
"""
import json, pathlib, re, sys, unicodedata

ROOT = pathlib.Path(__file__).resolve().parents[1]
JS = ROOT / "assets" / "catalogue.js"
EVENT = json.loads((ROOT / "content" / "evento-blonde-influence.json").read_text(encoding="utf-8"))

src = JS.read_text(encoding="utf-8")
if "eventListCents" in src:
    sys.exit("Preços do evento já aplicados.")

start = src.index('"products":[') + len('"products":')
depth, j, in_str, esc = 0, start, False, False
while True:
    c = src[j]
    if in_str:
        if esc: esc = False
        elif c == "\\": esc = True
        elif c == '"': in_str = False
    elif c == '"': in_str = True
    elif c == "[": depth += 1
    elif c == "]":
        depth -= 1
        if depth == 0: break
    j += 1
products = json.loads(src[start:j + 1])
by_id = {p["id"]: p for p in products}

def slugify(text):
    text = unicodedata.normalize("NFD", text.lower())
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-")

EVENT_ORDER = -2000
for n, row in enumerate(EVENT["rows"]):
    fields = {"priceCents": row["event"], "eventListCents": row["list"], "eventPixCents": row["pix"], "eventSection": row["section"]}
    if "ids" in row:
        for pid in row["ids"]:
            p = by_id[pid]
            p.update(fields)
            p["order"] = EVENT_ORDER + n + (p["order"] % 1000) / 1000
            p["keywords"] = [*p.get("keywords", []), "evento", "blonde influence", "oferta"]
    else:
        meta = row["new"]
        combo = meta["category"] == "Combos do evento"
        if combo:
            number, _, title = row["name"].partition(" ")
            name = f"Combo {number} · {title.title()}"
        else:
            name = row["name"]
        products.append({
            "id": meta["id"], "sku": meta["id"], "slug": f"{slugify(name)}-{meta['id'].lower()}",
            "name": name, "brand": meta["brand"], "sourceGroup": meta["brand"],
            "line": meta["category"], "category": meta["category"], "size": meta["size"],
            "status": "consult", "order": EVENT_ORDER + n,
            "keywords": [meta["id"], meta["brand"], meta["category"], "evento", "blonde influence", "oferta", *(["combo"] if combo else [])],
            "reviewPending": ["Foto oficial", "Disponibilidade comercial"] + (["Composição do combo"] if combo else []),
            **fields,
        })

data = json.dumps(products, ensure_ascii=False, separators=(",", ":"))
src = src[:start] + data + src[j + 1:]

PATCHES = [
    # Ponte entre o catálogo e assets/event-offer.js (carrinho, produtos e cards)
    ('k=!0,no()',
     'k=!0,globalThis.FenieEvent&&globalThis.FenieEvent.bridge({cart:()=>c,products:()=>d,summary:()=>J(c,d),setQty:(i,q)=>{let P=d.find(x=>x.id===i);if(!P||["hidden","unavailable"].includes(P.status))return!1;q>0?c[i]=Math.min(999,q):delete c[i];return Z()},cards:(l,o)=>eo(l,o||"draft"),toast:t}),no()'),
    # Vitrine do evento no topo da página inicial
    ('["/","/catalogo","/marcas","/selecoes"].includes(A)?uA():',
     '["/","/catalogo","/marcas","/selecoes"].includes(A)?(uA(),A==="/"&&globalThis.FenieEvent&&globalThis.FenieEvent.home(R)):'),
    # Avisa a camada do evento a cada mudança no pedido
    ('function W(){let A=J(c,d);',
     'function W(){let A=J(c,d);globalThis.FenieEvent&&globalThis.FenieEvent.onCart&&queueMicrotask(()=>globalThis.FenieEvent.onCart(A));'),
    # Barra do pedido leva direto para a revisão e o WhatsApp
    ('<a href="#/carrinho" class="primary">Revisar pedido <span aria-hidden="true">\\u2192</span></a>`)}',
     '<a href="#/resumo" class="primary">Finalizar pedido <span aria-hidden="true">\\u2192</span></a>`)}'),
    # Confirmação no próprio botão em vez do aviso que cobre a tela
    ('c[a]=s,Z()&&t("Produto adicionado ao pedido."),document.querySelector("#toast").insertAdjacentHTML(',
     'c[a]=s;if(globalThis.FenieEvent&&globalThis.FenieEvent.added){Z();globalThis.FenieEvent.added(o,a,g);return}Z()&&t("Produto adicionado ao pedido."),document.querySelector("#toast").insertAdjacentHTML('),
    ('return `<div class="hl-discount-summary" data-combo-summary>${summary.discountCents?',
     'return `<div class="hl-discount-summary" data-combo-summary>${globalThis.FenieEvent?globalThis.FenieEvent.cartSavings(summary):""}${summary.discountCents?'),
    ('<small>${A.count} ${A.count===1?"unidade no pedido":"unidades no pedido"}</small><strong>${I(A.totalCents)}</strong></div>',
     '<small>${A.count} ${A.count===1?"unidade no pedido":"unidades no pedido"}</small><strong>${I(A.totalCents)}</strong>${globalThis.FenieEvent?globalThis.FenieEvent.dockSavings(A):""}</div>'),
    ('document.querySelector(".review-banner span").textContent=',
     '(document.querySelector(".review-banner span")||{}).textContent='),
    ('<a href="#/produto/${A.slug}" class="product-link"><div class="product-visual">${O(A)}</div>',
     '<a href="#/produto/${A.slug}" class="product-link"><div class="product-visual">${O(A)}${globalThis.FenieEvent?globalThis.FenieEvent.ribbon(A):""}</div>'),
    ('<div class="price">${I(A.priceCents)}</div>',
     '<div class="price">${globalThis.FenieEvent?globalThis.FenieEvent.card(A):I(A.priceCents)}</div>'),
    ('<a href="#/produto/${e.slug}" class="product-link"><div class="product-visual">${O(e)}</div>',
     '<a href="#/produto/${e.slug}" class="product-link"><div class="product-visual">${O(e)}${globalThis.FenieEvent?globalThis.FenieEvent.ribbonFamily(A.products):""}</div>'),
    ('<div class="price">${a?I(a.priceCents):`<small>A partir de</small> ${I(iA(A,dA[`${o}:${i.id}`]))}`}</div>',
     '<div class="price">${a?(globalThis.FenieEvent?globalThis.FenieEvent.card(a):I(a.priceCents)):`<small>A partir de</small> ${I(iA(A,dA[`${o}:${i.id}`]))}`}</div>'),
    ('<div class="detail-price">${I(o.priceCents)}<small>por unidade de venda \\xB7 tabela padr\\xE3o Mercos</small></div>',
     '${globalThis.FenieEvent?globalThis.FenieEvent.detail(o):`<div class="detail-price">${I(o.priceCents)}<small>por unidade de venda \\xB7 tabela padr\\xE3o Mercos</small></div>`}'),
    ('`Unit\\xE1rio: ${I(g.priceCents)}`,',
     '`Unit\\xE1rio: ${I(g.priceCents)}`,...(globalThis.FenieEvent?globalThis.FenieEvent.msgItem(g):[]),'),
    ('`Total dos produtos: ${I(n.totalCents)}`,',
     '`Total dos produtos: ${I(n.totalCents)}`,...(globalThis.FenieEvent?globalThis.FenieEvent.msgTotal(n.items,paymentMethod):[]),'),
    ('"Ol\\xE1! Montei um pedido pelo Cat\\xE1logo Feni\\xE9 PRO."',
     '(globalThis.FenieEvent?globalThis.FenieEvent.greeting():"Ol\\xE1! Montei um pedido pelo Cat\\xE1logo Feni\\xE9 PRO.")'),
    ('Tabela padr\\xE3o Mercos \\xB7 ${C(rA)}',
     '${globalThis.FenieEvent?globalThis.FenieEvent.summaryNote():`Tabela padr\\xE3o Mercos \\xB7 ${C(rA)}`}'),
    ('<div class="summary-total"><span>Total dos produtos</span><strong>${I(A.totalCents)}</strong></div></div><div class="field"><label for="clientName">',
     '<div class="summary-total"><span>Total dos produtos</span><strong>${I(A.totalCents)}</strong></div>${globalThis.FenieEvent?globalThis.FenieEvent.reviewTotal(A):""}</div><div class="field"><label for="clientName">'),
]
for old, new in PATCHES:
    count = src.count(old)
    if count != 1:
        sys.exit(f"Trecho esperado 1 vez, encontrado {count}: {old[:60]}")
    src = src.replace(old, new)

JS.write_text(src, encoding="utf-8")
total = sum(len(r.get("ids", [])) for r in EVENT["rows"])
added = sum("new" in r for r in EVENT["rows"])
print(f"{total} produtos com preço de evento, {added} itens novos, {len(PATCHES)} ajustes de exibição.")
