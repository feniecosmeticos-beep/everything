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
  const isPerceived = (p) => has(p) && p.eventReferenceType === "perceived";

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
    const gifts = Array.isArray(p.eventGifts) && p.eventGifts.length ? `<span class="ev-gifts">+ ${p.eventGifts.length} brindes inclusos</span>` : "";
    const pixLine = isCombo(p)
      ? `<span class="ev-pix ev-pix-fixed"><small>Preço único em qualquer pagamento</small></span>${gifts}`
      : pix < p.priceCents ? `<span class="ev-pix">${brl(pix)} <small>no Pix ou cartão</small></span>` : "";
    return `<span class="ev-price"><del>${isPerceived(p) ? "Valor percebido" : "De"} ${brl(p.eventListCents)}</del><span class="ev-now">${brl(p.priceCents)}</span>${pixLine}</span>`;
  }

  function detail(p) {
    if (!has(p)) return `<div class="detail-price">${brl(p.priceCents)}<small>por unidade de venda · tabela padrão Mercos</small></div>${comboDetail(p)}`;
    const pix = pixOf(p);
    const save = p.eventListCents - pix;
    return `<div class="detail-price ev-detail">
      <span class="ev-tag">Preço exclusivo · Evento ${cfg.name}</span>
      <del>${isPerceived(p) ? "Valor percebido" : "Preço de tabela"} ${brl(p.eventListCents)}</del>
      <div class="ev-detail-row"><div><small>Preço do evento</small><strong>${brl(p.priceCents)}</strong></div>${
        !isCombo(p) && pix < p.priceCents ? `<div class="ev-detail-pix"><small>No Pix ou cartão</small><strong>${brl(pix)}</strong></div>` : ""
      }</div>
      ${save > 0 ? `<p class="ev-save">Você economiza ${brl(save)} por unidade${pct(p) > 0 ? ` (${pct(p)}% abaixo ${isPerceived(p) ? "do valor percebido" : "da tabela"})` : ""}.</p>` : ""}
      <p class="ev-terms">${isCombo(p) ? "Combo com preço fixo, válido em qualquer forma de pagamento." : "Condição válida apenas para pedidos do evento. Fora dele, vale a tabela regular."}</p>
    </div>${comboDetail(p)}`;
  }

  function comboDetail(p) {
    const items = isCombo(p) ? p.eventIncludes : p.kitIncludes;
    if (!Array.isArray(items) || !items.length) return "";
    const label = isCombo(p) ? "O que vem no combo" : "O que vem no kit";
    const list = (items) => items.map((x) => `<li>${esc(x)}</li>`).join("");
    return `<section class="ev-combo" aria-label="${label}">
      <h2>${label}</h2><ul class="ev-combo-items">${list(items)}</ul>
      ${p.eventGifts?.length ? `<div class="ev-combo-gifts"><h3>Brindes inclusos</h3><ul>${list(p.eventGifts)}</ul></div>` : ""}
      ${p.eventNote ? `<p class="ev-combo-note">${esc(p.eventNote)}</p>` : ""}
      ${p.eventArt && !isPerceived(p) ? `<details class="ev-combo-art-box"><summary>Ver a arte do combo</summary><img class="ev-combo-art" src="${esc(p.eventArt)}" alt="Arte do ${esc(p.name)} com produtos, brindes e preço" loading="lazy" decoding="async" width="900" height="1125"></details>` : ""}
    </section>`;
  }

  function msgItem(p) {
    if (!has(p)) return p.kitIncludes?.length ? [`Composição do kit: ${p.kitIncludes.join("; ")}`] : [];
    const lines = [`${isPerceived(p) ? "Valor percebido" : "Tabela"}: ${brl(p.eventListCents)} · preço do evento ${cfg.name}`];
    if (isCombo(p) && p.eventGifts?.length) lines.push(`Brindes: ${p.eventGifts.join(", ")}`);
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
    if (list > best) lines.push(`Economia sobre ${items.some((i) => isPerceived(i.product)) ? "os valores de referência" : "a tabela"}: ${brl(list - best)}`);
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

  const greeting = () => (cfg.active ? `Olá! Montei meu pedido pelo catálogo do evento ${cfg.name}.` : "Olá! Montei um pedido pelo Catálogo Fenié PRO.");
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
  const SECTION_PREVIEW = 3;
  let api = null;
  let lastCount = null;

  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  const productById = (id) => api?.products().find((p) => p.id === id);
  const qtyOf = (id) => Number(api?.cart()[id] || 0);
  /* Atalhos +6 e +12 só para itens de alto giro: oxidantes e tonalidades de coloração */
  const isBulk = (p) => !!p && (/^creme oxidante/i.test(p.name) || (/^MUP-COL-/.test(p.id) && p.category === "Coloração"));

  function bridge(fns) { api = fns; }

  function offerGroups() {
    const offers = api.products().filter((p) => (has(p) || p.catalogueSection === "Lançamento Secrets") && p.status !== "hidden");
    return SECTIONS.map((name) => ({ name, items: offers.filter((p) => (p.catalogueSection || p.eventSection) === name) })).filter((g) => g.items.length);
  }

  function collectionFromUrl(groups) {
    const params = new URLSearchParams(location.hash.split("?")[1] || "");
    const requested = params.get("colecao");
    const collection = ["combos", "lancamentos", "linhas"].includes(requested) ? requested : "combos";
    const lines = groups.filter((g) => !["Combos do evento", "Lançamento Secrets"].includes(g.name));
    const line = lines.find((g) => g.name === params.get("linha"))?.name || lines[0]?.name;
    return { collection, line, lines };
  }

  function home(root) {
    if (!api || !cfg.active) return;
    const main = root.querySelector(".main") || root;
    const groups = offerGroups();
    if (!groups.length) return;
    const state = collectionFromUrl(groups);
    // A página do evento substitui a vitrine genérica; marcas e seleções mantêm suas rotas próprias.
    main.innerHTML = `<section class="ev-home" id="ev-home" aria-label="Ofertas do evento ${esc(cfg.name)}">
      <div class="ev-editorial">
        <p class="ev-eyebrow">A seleção ${esc(cfg.name)} · ${esc(cfg.dateLabel)}</p>
        <h1>Grandes resultados.<br><em>Boas escolhas.</em></h1>
        <p class="ev-editorial-copy">Produtos profissionais e preços exclusivos<br class="ev-desktop-break"> para renovar a sua bancada.</p>
        <a class="ev-discover" href="#ev-products" data-ev-discover>Descobrir ofertas <span aria-hidden="true">→</span></a>
        <p class="ev-reassurance">Sem cadastro <span aria-hidden="true">·</span> Pedido pelo WhatsApp</p>
      </div>
      <nav class="ev-explore" aria-label="Explorar ofertas do evento">
        <a href="#/?colecao=combos" data-ev-collection="combos">Combos</a>
        <a href="#/?colecao=lancamentos" data-ev-collection="lancamentos">Lançamentos</a>
        <a href="#/destaques?view=pedidos">Mais vendidos <span aria-hidden="true">↗</span></a>
        <a href="#/?colecao=linhas" data-ev-collection="linhas">Por linha</a>
      </nav>
      <section class="ev-sec results-section" id="ev-products" aria-labelledby="ev-products-title"></section>
      <div class="ev-explore-footer"><a class="ev-all" href="#/catalogo">Explorar todo o catálogo <span aria-hidden="true">→</span></a><a href="#/marcas">Encontrar por marca <span aria-hidden="true">↗</span></a></div>
      <details class="ev-order-help"><summary>Como funciona o pedido?</summary><p>Escolha os produtos, confira as quantidades e a forma de pagamento e envie o pedido pelo WhatsApp. Nossa equipe confirma a disponibilidade, o pagamento e a entrega com você. Não há cobrança neste catálogo.</p></details>
    </section>`;
    renderCollection(state.collection, state.line);
    measureSticky();
    decorate();
  }

  function renderCollection(collection, line, moveFocus = false) {
    const panel = document.getElementById("ev-products");
    if (!panel || !api) return;
    const groups = offerGroups();
    const lines = groups.filter((g) => !["Combos do evento", "Lançamento Secrets"].includes(g.name));
    const name = collection === "combos" ? "Combos do evento" : collection === "lancamentos" ? "Lançamento Secrets" : line;
    const group = groups.find((g) => g.name === name) || groups[0];
    panel.dataset.collection = collection;
    panel.dataset.line = group.name;
    document.querySelectorAll("[data-ev-collection]").forEach((link) => {
      if (link.dataset.evCollection === collection) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
    const picker = collection === "linhas" ? `<div class="ev-line-picker"><label for="ev-line">Qual linha você procura?</label><select id="ev-line" data-ev-line>${lines.map((g) => `<option value="${esc(g.name)}"${g.name === group.name ? " selected" : ""}>${esc(g.name)}</option>`).join("")}</select></div>` : "";
    panel.innerHTML = `${picker}<div class="ev-sec-head"><div><h2 id="ev-products-title" tabindex="-1">${esc(group.name)}</h2><p>${collection === "combos" ? "Preço fixo em qualquer forma de pagamento" : "Escolha seus favoritos para o pedido"}</p></div><span class="ev-result-count" role="status"></span></div><div class="product-grid ev-grid" data-ev-grid></div><button type="button" class="ev-more" data-ev-more hidden></button>`;
    const grid = panel.querySelector("[data-ev-grid]");
    grid.innerHTML = api.cards(group.items, "draft");
    const cards = [...grid.children];
    cards.slice(SECTION_PREVIEW).forEach((c) => c.classList.add("ev-collapsed"));
    const more = panel.querySelector("[data-ev-more]");
    more.hidden = cards.length <= SECTION_PREVIEW;
    more.textContent = `Ver todos de ${group.name} (${cards.length})`;
    panel.querySelector(".ev-result-count").textContent = `Mostrando ${Math.min(SECTION_PREVIEW, cards.length)} de ${cards.length}`;
    decorate();
    if (moveFocus) jumpToProducts(true);
  }

  function selectCollection(collection, line) {
    const groups = offerGroups();
    const state = collectionFromUrl(groups);
    line = line || state.line;
    const params = new URLSearchParams({ colecao: collection });
    if (collection === "linhas" && line) params.set("linha", line);
    history.replaceState(null, "", `#/?${params}`);
    renderCollection(collection, line, true);
  }

  function measureSticky() {
    const bar = document.querySelector(".topbar");
    const h = bar && getComputedStyle(bar).position === "sticky" ? Math.round(bar.getBoundingClientRect().height) : 0;
    document.documentElement.style.setProperty("--ev-sticky-top", `${h}px`);
  }

  function jumpToProducts(focus = false) {
    const sec = document.getElementById("ev-products");
    if (!sec) return;
    measureSticky();
    const tabs = document.querySelector(".ev-explore");
    const offset = (parseInt(getComputedStyle(document.documentElement).getPropertyValue("--ev-sticky-top")) || 0) + (tabs?.offsetHeight || 0) + 8;
    if (focus) sec.querySelector("h2")?.focus({ preventScroll: true });
    window.scrollTo({ top: Math.max(0, sec.getBoundingClientRect().top + window.scrollY - offset), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
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
    const collection = event.target.closest("[data-ev-collection]");
    if (collection && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      selectCollection(collection.dataset.evCollection);
      return;
    }
    if (event.target.closest("[data-ev-discover]")) {
      event.preventDefault();
      jumpToProducts(true);
      return;
    }
    const more = event.target.closest("[data-ev-more]");
    if (more) {
      more.parentElement.querySelectorAll(".ev-collapsed").forEach((c) => c.classList.remove("ev-collapsed"));
      more.hidden = true;
      const panel = more.parentElement;
      const cards = [...panel.querySelector("[data-ev-grid]").children];
      panel.querySelector(".ev-result-count").textContent = `Mostrando ${cards.length} de ${cards.length}`;
      const firstNew = cards[SECTION_PREVIEW]?.querySelector("a, button");
      firstNew?.focus({ preventScroll: true });
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

  document.addEventListener("change", (event) => {
    if (event.target.matches("[data-ev-line]")) selectCollection("linhas", event.target.value);
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
