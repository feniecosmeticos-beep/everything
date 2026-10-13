# Verificação da atualização visual e de navegação

Data: 13/10/2026.

## História verificada

O profissional entra no catálogo, encontra uma marca ou produto, escolhe uma variante, adiciona ao pedido, revisa as quantidades e gera uma mensagem de demonstração. A lista de reposição permite guardar a seleção no navegador. Não há API comercial, banco de dados ou envio real neste fluxo; os dados são locais.

## Resultado

| Verificação | Evidência |
|---|---|
| Identidade visual | Georgia nos títulos; Segoe UI/Arial nos controles; paleta azul profundo, marfim e dourado baseada no site institucional |
| Início e produtos | Início editorial separado da área de consulta; navegação identifica a página atual |
| Busca digitada | Digitação sequencial de Royal na página inicial manteve o foco e mostrou 20 produtos / 32 opções |
| Classificação | DOH-COL-RYF-889 permaneceu visível com busca e categoria Coloração: 1 produto / 1 opção |
| Filtros após recarregar | Busca e categoria permaneceram selecionadas a partir do endereço da página |
| Voltar da ficha | Retornou ao endereço com a mesma busca e categoria |
| Ordenação | Menor preço apresentou primeiro as esponjas de R$ 11,00, seguidas de itens de R$ 11,90 |
| Filtro no celular | Painel permaneceu aberto após selecionar Olenka e aplicou 83 produtos / 96 opções |
| Variante no celular | Seleção de 30 ml no pH Acid mudou a identidade para OLK-MSK-PHA-30 e preço para R$ 22,90 |
| Carrinho | Duas unidades do SKU RGL-SPT-VOL-200 a R$ 112,00 totalizaram R$ 224,00 |
| Reposição | Lista salva exibiu o mesmo SKU, duas unidades e subtotal de R$ 224,00 |
| Revisão | Mensagem gerada com aviso DEMONSTRAÇÃO — NÃO É UM PEDIDO REAL |
| Layout móvel | Verificado em 390 × 844 e 320 × 780; sem rolagem horizontal |
| Navegador | Nenhum erro ou aviso nos registros consultados durante os fluxos |
| Imagens | 261 arquivos decodificados e verificados; nenhum arquivo inválido |
| Referências de arquivos | 264 recursos locais referenciados; nenhum ausente |
| Dados comerciais | Objeto completo do cadastro idêntico ao da importação anterior, com 701 SKUs únicos |

## Estrutura e carregamento

O HTML passou de aproximadamente 29,4 MB para 4,1 KB. O código e os estilos somam aproximadamente 750 KB; as fotos foram separadas e continuam com os mesmos bytes. Isso permite carregar imagens conforme sua proximidade na página e reutilizar o cache por arquivo. Não foi realizado teste de velocidade em uma rede móvel real.

Os registros de auditoria foram preservados em `docs/audits/` e deixaram de ser transferidos junto da página inicial.

## Limites

Os preços não foram consultados novamente no Mercos. As fotos não foram conferidas individualmente contra cada embalagem real. Continuam as pendências de foto, marca, embalagem e grupo registradas no README. Pedidos reais permanecem desativados. Esta alteração atualiza o código do catálogo; não altera o site institucional nem configura uma hospedagem pública.
