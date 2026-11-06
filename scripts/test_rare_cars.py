"""Independent source audit against openpyxl, not the runtime ZIP/XML reader."""
from pathlib import Path
import datetime
import json
import unittest
import openpyxl
ROOT=Path(__file__).resolve().parents[1]
def value(v):
    if isinstance(v,datetime.datetime):return v.date().isoformat()
    if isinstance(v,float) and v.is_integer():return str(int(v))
    return str(v)
class SourceAudit(unittest.TestCase):
    def test_every_car_row_and_detail(self):
        workbook=openpyxl.load_workbook(ROOT/'data/rare-cars-source.xlsx',data_only=True)
        data=json.loads((ROOT/'public/rare-cars.json').read_text())
        actual={(c['category'],c['sourceRow']):c for c in data['cars']}
        expected_keys=set()
        for sheet in workbook:
            headers=[str(c.value or '').strip() for c in sheet[2]]
            for row in sheet.iter_rows(min_row=3):
                if not isinstance(row[0].value,(int,float)) or not row[1].value or not row[2].value:continue
                key=(sheet.title.strip(),row[0].row);expected_keys.add(key);car=actual[key]
                self.assertEqual([car['year'],car['brand'],car['model']],[int(row[0].value),str(row[1].value).strip(),str(row[2].value).strip()])
                details=[{'label':headers[i],'value':value(cell.value)} for i,cell in enumerate(row) if i>=3 and headers[i] and cell.value is not None]
                if headers[3] and not headers[4] and row[4].value is not None:details.append({'label':'Notes','value':value(row[4].value)})
                self.assertEqual(car['details'],details,key)
        self.assertEqual(set(actual),expected_keys)
        self.assertEqual(len(actual),284)
if __name__=='__main__':unittest.main()
