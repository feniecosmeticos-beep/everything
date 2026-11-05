import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import openpyxl

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('ranking',ROOT/'scripts/import-ranking-xlsx.py')
ranking=importlib.util.module_from_spec(spec)
spec.loader.exec_module(ranking)


class RankingBrandTests(unittest.TestCase):
    def test_confirmed_paper_brand_preserves_historical_total(self):
        products=ranking.catalogue_products()
        paper=[item for item in products if item.get('sourceGroup')=='PAPEL PARA MECHAS']
        self.assertEqual(len(paper),12)
        self.assertTrue(all(item['brand']=='PAPEL PARA MECHAS' for item in paper))
        self.assertTrue(all('Marca' not in item['reviewPending'] for item in paper))
        period=json.loads((ROOT/'content/highlights.json').read_text(encoding='utf-8'))['sales']['periods'][0]
        sales=[row for row in period['products'] if row['sku'] in {item['sku'] for item in paper}]
        self.assertEqual(len(sales),7)
        self.assertEqual(sum(row['units'] for row in sales),51)
        self.assertTrue(all(row['brand']=='PAPEL PARA MECHAS' for row in sales))
        counts={row['brand']:row['units'] for row in period['classifications']}
        self.assertEqual(counts['PAPEL PARA MECHAS'],51)
        self.assertEqual(counts['SEM-MARCA'],13)
        self.assertEqual(sum(counts.values()),1741)

    def test_import_resolves_confirmed_brand_without_double_counting(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            for directory in ['assets','content','docs']:
                (root/directory).mkdir()
            products=[{'sku':'PAPER-A','name':'Paper A','sourceGroup':'PAPEL PARA MECHAS'},
                      {'sku':'PAPER-B','name':'Paper B','sourceGroup':'PAPEL PARA MECHAS'},
                      {'sku':'OTHER','name':'Other','sourceGroup':'ACESSORIOS'}]
            (root/'assets/catalogue.js').write_text('var data={"products":'+json.dumps(products)+'};',encoding='utf-8')
            (root/'content/highlights.json').write_text('{"version":1,"combos":[]}',encoding='utf-8')
            book=openpyxl.Workbook()
            summary=book.active
            summary.title='Resumo'
            for row in [('Período','01/10/2026 a 14/10/2026'),('Quantidade vendida',32),
                        ('Marca','Quantidade vendida'),('Não informada',27),('PAPEL PARA MECHAS',5),('Total geral',32)]:
                summary.append(row)
            sheet=book.create_sheet('Produtos')
            for row in [('Posição','Produto','Marca','Quantidade vendida'),
                        (1,'Paper A','Não informada',24),(2,'Paper B','PAPEL PARA MECHAS',5),(3,'Other','Não informada',3)]:
                sheet.append(row)
            report=root/'report.xlsx'
            book.save(report)
            with patch.object(ranking,'ROOT',root),patch('sys.argv',['import-ranking-xlsx.py',str(report)]):
                ranking.main()
            period=json.loads((root/'content/highlights.json').read_text(encoding='utf-8'))['sales']['periods'][0]
            self.assertEqual(period['brands'],[{'brand':'PAPEL PARA MECHAS','units':29}])
            self.assertEqual({row['brand']:row['units'] for row in period['classifications']},{'PAPEL PARA MECHAS':29,'SEM-MARCA':3})
            self.assertEqual(period['coverage']['sourceUnits'],32)


if __name__=='__main__':
    unittest.main()
