# Catálogo profissional Fenié PRO

Prévia do catálogo com busca, filtros, produtos agrupados por variantes, carrinho e geração de mensagem de demonstração.

## Abrir a prévia

Baixe o repositório e abra `index.html` em um navegador. Não é necessário instalar dependências ou compilar o projeto. Fotos e dados estão embutidos no HTML; a fonte Google Fonts usa conexão com a internet e tem fontes locais como alternativa.

Também é possível servir a pasta localmente:

```sh
python -m http.server 8080
```

Abra `http://localhost:8080`.

## Versão importada

- Arquivo de origem: `Fenie-Catalogo-Fotos-Previa (7).html`.
- Importado em 13/10/2026 como `index.html`, sem alterações de conteúdo.
- 701 opções comerciais, agrupadas em 488 produtos.
- Preços identificados na prévia como tabela padrão Mercos de 07/10/2026.
- Pedidos reais desativados. A mensagem gerada é uma demonstração.

## Pendências conhecidas

- Corrigir a classificação de categorias: a Royal Fantasie Doha 8/89, SKU `DOH-COL-RYF-889`, aparece pela busca do código, mas é excluída ao filtrar por Coloração.
- Revisar 203 opções sem foto, 111 com marca a confirmar, 275 com embalagem a confirmar e 175 com grupo não informado. Esses grupos podem se sobrepor.
- Corrigir o grupo `hampoos e condicionadores`, separado de `Shampoos e condicionadores`.
- Otimizar as imagens para publicação: o HTML completo tem aproximadamente 29,4 MB.
- Confirmar preços, disponibilidade e atendimento antes de habilitar pedidos reais.

O repositório contém a prévia exportada; os arquivos-fonte que geraram esse HTML não fazem parte desta importação.
