#!/usr/bin/env python3
"""Calibration of the simulator's paired deltas against official deltas (works on a partial log).
  python3 -I calib_report.py [run name, default calib24]"""
import json, math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
name = sys.argv[1] if len(sys.argv) > 1 else 'calib24'
cands = {('c%04d' % (i + 1)): c for i, c in enumerate(json.load(open(os.path.join(HERE, 'calib_cands.json'))))}
M = {}
for line in open(os.path.join(HERE, 'runs', name, 'log.jsonl')):
    r = json.loads(line)
    if r['ev'] == 'batch':
        for m in r['matches']:
            M.setdefault(r['cand'], {})[m['seed']] = m
base = M.get('base', {})
def rank(v):
    o = sorted(range(len(v)), key=lambda i: v[i]); r = [0.0] * len(v); i = 0
    while i < len(o):
        j = i
        while j + 1 < len(o) and v[o[j + 1]] == v[o[i]]: j += 1
        for k in range(i, j + 1): r[o[k]] = (i + j) / 2 + 1
        i = j + 1
    return r
def corr(x, y):
    n = len(x); mx = sum(x) / n; my = sum(y) / n
    sxx = sum((a - mx) ** 2 for a in x); syy = sum((b - my) ** 2 for b in y)
    return sum((a - mx) * (b - my) for a, b in zip(x, y)) / math.sqrt(sxx * syy) if sxx > 0 and syy > 0 else float('nan')
rows = []
print('base: n %d, sim mean score %.3f (official 5.38)' % (len(base), sum(m['score'] for m in base.values()) / max(1, len(base))))
print('%-14s %5s %3s %8s %6s %6s %4s  %8s  %s' % ('build', 'exact', 'n', 'sim d', 'se', 't', 'dif', 'official', 'sign'))
for cid, c in cands.items():
    seeds = sorted(s for s in M.get(cid, {}) if s in base)
    if not seeds: continue
    d = [M[cid][s]['score'] - base[s]['score'] for s in seeds]; n = len(d); mean = sum(d) / n
    sd = math.sqrt(sum((x - mean) ** 2 for x in d) / (n - 1)) if n > 1 else 0; se = sd / math.sqrt(n)
    dif = sum(1 for s in seeds if M[cid][s]['fp'] != base[s]['fp'])
    od = round(c['official'] - 5.38, 2)
    sign = 'tie' if od == 0 else ('sim 0' if mean == 0 else ('ok' if (mean > 0) == (od > 0) else 'WRONG'))
    rows.append((c['name'], mean, se, od, sign, dif))
    print('%-14s %5s %3d %+8.3f %6.3f %+6.2f %4d  %+8.2f  %s' % (c['name'], 'yes' if c['exact'] else 'port', n, mean, se, mean / se if se else 0, dif, od, sign))
nz = [r for r in rows if r[3] != 0]
ok = sum(1 for r in nz if r[4] == 'ok'); wrong = sum(1 for r in nz if r[4] == 'WRONG'); zero = sum(1 for r in nz if r[4] == 'sim 0')
print('builds with an official delta != 0: %d; sim sign right %d, wrong %d, sim exactly 0: %d' % (len(nz), ok, wrong, zero))
if len(rows) >= 3:
    x = [r[1] for r in rows]; y = [r[3] for r in rows]
    print('Pearson r %.2f, Spearman rho %.2f over %d builds (official delta against sim paired delta)' % (corr(x, y), corr(rank(x), rank(y)), len(rows)))
    print('sim |delta| mean %.3f, typical se %.3f; official |delta| mean %.3f' % (sum(abs(a) for a in x) / len(x), sum(r[2] for r in rows) / len(rows), sum(abs(b) for b in y) / len(y)))
