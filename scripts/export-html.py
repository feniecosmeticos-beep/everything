"""Export the catalogue as a standalone HTML file (standard library only)."""
from pathlib import Path
import base64
import re
import sys

root = Path(__file__).resolve().parents[1]
html = (root / 'index.html').read_text(encoding='utf-8')
for name in ('catalogue-base.css', 'catalogue-premium.css', 'catalogue-mobile.css', 'catalogue-highlights.css'):
    css = (root / 'assets' / name).read_text(encoding='utf-8')
    tag = re.compile(r'<link rel="stylesheet" href="\./assets/' + re.escape(name) + r'(?:\?v=[a-f0-9]+)?">')
    html = tag.sub(lambda _: f'<style>\n{css}\n</style>', html)
js = (root / 'assets/catalogue.js').read_text(encoding='utf-8')
assert '</script' not in js.lower()
html = re.sub(r'<script src="\./assets/catalogue\.js(?:\?v=[a-f0-9]+)?" defer></script>', lambda _: f'<script>\n{js}\n</script>', html)
highlights = (root / 'assets/highlights-data.js').read_text(encoding='utf-8')
assert '</script' not in highlights.lower()
html = re.sub(r'<script src="\./assets/highlights-data\.js(?:\?v=[a-f0-9]+)?" defer></script>', lambda _: f'<script>\n{highlights}\n</script>', html)
cache = {}
def embed(match):
    name = match.group(0)
    if name not in cache:
        file = root / name[2:]
        mime = {'.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml'}[file.suffix]
        cache[name] = 'data:' + mime + ';base64,' + base64.b64encode(file.read_bytes()).decode('ascii')
    return cache[name]
html = re.sub(r'\./assets/(?:images|logos)/[A-Za-z0-9_-]+\.(?:png|jpg|webp|svg)', embed, html)
assert not re.search(r'(?:src|href)="\./assets/', html)
assert '<script src=' not in html
output = Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'catalogo-standalone.html'
output.write_text(html, encoding='utf-8')
print(f'{output.name}: {output.stat().st_size} bytes; {len(cache)} embedded images')
