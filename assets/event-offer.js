/* Condição comercial do evento Blonde Influence.
   Os preços do evento ficam em assets/catalogue.js (priceCents, eventListCents, eventPixCents),
   aplicados por scripts/apply-event-prices.py. Para encerrar, reverta o commit que aplicou os preços.
   Para exibir contagem regressiva, preencha `endsAt` (ex.: "2026-11-09T23:59:00-03:00"). */
(() => {
  const cfg = {
    active: true,
    name: "Blonde Influence",
    dateLabel: "09/11/2026",
    endsAt: null
  };

  const brl = (cents) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const has = (p) => cfg.active && p && Number.isSafeInteger(p.eventListCents) && p.eventListCents > 0;
  const pixOf = (p) => (has(p) && Number.isSafeInteger(p.eventPixCents) ? p.eventPixCents : p.priceCents);
  const pct = (p) => Math.round((1 - pixOf(p) / p.eventListCents) * 100);
  const isCombo = (p) => p.category === "Combos do evento";

  function ribbon(p) {
    if (!has(p)) return "";
    const off = pct(p);
    return `<span class="ev-ribbon"><b><span class="ev-long">Exclusivo do evento</span><span class="ev-short">Evento</span></b>${off > 0 ? `<i>-${off}%</i>` : ""}</span>`;
  }

  function ribbonFamily(products) {
    const offers = (products || []).filter(has);
    if (!offers.length) return "";
    const off = Math.max(...offers.map(pct));
    return `<span class="ev-ribbon"><b><span class="ev-long">Exclusivo do evento</span><span class="ev-short">Evento</span></b>${off > 0 ? `<i>até -${off}%</i>` : ""}</span>`;
  }

  function card(p) {
    if (!has(p)) return brl(p.priceCents);
    const pix = pixOf(p);
    const pixLine = isCombo(p)
      ? `<span class="ev-pix ev-pix-fixed"><small>Preço único em qualquer pagamento</small></span>`
      : pix < p.priceCents ? `<span class="ev-pix">${brl(pix)} <small>no Pix ou cartão</small></span>` : "";
    return `<span class="ev-price"><del>De ${brl(p.eventListCents)}</del><span class="ev-now">${brl(p.priceCents)}</span>${pixLine}</span>`;
  }

  function detail(p) {
    if (!has(p)) return `<div class="detail-price">${brl(p.priceCents)}<small>por unidade de venda · tabela padrão Mercos</small></div>`;
    const pix = pixOf(p);
    const save = p.eventListCents - pix;
    return `<div class="detail-price ev-detail">
      <span class="ev-tag">Preço exclusivo · Evento ${cfg.name}</span>
      <del>Preço de tabela ${brl(p.eventListCents)}</del>
      <div class="ev-detail-row"><div><small>Preço do evento</small><strong>${brl(p.priceCents)}</strong></div>${
        !isCombo(p) && pix < p.priceCents ? `<div class="ev-detail-pix"><small>No Pix ou cartão</small><strong>${brl(pix)}</strong></div>` : ""
      }</div>
      ${save > 0 ? `<p class="ev-save">Você economiza ${brl(save)} por unidade${pct(p) > 0 ? ` (${pct(p)}% abaixo da tabela)` : ""}.</p>` : ""}
      <p class="ev-terms">${isCombo(p) ? "Combo com preço fixo, válido em qualquer forma de pagamento." : "Condição válida apenas para pedidos do evento. Fora dele, vale a tabela regular."}</p>
    </div>`;
  }

  function msgItem(p) {
    if (!has(p)) return [];
    const lines = [`Tabela: ${brl(p.eventListCents)} · preço do evento ${cfg.name}`];
    if (!isCombo(p) && pixOf(p) < p.priceCents) lines.push(`No Pix/cartão: ${brl(pixOf(p))}`);
    return lines;
  }

  function pixTotalCents(items) {
    return (items || []).reduce((sum, { product, quantity, subtotalCents }) => {
      if (!has(product)) return sum + subtotalCents;
      const discount = product.priceCents * quantity - subtotalCents;
      return sum + pixOf(product) * quantity - discount;
    }, 0);
  }

  function listTotalCents(items) {
    return (items || []).reduce((sum, { product, quantity, subtotalCents }) => sum + (has(product) ? product.eventListCents * quantity : subtotalCents), 0);
  }

  function msgTotal(items, method) {
    if (!cfg.active || !(items || []).some((i) => has(i.product))) return [];
    const total = items.reduce((s, i) => s + i.subtotalCents, 0);
    const pix = pixTotalCents(items);
    const list = listTotalCents(items);
    const lines = [];
    if (pix < total) lines.push(`Total no Pix/cartão: ${brl(pix)}`);
    const best = ["pix", "credito", "debito"].includes(method) ? pix : total;
    if (list > best) lines.push(`Economia sobre a tabela: ${brl(list - best)}`);
    return lines;
  }

  function reviewTotal(summary) {
    const items = summary?.items || [];
    if (!cfg.active || !items.some((i) => has(i.product))) return "";
    const pix = pixTotalCents(items);
    const list = listTotalCents(items);
    return `<div class="ev-review">${pix < summary.totalCents ? `<div class="summary-total ev-review-pix"><span>No Pix ou cartão</span><strong>${brl(pix)}</strong></div>` : ""}${
      list > pix ? `<p class="ev-save">Economia de até ${brl(list - pix)} sobre a tabela, só no evento ${cfg.name}.</p>` : ""
    }</div>`;
  }

  const greeting = () => (cfg.active ? `Olá! Montei meu pedido com os preços exclusivos do evento ${cfg.name}.` : "Olá! Montei um pedido pelo Catálogo Fenié PRO.");
  const summaryNote = () => (cfg.active ? `Preços exclusivos do evento ${cfg.name} nos itens marcados` : "Tabela padrão Mercos");

  function countdown() {
    const el = document.querySelector("[data-ev-countdown]");
    if (!el || !cfg.endsAt) return;
    const end = new Date(cfg.endsAt).getTime();
    const tick = () => {
      const left = end - Date.now();
      if (left <= 0) { el.textContent = "Condição encerrada"; return; }
      const h = Math.floor(left / 36e5), m = Math.floor((left % 36e5) / 6e4), s = Math.floor((left % 6e4) / 1e3);
      el.textContent = `Termina em ${h}h ${String(m).padStart(2, "0")}min ${String(s).padStart(2, "0")}s`;
      setTimeout(tick, 1000);
    };
    el.hidden = false;
    tick();
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!cfg.active) document.documentElement.classList.add("ev-off");
    countdown();
  });

  window.FenieEvent = { cfg, has, card, detail, ribbon, ribbonFamily, msgItem, msgTotal, reviewTotal, greeting, summaryNote };
})();
