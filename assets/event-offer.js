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
    return `<span class="ev-ribbon"><b><span class="ev-long">Exclusivo do evento</span><span class="ev-short">Evento</span></b>${off > 0 ? `<i><span class="ev-upto">até </span>-${off}%</i>` : ""}</span>`;
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
    return pix < summary.totalCents ? `<div class="ev-review"><div class="summary-total ev-review-pix"><span>No Pix ou cartão</span><strong>${brl(pix)}</strong></div></div>` : "";
  }

  function savingsOf(summary) {
    const items = summary?.items || [];
    if (!cfg.active || !items.some((i) => has(i.product))) return null;
    const list = listTotalCents(items);
    return { now: list - summary.totalCents, pix: list - pixTotalCents(items) };
  }

  function cartSavings(summary) {
    const save = savingsOf(summary);
    if (!save || save.pix <= 0) return "";
    const head = save.now > 0
      ? `Você já economizou <strong>${brl(save.now)}</strong> neste pedido`
      : `Pague no Pix ou cartão e economize <strong>${brl(save.pix)}</strong>`;
    const pixLine = save.now > 0 && save.pix > save.now ? `<small>No Pix ou cartão, a economia sobe para ${brl(save.pix)}.</small>` : "";
    return `<div class="ev-savings" role="status"><span class="ev-savings-tag">Evento ${cfg.name}</span><p>${head}</p>${pixLine}</div>`;
  }

  function dockSavings(summary) {
    const save = savingsOf(summary);
    if (!save || save.pix <= 0) return "";
    return `<small class="ev-dock-save">Economia de ${brl(Math.max(save.now, 0) || save.pix)}${save.now > 0 ? "" : " no Pix"}</small>`;
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

  /* ---------- Experiência no celular durante o evento ---------- */

  const SECTIONS = ["Combos do evento", "Lançamento Secrets", "Royal Look", "Blond Tech e Plex", "MUP Color", "Olenkolor", "Tratamentos", "Self Care", "Finalização Happy End", "Men's Care, Therapy e Especialidades"];
  const SECTION_PREVIEW = 6;
  let api = null;
  let lastCount = null;

  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  const productById = (id) => api?.products().find((p) => p.id === id);
  const qtyOf = (id) => Number(api?.cart()[id] || 0);
  /* Atalhos +6 e +12 só para itens de alto giro: oxidantes e tonalidades de coloração */
  const isBulk = (p) => !!p && (/^creme oxidante/i.test(p.name) || (/^MUP-COL-/.test(p.id) && p.category === "Coloração"));

  function bridge(fns) { api = fns; }

  function home(root) {
    if (!api || !cfg.active) return;
    const main = root.querySelector(".main") || root;
    const offers = api.products().filter((p) => has(p) && p.status !== "hidden");
    const groups = SECTIONS.map((name) => ({ name, items: offers.filter((p) => p.eventSection === name) })).filter((g) => g.items.length);
    if (!groups.length) return;
    const sections = groups.map((g, i) => {
      const html = api.cards(g.items, "draft");
      return `<section class="ev-sec results-section" id="ev-sec-${i}" data-ev-sec="${i}" aria-labelledby="ev-sec-title-${i}">
        <div class="ev-sec-head"><h2 id="ev-sec-title-${i}">${esc(g.name)}</h2>${g.name === "Combos do evento" ? "<p>Preço fixo em qualquer forma de pagamento</p>" : ""}</div>
        <div class="product-grid ev-grid" data-ev-grid>${html}</div>
        <button type="button" class="ev-more" data-ev-more hidden>Ver todos de ${esc(g.name)}</button>
      </section>`;
    }).join("");
    main.insertAdjacentHTML("afterbegin", `<section class="ev-home" id="ev-home" aria-label="Ofertas do evento ${esc(cfg.name)}">
      <div class="ev-hero"><span>Evento ${esc(cfg.name)}</span><h1>Ofertas exclusivas para o seu salão</h1><p>No Pix ou cartão o preço fica ainda menor.</p></div>
      <section class="ev-how" aria-labelledby="ev-how-title">
        <h2 id="ev-how-title">Como funciona</h2>
        <ol>
          <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/></svg><span><b>Escolha</b> os produtos</span></li>
          <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/></svg><span><b>Confira</b> o pedido</span></li>
          <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 0 1-13.4 7.9L3 21l1.2-4.4A9 9 0 1 1 21 12Z"/></svg><span><b>Envie</b> pelo WhatsApp</span></li>
        </ol>
        <p>Sem cadastro e sem pagamento aqui. Nossa equipe confirma o pedido e a entrega com você.</p>
      </section>
      <nav class="ev-tabs" aria-label="Linhas em oferta"><div>${groups.map((g, i) => `<button type="button" data-ev-tab="${i}" aria-pressed="${i === 0}">${esc(g.name)}</button>`).join("")}</div></nav>
      ${sections}
      <a class="ev-all" href="#/catalogo">Ver o catálogo completo <span aria-hidden="true">→</span></a>
    </section>`);
    main.querySelectorAll("[data-ev-grid]").forEach((grid) => {
      const cards = [...grid.children];
      if (cards.length > SECTION_PREVIEW + 1) {
        cards.slice(SECTION_PREVIEW).forEach((c) => c.classList.add("ev-collapsed"));
        const more = grid.parentElement.querySelector("[data-ev-more]");
        more.hidden = false;
        more.textContent = `Ver mais ${cards.length - SECTION_PREVIEW} produtos`;
      }
    });
    measureSticky();
    watchSections();
    decorate();
  }

  function measureSticky() {
    const bar = document.querySelector(".topbar");
    const h = bar && getComputedStyle(bar).position === "sticky" ? Math.round(bar.getBoundingClientRect().height) : 0;
    document.documentElement.style.setProperty("--ev-sticky-top", `${h}px`);
  }

  let sectionObserver = null;
  function watchSections() {
    sectionObserver?.disconnect();
    if (!("IntersectionObserver" in window)) return;
    sectionObserver = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!visible) return;
      if (Date.now() < jumpingUntil) return;
      markTab(visible.target.dataset.evSec);
    }, { rootMargin: "-35% 0px -60% 0px" });
    document.querySelectorAll("[data-ev-sec]").forEach((s) => sectionObserver.observe(s));
  }

  let jumpingUntil = 0;
  function markTab(idx) {
    document.querySelectorAll("[data-ev-tab]").forEach((btn) => {
      const on = btn.dataset.evTab === String(idx);
      btn.setAttribute("aria-pressed", String(on));
      if (on) {
        const rail = btn.parentElement;
        rail.scrollTo({ left: btn.offsetLeft - (rail.clientWidth - btn.offsetWidth) / 2, behavior: "smooth" });
      }
    });
  }

  function jumpTo(idx) {
    const sec = document.getElementById(`ev-sec-${idx}`);
    if (!sec) return;
    const tabs = document.querySelector(".ev-tabs");
    const offset = (parseInt(getComputedStyle(document.documentElement).getPropertyValue("--ev-sticky-top")) || 0) + (tabs?.offsetHeight || 0) + 8;
    jumpingUntil = Date.now() + 1200;
    markTab(idx);
    window.scrollTo({ top: Math.max(0, sec.getBoundingClientRect().top + window.scrollY - offset), behavior: "smooth" });
  }

  function stepperMarkup(p, qty) {
    const bulk = isBulk(p) ? `<div class="ev-bulk"><button type="button" data-ev-step="6">+6</button><button type="button" data-ev-step="12">+12</button></div>` : "";
    return `<div class="ev-step" ${qty ? "" : "hidden"}><button type="button" data-ev-step="-1" aria-label="Diminuir quantidade de ${esc(p.name)}">−</button><output aria-live="polite">${qty}</output><button type="button" data-ev-step="1" aria-label="Aumentar quantidade de ${esc(p.name)}">+</button></div>${bulk}`;
  }

  function decorate() {
    if (!api) return;
    document.querySelectorAll("#view .card-bottom").forEach((bottom) => {
      const add = bottom.querySelector('button.add-btn[data-add-count="1"][data-id]');
      let box = bottom.querySelector(".ev-qty");
      if (!add) { box?.remove(); return; }
      const id = add.dataset.id;
      const p = productById(id);
      if (!p || p.status === "unavailable") { box?.remove(); return; }
      if (!box || box.dataset.evId !== id) {
        box?.remove();
        add.insertAdjacentHTML("afterend", `<div class="ev-qty" data-ev-id="${esc(id)}">${stepperMarkup(p, qtyOf(id))}</div>`);
        box = bottom.querySelector(".ev-qty");
      }
      syncBox(box, add);
    });
  }

  function syncBox(box, add) {
    const qty = qtyOf(box.dataset.evId);
    const step = box.querySelector(".ev-step");
    if (step.hidden !== !qty) step.hidden = !qty;
    const out = step.querySelector("output");
    if (out.textContent !== String(qty)) out.textContent = qty;
    step.querySelector('[data-ev-step="1"]').disabled = qty >= 999;
    if (add && add.hidden !== !!qty) add.hidden = !!qty;
    box.closest(".product-card")?.classList.toggle("ev-in-cart", !!qty);
  }

  /* Na revisão, o botão do WhatsApp fica sempre ao alcance do polegar */
  let sendObserver = null;
  function syncSendBar() {
    let bar = document.getElementById("evSendBar");
    const onReview = location.hash === "#/resumo" && !!document.querySelector("#whatsappOrder");
    if (!onReview) { if (bar) bar.hidden = true; sendObserver?.disconnect(); return; }
    if (!bar) {
      document.body.insertAdjacentHTML("beforeend", '<div id="evSendBar" class="ev-send-bar" hidden><button type="button" data-ev-send>Enviar pedido pelo WhatsApp <span aria-hidden="true">→</span></button></div>');
      bar = document.getElementById("evSendBar");
    }
    bar.hidden = false;
    sendObserver?.disconnect();
    if ("IntersectionObserver" in window) {
      sendObserver = new IntersectionObserver(([entry]) => { bar.classList.toggle("ev-send-hide", entry.isIntersecting); });
      sendObserver.observe(document.querySelector("#whatsappOrder"));
    }
  }

  function onCart(summary) {
    syncSendBar();
    document.querySelectorAll("#view .ev-qty").forEach((box) => syncBox(box, box.parentElement.querySelector("button.add-btn")));
    const count = summary?.count ?? 0;
    if (lastCount !== null && count > lastCount) {
      const dock = document.querySelector("#orderDock");
      dock?.classList.remove("ev-bump");
      void dock?.offsetWidth;
      dock?.classList.add("ev-bump");
    }
    lastCount = count;
  }

  function added(button, id) {
    try { navigator.vibrate?.(12); } catch {}
    const box = button.closest(".ev-qty") || button.closest(".card-bottom")?.querySelector(".ev-qty");
    if (box) {
      const out = box.querySelector("output");
      out?.classList.remove("ev-flash"); void out?.offsetWidth; out?.classList.add("ev-flash");
      return;
    }
    if (button.dataset.evLabel === undefined) button.dataset.evLabel = button.innerHTML;
    button.classList.add("ev-added");
    button.innerHTML = "✓ Adicionado ao pedido";
    clearTimeout(button._evTimer);
    button._evTimer = setTimeout(() => { button.classList.remove("ev-added"); button.innerHTML = button.dataset.evLabel; }, 1400);
  }

  document.addEventListener("click", (event) => {
    const stepBtn = event.target.closest("[data-ev-step]");
    if (stepBtn && api) {
      const box = stepBtn.closest(".ev-qty");
      const id = box?.dataset.evId;
      if (!id) return;
      event.preventDefault();
      const delta = Number(stepBtn.dataset.evStep);
      const next = Math.max(0, Math.min(999, qtyOf(id) + delta));
      api.setQty(id, next);
      if (delta > 0) added(stepBtn, id);
      return;
    }
    const tab = event.target.closest("[data-ev-tab]");
    if (tab) {
      jumpTo(tab.dataset.evTab);
      return;
    }
    const more = event.target.closest("[data-ev-more]");
    if (more) {
      more.parentElement.querySelectorAll(".ev-collapsed").forEach((c) => c.classList.remove("ev-collapsed"));
      more.hidden = true;
      decorate();
      return;
    }
    if (event.target.closest("[data-ev-send]")) {
      document.querySelector("#whatsappOrder")?.click();
      return;
    }
    const offers = event.target.closest("[data-ev-offers]");
    if (offers) {
      event.preventDefault();
      const goTop = () => document.getElementById("ev-home")?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (["", "#", "#/"].includes(location.hash)) goTop();
      else { location.hash = "/"; setTimeout(goTop, 350); }
    }
  });

  let pending = 0;
  function scheduleDecorate() {
    if (pending) return;
    pending = requestAnimationFrame(() => { pending = 0; decorate(); });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!cfg.active) document.documentElement.classList.add("ev-off");
    countdown();
    const view = document.querySelector("#view");
    if (view && "MutationObserver" in window) new MutationObserver(scheduleDecorate).observe(view, { childList: true, subtree: true });
    window.addEventListener("resize", measureSticky, { passive: true });
    window.addEventListener("hashchange", () => setTimeout(syncSendBar, 50));
  });

  window.FenieEvent = { cfg, has, card, detail, ribbon, ribbonFamily, msgItem, msgTotal, reviewTotal, cartSavings, dockSavings, greeting, summaryNote, bridge, home, onCart, added };
})();
