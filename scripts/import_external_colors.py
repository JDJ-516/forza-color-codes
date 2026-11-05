"""Compare a pinned public CSV snapshot with the workbook, retaining raw historical variants."""
import csv
import hashlib
import json
from collections import defaultdict

COMMIT='b2825d88a48f34ea459e3100f76eeb5162b8d7b1'
REPOSITORY='https://github.com/nickdupuis/forza-paint-code-picker'
SOURCE_URL=f'{REPOSITORY}/blob/{COMMIT}/util/data/forza-colors.csv'
SOURCE_SHA256='2f1e1d5cba6f390907dac9b7dc00e33df3dbb83e9a7758795571a904764d8400'

def normalized(value):
    return ' '.join(str(value or '').split()).casefold()

def fingerprint(color):
    return tuple(normalized(v) for v in [color['manufacturer'],color['name'],color['finish'],
        *color['layers'][0]['raw'],*(color['layers'][1]['raw'] if len(color['layers'])>1 else [None]*3)])

def merge_historical(colors, path, slider, family_for):
    import colorsys
    if hashlib.sha256(path.read_bytes()).hexdigest()!=SOURCE_SHA256:
        raise ValueError('Historical source does not match the pinned revision checksum')
    known={fingerprint(c) for c in colors if c['category']=='Vehicle'}
    names=defaultdict(list)
    for c in colors:
        if c['category']=='Vehicle':names[(normalized(c['manufacturer']),normalized(c['name']))].append(c['id'])
    added, duplicates, conflicts= [],0,0
    with path.open(newline='',encoding='utf-8-sig') as stream:
        reader=csv.reader(stream)
        header=next(reader)
        if header[:3]!=['MAKE','COLOUR NAME','PAINT TYPE']:raise ValueError('Unexpected external CSV headers')
        total=0
        for row_number,row in enumerate(reader,2):
            if not any(row):continue
            total+=1
            if len(row)!=10:raise ValueError(f'Unexpected external row width at {row_number}')
            key=tuple(normalized(v) for v in row[:9])
            if key in known:
                duplicates+=1
                continue
            raw1=row[3:6];raw2=row[6:9] if any(row[6:9]) else None
            first=[slider(v) for v in raw1];second=[slider(v) for v in raw2] if raw2 else None
            if None in first or (second and None in second):raise ValueError(f'Invalid new historical recipe: {row_number}')
            related=names.get((normalized(row[0]),normalized(row[1])),[])
            conflicts+=bool(related)
            h,s,b=first
            ident='online-'+hashlib.sha256(json.dumps(key).encode()).hexdigest()[:20]
            color={
                'id':ident,'name':row[1],'manufacturer':row[0],'finish':row[2],'category':'Vehicle',
                'family':family_for(h,s,b),'hex':'#'+''.join(f'{round(v*255):02x}' for v in colorsys.hsv_to_rgb(h,s,b)),
                'h':h,'s':s,'b':b,'layers':[{'label':'Color 1 (X)','raw':raw1,'values':first}]+([{'label':'Color 2 (Y)','raw':raw2,'values':second}] if raw2 else []),
                'notes':row[9],'issues':[],
                'source':{'sheet':'Historical community CSV','row':row_number,'title':'nickdupuis / Forza Paint Code Picker — historical CSV',
                    'url':SOURCE_URL,'commit':COMMIT,'historical':True,'conflictsWith':related,
                    'warning':'Historical recipe retained from an older GTPlanet mirror. '+('Differs from the current workbook recipe with the same name; neither version was independently verified.' if related else 'Absent under this name in the current workbook; it may have been renamed or superseded. Not independently verified.')},
            }
            colors.append(color);added.append({'id':ident,'manufacturer':row[0],'name':row[1],'row':row_number,'conflictsWith':related});known.add(key)
    return {'url':SOURCE_URL,'commit':COMMIT,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
        'rowsCompared':total,'duplicateRecipesSkipped':duplicates,'historicalRecipesAdded':len(added),
        'sameNameConflicts':conflicts,'newNameIdentities':len(added)-conflicts,'added':added}
