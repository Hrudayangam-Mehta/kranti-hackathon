#!/usr/bin/env python3
"""simsum.py [tags...]: per sim tag vs base (trunk/survive/sim): kills, alive, captures (drop events), errors, fuse, sv counters."""
import json, glob, os, sys
F = os.path.dirname(os.path.abspath(__file__)) + '/../sim'
def load(tag): return {json.load(open(f))['a1']: json.load(open(f)) for f in glob.glob(F + '/' + tag + '/*.meta.json')}
tags = sys.argv[1:] or sorted(t for t in os.listdir(F) if os.path.isdir(F + '/' + t))
base = load('base')
print('%-14s %3s %5s %5s %7s %5s %4s %3s %4s %3s %4s %6s  sv counters' % ('tag', 'n', 'kills', 'mean', 'alive_s', 'caps', 'diff', 'up', 'down', 'err', 'fuse', 'maxMs'))
for tag in tags:
    d = load(tag)
    if not d: continue
    b = load('mech_base') if tag.startswith('mech_') else base
    ks = sum(x['kills'] for x in d.values()); al = sum(x['alive'] for x in d.values()); cap = sum(x.get('dropEv', 0) for x in d.values())
    df = sum(1 for s, x in d.items() if s in b and b[s]['hash'] != x['hash']); up = sum(1 for s, x in d.items() if s in b and x['kills'] > b[s]['kills']); dn = sum(1 for s, x in d.items() if s in b and x['kills'] < b[s]['kills'])
    c = {}
    for x in d.values():
        for k, v in x.get('counters', {}).items():
            if k.startswith('sv'): c[k] = c.get(k, 0) + v
    m6 = {}
    for k in ('svDropGo', 'svHoldDec', 'svCbBeam', 'svRlLow', 'svRlMid', 'svRlTop'):
        m6[k] = sum(1 for x in d.values() if x.get('counters', {}).get(k, 0) > 0)
    err = sum(x.get('errors', 0) for x in d.values()); fu = sum(x.get('fuse', 0) for x in d.values()); mx = max(x.get('maxMs', 0) for x in d.values())
    print('%-14s %3d %5d %5.2f %7.0f %5d %4d %3d %4d %3d %4d %6.1f  %s | matches reached %s' % (tag, len(d), ks, ks / len(d), al, cap, df, up, dn, err, fu, mx, ' '.join('%s=%d' % kv for kv in sorted(c.items())), ' '.join('%s:%d' % kv for kv in m6.items() if kv[1])))
