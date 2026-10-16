import importlib.util
from pathlib import Path
import tempfile
import unittest
import json

spec=importlib.util.spec_from_file_location('sales',Path(__file__).resolve().parents[1]/'import-sales.py')
sales=importlib.util.module_from_spec(spec)
spec.loader.exec_module(sales)

class SalesTests(unittest.TestCase):
    def test_units_orders_returns_and_cancellations(self):
        text='sku;quantidade;pedido;data;status\nA;2;P1;2026-07-01;faturado\nA;3;P1;2026-07-01;faturado\nA;1;P1;2026-07-01;devolvido\nA;1;P2;2026-07-02;faturado\nB;20;P3;2026-07-03;faturado\nX;99;P4;2026-07-04;cancelado\n'
        period=sales.sales_periods(text,{'A','B'})[0]
        self.assertEqual(period['products'],[{'sku':'A','units':5,'orders':2},{'sku':'B','units':20,'orders':1}])
        self.assertEqual(period['from'],'2026-07-01')
        self.assertEqual(period['to'],'2026-07-03')

    def test_rejects_unknown_sku_and_fractional_units(self):
        with self.assertRaisesRegex(ValueError,'não existe'):
            sales.sales_periods('sku;quantidade;pedido;data\nX;1;P1;01/07/2026\n',{'A'})
        with self.assertRaisesRegex(ValueError,'inteira'):
            sales.sales_periods('sku;quantidade;pedido;data\nA;1,5;P1;01/07/2026\n',{'A'})

    def test_empty_and_ambiguous_reports_fail(self):
        with self.assertRaisesRegex(ValueError,'nenhuma venda'):
            sales.sales_periods('sku;quantidade;pedido;data;status\nA;1;P1;2026-07-01;cancelado\n',{'A'})
        with self.assertRaisesRegex(ValueError,'datas diferentes'):
            sales.sales_periods('sku;quantidade;pedido;data\nA;1;P1;2026-07-01\nA;1;P1;2026-07-02\n',{'A'})

    def test_public_output_does_not_contain_order_ids(self):
        periods=sales.sales_periods('sku;quantidade;pedido;data\nA;4;PRIVATE-ORDER;2026-07-01\n',{'A'})
        config={'version':1,'month':'2026-07','combos':[],'sales':{'source':'Mercos','periods':periods}}
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            (root/'content').mkdir()
            (root/'assets').mkdir()
            sales.write_config(config,root)
            output=(root/'assets/highlights-data.js').read_text(encoding='utf-8')
            self.assertNotIn('PRIVATE-ORDER',output)
            self.assertEqual(json.loads((root/'content/highlights.json').read_text(encoding='utf-8')),config)

if __name__=='__main__':
    unittest.main()
