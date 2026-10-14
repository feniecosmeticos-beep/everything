# Correção da experiência móvel — 14/10/2026

As três capturas enviadas pelo usuário mostravam cabeçalho alto, logos e fotos escurecidos, produtos apertados em duas colunas e a área de compra fixa cobrindo a ficha. A aparência era consistente com o escurecimento automático do navegador somado aos modos de mistura das imagens.

Foi incluído sinal de esquema claro no documento, removida a mistura de cores das imagens no celular e substituídos os contêineres SVG por PNG/WebP originais enquadrados por CSS. O cabeçalho passou a ter uma linha de 65 px. Os produtos aparecem em uma coluna, com imagem à esquerda, dados à direita e controles abaixo. A área de compra da ficha acompanha o conteúdo e o botão de ampliação fica ancorado na foto. A navegação inferior preserva cinco destinos.

Verificação no navegador da prévia HTTP local:

- 320 × 740, 360 × 800 e 390 × 844: sem rolagem horizontal no catálogo e na ficha examinados.
- 390 px: oito logos carregados e centralizados, sem nomes repetidos; fotos sem mistura de cores.
- Filtro MUP Makeup aberto pelo cartão da marca; painel de filtros aberto e fechado em 360 px.
- Tonalidade Verde selecionada no Corretivo Camuflagem, atualizando SKU MAK-COR-VER e preço R$ 49,00.
- Quantidade 2 de Bruma Fixadora adicionada ao pedido; contador atualizado para duas unidades.
- Ficha com área de compra em posição estática e foto de 238 px, sem o botão de ampliação sobre o cabeçalho.
- 1280 × 900: logos e navegação do desktop preservados.
- Sintaxe JavaScript conferida e HTML único regenerado com estilos e imagens incorporados.

A validação usa o navegador disponível com dimensões móveis; não reproduz o modo de escurecimento forçado específico do navegador Samsung das capturas. Os dados, preços e fotos comerciais foram preservados. Pedidos reais continuam desativados na prévia.
