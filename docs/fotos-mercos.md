# Fotos recuperadas do Mercos em 05/11/2026

A consulta percorreu as 50 páginas da lista de produtos ativos da empresa 264566 (737 registros). O cruzamento utilizou códigos de produto e conferência de nome, embalagem e imagem. Os itens criados especificamente para o evento foram relacionados aos cadastros equivalentes do Mercos somente quando a correspondência ficou identificada.

As fotos foram baixadas pela sessão do Mercos, preservadas em uma pasta local de originais e preparadas em WebP para o catálogo, sem recorte do produto. Cada imagem tem a origem registrada no arquivo de auditoria, junto do código, identificador do Mercos e resumos de integridade dos arquivos. Nenhum dado de cliente ou pedido entra no catálogo.

A importação altera imagem, texto alternativo, origem da foto e a pendência de foto resolvida. A identificação do Creme Ativador Secret Curl foi corrigida para 250 ml: a equipe informou a quantidade 250 e a unidade ml foi conferida no rótulo do Mercos. O endereço antigo da ficha foi preservado. Os demais dados comerciais continuam iguais, condição verificada pelo importador antes de salvar.

As pendências restantes estão em `docs/audits/mercos-photos-2026-11-05.json`: ausência de foto no Mercos, ausência de correspondência ativa, divergência de embalagem ou arte promocional inadequada. Exemplo de divergência: Pomada Happy End com 80 g no cadastro e 60 g na foto. Esses arquivos ficam fora da aplicação até a embalagem ser confirmada.

O importador pode ser executado com `python scripts/import-mercos-photos.py <pasta-da-coleta>`; exige Pillow. Os arquivos privados da coleta e os caminhos locais dos originais não são publicados no repositório.
