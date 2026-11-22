"""Panel R6 reward economist: the action-to-reward table (python3 -I rewards.py > rewards_out.txt).

Tags: [M] official 48-seed score (ours or another team's one-change A/B), [S] our simulator ledger (ledger.js, V4 seeds
1-40; behaviour only, its within-bot score deltas have had the wrong sign six times), [T] a 6+ bot's choice, [A] model,
[N] no evidence. Physical numbers come from notes/hello_example.json; the bot must read them from hello.config.

Points = house deaths before ours. Per event:
    U = pts - lam_t * T - lam_hp(state) * HP - P(death) * V_fut
pts counts kills, drops, cubes, a laser and the output dealt meanwhile (1 pt per DMG_PER_PT damage); HP is intake
(negative = HP refunded or saved against the baseline). In-contact rows are scored against standing in the
stand-off band for the same time; out-of-contact rows against idling at full hp. freq = events per match in V4 (sim).
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
CFG = json.load(open(os.path.join(HERE, '..', '..', 'notes', 'hello_example.json')))['config']
MECH, ZONE, CUBES, DROPS = CFG['mech'], CFG['zone'], CFG['cubes'], CFG['drops']
HP0, REGEN, DELAY = MECH['hp'], MECH['regen_per_s'], MECH['regen_delay']
LASER = CFG['weapons']['laser']

# ---------------- exchange rates
LAM_T = {'contested': 0.014, 'free': 0.003}   # [M] V1-V2 +0.38 for ~27 s earlier first damage / [A] clock only
LIFE_RATE = 4.97 / 80.0                       # [M]+[S] average points per second alive (reference line)
LAM_HP_AVG = 4.97 / 2100.0                    # [M]+[S] points per HP of intake over a life (reference line)
LAM_HP = {'abundant': 0.0005, 'normal': LAM_HP_AVG, 'scarce': 0.0036}   # [S] shadow price of HP by scarcity
V_FUT = 2.5                                   # [A] further points if we survive a crisis mid-match
V_CUBE = 0.10                                 # [A] cubes 1-6 (0.06 for 6-9, 0.01 at 10+); calibrated to E01/E04/E12
V_LASER = 0.5                                 # [A, T x3] a laser in hand before ~60 s while gun-only (0.2-1.0)
KILL_DROP = 0.7 * CUBES['death_drop_extra'] * V_CUBE   # [T] 70% of kill cubes collected; a 0-cube victim drops 2
DMG_PER_PT = 1450.0                           # [S] output per kill including waste
STANDOFF = {'out': 175.0, 'in': 42.0}         # [S] V1 legs: stand-off dmg/s dealt, hp/s taken
P_NEXT_MULTI = 0.55                           # [S] P(next episode has >= 2 attackers) after the first episode

def phi(z):
    return 0.5 * (1 + math.erf(z / math.sqrt(2)))

def p_win(hp, cost, sd=0.35):
    return phi((hp - cost) / max(1.0, sd * cost))

def lam_of_h(h):
    """Marginal value of one HP at hp fraction h (expected over the next episode's line count) [S ledger]."""
    lam1 = LAM_HP['scarce'] if h < 0.3 else 0.0002
    return P_NEXT_MULTI * LAM_HP['scarce'] + (1 - P_NEXT_MULTI) * lam1

def refund_value(h0, hp_gain):
    steps, v = 50, 0.0
    for i in range(steps):
        h = h0 + (i + 0.5) / steps * hp_gain / HP0
        v += lam_of_h(h) * hp_gain / steps
    return v

rows = []
def row(fam, act, pts, T, HP, pdie, state, lam_t, freq, tag, note='', contact=False):
    U = pts - LAM_T[lam_t] * T - LAM_HP[state] * HP - pdie * V_FUT
    if contact:   # against standing in the stand-off band for the same time
        base = STANDOFF['out'] * T / DMG_PER_PT - LAM_T[lam_t] * T - LAM_HP[state] * STANDOFF['in'] * T
        U -= base
    rows.append(dict(fam=fam, act=act, pts=pts, T=T, HP=HP, pdie=pdie, U=U, state=state, lam_t=lam_t, freq=freq, tag=tag, note=note,
                     ps=pts / T if T > 0 else 0.0, pk=(1000 * pts / HP) if HP > 0 else float('inf')))

# ---------------- A. engage one fresh 0-cube hunter (1 line) at full hp (toy sustained dps, panel_r5 design_arith)
OUR = {'gun': {40: 92, 75: 78, 110: 71, 150: 0}, 'gun+laser': {40: 204, 75: 190, 110: 183, 150: 112}}
HGUN = {40: 51, 75: 51, 110: 27, 150: 11}
HLAS = 0.3 * LASER['damage'] / (LASER['charge'] + LASER['cooldown'] + 0.3)   # [M S07] house laser 15-27% accuracy -> ~35 dps
HUNT = {'gun': HGUN, 'gun+laser': {d: v + HLAS for d, v in HGUN.items()}}
for us in OUR:
    for th in HUNT:
        for d in (40, 75, 110, 150):
            dps = OUR[us][d]
            if dps <= 0:
                row('A engage 1 hunter', f'{us} vs {th} @{d} m', 0.0, 10.0, HUNT[th][d] * 10, 0.0, 'abundant', 'contested', None, '[A]', 'gun silent beyond the 0.55 s flight gate')
                continue
            ttk = HP0 / dps; cost = HUNT[th][d] * ttk; pw = p_win(HP0, cost)
            row('A engage 1 hunter', f'{us} vs {th} @{d} m', pw * (1 + KILL_DROP), ttk, min(cost, HP0), 0.5 * (1 - pw), 'abundant', 'contested', None, '[A]')
ttk = HP0 / OUR['gun+laser'][40]; cost = (HGUN[40] + 190) * ttk; pw = p_win(HP0, cost)
row('A engage 1 hunter', 'gun+laser vs lightning holder inside 45 m', pw * (1 + KILL_DROP), ttk, min(cost, HP0), 0.5 * (1 - pw), 'abundant', 'contested', 0.5, '[A, S lightning = 20-25% of damage taken]')
row('A engage (sim)', 'episode with 1 attacker (V4, n 36)', 0.75, 6.9, 221, 0.06, 'abundant', 'contested', 0.9, '[S]')
row('A engage (sim)', 'episode with 2 attackers (n 23)', 1.04, 11.6, 893, 0.70, 'scarce', 'contested', 0.6, '[S]')
row('A engage (sim)', 'episode with 3+ attackers (n 37)', 2.78, 27.3, 1214, 0.59, 'scarce', 'contested', 0.9, '[S]')

# ---------------- B. finish (target <= one burst, TTK' <= 1.5 s) instead of the exit V4 takes
# abandon2 ft-off [S]: 23 near-kill exits in 20 seeds (1.15 per match), 9 killed later anyway (0.39)
row('B finish', 'near kill, 2 lines (IN 150): finish vs leave', (0.85 - 0.39) * (1 + KILL_DROP), 1.8, 150 * 1.8 - 72 * 1.8, 0.03, 'normal', 'contested', 1.15,
    '[S, M G01 +0.39, A32 +0.34]', 'HP net of the 72 hp/s retreat walk it replaces')
row('B finish', 'target under 25% with 1 line', 0.95 * (1 + KILL_DROP), 1.5, 27 * 1.5, 0.0, 'abundant', 'contested', 1.0, '[A]')

# ---------------- C. retreat (V4: 2.15 LOSING disengages per match [S]); scored against fighting on for the same time
FIGHT_ON = dict(pts=0.30 * (1 + KILL_DROP), hp=150 * 4.0, pdie=0.30)   # [S] per LOSING event: 2.15 per match, ~1 death per match
def vs_fight_on(name, pts, T, HP, pdie, freq, tag, note):
    # crisis convention: the HP difference is priced at the abundant rate because P(death) already carries the scarcity
    U = (pts - FIGHT_ON['pts']) - LAM_HP['abundant'] * (HP - FIGHT_ON['hp']) - (pdie - FIGHT_ON['pdie']) * V_FUT
    rows.append(dict(fam='C retreat', act=name, pts=pts, T=T, HP=HP, pdie=pdie, U=U, state='crisis', lam_t='contested', freq=freq, tag=tag, note=note,
                     ps=pts / T, pk=(1000 * pts / HP) if HP > 0 else float('inf')))
vs_fight_on('LOSING, cover <= 7 m (0.6 s): hide, then heal', 0.05, 4.0, 110 * 0.6 + 40, 0.20, 0.65, '[A, M A05 -0.41 when low-hp hiding was removed]', 'vs fighting on; share of LOSING events with cover that near assumed 0.3')
vs_fight_on('LOSING, cover 30 m (2.6 s walk at 72 hp/s)', 0.0, 4.0, 72 * 2.6 + 60, 0.30, 1.5, '[S legs, A]', 'walking to cover takes more fire than standing (72 vs 42 hp/s)')
vs_fight_on('LOSING, no cover within 1.5 s: fight on', FIGHT_ON['pts'], 4.0, FIGHT_ON['hp'], FIGHT_ON['pdie'], 0.0, '[S]', 'baseline')
row('C retreat', 'NOT losing (1 line, 72% hp) to cover 30 m', -0.6, 7.6, 72 * 2.6, 0.0, 'abundant', 'contested', 0.0, '[M A25 -1.10, S]', 'a 94%-won fight given up; the target regenerates', contact=True)

# ---------------- D. heal from 45% in the lull after a fight (0.55 lulls per match start under 70% [S])
d = json.load(open(os.path.join(HERE, 'd_v4.json')))
LULL = [l['len'] for l in d['LU']]
mean_lull = sum(LULL) / len(LULL)
for tgt in (0.70, 0.90, 1.00):
    T = DELAY + (tgt - 0.45) * HP0 / REGEN
    gain = (tgt - 0.45) * HP0
    exp_hp = sum(REGEN * max(0.0, min(x, T) - DELAY) for x in LULL) / len(LULL)
    pc = sum(x >= T for x in LULL) / len(LULL)
    row('D heal', f'45% -> {int(tgt*100)}%, completes (free lull)', refund_value(0.45, gain), T, -gain, 0.0, 'abundant', 'free', 0.55, '[A]', f'{T:.1f} s for +{gain:.0f} hp')
    row('D heal', f'45% -> {int(tgt*100)}%, real lulls (P done {pc:.2f})', refund_value(0.45, exp_hp), min(T, mean_lull), -exp_hp, 0.0, 'abundant', 'free', 0.55, '[S lulls, A]', f'expected +{exp_hp:.0f} hp')
row('D heal', 'one more heal second at 45-85% (no line on us)', refund_value(0.6, REGEN), 1.0, -REGEN, 0.0, 'abundant', 'contested', 0.0, '[A]', 'the hunter was coming anyway: the extra time is waiting, not walking')
row('D heal', 'one more heal second at 90-100%', refund_value(0.95, REGEN), 1.0, -REGEN, 0.0, 'abundant', 'contested', 0.0, '[A]')
row('D heal', 'the 5 s regen delay (dead time)', 0.0, DELAY, 0, 0.0, 'abundant', 'contested', 0.0, '[A, R regen rule]')

# ---------------- E. farm with no hunter near (crate 0.4 / drone 0.4 per match [S])
crate_T = 3.4 + 7 * 0.27 + 2.6
row('E farm', 'crate 40 m, gun only (cube + 50% weapon, 1/3 laser)', V_CUBE + 0.5 * V_LASER / 3, crate_T, 0, 0.0, 'normal', 'free', 0.4, '[A, M E01 +0.27, E04 +0.37, E12 -0.65]')
row('E farm', 'crate 40 m, laser held (one beam breaks it)', V_CUBE + 0.01, 3.4 + 1.0 + 2.6, 0, 0.0, 'normal', 'free', 0.4, '[A]')
row('E farm', 'crate at 10+ cubes', 0.01 + 0.01, crate_T, 0, 0.0, 'normal', 'free', 0.1, '[A]')
row('E farm', 'drone (2 cubes; ~60 hp; resets regen)', 2 * V_CUBE, 8.5, 60, 0.0, 'normal', 'free', 0.4, '[S drone hp 68 per match, A]')
row('E farm', 'crate 150 m away', V_CUBE + 0.5 * V_LASER / 3, 13 + 2 + 2.6, 0, 0.0, 'normal', 'contested', 0.0, '[M E05 -0.12, E09 -0.09, E15 -0.17]')

# ---------------- F. grab in contact (grab leg 14 hp/s in, 105 dmg/s out [S])
row('F grab', 'cube 40-70 m in contact (4 s)', V_CUBE + 105 * 4 / DMG_PER_PT, 4.0, 14 * 4, 0.0, 'normal', 'contested', 1.0, '[S legs, T 5.58 bot]', contact=True)
row('F grab', 'kill-drop cubes (2+ within 5 m, 3 s)', 2 * V_CUBE * 0.9 + 105 * 3 / DMG_PER_PT, 3.0, 14 * 3, 0.0, 'normal', 'contested', 1.5, '[T kyoto 56 of 84]', contact=True)
row('F grab', 'laser 60-130 m, gun only, t < 60 s (7 s)', V_LASER + 105 * 7 / DMG_PER_PT, 7.0, 42 * 7, 0.02, 'normal', 'contested', 0.3, '[A, T x3; M L01 -0.11 long detours]', contact=True)

# ---------------- G. supply drop: full hp + 3 cubes, 4 s alone in the ring; first landing at 95 s (alive then in 5 of 40 [S])
for h, lines, trip in ((0.5, 0, 12), (0.9, 0, 12), (0.5, 1, 12), (0.5, 0, 21)):
    gain = (1 - h) * HP0
    row('G supply drop', f'at {int(h*100)}% hp, {lines} line, {trip} s trip, P(capture) 0.5', 0.5 * (refund_value(h, gain) + DROPS['cubes'] * V_CUBE), trip + DROPS['capture_s'], 4 * 60 * lines, 0.05 + 0.15 * lines,
        'normal', 'contested', 0.12, '[A, M E03 -0.21, E10 +0.02, E11 -0.08]')

# ---------------- H. step outside the zone for x s (phase dps from config); escaping a losing fight vs a stronger pursuer
# pursuer does not follow: P(escape) 0.40; follows: 0.10 -> expected 0.25 [N: the sim stand-in turns back 10-28 m from the edge]
P_ESC = 0.25
for ph in ZONE['phases'][:4]:
    dps = ph['dps']
    for x in (3, 6, 10):
        cost_fight = dps * x
        cost_quiet = (dps + REGEN) * x + REGEN * DELAY
        dP = 0.70 * P_ESC * min(1.0, x / 6)          # P(death) of the losing fight 0.70 [S 2-attacker], cut by a successful escape
        U = -0.3 - LAM_HP['abundant'] * cost_fight + dP * V_FUT   # -0.3: the target we leave regenerates
        rows.append(dict(fam='H outside zone', act=f'{dps} dps: {x} s out of a losing fight', pts=-0.3, T=x, HP=cost_fight, pdie=0.70 - dP, U=U, state='crisis', lam_t='contested',
                         freq=0.05 if dps <= 35 else 0.0, tag='[A, N]', note=f'out of a fight {cost_quiet:.0f} hp; pays only if it removes > {dps/0.6:.0f} dps of lines; P(escape) 0.25 (0.4 if hunters stop at the edge)',
                         ps=0.0, pk=0.0))
# ---------------- I. rotate (zone leg: 20 hp/s in, 38 dmg/s out [S]; 1 rotation per match)
row('I rotate', 'early on the empty side vs late through the squad', 0.06, 0.0, 0, 0.0, 'normal', 'free', 1.0, '[M Z01 +0.06; Z02 +0.29 in a 4-change bundle]', 'V4 already does this (D9: 0 zone deaths)')

# ---------------- J. idle (HOLD / roam with no target: 0 hp, 8 dmg/s; 8.5 s per match at full hp [S])
row('J idle', 'full hp, nothing in view (10 s)', 8 * 10 / DMG_PER_PT, 10, 0, 0.0, 'abundant', 'contested', 0.85, '[S]', 'the seek preset S targets this')
row('J idle', 'hurt (60%), nothing in view (10 s) = free heal', refund_value(0.6, REGEN * 5), 10, -REGEN * 5, 0.0, 'abundant', 'free', 0.3, '[A]')

print('Exchange rates: lam_t contested %.3f / free %.3f pt/s (life average %.3f); lam_hp abundant %.4f / average %.4f / scarce %.4f pt/hp; '
      'V_fut %.1f; V_cube %.2f; V_laser %.2f; kill drop %.2f; %.0f dmg per point; house laser %.0f dps; P(next episode multi-line) %.2f'
      % (LAM_T['contested'], LAM_T['free'], LIFE_RATE, LAM_HP['abundant'], LAM_HP['normal'], LAM_HP['scarce'], V_FUT, V_CUBE, V_LASER, KILL_DROP, DMG_PER_PT, HLAS, P_NEXT_MULTI))
print(f"{'family':18} {'action':50} {'pts':>6} {'T s':>5} {'HP':>6} {'Pdie':>5} {'pt/s':>6} {'pt/kHP':>6} {'U/event':>7} {'freq':>5} {'U/match':>7}  tag / note")
for r in rows:
    pk = '   inf' if r['pk'] == float('inf') or r['HP'] <= 0 else f"{r['pk']:6.2f}"
    fq = '    -' if r['freq'] is None else f"{r['freq']:5.2f}"; um = '      -' if r['freq'] is None else f"{r['U']*r['freq']:7.2f}"
    print(f"{r['fam']:18} {r['act']:50} {r['pts']:6.2f} {r['T']:5.1f} {r['HP']:6.0f} {r['pdie']:5.2f} {r['ps']:6.3f} {pk} {r['U']:7.2f} {fq} {um}  {r['tag']} {r['note']}")
