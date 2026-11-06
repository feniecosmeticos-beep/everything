"""Atualiza somente o valor percebido dos combos, preservando seus preços de venda."""
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]


def update(root=ROOT):
    event=json.loads((root/'content/evento-blonde-influence.json').read_text(encoding='utf-8'))
    rows={row['new']['id']:row for row in event['rows'] if row.get('referenceType')=='perceived'}
    if len(rows)!=9:
        raise ValueError('São esperados os nove combos com valor percebido confirmado.')
    path=root/'assets/catalogue.js'
    source=path.read_text(encoding='utf-8')
    start=source.index('"products":[')+len('"products":')
    products,length=json.JSONDecoder().raw_decode(source[start:])
    found=set()
    for product in products:
        row=rows.get(product['id'])
        if not row:
            continue
        if product['category']!='Combos do evento' or product['priceCents']!=row['event'] or product['eventPixCents']!=row['pix']:
            raise ValueError(f"Preço de venda ou identificação divergente: {product['id']}")
        if not isinstance(row['list'],int) or row['list']<product['priceCents']:
            raise ValueError(f"Valor percebido inválido: {product['id']}")
        product.update(eventListCents=row['list'],eventReferenceType='perceived')
        found.add(product['id'])
    if found!=set(rows):
        raise ValueError('Um ou mais combos não foram encontrados no catálogo.')
    encoded=json.dumps(products,ensure_ascii=False,separators=(',',':'))
    path.write_bytes((source[:start]+encoded+source[start+length:]).encode('utf-8'))
    print('Valores percebidos atualizados nos nove combos; preços de venda preservados.')


if __name__=='__main__':
    update()
