# Destaques Fenié — proposta de 14/10/2026

## Versão atual: sem combos e com ranking completo

Por solicitação do usuário, os combos estão pausados (`combosEnabled: false`). Não aparecem no início, nas abas ou em links, e seus descontos não se aplicam aos pedidos. As definições abaixo foram preservadas para uma eventual reativação. A página abre no ranking e tem duas abas: Mais pedidos e Mais vendidos.

O ranking atual inclui todas as classificações do relatório, não somente as marcas com logo no catálogo. MUP Color e MUP Makeup foram consolidadas em **MUP**, uma única posição com 1.250 unidades. Nenhuma tonalidade possui posição separada. Os totais completos são: MUP 1.250; Olenka 239; Sem marca informada 64; Glynett 62; Spa do Fio 40; Prohall 32; Rigolim 27; Vabene 14; Cursos 6; Doha 6; Cromaire 1. São 11 classificações e 1.741 unidades, reconciliadas com todo o relatório. Empates preservam a ordem do resumo Mercos. Cursos e itens sem marca têm rótulos próprios, sem serem apresentados como marcas comerciais.

A vitrine Mais pedidos mantém os produtos agrupados por linha, com opções de tamanho ou tonalidade dentro do cartão. A partir da revisão de 16/10, o limite de seis cartões foi removido: a lista completa pode ser aberta em lotes de 12 pelo botão “Mostrar mais produtos”, até a indicação de fim da lista. Os dez itens sem correspondência também aparecem, com preço e disponibilidade a confirmar. A expansão preserva as escolhas já feitas nos cartões. O ranking completo é informativo; somente as classificações com produtos identificáveis no catálogo têm acesso direto a eles. O botão da MUP reúne a busca de Color e Makeup.

O registro abaixo descreve a proposta anterior de combos e a importação das vendas. A configuração atual acima tem precedência para a apresentação do site.

## Sugestões de combos para outubro

Estas seleções são propostas para avaliação comercial, com desconto inicial de 10% solicitado durante o desenvolvimento. A economia e o valor final aparecem na vitrine, no pedido e na mensagem de demonstração. O percentual é editável por combo em `content/highlights.json`.

| Seleção | Produtos | Original | Economia | Com desconto |
|---|---|---|---|---|
| Cuidado & acabamento | Royal Finish 500 g + Happy End CC Cream 250 ml | R$ 238,00 | R$ 23,80 | R$ 214,20 |
| Bancada de maquiagem | Primer Glow + Esponja Gota + Bruma Fixadora 120 ml | R$ 165,90 | R$ 16,59 | R$ 149,31 |
| Finalização no salão | Volumizer Rigolim 200 ml + Happy End CC Cream 250 ml | R$ 201,00 | R$ 20,10 | R$ 180,90 |

O total acompanha o preço vigente de cada SKU. As unidades do combo entram como itens individuais e podem ser ajustadas no pedido. Se dois combos usam o mesmo produto, suas quantidades são somadas. O desconto abrange somente as unidades dos combos adicionados: itens extras avulsos mantêm o preço normal. Retirar um produto de um combo desfaz seu desconto integral; acrescentar novamente um item avulso não recria a promoção. A seleção promocional é salva neste navegador por até 30 dias e vinculada ao mês configurado. A lista de reposição guarda quantidades, sem garantir promoções futuras.

A economia é arredondada em centavos por combo e distribuída proporcionalmente pelos produtos, reconciliando exatamente com o total anunciado. A operação inteira é rejeitada quando qualquer produto ultrapassaria 999 unidades, sem adicionar apenas parte do combo. SKUs ausentes, ocultos ou indisponíveis impedem a exibição da seleção. O percentual de 10% é uma proposta; o relatório fornecido não contém custos ou margens para avaliar a rentabilidade da promoção.

## Mais pedidos e ranking por marca

- **Mais pedidos:** vitrine baseada na quantidade vendida, conforme escolha do usuário. As variantes da mesma linha ficam em um cartão com escolha de tamanho ou tonalidade; a lista completa é apresentada em lotes de 12 cartões pelo botão “Mostrar mais produtos”. Não há contagem de pedidos no relatório, e nenhuma é inferida.
- **Mais vendidos:** ranking por marca, conforme orientação do usuário para evitar posições separadas para cada tonalidade. Cada marca reúne todas as suas linhas e colorações. Os oito totais vêm do resumo por marca do relatório.

Na vitrine, os volumes são agrupados pelas famílias já cadastradas no catálogo. Empates são ordenados pelo nome. Fotos, embalagem e preço atual permitem abrir a ficha ou adicionar uma unidade ao pedido. No ranking, os logos estão centralizados e há acesso ao catálogo de cada marca. A origem e o intervalo dos dados aparecem abaixo das áreas. Os preços do catálogo não são apresentados como faturamento histórico.

O relatório recebido cobre 01/10/2026 a 14/10/2026. Foram conferidos 260 itens e 1.741 unidades; 250 nomes têm correspondência única com os SKUs do catálogo, somando 1.724 unidades. As dez linhas sem correspondência (17 unidades) estão registradas em `docs/ranking-sem-correspondencia.json` e aparecem na vitrine sem preço ou botão de compra, identificadas para consulta. Os totais por marca são independentes desse cruzamento e foram reconciliados com a aba Produtos.

O ranking inclui somente as oito marcas presentes na vitrine de marcas do catálogo, somando 1.656 unidades: MUP Color 1.191, Olenka 239, Glynett 62, MUP Makeup 59, Spa do Fio 40, Prohall 32, Rigolim 27 e Doha 6. Marcas adicionais do relatório, cursos e itens sem identificação ficam fora dessa lista. MUP Color e MUP Makeup continuam separadas, como no catálogo. As identificações de marca seguem o relatório, que registra inferências de linha para duas unidades Olenka e uma Prohall.

## Preparar as vendas

Para atualizar com o mesmo formato de relatório agregado XLSX, use `python scripts/import-ranking-xlsx.py /caminho/relatorio.xlsx`. Esse leitor usa `openpyxl` somente para leitura, não altera o arquivo de origem e exige reconciliação entre produtos, marcas e resumo. Ele publica somente SKUs, contagens e período; valores de faturamento, preço médio histórico e o arquivo original não são publicados.

O CSV abaixo é uma alternativa para futuras exportações com linhas de pedido e permite calcular recorrência caso esse indicador venha a ser solicitado.

Use um relatório completo do período, com uma linha por item de pedido. O modelo de cabeçalho está em `docs/modelo-vendas.csv`:

```csv
sku;quantidade;pedido;data;status
```

`data` é a data original do pedido, em AAAA-MM-DD ou DD/MM/AAAA. `quantidade` é inteira; valores negativos ou status `devolvido` descontam unidades. Retornos precisam referenciar o pedido e sua data original. `pedido` deve ser um identificador único, sem nome ou contato de cliente. O status é opcional apenas quando a exportação já contém somente vendas confirmadas. Cancelamentos, orçamentos e rascunhos são excluídos; status desconhecidos, SKUs não cadastrados, quantidades inválidas e datas inconsistentes geram erro, preservando o conteúdo anterior.

```sh
python scripts/import-sales.py /caminho/relatorio.csv
python scripts/export-html.py /caminho/catalogo.html
```

A importação roda localmente e gera apenas contagens agregadas por SKU e mês. O arquivo bruto, os números dos pedidos e dados de clientes não entram no site. O arquivo publicado é `assets/highlights-data.js`; a configuração editável é `content/highlights.json`. Para mudar o mês, títulos ou SKUs dos combos, edite esse JSON e execute `python scripts/import-sales.py --refresh-config`.

Esta etapa não conecta automaticamente o catálogo ao Mercos e não cria atualização recorrente. Um relatório novo substitui todos os períodos anteriores; use uma exportação completa para manter o histórico desejado.

## Verificação

Testes concluídos: soma e desconto de cada combo; acumulação de produto compartilhado; arredondamento em centavos; retirada de promoção em combo incompleto; itens avulsos e lista de reposição sem desconto indevido; persistência; rejeição integral por limite de quantidade; SKU inválido; preservação dos 701 registros comerciais; agregação de linhas do mesmo pedido; devolução e cancelamento; validação de arquivo inválido; ausência de números de pedido no conteúdo publicado. O ranking reconciliou oito marcas e 1.656 unidades com o relatório. No navegador, o combo de R$ 238,00 apresentou desconto de R$ 23,80 e total de R$ 214,20 no painel, carrinho, revisão e mensagem, inclusive após recarregar. A vitrine agrupada por linha e o ranking por marca foram conferidos em 320 e 390 px, sem rolagem horizontal.
