# Catálogo profissional Fenié PRO

Catálogo com busca por nome ou código, filtros por marca e necessidade, variantes, pedido pelo WhatsApp e lista de reposição salva no navegador.

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
- Destaques: vitrine dos mais vendidos agrupada por linha e ranking completo por marca/classificação, com dados reais de 01 a 14/10/2026. MUP fica em uma única posição. Os combos estão pausados. Consulte `docs/destaques.md`.

- Forma de pagamento na revisão: Pix, crédito, débito, boleto à vista ou parcelado de 2 a 6 vezes. A escolha segue na mensagem do WhatsApp e na opção de copiar pedido.

### Rotas

| Caminho | Conteúdo |
|---|---|
| `#/` | Início |
| `#/catalogo` | Produtos e filtros |
| `#/marcas` | Marcas |
| `#/destaques` | Mais pedidos e ranking completo |
| `#/selecoes` | Seleções e dicas para o salão |
| `#/produto/<slug>` | Ficha e variantes |
| `#/carrinho` | Seleção atual |
| `#/resumo` | Revisão e envio pelo WhatsApp |
| `#/reposicao` | Lista salva |

Exemplo de filtro: `#/catalogo?q=DOH-COL-RYF-889&category=coloracao`. Parâmetros comerciais de campanha na URL continuam preservados.

## Dados comerciais

Origem: `Fenie-Catalogo-Fotos-Previa (7).html`, importado em 13/10/2026. A importação original tinha 701 opções, agrupadas em 488 produtos. Em 19/10/2026, os três oxidantes agregados receberam 14 variações conferidas no Mercos: são 712 opções selecionáveis e três registros agregados ocultos para preservar vínculos históricos.

A tabela geral é de 07/10/2026; os 14 oxidantes foram conferidos em 19/10/2026. Pedidos pelo WhatsApp +55 41 9840-2800 estão habilitados: o cliente confere e envia a mensagem. Disponibilidade, frete e condições dependem do atendimento. Consulte [oxidantes e WhatsApp](docs/oxidantes-e-whatsapp.md).

Pendências do restante do cadastro: 200 opções sem foto, 111 com marca a confirmar, 275 com embalagem a confirmar e 175 com grupo não informado. Esses grupos podem se sobrepor. Esses campos e a disponibilidade devem ser conferidos pelo atendimento antes de confirmar a compra.

## Organização

- `index.html`: estrutura e navegação.
- `assets/catalogue-base.css`: estilos da prévia de origem.
- `assets/catalogue-premium.css`: identidade visual e ajustes responsivos.
- `assets/catalogue-mobile.css`: correções finais de layout para celular e enquadramento dos logos.
- `assets/catalogue-highlights.css`: vitrine de combos e rankings.
- `assets/highlights-data.js`: conteúdo comercial dos destaques, gerado a partir do JSON.
- `content/highlights.json`: combinações de SKUs e contagens agregadas de vendas por mês.
- `assets/catalogue.js`: dados, busca, filtros, variantes e pedido.
- `assets/images/`: imagens extraídas da prévia, sem alteração dos bytes.
- `assets/logos/`: logos originais das marcas.
- `docs/audits/`: registros de origem das fotos e variantes.
- `docs/verificacao-ui-ux.md`: validação da atualização.
- `scripts/import-sales.py`: preparação local dos rankings a partir de CSV, sem publicar dados de clientes ou números de pedido.
- `scripts/import-ranking-xlsx.py`: leitura do relatório agregado, reconciliação das quantidades e cruzamento de nomes com SKUs; não publica faturamento histórico.

Os arquivos-fonte anteriores à exportação HTML não fazem parte deste repositório.

## Verificação e manutenção

A revisão de 16/10/2026 utilizou REA 6.5.0 e testes de navegação, pedido e reposição. Consulte [o relatório](docs/revisao-rea.md) para falhas corrigidas, evidências e limitações.

Execute `node --test scripts/tests/test-catalogue.cjs`, `python scripts/tests/test-sales.py` e `python scripts/tests/test-assets.py` para as 17 verificações automatizadas.

Após editar CSS ou JavaScript, rode `python scripts/version-assets.py` para atualizar as versões por conteúdo no HTML. Para gerar uma versão independente: `python scripts/export-html.py catalogo-revisado.html`.
