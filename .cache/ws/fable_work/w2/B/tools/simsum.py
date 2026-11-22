# simsum.py BASE TAG...: 24-seed sim summary (w2/B/out/sim/<tag>/sqN.meta.json): kills, alive, errors, fuse, worst ms,
# matches differing from BASE (meta hash), up / down in kills, matches where each fm counter moved, and the fm counter sums
import json, glob, os, sys
D = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/w2/B/out/sim'
def load(t):
    out = {}
    for f in glob.glob(f'{D}/{t}/sq*.meta.json'):
        out[int(os.path.basename(f)[2:-10])] = json.load(open(f))
    return out
base = load(sys.argv[1])
for t in sys.argv[1:]:
    m = load(t)
    k = sum(j.get('kills', 0) for j in m.values()); a = sum(j.get('alive', 0) for j in m.values())
    e = sum(j['counters'].get('errors', 0) for j in m.values()); fu = sum(j['counters'].get('fuse', 0) for j in m.values())
    w = max([j.get('maxMs', 0) for j in m.values()] or [0])
    diff = sum(1 for s, j in m.items() if s in base and base[s]['hash'] != j['hash'])
    up = sum(1 for s, j in m.items() if s in base and j.get('kills', 0) > base[s].get('kills', 0))
    dn = sum(1 for s, j in m.items() if s in base and j.get('kills', 0) < base[s].get('kills', 0))
    cs, cm = {}, {}
    for j in m.values():
        for c, v in j['counters'].items():
            if c.startswith('fm') and c not in ('fmOrderUnknown', 'fmOrderMissing'):
                cs[c] = cs.get(c, 0) + v
                if v > 0: cm[c] = cm.get(c, 0) + 1
    print(f'{t}: n {len(m)} kills {k} alive {a:.0f} errors {e} fuse {fu} worst {w} ms; differ {diff}, up/down {up}/{dn}')
    if cs: print('   fm counters (sum / matches > 0): ' + ', '.join(f'{c} {cs[c]}/{cm.get(c, 0)}' for c in sorted(cs)))
