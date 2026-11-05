import unittest
import json
from pathlib import Path
from import_colors import import_workbook, build_catalogue
import openpyxl

ROOT=Path(__file__).resolve().parents[1]
class WorkbookImportTest(unittest.TestCase):
    def test_every_nonblank_row_and_raw_setting_is_preserved(self):
        colors, report=import_workbook(ROOT/'data/source.xlsx')
        self.assertEqual(len(colors),11004)
        workbook=openpyxl.load_workbook(ROOT/'data/source.xlsx',data_only=True)
        by_source={(c['source']['sheet'],c['source']['row']):c for c in colors}
        seen=0
        for sheet in workbook:
            for n,row in enumerate(sheet.iter_rows(min_row=3,values_only=True),3):
                if not any(v is not None for v in row[:10]):continue
                c=by_source[(sheet.title,n)];seen+=1
                self.assertEqual(c['manufacturer'],str(row[0]).strip())
                self.assertEqual(c['name'],str(row[1]).strip())
                self.assertEqual(c['finish'],str(row[2]).strip())
                self.assertEqual(c['notes'],str(row[9] or ''))
                self.assertEqual(c['layers'][0]['raw'],list(row[3:6]))
                if any(v is not None for v in row[6:9]):self.assertEqual(c['layers'][1]['raw'],list(row[6:9]))
                else:self.assertEqual(len(c['layers']),1)
        self.assertEqual(seen,len(colors))
        combined, combined_report = build_catalogue(ROOT/'data/source.xlsx')
        self.assertEqual(combined[:len(colors)], colors)
        self.assertEqual(combined,json.loads((ROOT/'public/catalogue.json').read_text()))
        self.assertEqual(combined_report,json.loads((ROOT/'public/import-report.json').read_text()))

if __name__=='__main__':unittest.main()
