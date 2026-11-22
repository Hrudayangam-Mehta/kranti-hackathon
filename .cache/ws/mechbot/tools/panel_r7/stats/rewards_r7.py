#!/usr/bin/env python3
"""Reward chain in placement points from the V4 simulator ledger (tools/panel_r6/d_v4.json; behaviour statistics only,
never a within-bot delta), scaled to the official level from fit.py.  Standard library only.

V(k) = expected further points from 'alive between fights with k kills'.  Episode types from the ledger:
one attacker (kills 0.75, P(death) 0.06) or 2+ attackers (pooled), with P(2+ | k) measured per kill count.
Value of a kill at k: 1 + V(k+1) - V(k) (the escalation it causes), plus drops.
Value of a second alive by phase: kills per alive-second in that time bin.
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, '..', '..', 'panel_r6', 'd_v4.json')
OFFICIAL = 4.93      # fit.py posterior mean of the V4 family

def main():
    d = json.load(open(P))
    M, EP = d['M'], d['EP']
    sim_level = sum(m['score'] for m in M) / len(M)
    scale = OFFICIAL / sim_level
    # episode outcomes by number of attackers, and P(2+ attackers | kills so far)
    by_seed = {}
    for e in EP: by_seed.setdefault(e['seed'], []).append(e)
    cnt = {}; out = {'1': [0, 0, 0], '2+': [0, 0, 0]}
    for s, eps in by_seed.items():
        k = 0
        for e in sorted(eps, key=lambda e: e['t0']):
            if e['nAtt'] <= 0: k += e['kills']; continue
            typ = '1' if e['nAtt'] == 1 else '2+'
            kk = min(k, 3); c = cnt.setdefault(kk, [0, 0]); c[0] += 1; c[1] += (typ == '2+')
            o = out[typ]; o[0] += 1; o[1] += e['kills']; o[2] += e['died']
            k += e['kills']
    pk = {k: c[1] / c[0] for k, c in cnt.items()}
    for t in out: o = out[t]; print('episodes %-3s n %3d  kills %.2f  P(death) %.2f' % (t, o[0], o[1] / o[0], o[2] / o[0]))
    print('P(next fight has 2+ attackers | kills 0,1,2,3+) =', {k: round(v, 2) for k, v in sorted(pk.items())}, ' n =', {k: c[0] for k, c in sorted(cnt.items())})
    k1, d1 = out['1'][1] / out['1'][0], out['1'][2] / out['1'][0]
    k2, d2 = out['2+'][1] / out['2+'][0], out['2+'][2] / out['2+'][0]
    # chain: type 1 -> +1 kill w.p. k1 (capped at 1), survive 1-d1; type 2+ -> +round(k2) kills, survive 1-d2
    K = 16; V = [0.0] * (K + 3)
    inc2 = max(1, round(k2))
    for _ in range(400):
        for k in range(K, -1, -1):
            p = pk.get(min(k, 3), 0.88)
            a = min(k1, 1.0)
            v1 = k1 + (1 - d1) * (a * V[min(k + 1, K)] + (1 - a) * V[k])
            v2 = k2 + (1 - d2) * V[min(k + inc2, K)]
            V[k] = 0.0 if k >= 15 else (1 - p) * v1 + p * v2
    print('\nchain V(0) = %.2f (simulator level %.2f; scale to official x%.2f)' % (V[0], sim_level, scale))
    print('value of a kill (placement points, official scale), net of the escalation it causes:')
    for k in range(0, 6):
        dv = 1 + V[k + 1] - V[k]
        print('  kill number %d: banked +1, future %+.2f -> net %.2f' % (k + 1, (V[k + 1] - V[k]) * scale, 1 + (V[k + 1] - V[k]) * scale))
    # survival seconds by phase: kills per alive-second in time bins
    bins = [(0, 20), (20, 40), (40, 60), (60, 80), (80, 110)]
    print('\nvalue of one more second alive (kills per alive-second x official scale), by match time:')
    for lo, hi in bins:
        alive = sum(max(0.0, min(m['alive'], hi) - lo) for m in M)
        kills = 0.0
        for e in EP:
            # spread an episode's kills uniformly over its duration
            t0, t1 = e['t0'], e['t0'] + max(e['dur'], 0.1)
            ov = max(0.0, min(t1, hi) - max(t0, lo))
            kills += e['kills'] * ov / (t1 - t0)
        surv = sum(1 for m in M if m['alive'] > lo) / len(M)
        print('  %3d-%3d s: alive at start %.2f, %.3f pt/s (%.2f pt per 10 s)' % (lo, hi, surv, kills / alive * scale if alive else 0, 10 * kills / alive * scale if alive else 0))
    tot_alive = sum(m['alive'] for m in M) / len(M)
    print('\nmean life %.1f s (sim); level per second alive %.3f (official scale)' % (tot_alive, OFFICIAL / tot_alive))

if __name__ == '__main__':
    main()
