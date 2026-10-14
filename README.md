# Catálogo profissional Fenié PRO

Catálogo com busca por nome ou código, filtros por marca e necessidade, variantes, pedido de demonstração e lista de reposição salva no navegador.

## Abrir ou publicar

Baixe o repositório completo e abra `index.html`. Mantenha a pasta `assets/` junto do HTML: ela contém as fotos, os estilos e o código do catálogo. Não há instalação de dependências ou compilação.

Para servir localmente:

```sh
python -m http.server 8080
```

Abra `http://localhost:8080`. Em uma hospedagem estática, envie `index.html` e a pasta `assets/` preservando a estrutura. GitHub Pages não está configurado por esta alteração.

## Experiência visual e navegação

Atualização de 13/10/2026, inspirada na identidade do [site institucional da Fenié](https://feniecosmeticos.com.br/): títulos em Georgia, controles em Segoe UI/Arial, azul profundo, marfim e dourado discreto.

- Início editorial com acesso a marcas, uso profissional, revenda e reposição.
- Consulta de produtos em uma área própria com filtros ativos e ordenação próxima dos resultados.
- Endereços que preservam filtros, busca e ordenação ao recarregar ou voltar de uma ficha.
- Navegação inferior no celular e painel de filtros com controles de toque.
- Ajuste móvel de 14/10/2026: cabeçalho compacto, logos sobre branco, fotos sem mistura de cores, produtos em uma coluna e controles de compra sem sobreposição.
- Fotos separadas em arquivos com carregamento sob demanda, sem alterar as imagens originais.
- Correção da classificação das colorações Royal Fantasie e Mix MUP; pó descolorante preservado na categoria de descoloração.
- Filtro explícito para os itens com marca a confirmar.

### Rotas

| Caminho | Conteúdo |
|---|---|
| `#/` | Início |
| `#/catalogo` | Produtos e filtros |
| `#/marcas` | Marcas |
| `#/selecoes` | Seleções e dicas para o salão |
| `#/produto/<slug>` | Ficha e variantes |
| `#/carrinho` | Seleção atual |
| `#/resumo` | Revisão e mensagem de demonstração |
| `#/reposicao` | Lista salva |

Exemplo de filtro: `#/catalogo?q=DOH-COL-RYF-889&category=coloracao`. Parâmetros comerciais de campanha na URL continuam preservados.

## Dados comerciais

Origem: `Fenie-Catalogo-Fotos-Previa (7).html`, importado em 13/10/2026. São 701 opções comerciais, agrupadas em 488 produtos. O cadastro comercial, os preços e os SKUs foram preservados nesta atualização.

Os preços são identificados na prévia como tabela padrão Mercos de 07/10/2026. Pedidos reais permanecem desativados; a mensagem gerada é marcada como demonstração.

Pendências: 203 opções sem foto, 111 com marca a confirmar, 275 com embalagem a confirmar e 175 com grupo não informado. Esses grupos podem se sobrepor. É necessário confirmar preço, disponibilidade, fotos e atendimento antes de habilitar pedidos reais.

## Organização

- `index.html`: estrutura e navegação.
- `assets/catalogue-base.css`: estilos da prévia de origem.
- `assets/catalogue-premium.css`: identidade visual e ajustes responsivos.
- `assets/catalogue-mobile.css`: correções finais de layout para celular e enquadramento dos logos.
- `assets/catalogue.js`: dados, busca, filtros, variantes e pedido.
- `assets/images/`: imagens extraídas da prévia, sem alteração dos bytes.
- `assets/logos/`: logos originais das marcas.
- `docs/audits/`: registros de origem das fotos e variantes.
- `docs/verificacao-ui-ux.md`: validação da atualização.

Os arquivos-fonte anteriores à exportação HTML não fazem parte deste repositório.
