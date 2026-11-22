#!/usr/bin/env python3
"""tf2sum.py: identity and T-F2 verdicts from out/id (recs.js metas)."""
import json, os, glob
D = os.path.dirname(os.path.abspath(__file__)) + '/../out/id'
def m(n):
    f = f'{D}/{n}.meta.json'
    return json.load(open(f)) if os.path.exists(f) else None
def cmp(a, b, need=True):
    x, y = m(a), m(b)
    if not x or not y: return f'{b}: missing'
    ok = x['hash'] == y['hash'] and x['n'] == y['n']
    tag = ('PASS' if ok else 'FAIL') if need else ('same' if ok else 'differs (allowed: SQUAD posture before the latch)')
    return f'{tag:5} {b} vs {a}: n {y["n"]} hash {y["hash"]} errors {y["errors"]} fuse {y["fuse"]}'
print('== identity (old values / mv_meas) against CH1_s1')
for s in ('kit', 'l4800'):
    for e in ('squad', 'auto'):
        print(cmp(f'ch1_{s}_{e}', f'off_{s}_{e}')); print(cmp(f'ch1_{s}_{e}', f'meas_{s}_{e}'))
print('== T-F2 forced FFA (all six mv_ presets on, and each rule alone) against CH1_s1')
for s in ('kit', 'f1', 'f2', 'f3', 'f4', 'l4800'): print(cmp(f'ch1_{s}_ffa', f'all_{s}_ffa'))
for p in ('mv_flip', 'mv_close', 'mv_zig', 'mv_arc', 'mv_rim'):
    for s in ('kit', 'f1'): print(cmp(f'ch1_{s}_ffa', f'{p}_{s}_ffa'))
for sd in (411, 412, 413, 414): print(cmp(f'ch1_ff{sd}_forced', f'all_ff{sd}_forced'))
print('== FFA streams / sims in env auto (info)')
for s in ('f1', 'f2', 'f3', 'f4'): print(cmp(f'ch1_{s}_auto', f'all_{s}_auto', False))
for sd in (411, 412, 413, 414):
    print(cmp(f'ch1_ff{sd}_auto', f'all_ff{sd}_auto', False))
    x, y = m(f'ch1_ff{sd}_auto'), m(f'all_ff{sd}_auto')
    if x and y: print(f'      kills {x.get("kills")} -> {y.get("kills")}, place {x.get("place")} -> {y.get("place")}, first foreign tick {y["firstForeignTick"]}, latch {y["latchTick"]}')
print('== squad streams with the rules on (acts, errors)')
for n in ['all_kit_squad', 'all_kit_auto', 'all_l4800_squad', 'all_l4800_auto'] + [f'{p}_l4800_squad' for p in ('mv_flip', 'mv_close', 'mv_zig', 'mv_arc', 'mv_rim')]:
    y = m(n)
    if not y: print(n, 'missing'); continue
    base = m('ch1_' + n.split('_', 1)[1].replace('mv_flip_', '').replace('mv_close_', '').replace('mv_zig_', '').replace('mv_arc_', '').replace('mv_rim_', '')) if n.startswith('all') else m('ch1_l4800_squad')
    c = y['counters']; keys = {k: round(v) for k, v in c.items() if k.startswith(('mvFlip', 'back', 'zig', 'arc', 'cover', 'rim', 'zoneFar'))}
    print(f'{n}: differs {y["hash"] != base["hash"]}, errors {y["errors"]}, fuse {y["fuse"]}, maxMs {y["maxMs"]} (base {base["maxMs"]}), p99 {y["p99"]} (base {base["p99"]}), modes {y["modes"]} | {keys}')
