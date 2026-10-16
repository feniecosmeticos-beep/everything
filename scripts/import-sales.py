"""Importa vendas por SKU e publica somente contagens agregadas, sem clientes/pedidos."""
from pathlib import Path
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from collections import defaultdict
import argparse
import csv
import io
import json
import re
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
MONTHS = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
IGNORED_STATUSES = {'cancelado','cancelada','orcamento','rascunho','excluido','excluida','nao aprovado','rejeitado'}
CONFIRMED_STATUSES = {'faturado','faturada','concluido','concluida','entregue','aprovado','aprovada','confirmado','confirmada','vendido','vendida','finalizado','finalizada','devolvido','devolvida'}

def normalize(value):
    return ''.join(char for char in unicodedata.normalize('NFD',value.strip().lower()) if not unicodedata.combining(char))

def parse_date(value):
    for fmt in ('%Y-%m-%d','%d/%m/%Y'):
        try:
            return datetime.strptime(value.strip(),fmt).date()
        except ValueError:
            pass
    raise ValueError('data deve ser AAAA-MM-DD ou DD/MM/AAAA')

def sales_periods(text,known_skus):
    try:
        dialect=csv.Sniffer().sniff(text[:8192],delimiters=';,\t')
    except csv.Error:
        dialect=csv.excel
    reader=csv.DictReader(io.StringIO(text),dialect=dialect)
    fieldnames={normalize(name):name for name in reader.fieldnames or [] if name}
    required={'sku','quantidade','pedido','data'}
    if not required.issubset(fieldnames):
        raise ValueError('colunas obrigatórias: sku, quantidade, pedido, data; status é opcional')
    by_month=defaultdict(lambda:defaultdict(lambda:defaultdict(int)))
    dates=defaultdict(list)
    order_dates={}
    included=0
    for line,row in enumerate(reader,start=2):
        if not any((value or '').strip() for key,value in row.items() if key):
            continue
        if None in row:
            raise ValueError(f'linha {line}: número de campos diferente do cabeçalho')
        def value(name):
            return (row.get(fieldnames.get(name,'')) or '').strip()
        status=normalize(value('status'))
        if status in IGNORED_STATUSES:
            continue
        if status and status not in CONFIRMED_STATUSES:
            raise ValueError(f'linha {line}: status não reconhecido; use somente vendas confirmadas')
        sku=value('sku')
        if sku not in known_skus:
            raise ValueError(f'linha {line}: SKU {sku!r} não existe no catálogo')
        order=value('pedido')
        if not order:
            raise ValueError(f'linha {line}: pedido ausente')
        try:
            amount=Decimal(value('quantidade').replace(',','.'))
            if not amount.is_finite() or amount!=amount.to_integral_value() or abs(amount)>1000000 or amount==0:
                raise ValueError('quantidade deve ser inteira, diferente de zero e até 1.000.000')
            sold_on=parse_date(value('data'))
        except (ValueError,InvalidOperation) as error:
            raise ValueError(f'linha {line}: {error}') from error
        if sold_on>date.today():
            raise ValueError(f'linha {line}: data futura')
        if order in order_dates and order_dates[order]!=sold_on:
            raise ValueError(f'linha {line}: o mesmo pedido aparece com datas diferentes')
        order_dates[order]=sold_on
        quantity=int(amount)
        if status in {'devolvido','devolvida'}:
            quantity=-abs(quantity)
        month=sold_on.strftime('%Y-%m')
        by_month[month][sku][order]+=quantity
        dates[month].append(sold_on)
        included+=1
    if not included:
        raise ValueError('nenhuma venda confirmada no arquivo')
    periods=[]
    for month in sorted(by_month,reverse=True):
        year,number=map(int,month.split('-'))
        products=[]
        for sku,orders in sorted(by_month[month].items()):
            units=sum(orders.values())
            count=sum(quantity>0 for quantity in orders.values())
            if units>0:
                products.append({'sku':sku,'units':units,'orders':count})
        if products:
            periods.append({'id':month,'label':f'{MONTHS[number-1]} de {year}','from':min(dates[month]).isoformat(),'to':max(dates[month]).isoformat(),'products':products})
    if not periods:
        raise ValueError('nenhum produto com quantidade líquida positiva')
    return periods

def write_config(config,root):
    serialized=json.dumps(config,ensure_ascii=False,indent=2)+'\n'
    encoded=serialized.replace('<','\\u003c').replace('\u2028','\\u2028').replace('\u2029','\\u2029')
    (root/'content/highlights.json').write_text(serialized,encoding='utf-8')
    (root/'assets/highlights-data.js').write_text('/* Gerado a partir de content/highlights.json. */\nwindow.FENIE_HIGHLIGHTS = '+encoded.rstrip()+';\n',encoding='utf-8')

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('csv',nargs='?',type=Path)
    parser.add_argument('--refresh-config',action='store_true',help='Regenera o JavaScript após editar o JSON, sem mudar as vendas.')
    args=parser.parse_args()
    if not args.csv and not args.refresh_config:
        parser.error('informe o CSV ou --refresh-config')
    config=json.loads((ROOT/'content/highlights.json').read_text(encoding='utf-8'))
    if args.csv:
        raw=args.csv.read_bytes()
        try:
            text=raw.decode('utf-8-sig')
        except UnicodeDecodeError:
            text=raw.decode('cp1252')
        app=(ROOT/'assets/catalogue.js').read_text(encoding='utf-8')
        known=set(re.findall(r'\bsku:"([A-Za-z0-9_.-]+)"',app))
        periods=sales_periods(text,known)
        config['sales']={'source':'Mercos','updatedAt':datetime.now(timezone.utc).isoformat(),'periods':periods}
    write_config(config,ROOT)
    print(f"Conteúdo atualizado; {len(config['combos'])} combos, {len(config['sales']['periods'])} períodos com vendas.")

if __name__=='__main__':
    main()
