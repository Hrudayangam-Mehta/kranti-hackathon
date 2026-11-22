#!/usr/bin/env python3
"""Per zone phase: time in FIGHT / ZONE, FIGHT<->ZONE flips, target distance when fighting, zone-dps damage taken,
our distance to the next centre / its radius. Input: sim traces (--trace) given as arguments."""
import gzip, json, sys, math
PH = [(0,110),(110,195),(195,265),(265,325),(325,375),(375,480)]
def ph(t):
    for i,(a,b) in enumerate(PH):
        if a <= t < b: return i
    return 5
agg = {}
for fn in sys.argv[1:]:
    d = json.load(gzip.open(fn))
    fr = d['frames']; prev = None
    for f in fr:
        p = ph(f['t']); a = agg.setdefault(p, {'n':0,'fight':0,'zone':0,'flips':0,'td':[], 'zdmg':0.0, 'out':0})
        a['n'] += 1
        md = f['md']
        if md == 'FIGHT': a['fight'] += 1; 
        if md == 'ZONE': a['zone'] += 1
        if md == 'FIGHT' and f.get('td', -1) and f.get('td', -1) > 0: a['td'].append(f['td'])
        if prev and {prev, md} == {'FIGHT', 'ZONE'}: a['flips'] += 1
        if not f.get('iz', 1): a['out'] += 1
        prev = md
    for x in d['dmg']:
        # [t, by, to, amount, weapon, ...]
        if len(x) > 4 and x[4] == 'zone' and x[2] == d['slot']: agg.setdefault(ph(x[0]), {'n':0,'fight':0,'zone':0,'flips':0,'td':[], 'zdmg':0.0,'out':0})['zdmg'] += x[3]
print('phase | obs-s | FIGHT s | ZONE s | FIGHT<->ZONE flips | flips/min | median target d in FIGHT | outside s | zone dmg')
for p in sorted(agg):
    a = agg[p]; s = a['n'] * 0.1
    td = sorted(a['td']); med = td[len(td)//2] if td else float('nan')
    print(f"{p} | {s:6.1f} | {a['fight']*0.1:6.1f} | {a['zone']*0.1:6.1f} | {a['flips']:4d} | {a['flips']/max(s/60,1e-9):5.1f} | {med:6.1f} | {a['out']*0.1:5.1f} | {a['zdmg']:6.0f}")
