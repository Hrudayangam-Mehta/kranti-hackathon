#!/usr/bin/env python3
"""Final collapse hp race and late-fight arithmetic (stdlib only).
1) max hp by cubes / plating; seconds alive after 415 s at 260 hp/s; armor does not count.
2) zone-race ordering vs house bots / finalists (E = hp - 260 * metres-equivalent off the point).
3) Sequential-focus fight model: k enemies with a line on us, we kill them one at a time.
   Returns kills before death, our hp left, and time; used for the engage rules per alive count."""
import math

BASE = 1400.0
def max_hp(cubes, plating):
    return BASE * (1 + 0.04 * min(cubes, 10)) * (1.15 ** plating)

print('## 1. Max hp and life after total closure (415 s, 260 hp/s, armor ignored)')
print('cubes | plating 0 | 1 | 2 | 3   (hp / seconds after 415)')
for c in (0, 3, 6, 10):
    cells = [f'{max_hp(c,p):5.0f} / {max_hp(c,p)/260:4.1f}' for p in range(4)]
    print(f'{c:5d} | ' + ' | '.join(cells))

print('\n## 2. Who dies first in the collapse: E = hp - cost(off-point). Same tick = shared place.')
print('A mech pushed 2.5-6 m off a final point costs 650-1560 hp (rho 0) or 390-940 (rho 0.67, on the old-centre side).')
cases = [
    ('us 10c+1p full on point vs house 0c full 6 m off', max_hp(10,1), 0, BASE, 6*260),
    ('us 10c+1p at 60% on point vs house 0c full 6 m off', 0.6*max_hp(10,1), 0, BASE, 6*260),
    ('us 0c full on point vs house 3c full pushed 3 m (both pushing)', BASE, 3*260, max_hp(3,0), 3*260),
    ('us 6c 50% vs house 0c 70%, both pushed 3 m', 0.5*max_hp(6,0), 3*260, 0.7*BASE, 3*260),
    ('finalist peer: us 10c+2p 80% vs them 10c+1p full, both 3 m', 0.8*max_hp(10,2), 780, max_hp(10,1), 780),
]
for name, h1, c1, h2, c2 in cases:
    e1, e2 = h1 - c1, h2 - c2
    print(f'{name}: E_us {e1:6.0f}  E_them {e2:6.0f}  -> {"WE outlast" if e1 > e2 else "THEY outlast"} by {abs(e1-e2)/260:4.1f} s')

# ---------------------------------------------------------------- 3. fight model
# house gun: 12 shots per (11*0.30 + 2.5) s = 5.8 s -> 93 dps at 100% hits; hit rate by range (D1 / S05)
def house_gun_hit(d, dodging):
    tab = [(75, 1.0), (100, 0.86), (126, 0.57), (151, 0.32), (999, 0.2)]
    for r, h in tab:
        if d < r:
            base = h; break
    # our bullet dodge / reversals: D1 says 84% -> 22% once velocity changes in flight (flight >= 0.3 s, ~75 m)
    if dodging and d >= 75: base *= 0.55
    return base
def house_dps(d, laser=True, dodging=True):
    gun = 93.0 * house_gun_hit(d, dodging)
    if not laser: return gun
    # house does not fire the gun while charging (0.75 s of each 2.7 s laser cycle); beam 315/2.7 s, accuracy 0.55 vs a strafer
    return gun * (1 - 0.75 / 2.7) + 117.0 * 0.55

def our_dps(d, cubes, laser=True, gun_during_charge=False):
    mult = 1 + 0.04 * min(cubes, 10)
    if d < 45: gh = 0.9
    elif d < 100: gh = 0.65
    elif d < 139: gh = 0.45
    else: gh = 0.0          # D2 gate: flight > 0.55 s
    gun = 102.0 * gh        # held trigger: 12 shots per 5.28 s
    if laser:
        la = 0.85 if d < 100 else 0.7
        lz = 131.0 * la
        g = gun if gun_during_charge else gun * (1 - 0.75 / 2.4)
        return mult * (lz + g)
    return mult * gun

def fight(k, d, cubes, plating, hp_frac=1.0, laser=True, house_hp=BASE, house_laser=True, dodging=True, gdc=False):
    """k enemies all with a line; we focus one at a time. Fluid: incoming = alive_enemies * house_dps."""
    H = hp_frac * max_hp(cubes, plating)
    D = max(1e-6, our_dps(d, cubes, laser, gdc))
    din = house_dps(d, house_laser, dodging)
    kills, t = 0, 0.0
    alive = k
    while alive > 0:
        tk = house_hp / D
        dmg = alive * din * tk
        if dmg >= H:
            # partial: we die during this kill
            t += H / (alive * din)
            return kills, 0.0, t
        H -= dmg; t += tk; kills += 1; alive -= 1
    return kills, H, t

print('\n## 3. Sequential-focus fight, all k with a line (kills, our hp left, seconds). Rows: range m; cols: k=1..4')
for cubes, plating, lz in ((0, 0, False), (0, 0, True), (6, 0, True), (10, 1, True)):
    print(f'-- us: {cubes} cubes, {plating} plating, laser={lz}; house 1400 hp gun+laser; we dodge')
    for d in (40, 90, 120, 150):
        cells = []
        for k in (1, 2, 3, 4):
            kk, hl, tt = fight(k, d, cubes, plating, 1.0, lz)
            cells.append(f'{kk}/{hl:5.0f}/{tt:4.1f}')
        print(f'  d={d:3d}: ' + '  '.join(cells) + f'   (our dps {our_dps(d,cubes,lz):5.1f}, one house {house_dps(d):5.1f})')

print('\n## 4. Serialised: each enemy alone (others without a line), 5 s gap between fights, no regen in between')
for cubes, plating in ((0, 0), (6, 0), (10, 1)):
    H = max_hp(cubes, plating); n = 0; d = 120
    D = our_dps(d, cubes, True); din = house_dps(d)
    while True:
        tk = BASE / D; dmg = din * tk
        if dmg >= H: break
        H -= dmg; n += 1
        H = min(max_hp(cubes, plating), H + 2 * 56 * (1 + 0.0))   # kill cubes: +2 cubes when we collect (death drop extra); +4% max hp each (healing the difference)
        if n > 15: break
    print(f'  {cubes} cubes {plating} plating at 120 m: {n} kills in a row before death (no regen); with 45 hp/s regen in 20 s gaps it is unbounded')

print('\n## 5. Two-alive FFA: fight now vs let the collapse decide. Peer finalist with laser, both at 120 m.')
for (hu, cu, pu, ht, ct, pt) in ((1.0, 10, 1, 1.0, 10, 0), (0.6, 10, 1, 1.0, 6, 0), (1.0, 6, 0, 1.0, 10, 1), (0.9, 10, 2, 0.5, 10, 1)):
    Hu, Ht = hu * max_hp(cu, pu), ht * max_hp(ct, pt)
    Du, Dt = our_dps(120, cu, True), our_dps(120, ct, True)   # peer uses our dps model
    tu, tt = Hu / Dt, Ht / Du
    p_duel = tt < tu
    print(f'  us {hu:.0%} of {max_hp(cu,pu):4.0f}, them {ht:.0%} of {max_hp(ct,pt):4.0f}: duel -> {"we win" if p_duel else "we lose"} (we die in {tu:4.1f} s, they in {tt:4.1f} s); zone race -> {"we win" if Hu > Ht else "we lose"} by {abs(Hu-Ht):4.0f} hp')
