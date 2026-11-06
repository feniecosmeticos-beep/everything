# Correções da jornada do catálogo

Atualização de 06/11/2026, após a auditoria da entrada, busca, ficha e pedido.

## Variações

As 68 famílias, com 292 variantes, foram sincronizadas com os produtos. A mudança de marca Papel para Mechas deixou de invalidar o conjunto. A validação agora isola famílias com divergência; as outras continuam agrupadas e os itens afetados permanecem disponíveis individualmente. URLs antigas de oxidantes também têm recuperação sem depender de uma família válida.

## Busca e escolha

SKU exato tem prioridade. Tonalidade e volume exatos deixam de se misturar com ocorrências parciais de números: “MUP 6” encontra a coloração 6; “MUP 6.1” encontra 6.1; “oxidante MUP 6vol” encontra 6 Vol. O código pai MC-OX-900 mantém os quatro volumes no mesmo card. A opção exata é selecionada no card, sem adicionar produtos automaticamente.

## Preço e pagamento

Uma cotação comum calcula unitários, subtotais e total conforme Pix, crédito, débito ou boleto. O cálculo preserva descontos de combos e não aplica o desconto do evento duas vezes. Revisão, rodapé, mensagem e link do WhatsApp usam o mesmo valor. Ao retornar ao carrinho durante a visita, a preferência de pagamento também é respeitada na exibição dos valores. Quantidades e remoção podem ser alteradas na própria revisão.

## Celular

Há uma única barra inferior fixa por etapa. A barra do pedido substitui a navegação inferior quando há produtos; a revisão usa total do pagamento e botão do WhatsApp. O cabeçalho é compactado durante a rolagem. O conteúdo tem espaço inferior reservado, e o envio não fica encoberto pela navegação. As escolhas de pagamento ficam em duas colunas em telas estreitas.

## Informações dos produtos

Os cinco códigos de coloração 5L, 6L, 7L, 8L e 9L deixaram de ser apresentados como litros. Nenhum peso foi presumido. Os campos ainda sem confirmação ficam na identificação detalhada e na orientação do atendimento; não há texto de conteúdo “em preparação”. A identificação e o código continuam acessíveis.

As fichas MUP Color e os quatro lançamentos Secret Curl receberam indicações e benefícios resumidos, com fonte oficial acessível na própria ficha. O conteúdo editorial já existente foi preservado.

Fontes verificadas em 06/11/2026:

- Coloração MUP: https://loja.olenkacosmeticos.com.br/produto/coloracao-mup-color/
- Secret Curl: https://loja.olenkacosmeticos.com.br/produto/kit-secret-curl-shampoo-mascara-e-ativador-de-cachos-250ml-ganhe-uma-escova-de-fitagem/
- Gelatina Secret Curl: https://loja.olenkacosmeticos.com.br/produto/gelatina-modeladora-secret-curl-500g-novo/

## Combos

Os cards mostram a composição resumida e o primeiro brinde, permitindo comparar as opções. As composições e preços de venda não mudaram. Os novos valores percebidos do PDF continuam incluídos neste PR, com economia calculada em centavos.

## Validação

- Validação integral das 68 famílias e isolamento de uma família propositalmente inválida.
- Busca por tonalidade, volume e SKU pai.
- Cotação sem alteração do carrinho original, idempotência, pedidos mistos e descontos já aplicados.
- Um único total a pagar na mensagem, correspondente à forma de pagamento.
- Edição de quantidade na revisão e conferência do SKU selecionado.
- Tamanhos desconhecidos preservados como desconhecidos, sem inferência a partir da tonalidade.

O catálogo continua sendo uma seleção enviada ao atendimento pelo WhatsApp. O envio não confirma automaticamente estoque, frete ou venda. Não foi criado nenhum serviço externo de análise de conversão nesta alteração.
