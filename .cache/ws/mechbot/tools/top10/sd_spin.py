#!/usr/bin/env python3
"""Torso habits per team in the recorded showdowns: share of alive time the torso turns at (near) the
maximum rate, and share of gun/laser hits each team took in its rear arc (x1.5 damage).  Data only."""
import sys, os, math, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sd_load
d = sd_load.load()
def wrap(a): return (a + math.pi) % (2 * math.pi) - math.pi
fast = collections.Counter(); tot = collections.Counter(); life = collections.defaultdict(list); pl = collections.defaultdict(list)
for r in d:
    names = [m['name'] for m in r['hdr']['mechs']]
    prev = {}
    for f in r['frames']:
        for row in f['m']:
            i = row[0]
            if row[6] <= 0: prev.pop(i, None); continue
            if i in prev:
                w = abs(wrap(row[4] - prev[i])) / 0.1
                tot[names[i]] += 1; fast[names[i]] += w >= 3.0
            prev[i] = row[4]
    for mm in r['result']['mechs']:
        pl[mm['name']].append(mm['place']); life[mm['name']].append(mm['death_t'] if mm.get('death_t') is not None else r['frames'][-1]['t'] / 20.0)
print('team, matches, mean place, mean life s, share of alive time with torso turning >= 3 rad/s')
for n in sorted(tot, key=lambda n: -fast[n] / max(1, tot[n])):
    if len(pl[n]) >= 2: print('  %-26s n=%2d place %5.1f life %5.0f  fast-turn %3.0f%%' % (n, len(pl[n]), sum(pl[n]) / len(pl[n]), sum(life[n]) / len(life[n]), 100.0 * fast[n] / tot[n]))
