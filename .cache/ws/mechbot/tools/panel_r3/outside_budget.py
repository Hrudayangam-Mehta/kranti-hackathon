#!/usr/bin/env python3
"""When is a step OUTSIDE the zone worth it? Break-even seconds for four uses, per zone dps (stdlib only).
Costs: zone dps x s (in a fight regen is already blocked); out of a fight add 45 x (s + 5) lost regen.
Gains (our arithmetic, 0 cubes; scale by 1 + 0.04 cubes):
  flank   : a rear opening on a mech facing away: beam 472 (vs 315) + ~0.8 s unanswered while it turns 180 deg
            (4 rad/s) + 4 rear gun rounds 67.5 -> ~740 hp swing vs a frontal opening that it answers at once
  dodge   : breaking one enemy line: its dps by range (house gun 93 x hit rate; + laser 64 when carried)
  finish  : a fleeing target outside takes z too: time to kill h / (D + z)
  rotate  : outside arc instead of an inside chord past a crowd: hp per metre z / v"""
ZD = [20, 35, 60, 100, 160, 260]
FLANK = 740.0
print('dps | flank break-even s (x1/3 safety) | dodge: lines a step outside must break to pay (gun <75 m 93, 75-100 80, 100-126 53) | finish 600 hp target, our dps 150: s outside | outer arc 100 m walk / boost hp')
for z in ZD:
    be = FLANK / z
    need = '1 line at any range <126 m' if z < 53 else ('1 line <100 m' if z < 80 else ('1 line <75 m' if z < 93 else ('2 lines <100 m' if z < 160 else ('2 lines <75 m' if z < 186 else '3 lines <75 m'))))
    fin = 600 / (150 + z)
    print(f'{z:3d} | {be:5.1f} / {be/3:4.1f} | {need} | {fin:4.1f} s, our cost {fin*z:4.0f} | {100*z/11.7:5.0f} / {100*z/19.5:5.0f}')
print('\nRule budget used in the spec: s_out <= min(cap[dps], 0.15 x hp / dps); cap = 12 / 7 / 4 / 2 / 0 / 0 s for 20 / 35 / 60 / 100 / 160 / 260')
for z, cap in zip(ZD, (12, 7, 4, 2, 0, 0)):
    for hp in (1400, 700):
        print(f'  dps {z:3d}, hp {hp}: s_out {min(cap, 0.15*hp/z):4.1f} s, cost {min(cap, 0.15*hp/z)*z:4.0f} hp')
