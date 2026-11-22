#!/usr/bin/env python3
"""Panel R5 algorithms expert: kill order against several hunters with lines on us (practice = 1 vs n).

Static attrition model (Furtak & Buro 2010 / Smith's rule frame): every hunter keeps its line and its dps a_i on us
until it dies; we kill them one at a time (focus, no switching), ttk_i = hp_i / b_i. Damage taken to kill them all
= sum a_i C_i. Kills before death: our hp budget H is spent at sum of a over the living.
Numbers: house gun 93 dps sustained (12 rounds per 5.8 s) x real-server hit rate by range (S05: <40 m 0.94,
40-80 0.58, 80-130 0.31, beyond 0.12); a laser carrier fires the gun 60% as often and adds 315 x 0.67 / 2.7 s
(cube bonus 4% per cube both ways). Ours: gun 105 dps held trigger x qOut prior (0.95 / 0.9 / 0.75 / 0.5), laser
315 x 0.92 / 2.5 s, our cubes 3; 0.3 s to swing onto each new target.
J = kills before death + spare hp / 500 (about one kill per 500 hp taken over a life) when all are killed.
Rules compared:
  v4add   V4 focus 'add' cost: distance + 0.1 hp - 200 if hp <= 30% or finishable by the current burst
  smith   highest a_i / ttk_i first (Attack-Value), a_i and ttk_i from the numbers above
  smithL  smith with a cruder threat: loadout only (gun 30 dps, laser carrier 110 dps) times the cube bonus
  near    nearest first
  spt     quickest kill first (shortest processing time)
  smithB  smith when the hp budget covers killing all of them, else spt
  best    exhaustive search over the orders for the highest J (the model's optimum; n! <= 24 orders)
Run: python3 -I -B order_model.py
"""
import itertools
import random


def p_house(d):
    return 0.94 if d < 40 else 0.58 if d < 80 else 0.31 if d < 130 else 0.12


def q_us(d):
    return 0.95 if d < 40 else 0.9 if d < 90 else 0.75 if d < 160 else 0.5


def scenario(rng, n):
    hs = []
    for i in range(n):
        d = rng.uniform(60, 180)
        laser = rng.random() < 0.5
        c = rng.choice([0, 0, 1, 2, 3, 4, 6])
        mx = 1400 * (1 + 0.04 * c)
        hp = mx if rng.random() < 0.5 else mx * rng.uniform(0.25, 1.0)
        k = 1 + 0.04 * min(c, 10)
        gun = 93 * p_house(d) * k * (0.6 if laser else 1.0)
        a = gun + (315 * 0.67 / 2.7 * k if laser else 0.0)
        hs.append({'d': d, 'laser': laser, 'c': c, 'mx': mx, 'hp': hp, 'a': a, 'k': k})
    return hs


def our_dps(h, we_laser):
    km = 1 + 0.04 * 3
    b = 105 * q_us(h['d']) * km
    if we_laser:
        b += 315 * 0.92 / 2.5 * km
    return b


def burst(h, we_laser):
    km = 1 + 0.04 * 3
    return 12 * 45 * q_us(h['d']) * km + (315 * km if we_laser else 0)


def order(hs, rule, we_laser):
    idx = list(range(len(hs)))
    if rule == 'near':
        return sorted(idx, key=lambda i: hs[i]['d'])
    if rule == 'v4add':
        def cost(i):
            h = hs[i]
            c = h['d'] + 0.1 * h['hp']
            if h['hp'] <= 0.3 * h['mx'] or burst(h, we_laser) >= h['hp']:
                c -= 200
            return c
        return sorted(idx, key=cost)
    if rule == 'smith':
        return sorted(idx, key=lambda i: -hs[i]['a'] / (hs[i]['hp'] / our_dps(hs[i], we_laser) + 0.3))
    if rule == 'spt':
        return sorted(idx, key=lambda i: hs[i]['hp'] / our_dps(hs[i], we_laser))
    if rule == 'best':
        bestJ, bestO = None, None
        for o in itertools.permutations(idx):
            tot, k, spare = play(hs, o, we_laser, order.H, True)
            J = k + spare / 500.0
            if bestJ is None or J > bestJ + 1e-9:
                bestJ, bestO = J, list(o)
        return bestO
    if rule == 'smithB':
        # Smith while the budget covers killing everyone (save hp for the next wave), else quickest kill first
        o = sorted(idx, key=lambda i: -hs[i]['a'] / (hs[i]['hp'] / our_dps(hs[i], we_laser) + 0.3))
        tot, k, spare = play(hs, o, we_laser, order.H, True)
        if k == len(idx):
            return o
        return sorted(idx, key=lambda i: hs[i]['hp'] / our_dps(hs[i], we_laser))
    if rule == 'smithL':
        return sorted(idx, key=lambda i: -((110 if hs[i]['laser'] else 30) * hs[i]['k']) / (hs[i]['hp'] / our_dps(hs[i], we_laser) + 0.3))
    raise ValueError(rule)


def play(hs, ordr, we_laser, H, spare_out=False):
    t, taken, kills, dead_at = 0.0, 0.0, 0, None
    alive = set(range(len(hs)))
    total = 0.0
    for i in ordr:
        ttk = hs[i]['hp'] / our_dps(hs[i], we_laser) + 0.3
        rate = sum(hs[j]['a'] for j in alive)
        if dead_at is None and taken + rate * ttk >= H:
            dead_at = t + (H - taken) / rate
        taken += rate * ttk
        total += rate * ttk
        t += ttk
        alive.discard(i)
        if dead_at is None:
            kills += 1
    if spare_out:
        return total, kills, max(0.0, H - total) if dead_at is None else 0.0
    return total, kills


def main():
    rng = random.Random(5)
    rules = ['v4add', 'smith', 'smithL', 'smithB', 'spt', 'near', 'best']
    print('Damage taken to kill every hunter (all lines open), kills before death with H = U(0.5, 1.0) x 1400,')
    print('and how often the first pick differs from v4add. 6000 scenarios per row.\n')
    for n in (2, 3, 4):
        for we_laser in (False, True):
            agg = {r: [0.0, 0, 0.0] for r in rules}
            diff_first = {r: 0 for r in rules}
            gain_when_diff = {r: [0.0, 0] for r in rules}
            N = 6000
            for _ in range(N):
                hs = scenario(rng, n)
                H = 1400 * rng.uniform(0.5, 1.0)
                order.H = H
                base_o = order(hs, 'v4add', we_laser)
                base = play(hs, base_o, we_laser, H)
                for r in rules:
                    o = order(hs, r, we_laser)
                    tot, k, sp = play(hs, o, we_laser, H, True)
                    agg[r][0] += tot
                    agg[r][1] += k
                    agg[r][2] += k + sp / 500.0
                    if o[0] != base_o[0]:
                        diff_first[r] += 1
                        gain_when_diff[r][0] += base[0] - tot
                        gain_when_diff[r][1] += 1
            print('n=%d hunters, we %s laser' % (n, 'hold a' if we_laser else 'have no'))
            for r in rules:
                dm = agg[r][0] / N
                kk = agg[r][1] / N
                g = gain_when_diff[r]
                print('  %-7s damage %6.0f (%+5.1f%% vs v4add)  kills %4.2f  J %4.2f  first pick differs %4.1f%%  saving then %5.0f hp' % (
                    r, dm, 100 * (dm / (agg['v4add'][0] / N) - 1), kk, agg[r][2] / N, 100 * diff_first[r] / N, g[0] / max(1, g[1])))
            print()


if __name__ == '__main__':
    main()
