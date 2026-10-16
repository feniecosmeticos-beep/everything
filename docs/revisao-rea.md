# Revisão do catálogo com REA — 16/10/2026

Base: commit 33767dfe8158e50a2db6eca0128f138fbf0db987 de feniecosmeticos-beep/everything.

## Resultado

Três falhas confirmadas foram corrigidas. A revisão também acrescentou versões por conteúdo aos arquivos CSS/JavaScript e corrigiu o título da aba Destaques.

| Prioridade | Falha observada | Correção |
|---|---|---|
| P2 | O link “Ir ao conteúdo” alterava o hash para #view e fazia o ranking ou formulário desaparecer. Reproduzido no navegador. | O link agora move rolagem e foco para o conteúdo existente, preservando endereço, formulário e mensagem. |
| P2 | Um endereço inexistente, como #/pagina-inexistente, mostrava apenas o rodapé de atendimento. | Página de recuperação com título, explicação e links para o catálogo e início. |
| P2 | Mesmo pausados, os combos exigiam uma gravação adicional no armazenamento. Se somente essa gravação falhasse, a rotina retornava falha apesar de o pedido normal poder ser salvo. Reproduzido em teste isolado da função de produção. | Combos desativados não acessam o armazenamento promocional. A falha continua sendo sinalizada quando a promoção está ativa. |

Na verificação local, recarregar o documento ainda deixou o script anterior em cache. Os seis recursos CSS/JS agora recebem uma versão baseada no SHA-256 de seu conteúdo. Isso troca o endereço do recurso quando ele muda. O exportador continua gerando um HTML independente, incluindo arquivos com versão. Rode scripts/version-assets.py após alterar CSS ou JavaScript e antes de publicar.

## Como o REA foi utilizado

Foi usada a versão 6.5.0 do pacote oficial rea-agents, associado ao repositório https://github.com/morluto/rea, em uma pasta de ferramentas fora do catálogo. Não há nova dependência de produção, registro global de MCP ou instalação de ferramentas de análise nativa no site.

O comando analyze-javascript-application analisou assets/catalogue.js e assets/highlights-data.js como texto, sem executar o aplicativo. Foram geradas evidências antes e depois das correções: dois arquivos JavaScript, zero falhas de parsing; 66.579 nós de AST antes e 66.660 depois. O rastreamento semântico da função no encontrou uma origem e percorreu quatro funções e três relações, com cobertura parcial. O resumo dos identificadores e estatísticas está em rea-evidencias-resumo.json.

Os 11 findings de inventário do REA não significam 11 bugs. A ferramenta registra milhares de relações desconhecidas; elas também não significam vulnerabilidades. O rastreamento estrutural literal de hashchange não encontrou correspondência, e por isso foi usado o nó semântico exato do roteador. As conclusões funcionais acima foram confirmadas por leitura do código, testes e reprodução no navegador, e não inferidas apenas da ausência de resultados no grafo. Esta é uma revisão direcionada, sem garantia de ausência de outras falhas.

## Validação

- 6 testes Node: foco do atalho, recuperação de rota, armazenamento de combos pausados/ativos, quantidades e carrinhos salvos inválidos, totais em centavos e itens indisponíveis.
- 4 testes do importador de vendas e 2 testes de versionamento de recursos.
- Verificações anteriores do ranking completo, cobertura das vendas, agrupamento e desativação dos descontos passaram.
- Navegador em 390 × 844: busca por MC-OX-900, adição, alteração para duas unidades e subtotal de R$ 85,00; reposição somada ao pedido, quatro unidades e R$ 170,00; geração de mensagem de demonstração.
- Usar “Ir ao conteúdo” na revisão preservou a URL #/resumo, o nome preenchido e a mensagem, e colocou o foco no elemento principal.
- O ranking continuou com 11 classificações e MUP em uma posição. O botão MUP abriu 40 produtos e 141 opções; o filtro MUP Makeup mostrou 28 produtos e 60 opções. O painel de filtros fechou e devolveu a barra lateral ao catálogo.
- A navegação móvel verificada ficou sem rolagem horizontal. Não foram encontrados erros JavaScript nos fluxos observados.
- Exportação conferida: HTML sem scripts ou CSS externos e com 269 imagens incorporadas.

Os dados literais do catálogo, editoriais, famílias e mapeamento de imagens foram comparados antes/depois e permaneceram idênticos. Foram preservados os 701 cadastros, os preços e as regras comerciais. Combos continuam pausados e pedidos reais continuam desativados.

## Próximas melhorias de conteúdo

O cadastro ainda contém 203 opções sem foto, 111 com marca a confirmar e 275 com embalagem a confirmar. Esses grupos se sobrepõem. São pendências reais do cadastro; preencher por suposição prejudicaria a precisão comercial. A próxima melhoria de experiência deve priorizar conferência e enriquecimento desses dados.

A publicação anterior precisou ser feita diretamente no projeto da Vercel porque sua conexão Git apontava para catalogofenie, e o código atual está em everything. O alinhamento dessa conexão é uma melhoria de manutenção separada. Esta revisão não altera configurações de conta ou ativa pedidos reais.

## Reproduzir

Execute na raiz do projeto:

```sh
node --test scripts/tests/test-catalogue.cjs
python scripts/tests/test-sales.py
python scripts/tests/test-assets.py
python scripts/version-assets.py
python scripts/export-html.py catalogo-revisado.html
```

Para repetir a análise estática com Node compatível:

```sh
npx -y rea-agents@6.5.0 analyze-javascript-application . --source-path assets/catalogue.js --source-path assets/highlights-data.js --max-semantic-nodes 90000 --max-semantic-nodes-per-file 75000 --json > rea-evidence.json
```

As evidências completas e as capturas da revisão desta sessão foram guardadas localmente em work/rea-audit e outputs, fora da distribuição pública do código.
