#!/usr/bin/env python3
# DEV ONLY (red team): summary of ffa_probe.js outputs. Usage: python3 summarize.py out/a.json out/b.json ...
import json, sys, statistics as st, collections
def med(v): return round(st.median(v), 1) if v else None
rows = []
for p in sys.argv[1:]:
    try: d = json.load(open(p))
    except Exception as e: print(p, 'unreadable', e); continue
    ms = d['matches']; n = len(ms)
    if not n: continue
    pl = [m['place'] for m in ms]
    sc = [m['score'] for m in ms]
    se = (st.pstdev(sc) / n ** 0.5) if n > 1 else 0
    early = sum(1 for m in ms if m['alive_s'] < 60 and m['place'] > 1)
    b8 = sum(1 for m in ms if m['place'] >= 9)
    top4 = sum(1 for m in ms if m['place'] <= 4)
    cause = collections.Counter((m['cause'] or 'alive') for m in ms)
    lat = [m['latchT'] for m in ms if m['latchT'] is not None]
    nolaser = sum(1 for m in ms if m['place'] > 1 and 'laser' not in (m['loadout'] or []))
    laserdeath = sum(1 for m in ms if m['cause'] == 'laser')
    ff = sum(1 for m in ms if m['weFiredFirst'])
    print(f"{d['tag']:>22} n={n:3d} place {st.mean(pl):5.2f} score {st.mean(sc):5.2f} +-{se:4.2f} | dead<60s {early:2d} | place>=9 {b8:2d} | top4 {top4:2d} | win {sum(1 for x in pl if x==1)} | alive med {med([m['alive_s'] for m in ms])}s | latch med {med(lat)} (n={len(lat)}) | firedFirst {ff} | approach med {med([m['approachS'] for m in ms])}s | cubes med {med([m['cubes'] for m in ms])} | killed by laser {laserdeath}, died without laser {nolaser} | causes {dict(cause)}")
    rows.append(d)
if '--field' in sys.argv or True:
    agg = collections.defaultdict(list)
    for d in rows:
        for m in d['matches']:
            for f in m['field']:
                if f['id'] != m['slot']: agg[f['name']].append(f['place'])
    if agg:
        print('\nopponent names (as they announce themselves), mean place over all listed runs:')
        for k, v in sorted(agg.items(), key=lambda kv: st.mean(kv[1])): print(f"  {k[:28]:28s} n={len(v):4d} mean place {st.mean(v):5.2f}  top4 {sum(1 for x in v if x<=4)/len(v):.0%}  dead-first-8 {sum(1 for x in v if x>=9)/len(v):.0%}")
    d3 = [m['death3T'] for d in rows for m in d['matches'] if m.get('death3T')]
    d8 = [m['death8T'] for d in rows for m in d['matches'] if m.get('death8T')]
    print(f"\nfield pace: third foreign death median {med(d3)} s (max {max(d3) if d3 else None}), eighth {med(d8)} s; others dead at 60 s median {med([m['othersDeadAt60'] for d in rows for m in d['matches']])}")
