from pathlib import Path
from hashlib import sha256
import importlib.util
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('version_assets', Path(__file__).resolve().parents[1] / 'version-assets.py')
assets = importlib.util.module_from_spec(spec)
spec.loader.exec_module(assets)


class AssetVersionTests(unittest.TestCase):
    def test_versions_follow_content_and_repeat_without_changing(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'assets').mkdir()
            target = root / 'assets/app.js'
            target.write_bytes(b'old code')
            html = '<script src="./assets/app.js?v=123" defer></script>'
            first = assets.version_html(html, root)
            self.assertIn(sha256(b'old code').hexdigest()[:12], first)
            self.assertEqual(first, assets.version_html(first, root))
            target.write_bytes(b'new code')
            second = assets.version_html(first, root)
            self.assertNotEqual(first, second)
            self.assertIn(sha256(b'new code').hexdigest()[:12], second)

    def test_images_and_external_sources_are_preserved(self):
        html = '<img src="./assets/logo.png"><script src="https://example.com/app.js"></script>'
        self.assertEqual(html, assets.version_html(html))


if __name__ == '__main__':
    unittest.main()
