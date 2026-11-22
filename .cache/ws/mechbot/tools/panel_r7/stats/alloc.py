#!/usr/bin/env python3
"""Slot allocation arithmetic for a best-of-draws board.  Standard library only.
(a) expected maximum of n draws; (b) P(at least one draw clears a cut) by build mean, n and sigma, with scores on the
1/48 grid and 'clear' = strictly above the cut (ties lose to the earlier team); (c) a policy simulation of
salts-only vs new arms, with the engineer's presets arriving in stages.

usage: python3 -I alloc.py [--runs N]
"""
import math, random, sys

GRID = 1.0 / 48
SIGMAS = [(0.13, 0.20), (0.15, 0.25), (0.17, 0.25), (0.20, 0.20), (0.24, 0.10)]   # ~ fit.py posterior of sigma

def Phi(z): return 0.5 * math.erfc(-z / math.sqrt(2))

def p_draw_ge(c, mu, s):
    """P(one draw, rounded to the 1/48 grid, is >= the first grid value strictly above c)."""
    k = math.floor(c * 48 + 1e-9) + 1          # first total strictly above c
    thr = (k - 0.5) / 48                         # rounding boundary
    return 1 - Phi((thr - mu) / s)

def emax_std(n, m=200000, seed=1):
    # expected max of n standard normals by numeric integration
    lo, hi, steps = -8.0, 8.0, 4000; h = (hi - lo) / steps; tot = 0.0
    for i in range(steps + 1):
        x = lo + i * h; w = 0.5 if i in (0, steps) else 1.0
        f = n * math.exp(-x * x / 2) / math.sqrt(2 * math.pi) * Phi(x) ** (n - 1)
        tot += w * x * f
    return tot * h

def tables():
    print('(a) Expected maximum of n draws above the build mean (sigma 0.17 / 0.20 / 0.24 / posterior mix)')
    for n in (1, 2, 4, 8, 12, 18, 24, 36, 48, 60, 80, 100):
        e = emax_std(n)
        mix = sum(w * s for s, w in SIGMAS) * e
        print('  n=%3d  +%.2f / +%.2f / +%.2f / +%.2f' % (n, 0.17 * e, 0.20 * e, 0.24 * e, mix))
    print('\n(b) P(at least one of n draws is strictly above the cut), sigma = posterior mix (0.17 / 0.24 in brackets)')
    for cut in (5.4, 5.6, 5.8):
        print('  cut %.1f (needs %.3f = %d/48)' % (cut, (math.floor(cut * 48 + 1e-9) + 1) / 48, math.floor(cut * 48 + 1e-9) + 1))
        for mu in (4.93, 5.00, 5.05, 5.10, 5.15, 5.20, 5.30, 5.40, 5.50, 5.60):
            cells = []
            for n in (6, 12, 24, 48, 96):
                pm = sum(w * (1 - (1 - p_draw_ge(cut, mu, s)) ** n) for s, w in SIGMAS)
                p17 = 1 - (1 - p_draw_ge(cut, mu, 0.17)) ** n; p24 = 1 - (1 - p_draw_ge(cut, mu, 0.24)) ** n
                cells.append('%.2f (%.2f/%.2f)' % (pm, p17, p24))
            print('    mean %.2f: n=6 %s | 12 %s | 24 %s | 48 %s | 96 %s' % ((mu,) + tuple(cells)))

# ---------------- policy simulation ----------------
ARRIVALS = [  # (name, first slot index usable; slot 0 = first free slot after the 21:25 batch, ~22:25 UTC Sat)
    ('FIN', 2), ('ISO', 2), ('LC', 3), ('ESC', 3),          # R5a (~22:45)
    ('AVO', 6), ('LG', 6),                                  # R5b (~23:25)
    ('HF', 15), ('HN', 15), ('ZE', 15),                     # R6a (~01:00)
    ('PRE', 20), ('HAND', 22), ('KD', 24), ('GASP', 26), ('IOx', 28), ('SYNC', 30), ('ARC', 32), ('UT', 34), ('RISK', 36),
]
FREEZE = 64        # SQUAD code freeze (~09:00 Sun): no new arm after this slot
NSLOTS = 99        # ~105 minus the six pending 21:25 draws
PORTS = 2          # final-code port slots (Port-F and one spare)

def run_policy(policy, rng, prior_m, prior_s, cut_vals):
    s = rng.choices([x for x, _ in SIGMAS], weights=[w for _, w in SIGMAS])[0]
    mu0 = rng.gauss(4.93, 0.06)
    delta = {a: rng.gauss(prior_m, prior_s) for a, _ in ARRIVALS}
    def draw(mu): return round(rng.gauss(mu, s) * 48) / 48
    best = 5.15
    for _ in range(6):                          # the pending 21:25 batch (KS x3, S x2, K0): base-like builds
        best = max(best, draw(mu0 + rng.gauss(0.02, 0.05)))
    # leader bookkeeping (what we can see): estimated leader mean from its own draws, prior N(4.93, 0.06^2)
    stack = []                                   # adopted arms
    lead_draws = []                              # draws of the current stack
    obs = {a: [] for a, _ in ARRIVALS}           # arm draws (each on the stack at its time)
    queue = []                                   # arms available and not decided
    decided = set()
    slots = NSLOTS - PORTS
    nxt = 0
    def lead_mean_est():
        n = len(lead_draws); prior_v = 0.06 ** 2; sv = 0.17 ** 2
        if n == 0: return 4.93
        return (4.93 / prior_v + sum(lead_draws) / sv) / (1 / prior_v + n / sv)
    def true_mean(extra=None):
        return mu0 + sum(delta[a] for a in stack) + (delta[extra] if extra else 0.0)
    for t in range(slots):
        while nxt < len(ARRIVALS) and ARRIVALS[nxt][1] <= t and t < FREEZE:
            queue.append(ARRIVALS[nxt][0]); nxt += 1
        pick = None
        if policy == 'salts':
            pick = None
        elif policy == 'r5':        # 1 draw; 2nd if d >= 0; adopt at 2-draw mean d >= 0; reject d <= -0.25 on the 1st
            cand = [a for a in queue if a not in decided]
            # prefer an arm that needs its second draw, then a fresh arm
            two = [a for a in cand if len(obs[a]) == 1]
            one = [a for a in cand if len(obs[a]) == 0]
            pick = two[0] if two else (one[0] if one else None)
        elif policy == 'stack':     # every arm: one draw on the stack, joins unless d <= -0.25 (harm screen only)
            cand = [a for a in queue if a not in decided]
            pick = cand[0] if cand else None
        elif policy == 'r5x2':      # R5 rules but each arm's 1st draw is a same-salt pair with a leader draw (cheaper read)
            cand = [a for a in queue if a not in decided]
            two = [a for a in cand if len(obs[a]) == 1]
            one = [a for a in cand if len(obs[a]) == 0]
            pick = two[0] if two else (one[0] if one else None)
        if pick is None:
            x = draw(true_mean()); lead_draws.append(x); best = max(best, x); continue
        x = draw(true_mean(pick)); obs[pick].append(x); best = max(best, x)
        d = sum(obs[pick]) / len(obs[pick]) - lead_mean_est()
        if policy == 'stack':
            decided.add(pick)
            if d > -0.25: stack.append(pick); lead_draws = []   # new stack: forget old leader draws (fresh mean)
        else:
            if len(obs[pick]) == 1 and d <= -0.25: decided.add(pick)
            elif len(obs[pick]) == 1 and d < 0: decided.add(pick)       # parked = dropped (slots are short)
            elif len(obs[pick]) >= 2:
                decided.add(pick)
                if d >= 0: stack.append(pick); lead_draws = list(obs[pick])
    # ports reproduce; the final leader's true mean matters for nothing in practice but tells how good the stack is
    return [best > c for c in cut_vals], best, true_mean()

def simulate(runs, prior_m, prior_s, label):
    cuts = (5.4, 5.6, 5.8)
    print('\n(c) policy simulation, %d runs, arm prior delta ~ N(%+.2f, %.2f^2) (%s), %d slots, %d arms' %
          (runs, prior_m, prior_s, label, NSLOTS, len(ARRIVALS)))
    for pol in ('salts', 'r5', 'stack'):
        rng = random.Random(11)
        hits = [0, 0, 0]; bs = 0.0; tm = 0.0
        for _ in range(runs):
            h, b, m = run_policy(pol, rng, prior_m, prior_s, cuts)
            hits = [x + y for x, y in zip(hits, h)]; bs += b; tm += m
        print('  %-6s P(max > 5.4 / 5.6 / 5.8) = %.2f / %.2f / %.2f   E[max] %.2f   E[true mean of final stack] %.2f' %
              (pol, hits[0] / runs, hits[1] / runs, hits[2] / runs, bs / runs, tm / runs))

def main():
    runs = 4000
    for a in sys.argv[1:]:
        if a.startswith('--runs='): runs = int(a.split('=')[1])
    tables()
    simulate(runs, 0.00, 0.06, 'fit.py tau, no expected gain')
    simulate(runs, 0.02, 0.06, 'panel gains halved')
    simulate(runs, 0.05, 0.10, 'panel gains as stated')
    simulate(runs, -0.02, 0.06, 'arms slightly harmful on average')

if __name__ == '__main__':
    main()
