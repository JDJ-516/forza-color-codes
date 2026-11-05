"""Reproduce the bundled catalogue: python scripts/import_colors.py [workbook.xlsx].
Development-only dependency: openpyxl==3.1.5. No Python needed to run the app.
Raw recipe cells are authoritative; invalid cells are retained and flagged, never repaired.
"""
import colorsys
import hashlib
import json
from pathlib import Path
import re
import sys
from collections import Counter
import openpyxl

ROOT = Path(__file__).resolve().parents[1]
SOURCE_URL = 'https://docs.google.com/spreadsheets/d/1wLXN4PusGWD7zcpLiS-uizYm6iZc2WM1EbBMurlAlj4/edit'

def slider(raw):
    match = re.fullmatch(r'\s*(\d+(?:\.\d+)?)\s*([LR])?\s*', str(raw), re.I)
    if not match or not 0 <= float(match[1]) <= 1:
        return None
    return float(match[1])

def family_for(h, s, b):
    if any(v is None for v in (h, s, b)): return 'Unknown'
    if s < .12 or b < .09: return 'Neutral'
    h = h % 1
    if h < .04 or h >= .96: return 'Red'
    if h < .12: return 'Orange'
    if h < .19: return 'Yellow'
    if h < .47: return 'Green'
    if h < .69: return 'Blue'
    if h < .84: return 'Purple'
    return 'Pink'

def import_workbook(path):
    workbook = openpyxl.load_workbook(path, data_only=True)
    colors, issues, counts, blanks = [], [], {}, {}
    identities = Counter()
    for sheet, category in [('Vehicle Colours', 'Vehicle'), ('Wheel Colours', 'Wheel')]:
        ws = workbook[sheet]
        if list(next(ws.iter_rows(min_row=2, max_row=2, values_only=True)))[:3] != ['MAKE','COLOUR NAME','PAINT TYPE']:
            raise ValueError(f'Unexpected headers in {sheet}')
        counts[sheet], blanks[sheet] = 0, 0
        for row_number, row in enumerate(ws.iter_rows(min_row=3, values_only=True), 3):
            raw = list(row[:10])
            if not any(v is not None for v in raw):
                blanks[sheet] += 1
                continue
            make, name, finish = [str(v or '').strip() for v in raw[:3]]
            if not make or not name: raise ValueError(f'Missing identity: {sheet}!{row_number}')
            raw1, raw2 = raw[3:6], raw[6:9]
            first = [slider(v) for v in raw1]
            second = [slider(v) for v in raw2] if any(v is not None for v in raw2) else None
            problems = []
            for offset, value in enumerate(raw[3:9], 4):
                required = offset <= 6 or second is not None
                if required and slider(value) is None:
                    problems.append({'cell': f'{chr(64+offset)}{row_number}', 'value': value})
            identity = hashlib.sha256(json.dumps([sheet,raw],ensure_ascii=False).encode()).hexdigest()[:20]
            identities[identity] += 1
            ident = f'sheet-{identity}-{identities[identity]}'
            h,s,b = first
            preview = '#bcc1b3' if None in first else '#'+''.join(f'{round(v*255):02x}' for v in colorsys.hsv_to_rgb(h,s,b))
            color = {
                'id':ident,'name':name,'manufacturer':make,'finish':finish,'category':category,
                'family':family_for(h,s,b),'hex':preview,'h':h,'s':s,'b':b,
                'layers':[{'label':'Color 1 (X)','raw':raw1,'values':first}] + ([{'label':'Color 2 (Y)','raw':raw2,'values':second}] if second is not None else []),
                'notes':str(raw[9] or ''),'source':{'sheet':sheet,'row':row_number},
                'issues':problems,
            }
            colors.append(color)
            counts[sheet] += 1
            if problems: issues.append({'id':ident,'sheet':sheet,'row':row_number,'manufacturer':make,'name':name,'cells':problems})
    metadata = {
        'title':'Forza Colour Sheet (Est. 2019)', 'url':SOURCE_URL,
        'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
        'total':len(colors),'sheets':counts,'blankRowsSkipped':blanks,
        'rowsNeedingReview':len(issues),'invalidCells':sum(len(x['cells']) for x in issues),
        'fh6ExplicitlyIdentified':False,
        'verification':'Imported community recipes; game compatibility has not been independently verified.',
    }
    return colors, {'metadata':metadata,'issues':issues}

if __name__ == '__main__':
    path = Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'data/source.xlsx'
    colors, report = import_workbook(path)
    (ROOT/'public/catalogue.json').write_text(json.dumps(colors,ensure_ascii=False,separators=(',',':'))+'\n')
    (ROOT/'public/import-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    (ROOT/'public/data.js').write_text('export const catalogueMetadata = '+json.dumps(report['metadata'],ensure_ascii=False)+';\n')
    print(json.dumps(report,ensure_ascii=False,indent=2))
