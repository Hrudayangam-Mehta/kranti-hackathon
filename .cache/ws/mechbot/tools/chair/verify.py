# Chair recomputation of panel numbers from the hello config. Usage: python3 -I verify.py <hello_example.json>
import json, math, sys
cfg = json.load(open(sys.argv[1]))['config']
M, W, Z, C = cfg['mech'], cfg['weapons'], cfg['zone'], cfg['cubes']
g, la, li, mo = W['gun'], W['laser'], W['lightning'], W['mortar']
tick = 1.0 / cfg['match']['tick_hz']
print('== zone timeline')
t = 0.0; r0 = Z['start_radius']
for i, ph in enumerate(Z['phases']):
    hs, he = t, t + ph['hold_s']; se = he + ph['shrink_s']
    print(' phase %d hold %3.0f-%3.0f shrink %3.0f-%3.0f r %3.0f->%3.0f dps %3d edge %.2f m/s (far side max %.2f)' % (
        i + 1, hs, he, he, se, r0, ph['radius'], ph['dps'], (r0 - ph['radius']) / ph['shrink_s'], 2 * (r0 - ph['radius']) / ph['shrink_s']))
    t = se; r0 = ph['radius']
tEnd = t
print(' drops called', cfg['drops']['times'], 'land', [x + cfg['drops']['fall_s'] for x in cfg['drops']['times']])
print('== weapons')
def gun(mag, cd, rl, dmg, quant=False):
    c = math.ceil(cd / tick - 1e-9) * tick if quant else cd
    cyc = (mag - 1) * c + rl
    return dmg / c, mag * dmg / cyc, (mag - 1) * c, cyc
for name, mag, cd, rl, dmg in [('base', g['mag'], g['cooldown'], g['reload'], g['damage']),
                               ('gun_mag x1', g['mag'] + 8, g['cooldown'], g['reload'] * .8, g['damage']),
                               ('gun_mag x2', g['mag'] + 16, g['cooldown'], g['reload'] * .64, g['damage']),
                               ('gun_damage x1', g['mag'], g['cooldown'], g['reload'], g['damage'] * 1.15),
                               ('gun_rate x1', g['mag'], g['cooldown'] * .87, g['reload'], g['damage']),
                               ('gun_rate x2', g['mag'], g['cooldown'] * .87 ** 2, g['reload'], g['damage'])]:
    b, s, ex, cyc = gun(mag, cd, rl, dmg); bq, sq, exq, cycq = gun(mag, cd, rl, dmg, True)
    print(' gun %-13s burst %5.1f sustained %5.1f (mag time %.2f s, cycle %.2f s, exposed share %.2f) | 20 Hz-quantised: burst %5.1f sustained %5.1f' % (
        name, b, s, ex, cyc, ex / cyc, bq, sq))
ldps = la['damage'] / (la['charge'] + la['cooldown'])
tap = la['damage'] * (la['min_frac'] + (1 - la['min_frac']) * la['min_charge'] / la['charge'])
print(' laser full %.0f per %.2f s = %.1f dps; tap %.1f per %.2f s = %.1f dps; vs mortar holder %.0f; rear %.0f; both %.0f' % (
    la['damage'], la['charge'] + la['cooldown'], ldps, tap, la['min_charge'] + la['cooldown'], tap / (la['min_charge'] + la['cooldown']),
    la['damage'] * (1 + la['cookoff']), la['damage'] * M['rear_mult'], la['damage'] * (1 + la['cookoff']) * M['rear_mult']))
zdps = li['damage'] / li['cooldown']; chain = sum(li['chain_falloff'] ** k for k in range(li['chain'] + 1))
print(' lightning %.0f dps, %.0f energy/s, tank %.1f s = %d zaps = %.0f dmg; full chain x%.2f = %.0f dps' % (
    zdps, li['energy'] / li['cooldown'], M['energy'] / (li['energy'] / li['cooldown']), M['energy'] // li['energy'],
    (M['energy'] // li['energy']) * li['damage'], chain, zdps * chain))
print(' mortar direct+splash %.0f per %.1f s = %.0f dps' % (mo['damage'] + mo['splash'], mo['cooldown'], (mo['damage'] + mo['splash']) / mo['cooldown']))
gs = gun(g['mag'], g['cooldown'], g['reload'], g['damage'])[1]
print(' TTK %d HP: gun %.1f s, laser %.1f s, lightning %.1f s (%.0f energy), gun+lightning burst %.1f s, gun+laser %.1f s, laser+lightning %.1f s' % (
    M['hp'], M['hp'] / gs, M['hp'] / ldps, M['hp'] / zdps, M['hp'] / li['damage'] * li['energy'],
    M['hp'] / (g['damage'] / g['cooldown'] + zdps), M['hp'] / (gs + ldps), M['hp'] / (ldps + zdps)))
print('== dodge geometry')
a, v, vb = M['ground_accel'], M['walk_speed'], g['speed']
for c in (0, 5, 10, 15, 21):
    R = M['radius'] * (1 + C['size_per_cube'] * c); w = R + cfg['projectile']['gun_radius']
    s = math.sqrt(2 * w / a)
    print(' cubes %2d R %.2f w %.2f s* %.3f s | blind-jink bound (no latency) %.0f m | shooter latency 0.10/0.05: %.0f/%.0f m | reactive (we see the bullet 0.05-0.10 s after fire): %.0f-%.0f m | s(c) %.2f' % (
        c, R, w, s, vb * s, vb * (s - 0.10) + 3, vb * (s - 0.05) + 3, vb * (s + 0.05) + 3, vb * (s + 0.10) + 3, math.sqrt(w / (M['radius'] + 0.3))))
print(' reversal time %.2f s; jink peak-to-peak at interval h: ' % (2 * v / a) + ', '.join('%.2f s: %.2f m' % (h, v * (h - 2 * v / a) + 2 * v * v / (2 * a) if h >= 2 * v / a else a * h * h / 4) for h in (0.35, 0.45, 0.5, 0.6, 0.8, 1.0)))
print(' laser no-lead aim: our displacement at walk/boost in 0.10 s %.2f/%.2f m, 0.15 s %.2f/%.2f m (radius %.1f)' % (v * .1, M['boost_speed'] * .1, v * .15, M['boost_speed'] * .15, M['radius']))
print('== spread-limited hit probability on a straight target (sigma = spread_deg per axis)')
sig = math.radians(g['spread_deg'])
for R in (75, 100, 125, 150, 200):
    py = math.erf((2.8 / R) / sig / math.sqrt(2)); pp = math.erf((4.8 / R) / sig / math.sqrt(2))
    print('  %3d m: %.3f  yaw gate %.1f mrad' % (R, py * pp, 1000 * max(0.004, 2.8 / R - sig)))
print('== kill cycle C = tau(1+a/r)+delta')
def Cyc(b, a_in, r=M['regen_per_s'], d=M['regen_delay'], h=M['hp']):
    tau = h / b; return tau, tau * (1 + a_in / r) + d
for name, b in (('gun q=0.6', gs * 0.6), ('gun+laser', gs * 0.6 + ldps * 0.85), ('gun q=0.6 +gun_damage', gs * 0.6 * 1.15)):
    tau, cc = Cyc(b, 31); _, c1 = Cyc(b, 31, 72, 3.5); _, c2 = Cyc(b, 31, 115.2, 2.0)
    print(' %-22s b %.0f tau %.1f C %.1f (kills/200 s %.2f, in %d s %.1f) | nanites x1 C %.1f (%+.0f%%) x2 %.1f (%+.0f%%)' % (
        name, b, tau, cc, 200 / cc, tEnd, tEnd / cc, c1, 100 * (c1 / cc - 1), c2, 100 * (c2 / c1 - 1)))
print(' range sweep, gun only, peek exposure 0.55 vs open field 1.0 (p_us: house-on-house by flight time; p_them: vs our jink)')
tab = [(60, 0.98, 0.95), (87, 0.86, 0.60), (112, 0.65, 0.37), (137, 0.45, 0.25), (165, 0.30, 0.18)]
for R, pu, pt in tab:
    for ex in (0.55, 1.0):
        b = gs * pu * (1.0 if ex == 0.55 else 1.0); ain = gs / 0.524 * 0.524 * pt * ex  # sustained house gun x hit x exposure
        tau, cc = Cyc(b, ain)
        print('   R %3d m exposure %.2f: p_us %.2f p_them %.2f ratio %.2f tau %.1f s HP lost per kill %4.0f C %.1f s' % (R, ex, pu, pt, pu / pt, tau, ain * tau, cc))
print('== finale')
for nm, hp in (('base', M['hp']), ('10 cubes', M['hp'] * 1.4), ('10 cubes + 3 plating', M['hp'] * 1.4 * 1.15 ** 3), ('3 plating', M['hp'] * 1.15 ** 3)):
    print(' %-22s %.0f HP -> %.1f s at %d HP/s' % (nm, hp, hp / Z['phases'][-1]['dps'], Z['phases'][-1]['dps']))
print(' laser beams to kill %d HP: ' % M['hp'] + ', '.join('%s %.0f dmg -> %d beams' % (n, d, math.ceil(M['hp'] / d)) for n, d in (
    ('base', 315), ('3 cubes', 315 * 1.12), ('10 cubes', 441), ('10c+1 lens', 441 * 1.18), ('10c+3 lens', 441 * 1.18 ** 3))))
print('== armor EHP per stack', ['%.1f%%' % (100 * ((1 - .08 * k) / (1 - .08 * (k + 1)) - 1)) for k in range(3)])
print('== FFA duel threshold p*(A)', {A: round((A - 1) * .5 / (1 + (A - 2) * .55), 3) for A in (16, 8, 4, 3, 2)},
      'power ratio', {A: round(((lambda p: p / (1 - p))((A - 1) * .5 / (1 + (A - 2) * .55))) ** (1 / 3), 2) for A in (16, 8, 4, 3)})
print('== supply drop worked case G', (700 / 45 + 5) / 30 + 0.04 * 3 * 3, 'p_die limit', ((700 / 45 + 5) / 30 + 0.36 - (100 / 11.7) / 30) / 3)
print('== finishing push threshold V/(1+V)', {t: round(max(.2, min(5, (240 - t) / 40)) / (1 + max(.2, min(5, (240 - t) / 40))), 2) for t in (40, 160, 220, 260)})
print('== scorer noise: SE of a 48-match mean')
for p in (0.2, 0.28, 0.35):
    print('  bimodal 0/15 with win rate %.2f: mean %.2f per-match SD %.2f SE %.2f; SE of a difference of two runs %.2f' % (p, 15 * p, 15 * math.sqrt(p * (1 - p)), 15 * math.sqrt(p * (1 - p) / 48), 15 * math.sqrt(2 * p * (1 - p) / 48)))
print('  unimodal SD 2.8: SE %.2f' % (2.8 / math.sqrt(48)))
print('== misc: tStep 4 m walk %.2f s, boost %.2f s, while charging (half speed) %.2f s; 360 deg sweep %.2f s; boost tank %.1f s / %.0f m; jet tank %.1f s' % (
    v / a + (4 - v * v / (2 * a)) / v, M['boost_speed'] / a + (4 - M['boost_speed'] ** 2 / (2 * a)) / M['boost_speed'], (v / 2) / a + (4 - (v / 2) ** 2 / (2 * a)) / (v / 2),
    2 * math.pi / M['turn_rate'], M['energy'] / M['boost_drain'], M['energy'] / M['boost_drain'] * M['boost_speed'], M['energy'] / M['jet_drain']))
print(' crate %d HP = %d rounds (%.2f s); drone %d HP = %d rounds; full heal by regen from half HP %.1f s' % (
    cfg['crates']['hp'], math.ceil(cfg['crates']['hp'] / g['damage']), (math.ceil(cfg['crates']['hp'] / g['damage']) - 1) * g['cooldown'],
    cfg['npc']['hp'], math.ceil(cfg['npc']['hp'] / g['damage']), M['regen_delay'] + 0.5 * M['hp'] / M['regen_per_s']))
