#!/usr/bin/env python3
"""Preprocess public bulk data into compact JSON shipped in public/data/.

Inputs (download into ./rawdata, not committed):
  College Scorecard (no key needed), https://collegescorecard.ed.gov/data/
    Most-Recent-Cohorts-Institution.csv
    Most-Recent-Cohorts-Field-of-Study.csv
  Census 2024 Gazetteer ZCTA file, https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html
    2024_Gaz_zcta_national.txt
    tab20_zcta520_county20_natl.txt (2020 ZCTA-to-county relationship file, for ZIP state)

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

FIPS = {'01':'AL','02':'AK','04':'AZ','05':'AR','06':'CA','08':'CO','09':'CT','10':'DE','11':'DC','12':'FL','13':'GA','15':'HI','16':'ID','17':'IL','18':'IN','19':'IA','20':'KS','21':'KY','22':'LA','23':'ME','24':'MD','25':'MA','26':'MI','27':'MN','28':'MS','29':'MO','30':'MT','31':'NE','32':'NV','33':'NH','34':'NJ','35':'NM','36':'NY','37':'NC','38':'ND','39':'OH','40':'OK','41':'OR','42':'PA','44':'RI','45':'SC','46':'SD','47':'TN','48':'TX','49':'UT','50':'VT','51':'VA','53':'WA','54':'WV','55':'WI','56':'WY','72':'PR'}
# ZCTA -> state via the Census 2020 ZCTA-to-county relationship file (state = county with most land in the ZCTA)
zstate, best = {}, {}
with open(os.path.join(raw, 'tab20_zcta520_county20_natl.txt')) as f:
    for r in csv.DictReader(f, delimiter='|'):
        z, c = r['GEOID_ZCTA5_20'], r['GEOID_COUNTY_20']
        if not z:
            continue
        land = int(r['AREALAND_PART'] or 0)
        if land >= best.get(z, -1):
            best[z] = land
            zstate[z] = FIPS.get(c[:2], '')

zips = {}
with open(os.path.join(raw, '2024_Gaz_zcta_national.txt')) as f:
    rd = csv.reader(f, delimiter='\t')
    h = [x.strip() for x in next(rd)]
    for row in rd:
        d = dict(zip(h, [x.strip() for x in row]))
        z = d['GEOID']
        zips.setdefault(z[:3], {})[z] = [round(float(d['INTPTLAT']), 4), round(float(d['INTPTLONG']), 4), zstate.get(z, '')]
for p, v in zips.items():
    with open(os.path.join(out, 'zips', f'{p}.json'), 'w') as f:
        json.dump(v, f, separators=(',', ':'))

from collections import Counter
print(len(schools), 'schools', Counter(s['t'] for s in schools), len(fos), 'with programs', len(zips), 'zip prefixes')
