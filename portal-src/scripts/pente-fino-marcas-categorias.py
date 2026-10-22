import json, re, unicodedata, csv, collections

data = json.load(open('/tmp/claude-0/pente/products.json'))

def norm(t):
    return unicodedata.normalize('NFD', t or '').encode('ascii', 'ignore').decode().lower()

UNKNOWN = 'Marca a confirmar'
PREFIX_BRAND = [
    ('SFO-', 'SPA DO FIO'), ('DOH-', 'DOHA'), ('DHO-', 'DOHA'), ('PHL-', 'PROHALL'),
    ('GLY', 'GLYNETT'), ('RGL-', 'RIGOLIM'), ('MUP-', 'MUP COLOR'), ('MAK-', 'MUP MAKEUP'),
    ('VAB-', 'VABENE'), ('VBN-', 'VABENE'), ('WS-', 'WS'),
    ('CUR-', 'FENIÉ ACADEMY'), ('CRS-', 'FENIÉ ACADEMY'), ('OLK-ING-', 'FENIÉ ACADEMY'),
]

def new_brand(pid, name, brand):
    n = norm(name)
    if brand != UNKNOWN:
        return brand
    if pid.startswith('TIF-'):
        return 'BABYLISS PRO' if 'babyliss' in n else 'TAIFF'
    if pid.startswith('OLK-KIT-CUS-'):
        return 'MUP COLOR' if 'mup color' in n else 'OLENKA'
    for pre, b in PREFIX_BRAND:
        if pid.startswith(pre):
            return b
    if pid.startswith('OLK-') or 'olenka' in n:
        return 'OLENKA'
    if 'taiff' in n:
        return 'TAIFF'
    if '18k' in n:
        return '18K'
    if 'krest' in n:
        return 'KREST'
    if 'spa do fio' in n:
        return 'SPA DO FIO'
    return brand  # continua a confirmar: sem marca identificável no nome/código

CAT_RENAME = {
    'Oleos': 'Óleos', 'hampoos e condicionadores': 'Shampoos e condicionadores',
    'Papel Liso': 'Papel para mechas', 'Papel Personalizado': 'Papel para mechas',
    'Acessórios': 'Acessórios de Aplicação', 'Descoloração': 'Descoloração',
}

def new_category(pid, name, cat):
    n = norm(name)
    # 1. cursos, ingressos e eventos
    if pid.startswith(('CUR-', 'CRS-', 'OLK-ING-')):
        return 'Cursos e eventos'
    # 2. kits e combos (todas as marcas)
    if re.match(r'^(kit|combo|olenka combo)\b', n) or 'combo' in pid.lower():
        return 'Kits e combos'
    # 3. papel para mechas
    if pid.startswith('PPM-PAP-') and 'avental' not in n or pid in ('PPM-MTC-50', 'VBN-PPA-100') or n.startswith('papel para mechas'):
        return 'Papel para mechas'
    if 'plaquete' in n:
        return 'Acessórios de Aplicação'
    if 'avental papel' in n:
        return 'Proteção e Descartáveis'
    # 4. oxidantes
    if 'oxidante' in n:
        return 'Oxidantes'
    # 5. perfumaria (hair/body splash)
    if 'splash' in n and 'growth' not in n:
        return 'Perfumaria'
    # 6. cachos: ativadores, cremes de pentear, mousses e sprays para cachos
    if re.search(r'(ativador de cachos|ativador day after|creme de pentear|dual mousse cabelos cacheados|spray twist|secret curl)', n):
        return 'Cachos'
    # 7. shampoo fora do lugar
    if re.match(r'^(shampoo|condicionador|condicionar)', n) and cat in ('Grupo não informado', 'Máscaras e tratamentos'):
        return 'Shampoos e condicionadores'
    # 8. óleo reparador em dose (sérum) é finalizador
    if pid in ('PHL-OIL-ABS-7', 'PHL-CX-ABS-7'):
        return 'Finalizadores'
    if cat == 'Grupo não informado' or cat == 'Olenka':
        if re.search(r'(oleo essencial|oil.s|oleo de |elixir)', n):
            return 'Óleos'
        if re.search(r'(oleo reparador|serum|fluido|secar sem frizz)', n):
            return 'Finalizadores'
        if re.search(r'(mascara|mask|balm|manteiga|fortificante|acidificante|pre tratamento)', n):
            return 'Máscaras e tratamentos'
        if 'bioenzyme' in n:
            return 'Alisantes e Progressivas'
        if re.search(r'(escova|pente)', n):
            return 'Escovas e pentes'
        if re.search(r'(tesoura|desfiadeira)', n):
            return 'Tesouras e Navalhas'
        if re.search(r'(presilha|pincel|clipe|cartela)', n):
            return 'Acessórios de Aplicação'
    return CAT_RENAME.get(cat, cat)

rows, changes = [], []
for pid, name, brand, cat in data:
    nb, nc = new_brand(pid, name, brand), new_category(pid, name, cat)
    rows.append((pid, name, brand, nb, cat, nc))
    if nb != brand or nc != cat:
        changes.append((pid, name, brand, nb, cat, nc))

json.dump([{'id': r[0], 'brand': r[3], 'category': r[5]} for r in changes], open('/tmp/claude-0/pente/changes.json', 'w'), ensure_ascii=False)
with open('/tmp/claude-0/pente/de_para.csv', 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f, delimiter=';')
    w.writerow(['Código', 'Produto', 'Marca antes', 'Marca depois', 'Categoria antes', 'Categoria depois'])
    w.writerows(changes)

print('alterados:', len(changes))
print('marca mudou:', sum(1 for r in changes if r[2] != r[3]), '| categoria mudou:', sum(1 for r in changes if r[4] != r[5]))
print('\nMARCAS depois:', collections.Counter(r[3] for r in rows).most_common())
print('\nCATEGORIAS depois:', collections.Counter(r[5] for r in rows).most_common())
print('\nAINDA SEM MARCA:')
for r in rows:
    if r[3] == UNKNOWN: print('  ', r[0], '|', r[1], '|', r[5])
print('\nAINDA SEM CATEGORIA:')
for r in rows:
    if r[5] in ('Grupo não informado', 'Olenka', ''): print('  ', r[0], '|', r[1], '|', r[3])
