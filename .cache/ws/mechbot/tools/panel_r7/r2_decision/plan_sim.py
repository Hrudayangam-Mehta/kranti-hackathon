#!/usr/bin/env python3
"""Decision-role policy simulation (stdlib).  Reconciles stats/alloc.py (stacking + screen) with bestof/alloc.py (PI, fillers).
Slot 0 = 22:25 UTC Sat.  28 slots to 03:00, 101 slots to 15:15 Sun.  Scores on the 1/48 grid; 'clear' = strictly above cut.
usage: python3 -I plan_sim.py [runs]"""
import random, sys, math
RUNS = int(sys.argv[1]) if len(sys.argv) > 1 else 4000
CUTS = (5.5, 5.6, 5.8)
H1, H2, FREEZE = 28, 101, 64            # 03:00, 15:15, 09:00 code freeze
# arms: (name, first usable slot).  Engineer order: aggr h70/h70g, LX, FIN, ISO, LG, LC, AVO; then one new arm per ~4 slots
ARR = [('h70g', 1), ('h70', 2), ('LX', 4), ('FIN', 6), ('ISO', 7), ('LG', 12), ('LC', 14), ('AVO', 18)]
ARR += [('X%d' % i, 22 + 4 * i) for i in range(11)]          # HN, PRE, calm, crowdR, risk late, HF, ZE ... until the freeze
def g(x): return round(x * 48) / 48
def run(policy, rng, sig, m0, tau, add, late=0):
    mu_ks = rng.gauss(5.03, 0.08)
    eff = {a: rng.gauss(m0, tau) for a, _ in ARR}; eff['KB'] = rng.gauss(m0, tau)
    arr = [(a, t + late) for a, t in ARR]
    draw = lambda mu: g(rng.gauss(mu, sig))
    best = 5.19
    ks = [draw(mu_ks) for _ in range(5)]                      # KS s1-s5 (being drawn now)
    kb = [draw(mu_ks + eff['KB']) for _ in range(2)]          # KB s0, s1
    best = max([best] + ks + kb)
    # base estimate: prior N(5.03, .08^2) with 5 KS draws + the selected 5.19 down-weighted
    def post(prior_m, prior_v, xs):
        if not xs: return prior_m, prior_v
        v = 1 / (1 / prior_v + len(xs) / sig ** 2); return v * (prior_m / prior_v + sum(xs) / sig ** 2), v
    bm, bv = post(5.03, 0.08 ** 2, ks)
    stack = []; sdraws = []; pm, pv = bm, bv
    obs = {a: [] for a, _ in arr}; obs['KB'] = kb; done = set(); parked = []
    avail = ['KB']; nxt = 0; hit1 = None
    tm = lambda extra=None: mu_ks + add * sum(eff[a] for a in stack) + (add * eff[extra] if extra else 0.0)
    def decide(a):
        nonlocal stack, sdraws, pm, pv
        b = post(pm, pv, sdraws)[0]; xs = obs[a]; d = sum(xs) / len(xs) - b
        if policy == 'r5':
            if len(xs) == 1 and d < 0: done.add(a)
            elif len(xs) >= 2:
                done.add(a)
                if d >= 0: stack.append(a); pm, pv = b + 0.3 * d, 0.08 ** 2; sdraws = []
        else:  # mine
            if len(xs) == 1:
                if d <= -0.25: done.add(a)
                elif d < -0.05: done.add(a); parked.append(a)        # filler rotation only
            elif len(xs) >= 2:
                done.add(a)
                if a in parked: parked.remove(a)
                if d >= 0: stack.append(a); pm, pv = b + 0.3 * d, 0.08 ** 2; sdraws = []
    if policy != 'salts': decide('KB') if False else None
    for t in range(H2):
        if t == H1: hit1 = [best > c for c in CUTS]
        while nxt < len(arr) and arr[nxt][1] <= t and t < FREEZE: avail.append(arr[nxt][0]); nxt += 1
        pick = None
        if policy in ('r5', 'mine') and t < H2 - 12:
            cand = [a for a in avail if a not in done]
            two = [a for a in cand if len(obs[a]) >= 1 and (len(obs[a]) < 2)]
            # KB already has 2 draws: decide at once
            for a in cand:
                if len(obs[a]) >= 2: decide(a)
            cand = [a for a in avail if a not in done]
            two = [a for a in cand if len(obs[a]) == 1]; one = [a for a in cand if len(obs[a]) == 0]
            if policy == 'mine' and t % 6 == 5 and len(sdraws) < 2: pick = None        # 1 stack salt per window while the stack mean is thin
            elif one and (policy == 'mine'): pick = one[0]                             # new behaviour arm first (wider ticket)
            elif two: pick = two[0]
            elif one: pick = one[0]
            elif policy == 'mine' and parked and t % 2 == 0: pick = parked[0]
        if pick is None:
            x = draw(tm()); sdraws.append(x); best = max(best, x); continue
        x = draw(tm(pick)); obs[pick].append(x); best = max(best, x)
        if pick in parked:
            parked.remove(pick); b = post(pm, pv, sdraws)[0]
            if sum(obs[pick]) / 2 - b >= 0: stack.append(pick); pm, pv = b, 0.08 ** 2; sdraws = []
        else: decide(pick)
    return hit1, [best > c for c in CUTS], tm()
WORLDS = [('arms no-ops        m0  0.00 tau .03', 0.00, .03), ('fit tau            m0  0.00 tau .06', 0.0, .06),
          ('gains halved       m0 +0.02 tau .06', .02, .06), ('slightly harmful   m0 -0.02 tau .06', -.02, .06),
          ('behaviour, neutral m0 -0.03 tau .15', -.03, .15), ('behaviour, harmful m0 -0.10 tau .15', -.10, .15),
          ('panel as stated    m0 +0.05 tau .10', .05, .10)]
for sig in (0.17, 0.20, 0.24):
    for add in (1.0, 0.6):
        print('\n== sigma %.2f, additivity %.1f ==  P(best > 5.5 / 5.6 / 5.8): at 03:00 | at 15:15 | E[true mean of final stack]' % (sig, add))
        for lab, m0, tau in WORLDS:
            row = []
            for pol in ('salts', 'r5', 'mine'):
                rng = random.Random(5); h1 = [0] * 3; h2 = [0] * 3; m = 0
                for _ in range(RUNS):
                    a, b, c = run(pol, rng, sig, m0, tau, add); h1 = [x + y for x, y in zip(h1, a)]; h2 = [x + y for x, y in zip(h2, b)]; m += c
                row.append('%-5s %s | %s | %.2f' % (pol, '/'.join('%.2f' % (x / RUNS) for x in h1), '/'.join('%.2f' % (x / RUNS) for x in h2), m / RUNS))
            print('  %s\n     %s' % (lab, '\n     '.join(row)))
# engineering delay sensitivity (arms 6 slots = 1 h late), sigma .20
print('\n== sigma 0.20, additivity 1.0, every arm 1 hour late ==')
for lab, m0, tau in WORLDS[1:5]:
    rng = random.Random(5); h1 = [0] * 3; h2 = [0] * 3
    for _ in range(RUNS):
        a, b, c = run('mine', rng, .20, m0, tau, 1.0, late=6); h1 = [x + y for x, y in zip(h1, a)]; h2 = [x + y for x, y in zip(h2, b)]
    print('  %s  mine %s | %s' % (lab, '/'.join('%.2f' % (x / RUNS) for x in h1), '/'.join('%.2f' % (x / RUNS) for x in h2)))
