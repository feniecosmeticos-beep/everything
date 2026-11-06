/* Conteúdo conferido nas fontes oficiais em 06/11/2026. Sem alteração de preço ou composição. */
(() => {
  const colorSource = "https://loja.olenkacosmeticos.com.br/produto/coloracao-mup-color/";
  const curlSource = "https://loja.olenkacosmeticos.com.br/produto/kit-secret-curl-shampoo-mascara-e-ativador-de-cachos-250ml-ganhe-uma-escova-de-fitagem/";
  const gelSource = "https://loja.olenkacosmeticos.com.br/produto/gelatina-modeladora-secret-curl-500g-novo/";
  const profiles = {
    color: { summary: "Coloração profissional MUP Color com tecnologia HD System.", indication: "Coloração dos fios por profissionais. Escolha a nuance no seletor.", benefits: ["Tecnologia desenvolvida para retenção dos pigmentos", "Fórmula com D-pantenol, queratina e complexo de proteínas"], sourceUrl: colorSource },
    shampoo: { summary: "Shampoo Secret Curl para cabelos ondulados, cacheados e crespos.", indication: "Limpeza e cuidado dos cabelos com curvatura.", benefits: ["Limpeza delicada", "Auxilia na hidratação dos fios"], sourceUrl: curlSource },
    mask: { summary: "Máscara multifuncional Secret Curl para condicionamento e tratamento.", indication: "Cabelos ondulados, cacheados e crespos.", benefits: ["Maciez e desembaraço", "Cuidado nutritivo dos fios"], sourceUrl: curlSource },
    activator: { summary: "Creme Ativador Secret Curl para a finalização dos cachos.", indication: "Cabelos ondulados, cacheados e crespos.", benefits: ["Definição com movimento", "Controle do frizz"], sourceUrl: curlSource },
    gel: { summary: "Gelatina Secret Curl para definir cachos com fixação moderada.", indication: "Curvaturas 3ABC a 4ABC.", benefits: ["Definição sem rigidez", "Fixação moderada e controle do frizz"], sourceUrl: gelSource }
  };
  const specific = { "EVT-OLK-SCR-SH-300": "shampoo", "EVT-OLK-SCR-MSK-250": "mask", "EVT-OLK-SCR-CAT-250": "activator", "EVT-OLK-SCR-GEL-250": "gel" };
  window.FenieProductGuidance = {
    profile(product) {
      if (specific[product.sku]) return profiles[specific[product.sku]];
      if (product.brand === "MUP COLOR" && /^MUP-COL-/.test(product.sku)) return profiles.color;
      return null;
    }
  };
})();
