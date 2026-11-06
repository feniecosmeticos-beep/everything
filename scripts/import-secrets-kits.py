"""Adiciona os três kits Secret Curl conferidos no Mercos, sem presumir promoções.

Uso: python scripts/import-secrets-kits.py <pasta-de-originais-do-Mercos>
Requer Pillow. Fonte: content/secrets-kits.json.
"""
import hashlib
import json
from pathlib import Path
import re
import sys
import unicodedata
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / 'content/secrets-kits.json').read_text(encoding='utf-8'))
source_file = ROOT / 'assets/catalogue.js'
source = source_file.read_text(encoding='utf-8')
start = source.index('"products":[') + len('"products":')
products, length = json.JSONDecoder().raw_decode(source[start:])
kit_ids = {p['sku'] for p in manifest['products']}
before = [p for p in products if p['id'] not in kit_ids]
added = []
for index, row in enumerate(manifest['products']):
    original = Path(sys.argv[1]) / f"mercos-{row['mercosId']}.jpg"
    assert hashlib.sha256(original.read_bytes()).hexdigest() == row['originalSha256'], row['sku']
    destination = ROOT / 'assets/products' / row['imageFile']
    if not destination.exists():
        image = ImageOps.exif_transpose(Image.open(original)).convert('RGB')
        image.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
        image.save(destination, 'WEBP', quality=90, method=6)
    slug = unicodedata.normalize('NFD', row['name'].lower())
    slug = ''.join(c for c in slug if not unicodedata.combining(c))
    slug = re.sub(r'[^a-z0-9]+', '-', slug).strip('-')
    added.append({
        'id':row['sku'], 'sku':row['sku'], 'slug':f"{slug}-{row['sku'].lower()}",
        'name':row['name'], 'brand':'OLENKA', 'sourceGroup':'OLENKA',
        'line':'Secret Curl', 'category':'Kits', 'size':row['size'],
        'status':'consult', 'order':-1915.3 + index * .1,
        'priceCents':row['priceCents'], 'catalogueSection':'Lançamento Secrets',
        'kitIncludes':row['includes'],
        'image':f"./assets/products/{row['imageFile']}", 'imageKind':'product',
        'imageAlt':f"{row['name']}; composição do kit cadastrada pela Fenié no Mercos",
        'imageSource':f"https://app.mercos.com/264566/representadas/403061/produtos/{row['mercosId']}/alterar/",
        'reviewPending':['Disponibilidade comercial'],
        'keywords':[row['sku'], 'Olenka', 'Secret Curl', 'Secrets', 'cachos', 'kit', *row['includes']]
    })
insert = next((i for i,p in enumerate(before) if p.get('eventSection') == 'Lançamento Secrets'), len(before))
result = before[:insert] + added + before[insert:]
assert [p for p in result if p['id'] not in kit_ids] == before
assert len({p['id'] for p in result}) == len(result)
encoded = json.dumps(result, ensure_ascii=False, separators=(',', ':'))
source_file.write_text(source[:start] + encoded + source[start+length:], encoding='utf-8', newline='\n')
print(json.dumps({'kits':len(added), 'prices':[p['priceCents'] for p in added], 'catalogueOptions':sum(p['status']!='hidden' for p in result)}))
