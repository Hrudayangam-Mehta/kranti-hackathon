#!/usr/bin/env python3
"""Select Mech Royale candidate repositories from the earlier triage lists.
Reads local files only.  usage: build_candidates.py <intel_dir> <out.tsv>"""
import os, re, sys, csv

intel, out = sys.argv[1], sys.argv[2]
tri = os.path.join(intel, '_triage')
KEY = re.compile(r'mech|royale|royal|mechfight|buildathon|builders|arena|bot|hackathon|oval|osu', re.I)
# other tracks of the same event / other events: not Mech Royale
NEG = re.compile(r'google|startup|blast[-_ ]?radius|shopping|databricks|rwx|cad[-_ ]?deid|mechina|'
                 r'river[-_ ]monitor|mechanicbot|sakhi|agentboard|coldchain|firstsign|biomed|hirevoice|'
                 r'stackscore|keepwell|vennessa|verifact', re.I)
rows = {}
def load(fn, tag):
    p = os.path.join(tri, fn)
    if not os.path.exists(p): return
    for r in csv.reader(open(p, encoding='utf-8', errors='replace'), delimiter='\t', quoting=csv.QUOTE_NONE):
        if len(r) < 5: continue
        r = (r + [''])[:6]
        name, lang, size, created, pushed, desc = r
        try: size = int(size)
        except ValueError: continue
        rows.setdefault(name, dict(name=name, lang=lang, size=size, created=created, pushed=pushed, desc=desc, src=tag))
for fn, tag in (('cands_f.tsv', 'f'), ('cands2.tsv', '2'), ('cands.tsv', '1'), ('cands_u.tsv', 'u')):
    load(fn, tag)
readmes = set(os.listdir(os.path.join(tri, 'readme'))) if os.path.isdir(os.path.join(tri, 'readme')) else set()
def readme_text(name):
    fn = name.replace('/', '_') + '.md'
    if fn in readmes:
        return open(os.path.join(tri, 'readme', fn), encoding='utf-8', errors='replace').read()
    return ''
sel = {}
for name, r in rows.items():
    if r['created'] < '2026-11-20' or r['size'] >= 50000: continue
    blob = name + ' ' + r['desc']
    if NEG.search(blob): continue
    rd = readme_text(name)
    why = None
    if KEY.search(name) or KEY.search(r['desc']): why = 'name/desc'
    elif rd and re.search(r'mech|royale|mechfight', rd, re.I): why = 'readme'
    elif not r['desc'].strip(): why = 'no-desc'
    if why:
        r['why'] = why; sel[name] = r
for d in sorted(os.listdir(intel)):
    if d.startswith('_') or '__' not in d or d.endswith('__branches'): continue
    owner, repo = d.split('__', 1)
    name = owner + '/' + repo
    if name not in sel:
        r = rows.get(name, dict(name=name, lang='', size=0, created='', pushed='', desc='', src='intel'))
        r['why'] = 'intel-clone'; sel[name] = r
with open(out, 'w', encoding='utf-8') as f:
    for name in sorted(sel, key=str.lower):
        r = sel[name]
        f.write('\t'.join([name, r['lang'], str(r['size']), r['created'], r['pushed'], r['why'], r['src'], r['desc'][:120]]) + '\n')
print(len(sel), 'candidates')
import collections
print(collections.Counter(r['why'] for r in sel.values()))
print('excluded recent small rows:')
for name, r in sorted(rows.items()):
    if r['created'] >= '2026-11-20' and r['size'] < 50000 and name not in sel:
        print('  ', name, '|', r['desc'][:60])
