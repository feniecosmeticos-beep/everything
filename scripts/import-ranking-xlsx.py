"""Importa relatório agregado de produtos, cruzando nomes únicos com o catálogo."""
from pathlib import Path
from collections import defaultdict
from datetime import datetime, timezone
import argparse
import importlib.util
import json
import re
import unicodedata
import openpyxl

ROOT=Path(__file__).resolve().parents[1]
BRANDS={'MUP COLOR','MUP MAKEUP','OLENKA','GLYNETT','SPA DO FIO','PROHALL','RIGOLIM','DOHA'}
spec=importlib.util.spec_from_file_location('sales_import',ROOT/'scripts/import-sales.py')
sales_import=importlib.util.module_from_spec(spec)
spec.loader.exec_module(sales_import)

def normalized(value):
    text=''.join(c for c in unicodedata.normalize('NFD',str(value).lower()) if not unicodedata.combining(c))
    return re.sub(r'\s+',' ',text).strip()

def decode_js_string(value):
    # Only decode the JS string literal's escapes; no evaluation of source code.
    mapping={'n':'\n','r':'\r','t':'\t','b':'\b','f':'\f','v':'\v','0':'\0'}
    def decode(match):
        token=match.group(1)
        if token.startswith('x'):
            return chr(int(token[1:],16))
        if token.startswith('u'):
            return chr(int(token[1:],16))
        return mapping.get(token,token)
    return re.sub(r'\\(x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|.)',decode,value)

def catalogue_names():
    app=(ROOT/'assets/catalogue.js').read_text(encoding='utf-8')
    block=app[app.index('uo={'):app.index(',lo={')]
    result=defaultdict(list)
    for match in re.finditer(r'\{id:"((?:\\.|[^"\\])*)",sku:"((?:\\.|[^"\\])*)",slug:"((?:\\.|[^"\\])*)",name:"((?:\\.|[^"\\])*)"',block):
        result[normalized(decode_js_string(match.group(4)))].append(decode_js_string(match.group(2)))
    if not result:
        raise ValueError('não foi possível ler os nomes comerciais do catálogo')
    return result

def public_brand(value):
    brand=str(value).strip().upper().replace('•','')
    return brand if brand in BRANDS else None

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('report',type=Path)
    args=parser.parse_args()
    workbook=openpyxl.load_workbook(args.report,data_only=True,read_only=True)
    summary=list(workbook['Resumo'].values)
    products=list(workbook['Produtos'].values)
    period_text=next(row[1] for row in summary if row and row[0]=='Período')
    period_match=re.fullmatch(r'(\d{2}/\d{2}/\d{4}) a (\d{2}/\d{2}/\d{4})',period_text)
    if not period_match:
        raise ValueError('período não reconhecido no relatório')
    from_date,to_date=(datetime.strptime(value,'%d/%m/%Y').date() for value in period_match.groups())
    if from_date>to_date or from_date.strftime('%Y-%m')!=to_date.strftime('%Y-%m'):
        raise ValueError('use um relatório de um único mês')
    header=next(index for index,row in enumerate(products) if row[0]=='Posição' and row[1]=='Produto' and row[3]=='Quantidade vendida')
    names=catalogue_names()
    rows=[]
    unmatched=[]
    all_brand_units=defaultdict(int)
    report_total=0
    seen=set()
    for row in products[header+1:]:
        if not isinstance(row[0],(int,float)):
            continue
        name=str(row[1]).strip()
        quantity=row[3]
        if not isinstance(quantity,(int,float)) or quantity!=int(quantity) or quantity<0:
            raise ValueError(f'quantidade inválida no produto {name}')
        if normalized(name) in seen:
            raise ValueError(f'produto duplicado no relatório: {name}')
        seen.add(normalized(name))
        quantity=int(quantity)
        report_total+=quantity
        all_brand_units[str(row[2]).strip()]+=quantity
        matches=names[normalized(name)]
        if len(matches)==1:
            rows.append({'sku':matches[0],'units':quantity,'sourceRank':int(row[0]),'brand':public_brand(row[2])})
        else:
            unmatched.append({'product':name,'brand':str(row[2]).strip(),'units':quantity,'sourceRank':int(row[0])})
    total_cell=next(row[1] for row in summary if row and row[0]=='Quantidade vendida')
    if report_total!=total_cell:
        raise ValueError('quantidades dos produtos não reconciliam com o resumo')
    brands=[]
    classifications={}
    brand_header=next(index for index,row in enumerate(summary) if row[0]=='Marca' and row[1]=='Quantidade vendida')
    for row in summary[brand_header+1:]:
        if row[0]=='Total geral':
            break
        if not row[0]:
            continue
        if all_brand_units[str(row[0]).strip()]!=row[1]:
            raise ValueError(f'quantidade da marca {row[0]} não reconcilia')
        brand=public_brand(row[0])
        if brand:
            brands.append({'brand':brand,'units':int(row[1])})
        raw=str(row[0]).strip()
        key='MUP' if raw in {'MUP COLOR','MUP MAKEUP'} else 'SEM-MARCA' if raw=='Não informada' else 'CURSOS' if raw=='Não se aplica (curso)' else brand or raw.upper()
        label='MUP' if key=='MUP' else 'Sem marca informada' if key=='SEM-MARCA' else 'Cursos' if key=='CURSOS' else key
        if key not in classifications:
            classifications[key]={'brand':key,'label':label,'units':0,'sourceOrder':len(classifications),'members':[]}
        classifications[key]['units']+=int(row[1])
        classifications[key]['members'].append(raw)
    full_ranking=sorted(classifications.values(),key=lambda item:(-item['units'],item['sourceOrder']))
    if sum(item['units'] for item in full_ranking)!=report_total:
        raise ValueError('ranking consolidado não reconcilia com todas as vendas do relatório')
    config=json.loads((ROOT/'content/highlights.json').read_text(encoding='utf-8'))
    period={'id':from_date.strftime('%Y-%m'),'label':f'{sales_import.MONTHS[from_date.month-1]} de {from_date.year}','from':from_date.isoformat(),'to':to_date.isoformat(),'products':rows,'brands':brands,'popularMode':'units','unitsMethod':'Quantidade vendida no relatório','coverage':{'sourceProducts':len(seen),'matchedProducts':len(rows),'sourceUnits':report_total,'matchedUnits':sum(row['units'] for row in rows)}}
    period['classifications']=full_ranking
    period['unmatchedProducts']=unmatched
    config['sales']={'source':'Mercos','updatedAt':datetime.now(timezone.utc).isoformat(),'periods':[period]}
    sales_import.write_config(config,ROOT)
    # Only the non-sensitive product mapping is retained in the source package.
    (ROOT/'docs/ranking-sem-correspondencia.json').write_text(json.dumps({'period':{'from':period['from'],'to':period['to']},'products':unmatched},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Ranking completo com {len(full_ranking)} classificações importado. Produtos associados: {len(rows)}/{len(seen)}. Quantidade total conferida: {report_total}.')

if __name__=='__main__':
    main()
