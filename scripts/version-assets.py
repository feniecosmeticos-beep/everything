"""Versiona CSS e JavaScript locais pelo conteúdo, sem dependências externas."""
from hashlib import sha256
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PATTERN = r'(?P<path>\./assets/[A-Za-z0-9_-]+\.(?:css|js))(?:\?v=[a-f0-9]+)?(?=")'


def version_html(html, root=ROOT):
    def replace(match):
        asset = root / match['path'][2:]
        version = sha256(asset.read_bytes()).hexdigest()[:12]
        return f"{match['path']}?v={version}"
    return re.sub(PATTERN, replace, html)


if __name__ == '__main__':
    target = ROOT / 'index.html'
    current = target.read_text(encoding='utf-8')
    updated = version_html(current)
    if updated != current:
        target.write_text(updated, encoding='utf-8')
    print('CSS e JavaScript versionados pelo SHA-256 do conteúdo.')
