#!/usr/bin/env python3
"""Preprocess public bulk data into compact JSON shipped in public/data/.

Inputs (download into ./rawdata, not committed):
  College Scorecard (no key needed), https://collegescorecard.ed.gov/data/
    Most-Recent-Cohorts-Institution.csv
    Most-Recent-Cohorts-Field-of-Study.csv
  Census 2024 Gazetteer ZCTA file, https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html
    2024_Gaz_zcta_national.txt

Usage: python3 scripts/build_school_data.py rawdata
"""
import csv, json, os, sys

raw = sys.argv[1] if len(sys.argv) > 1 else 'rawdata'
out = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')
os.makedirs(os.path.join(out, 'zips'), exist_ok=True)

# Our major ids -> 4-digit CIP codes (bachelor's programs) used to look up Scorecard field-of-study earnings
CIP = {
    'cs': '1107', 'compe': '1409', 'mecheng': '1419', 'ee': '1410', 'civeng': '1408', 'chemeng': '1407',
    'nursing': '5138', 'accounting': '5203', 'finance': '5208', 'econ': '4506', 'bizmgmt': '5202',
    'marketing': '5214', 'math': '2701', 'bio': '2601', 'psych': '4201', 'eled': '1312', 'comm': '0901',
    'cj': '4301', 'polisci': '4510', 'english': '2301', 'history': '5401', 'finearts': '5007',
    'graphic': '5004', 'construction': '5220',
}
cip2major = {v: k for k, v in CIP.items()}

def num(v):
    try:
        return round(float(v)) if v not in ('', 'NULL', 'PrivacySuppressed', 'PS', 'NA') else None
    except ValueError:
        return None

def fnum(v, nd=3):
    try:
        return round(float(v), nd) if v not in ('', 'NULL', 'PrivacySuppressed', 'PS', 'NA') else None
    except ValueError:
        return None

schools = []
ids = set()
with open(os.path.join(raw, 'Most-Recent-Cohorts-Institution.csv'), encoding='utf-8-sig') as f:
    for r in csv.DictReader(f):
        if r['CURROPER'] != '1' or r['DISTANCEONLY'] == '1':
            continue
        if r['CONTROL'] not in ('1', '2'):  # public, private nonprofit
            continue
        # degree-granting (associate or higher) undergraduate institutions; skip graduate-only
        if r['PREDDEG'] not in ('1', '2', '3') or r['HIGHDEG'] not in ('2', '3', '4'):
            continue
        lat, lon = fnum(r['LATITUDE'], 4), fnum(r['LONGITUDE'], 4)
        if lat is None or lon is None:
            continue
        if r['HIGHDEG'] == '2':  # highest award is an associate degree
            t = 'twoYear'
        elif r['CONTROL'] == '1':
            t = 'public4'
        else:
            t = 'private4'
        np_ = num(r['NPT4_PUB']) if r['CONTROL'] == '1' else num(r['NPT4_PRIV'])
        s = {
            'id': int(r['UNITID']), 'n': r['INSTNM'], 'c': r['CITY'], 's': r['STABBR'],
            'la': lat, 'lo': lon, 't': t, 'ctl': int(r['CONTROL']),
            'coa': num(r['COSTT4_A']), 'np': np_,
            'tin': num(r['TUITIONFEE_IN']), 'tout': num(r['TUITIONFEE_OUT']),
            'e10': num(r['MD_EARN_WNE_P10']), 'debt': num(r['GRAD_DEBT_MDN']),
            'grad': fnum(r['C150_4'] or r['C150_L4']), 'ug': num(r['UGDS']), 'url': r['INSTURL'],
        }
        schools.append({k: v for k, v in s.items() if v not in (None, '')})
        ids.add(int(r['UNITID']))

fos = {}
with open(os.path.join(raw, 'Most-Recent-Cohorts-Field-of-Study.csv'), encoding='utf-8-sig') as f:
    for r in csv.DictReader(f):
        if r['CREDLEV'] != '3':
            continue
        m = cip2major.get(r['CIPCODE'].zfill(4))
        if not r['UNITID'].isdigit():
            continue
        uid = int(r['UNITID'])
        if not m or uid not in ids:
            continue
        e1, e4 = num(r['EARN_MDN_1YR']), num(r['EARN_MDN_4YR'])
        if e1 is None and e4 is None:
            continue
        fos.setdefault(str(uid), {})[m] = [e1, e4]

with open(os.path.join(out, 'schools.json'), 'w') as f:
    json.dump(schools, f, separators=(',', ':'))
with open(os.path.join(out, 'programs.json'), 'w') as f:
    json.dump(fos, f, separators=(',', ':'))

zips = {}
with open(os.path.join(raw, '2024_Gaz_zcta_national.txt')) as f:
    rd = csv.reader(f, delimiter='\t')
    h = [x.strip() for x in next(rd)]
    for row in rd:
        d = dict(zip(h, [x.strip() for x in row]))
        z = d['GEOID']
        zips.setdefault(z[:3], {})[z] = [round(float(d['INTPTLAT']), 4), round(float(d['INTPTLONG']), 4)]
for p, v in zips.items():
    with open(os.path.join(out, 'zips', f'{p}.json'), 'w') as f:
        json.dump(v, f, separators=(',', ':'))

from collections import Counter
print(len(schools), 'schools', Counter(s['t'] for s in schools), len(fos), 'with programs', len(zips), 'zip prefixes')
