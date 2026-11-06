# Valores percebidos dos combos

Atualizados conforme o PDF comercial fornecido pela Fenié em 06/11/2026. A origem e o SHA-256 estão em `content/evento-blonde-influence.json`, no campo `comboReferenceSource`.

| Combo | Valor percebido | Venda em qualquer pagamento | Economia |
| --- | ---: | ---: | ---: |
| 01 Alisamento | R$ 1.513,00 | R$ 1.209,00 | R$ 304,00 |
| 02 Tratamento | R$ 798,80 | R$ 689,00 | R$ 109,80 |
| 03 Reconstrução | R$ 1.133,70 | R$ 939,00 | R$ 194,70 |
| 04 Reposição Hidrolipídica | R$ 1.173,70 | R$ 949,00 | R$ 224,70 |
| 05 Blond Tech | R$ 1.143,70 | R$ 949,00 | R$ 194,70 |
| 06 Olenka Hub | R$ 1.442,00 | R$ 1.099,00 | R$ 343,00 |
| 07 Color Essencial | R$ 999,60 | R$ 789,00 | R$ 210,60 |
| 08 (24 colorações / 6 oxidantes) | R$ 1.006,60 | R$ 789,00 | R$ 217,60 |
| 09 (36 colorações / 3 oxidantes / 2 pós) | R$ 1.432,00 | R$ 1.099,00 | R$ 333,00 |

O PDF apresenta R$ 343,10 de economia no combo 06. O catálogo calcula R$ 343,00 a partir dos dois valores comerciais informados. Uma unidade de cada combo soma R$ 8.511,00 a pagar e R$ 2.132,10 de economia sobre os valores percebidos.

Os combos usam `eventReferenceType: "perceived"`. Cards, fichas e mensagem de WhatsApp identificam a referência como **Valor percebido**, preservando **Tabela** nos itens avulsos. Pedidos com combos usam **Economia sobre os valores de referência** para não identificar o valor percebido como preço de tabela.

As artes anteriores com os preços antigos deixam de aparecer nas fichas destes combos. As fotos dos produtos e a composição cadastrada são preservadas. O PDF novo também apresenta diferenças de composição nos combos 03 e 04; estas não fazem parte da atualização dos valores percebidos.

Para reaplicar uma alteração desses valores ao catálogo já existente: `python scripts/update-combo-references.py`. O processo exige os nove combos, valida os preços de venda e atualiza somente a referência; pode ser repetido sem duplicar produtos. Depois execute `python scripts/version-assets.py`.
