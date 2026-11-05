"""Importa somente fotos revisadas, obtidas pela interface autenticada do Mercos.

Uso: python scripts/import-mercos-photos.py <pasta-da-coleta>
Os originais e os caminhos locais da coleta ficam fora do repositório.
Requer Pillow. Preserva os dados comerciais, exceto a identificação explicitamente
corrigida em CONFIRMED_CORRECTIONS após conferir a embalagem.
"""
import hashlib
import json
from pathlib import Path
import re
import sys

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
EXCLUDED = {
    'OLK-FND-PMS-80': 'Cadastro informa 80 g; foto do Mercos mostra 60 g.',
    'OLK-SHK-COL-500': 'Cadastro informa 500 g; foto do Mercos mostra 500 ml.',
    'GLY-SH-BSC-250': 'Cadastro informa 250 g; foto do Mercos mostra 250 ml.',
    'GLY-LVI-MSP-250': 'Cadastro informa 250 g; foto do Mercos mostra 250 ml.',
    'PHL-MSK-BIO-300': 'Cadastro informa 300 ml; foto do Mercos mostra 300 g.',
    'CUR-FN-MCH': 'Arte anuncia curso em 31 de agosto; não usar como oferta atual.',
    'OLK-KIT-HUB': 'Arquivo é uma arte promocional com preço. Falta foto própria do conjunto.',
}
CONFIRMED_CORRECTIONS = {
    # Equipe informou a quantidade 250; a unidade ml é legível no rótulo do Mercos.
    'EVT-OLK-SCR-CAT-250': {'name':'Creme Ativador Secret Curl 250ml', 'size':'250 ml'},
}


def load_products(source):
    start = source.index('"products":[') + len('"products":')
    products, length = json.JSONDecoder().raw_decode(source[start:])
    return start, length, products


def apply(collection):
    candidates = json.loads((collection / 'candidates.json').read_text(encoding='utf-8'))
    inventory = json.loads((collection / 'source-index.json').read_text(encoding='utf-8'))
    source_file = ROOT / 'assets/catalogue.js'
    source = source_file.read_text(encoding='utf-8')
    start, length, products = load_products(source)
    before = json.loads(json.dumps(products))
    by_id = {p['id']: p for p in products}
    audit_path = ROOT / 'docs/audits/mercos-photos-2026-11-05.json'
    prior = json.loads(audit_path.read_text(encoding='utf-8')) if audit_path.exists() else {}
    applied, rejected = [], []
    for candidate in candidates:
        product = by_id[candidate['product']['id']]
        row = candidate['source']
        product.update(CONFIRMED_CORRECTIONS.get(product['id'], {}))
        if product['id'] in EXCLUDED:
            rejected.append({'id': product['id'], 'name': product['name'], 'reason': EXCLUDED[product['id']], 'source': row['page'], 'sourceImage': row['image']})
            continue
        if product.get('image'):
            continue
        if not row['image'].startswith('https://arquivos.mercos.com/media/imagem_produto/264566/'):
            raise ValueError(f"Fonte de foto não aprovada: {product['id']}")
        original = Path(row['localPath'])
        digest = hashlib.sha256(original.read_bytes()).hexdigest()
        if digest != row['sha256']:
            raise ValueError(f"Original modificado: {product['id']}")
        image = ImageOps.exif_transpose(Image.open(original))
        if image.mode not in ('RGB', 'RGBA'):
            image = image.convert('RGBA' if 'transparency' in image.info else 'RGB')
        image.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
        filename = f'mercos-{digest[:16]}.webp'
        destination = ROOT / 'assets/products' / filename
        if not destination.exists():
            image.save(destination, 'WEBP', quality=90, method=6)
        product['image'] = f'./assets/products/{filename}'
        product['imageKind'] = 'product'
        shared_shade = product['category'] == 'Coloração'
        product['imageAlt'] = f"{product['brand']} — {product['name']}; " + ('embalagem comum da linha; a foto não representa a tonalidade' if shared_shade else 'foto cadastrada pela Fenié no Mercos')
        product['imageSource'] = row['page']
        product['reviewPending'] = [p for p in product.get('reviewPending', []) if p not in ('Foto oficial', 'Foto específica', 'Foto exata')]
        applied.append({'id': product['id'], 'name': product['name'], 'mercosId': row['mercosId'], 'mercosSku': row['sku'], 'mercosName': re.sub(r'\s*Clique para alterar ou excluir o produto\.?\s*', '', row['name']), 'image': product['image'], 'sourcePage': row['page'], 'sourceImage': row['image'], 'originalSha256': digest, 'optimizedSha256': hashlib.sha256(destination.read_bytes()).hexdigest(), 'sharedShadePackaging': shared_shade})

    # O conteúdo comercial deve permanecer exatamente igual ao anterior à importação.
    photo_fields = {'image', 'imageKind', 'imageAlt', 'imageSource', 'reviewPending'}
    for old, new in zip(before, products, strict=True):
        expected = {**old, **CONFIRMED_CORRECTIONS.get(old['id'], {})}
        assert {k:v for k,v in expected.items() if k not in photo_fields} == {k:v for k,v in new.items() if k not in photo_fields}, old['id']
    if applied:
        encoded = json.dumps(products, ensure_ascii=False, separators=(',', ':'))
        source_file.write_text(source[:start] + encoded + source[start + length:], encoding='utf-8', newline='\n')

    for product in products:
        if product.get('image') or product['status'] == 'hidden' or product['id'] in EXCLUDED:
            continue
        matches = [r for r in inventory if r['sku'] == product['sku']]
        rejected.append({'id': product['id'], 'name': product['name'], 'reason': 'Sem foto no cadastro ativo do Mercos.' if matches else 'Sem correspondência ativa por código; verificar composição ou cadastro específico.'})
    new_count = len(applied)
    accumulated = {p['id']:p for p in prior.get('applied', []) if by_id.get(p['id'], {}).get('image') == p['image']}
    accumulated.update({p['id']:p for p in applied})
    applied = list(accumulated.values())
    audit = {'collectedAt':'2026-11-05', 'source':'Mercos · Fenie Professionnel · empresa 264566', 'activeRecordsInspected':len(inventory), 'appliedCount':len(applied), 'pendingCount':len(rejected), 'labelCorrections':CONFIRMED_CORRECTIONS, 'applied':applied, 'pending':rejected}
    audit_path.write_text(json.dumps(audit, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
    print(json.dumps({'newApplied':new_count, 'applied':len(applied), 'pending':len(rejected), 'eventApplied':sum(bool(by_id[p['id']].get('eventSection')) for p in applied), 'files':len({p['image'] for p in applied}), 'bytes':sum((ROOT / path[2:]).stat().st_size for path in {p['image'] for p in applied})}))


if __name__ == '__main__':
    apply(Path(sys.argv[1]).resolve())
