# simsum.py <tag> [baseDir]: kills, alive, errors, fuse, worst ms, matches differing from the base (CH1 chaos sims), up/down,
# and the w2/A counters summed (with the number of matches where each moved)
import json, os, sys, re
S = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad'
tag = sys.argv[1]; base = sys.argv[2] if len(sys.argv) > 2 else S + '/fable_work/chaos/out/sim/CH1'
d = S + '/fable_work/w2/A/out/sim/' + tag
K = A = E = F = 0; mx = 0; diff = up = dn = n = 0; cs = {}; cm = {}; bk = 0
pat = re.compile(r'^(en|ec|fi|gate|beam|early|ammoAt|reloadCaught|snap|blind|over|fkWalk|laserShots|laserHits|modeSwitches|targetSwitches)')
for s in range(1, 25):
    f = f'{d}/sq{s}.meta.json'
    if not os.path.exists(f): continue
    m = json.load(open(f)); n += 1
    K += m.get('kills', 0); A += m.get('alive', 0); E += m.get('errors', 0); F += m.get('fuse', 0); mx = max(mx, m.get('maxMs', 0))
    bf = f'{base}/sq{s}.meta.json'
    if os.path.exists(bf):
        b = json.load(open(bf)); bk += b.get('kills', 0)
        if b['hash'] != m['hash']: diff += 1
        if m['kills'] > b['kills']: up += 1
        elif m['kills'] < b['kills']: dn += 1
    for k, v in m.get('counters', {}).items():
        if pat.match(k) and isinstance(v, (int, float)):
            cs[k] = cs.get(k, 0) + v
            if v: cm[k] = cm.get(k, 0) + 1
print(f'{tag}: matches {n}, kills {K} (base {bk}), alive {A:.0f} s, errors {E}, fuse {F}, worst {mx} ms, differ {diff}, up/down {up}/{dn}')
print('  counters (sum / matches where > 0): ' + ', '.join(f'{k} {round(cs[k])}/{cm.get(k,0)}' for k in sorted(cs)))
