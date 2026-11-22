#!/usr/bin/env python3
"""simsum.py <tagA> <tagB>: 24-seed sim comparison of sim_<tag>_sqN.meta.json in out/id (kills, alive, errors, fuse, times, counters)."""
import json, os, sys, statistics as st
D = os.path.dirname(os.path.abspath(__file__)) + '/../out/id'
CH = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/chaos/out/sim/CH1'
def load(tag):
    out = {}
    for sd in range(1, 25):
        f = f'{D}/sim_{tag}_sq{sd}.meta.json'
        if os.path.exists(f): out[sd] = json.load(open(f))
    return out
A, B = sys.argv[1], sys.argv[2]
a, b = load(A), load(B)
seeds = sorted(set(a) & set(b))
print(f'seeds {len(seeds)}: {seeds}')
same_ch = sum(1 for s in a if os.path.exists(f'{CH}/sq{s}.meta.json') and json.load(open(f'{CH}/sq{s}.meta.json'))['hash'] == a[s]['hash'])
print(f'{A}: hash equal to chaos/out/sim/CH1 on {same_ch} of {len(a)} seeds')
print('seed  kills %s/%s  alive  %s/%s  maxMs %s/%s  p99' % (A, B, A, B, A, B))
for s in seeds:
    x, y = a[s], b[s]
    print('%3d  %3d %3d   %6.1f %6.1f   %6.1f %6.1f   %5.1f %5.1f  %s' % (s, x['kills'], y['kills'], x['alive'], y['alive'], x['maxMs'], y['maxMs'], x['p99'], y['p99'], y.get('cause')))
def tot(d, f): return sum(f(d[s]) for s in seeds)
for t, d in ((A, a), (B, b)):
    k = tot(d, lambda m: m['kills']); al = tot(d, lambda m: m['alive'])
    print(f'{t}: kills {k} ({k/len(seeds):.2f}/match), alive {al:.0f} s ({al/len(seeds):.1f}), errors {tot(d, lambda m: m["errors"])}, fuse {tot(d, lambda m: m["fuse"])}, stuck {tot(d, lambda m: m["stuck"])}, '
          f'worst maxMs {max(d[s]["maxMs"] for s in seeds)}, median maxMs {st.median(d[s]["maxMs"] for s in seeds)}, median p99 {st.median(d[s]["p99"] for s in seeds)}')
up = sum(1 for s in seeds if b[s]['kills'] > a[s]['kills']); dn = sum(1 for s in seeds if b[s]['kills'] < a[s]['kills'])
print(f'{B} vs {A}: up {up}, down {dn}, same {len(seeds)-up-dn}; kill diff sd {st.pstdev([b[s]["kills"]-a[s]["kills"] for s in seeds]):.2f}')
def csum(d):
    c = {}
    for s in seeds:
        for k, v in d[s].get('counters', {}).items(): c[k] = c.get(k, 0) + v
    return c
def lsum(d, key):
    c = {}
    for s in seeds:
        for k, v in d[s].get(key, {}).items(): c[k] = c.get(k, 0) + v
    return c
ca, cb = csum(a), csum(b)
keys = sorted(k for k in set(ca) | set(cb) if k.startswith(('mv', 'back', 'zig', 'arc', 'cover', 'rim', 'zoneFar')) or k in ('jinks', 'bulletDodges', 'dodges', 'stuck', 'abandons', 'noProgress', 'kills', 'dmgIn', 'dmgOut', 'boostCharge', 'boostSpend', 'plans'))
print('counter                 %10s %10s' % (A, B))
for k in keys: print('%-22s %10.0f %10.0f' % (k, ca.get(k, 0), cb.get(k, 0)))
la, lb = lsum(a, 'legs'), lsum(b, 'legs'); ma, mb = lsum(a, 'modes'), lsum(b, 'modes')
print('legs (decisions)  ' + ' '.join(f'{k}:{la.get(k,0)}/{lb.get(k,0)}' for k in sorted(set(la) | set(lb), key=lambda k: -(la.get(k, 0) + lb.get(k, 0)))))
print('modes (decisions) ' + ' '.join(f'{k}:{ma.get(k,0)}/{mb.get(k,0)}' for k in sorted(set(ma) | set(mb))))
# intake per leg kind (hp per decision-second) where both have the measurement counters
for t, c, l in ((A, ca, la), (B, cb, lb)):
    row = []
    for k in ('standoff', 'grab', 'isolate', 'regain', 'backoff', 'arcback', 'zone', 'roam', 'loot'):
        n = l.get(k, 0)
        if n: row.append(f'{k} {c.get("mvIn_" + k, 0) / (n * 0.1):.0f}')
    print(f'{t} intake hp/s by leg: ' + ', '.join(row))
for t, c in ((A, ca), (B, cb)):
    print(f'{t} gun hit rate by range: ' + ', '.join(f'{b_}: {c.get("mvGunHit"+b_,0):.0f}/{c.get("mvGunSeen"+b_,0):.0f}' for b_ in ('0', '80', '110', '140')) +
          f'; rear share {c.get("mvRearDmg",0)/max(1,c.get("dmgIn",1)):.3f}')
