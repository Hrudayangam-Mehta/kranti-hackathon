#!/usr/bin/env python3
"""Clean-room fingerprint test: which public bot's upgrade preference order best explains the upgrade
picks AT made in its two recorded free-for-all wins?  Reads source files as TEXT only (never runs them).
Output: repo, file, likelihood of the 13 observed picks under each ordered list found in the file.
Model: an offer is 3 distinct upgrades drawn uniformly from those still available; the bot takes the one
ranked highest in its list.  P(pick p) = C(n_lower, 2) / C(n_avail, 3), n_lower = available ids ranked below p.
usage: upgrade_fingerprint.py <intel_dir> [top_n]"""
import os, re, sys, math, json
INTEL = sys.argv[1]
TOP = int(sys.argv[2]) if len(sys.argv) > 2 else 40
GEN = ['plating', 'armor', 'servos', 'capacitor', 'reactor', 'jets', 'nanites', 'gyros', 'sensors']
WUP = {'gun': ['gun_damage', 'gun_rate', 'gun_velocity', 'gun_mag'],
       'mortar': ['mortar_splash', 'mortar_reload', 'mortar_velocity'],
       'laser': ['laser_charge', 'laser_damage', 'laser_pierce'],
       'lightning': ['lightning_chain', 'lightning_range', 'lightning_efficiency']}
MAXS = dict(plating=3, armor=3, servos=3, capacitor=3, reactor=3, jets=2, nanites=2, gyros=2, sensors=2,
            gun_damage=3, gun_rate=3, gun_velocity=2, gun_mag=2, mortar_splash=2, mortar_reload=3, mortar_velocity=2,
            laser_charge=2, laser_damage=3, laser_pierce=1, lightning_chain=2, lightning_range=2, lightning_efficiency=2)
ALL = set(MAXS)
# observed picks: (weapons held when the offer was drawn, pick)
M1 = [(('gun', 'laser'), 'servos'), (('gun', 'laser'), 'laser_damage'), (('laser', 'lightning'), 'capacitor'),
      (('laser', 'lightning'), 'armor'), (('laser', 'lightning'), 'nanites'), (('laser', 'lightning'), 'laser_damage')]
M2 = [(('gun',), 'gun_mag'), (('gun',), 'servos'), (('gun', 'lightning'), 'plating'), (('laser', 'lightning'), 'laser_damage'),
      (('laser', 'lightning'), 'servos'), (('laser', 'lightning'), 'lightning_efficiency'), (('laser', 'lightning'), 'lightning_range')]
def loglik(order, alt_third=False):
    rank = {u: i for i, u in enumerate(order)}
    tot = 0.0
    for match in (M1, M2):
        taken = {}
        for weapons, pick in match:
            avail = [u for u in GEN if taken.get(u, 0) < MAXS[u]]
            for w in weapons: avail += [u for u in WUP[w] if taken.get(u, 0) < MAXS[u]]
            if pick not in avail: return -99.0
            rp = rank.get(pick, 10**6)
            lower = sum(1 for u in avail if u != pick and rank.get(u, 10**6 + 1) > rp)
            n = len(avail)
            p = math.comb(lower, 2) / math.comb(n, 3)
            tot += math.log(p) if p > 0 else -30.0
            taken[pick] = taken.get(pick, 0) + 1
    return tot
IDRE = re.compile(r'''["'`]([a-z]+(?:_[a-z]+)?)["'`]''')
WRE = re.compile(r'''["'`]?([a-z]+(?:_[a-z]+)?)["'`]?\s*[:=]\s*(-?\d+(?:\.\d+)?)''')
EXT = ('.py', '.ts', '.js', '.mjs', '.go', '.rs', '.java', '.kt', '.cs', '.cpp', '.cc', '.c', '.lua', '.rb', '.zig', '.nim', '.swift', '.json', '.toml', '.yaml', '.yml')
res = []
for repo in sorted(os.listdir(INTEL)):
    if repo.startswith('_') or '__' not in repo: continue
    for root, dirs, files in os.walk(os.path.join(INTEL, repo)):
        dirs[:] = [d for d in dirs if d not in ('.git', 'node_modules', 'arena', 'target', 'dist', 'build', 'vendor', 'kit', 'mechfight-kit', 'check')]
        for fn in files:
            if not fn.endswith(EXT): continue
            path = os.path.join(root, fn)
            try:
                if os.path.getsize(path) > 1500000: continue
                text = open(path, encoding='utf-8', errors='replace').read()
            except OSError: continue
            if 'servos' not in text or 'laser_damage' not in text: continue
            lists = []
            # (1) runs of quoted upgrade ids, gaps of at most 160 characters between consecutive ids
            run, last = [], None
            for m in IDRE.finditer(text):
                if m.group(1) not in ALL: continue
                if last is not None and m.start() - last > 160:
                    if len(set(run)) >= 6: lists.append(('seq', run))
                    run = []
                run.append(m.group(1)); last = m.end()
            if len(set(run)) >= 6: lists.append(('seq', run))
            # (2) id: weight tables, sorted by weight (both directions), same gap rule
            run, last = [], None
            for m in WRE.finditer(text):
                if m.group(1) not in ALL: continue
                if last is not None and m.start() - last > 200:
                    if len(set(u for u, _ in run)) >= 6: lists.append(('wt', run))
                    run = []
                run.append((m.group(1), float(m.group(2)))); last = m.end()
            if len(set(u for u, _ in run)) >= 6: lists.append(('wt', run))
            for kind, run in lists:
                cands = []
                if kind == 'seq':
                    seen = []
                    for u in run:
                        if u not in seen: seen.append(u)
                    cands.append(('seq', seen))
                else:
                    d = {}
                    for u, w in run: d.setdefault(u, w)
                    cands.append(('wt-desc', sorted(d, key=lambda u: -d[u])))
                    cands.append(('wt-asc', sorted(d, key=lambda u: d[u])))
                for k, order in cands:
                    res.append((loglik(order), repo, os.path.relpath(path, os.path.join(INTEL, repo)), k, len(order), order.index('servos') if 'servos' in order else -1))
res.sort(reverse=True)
base = loglik([])  # no preference information: every pick impossible -> floor
import random
random.seed(1)
rnd = sorted(loglik(random.sample(sorted(ALL), len(ALL))) for _ in range(2000))
print('random-order reference: median %.1f, 95th pct %.1f, best of 2000 %.1f' % (rnd[1000], rnd[1900], rnd[-1]))
seen = set()
n = 0
for ll, repo, path, k, ln, sv in res:
    key = (repo, round(ll, 2))
    if key in seen: continue
    seen.add(key)
    print('%7.2f  %-50s %-34s %-8s len %2d servos@%d' % (ll, repo, path[:34], k, ln, sv))
    n += 1
    if n >= TOP: break
print('lists scored:', len(res), 'repos with any list:', len(set(r[1] for r in res)))
