"""Section 10b: damage mechanics: rear multiplier, cube scaling, HP/cube, regen, crates, zone."""
import sys, os, math, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
R = Replay(); W = World()
upg = collections.defaultdict(list)
for e in R.events:
    if e['e'] == 'upgrade': upg[e['id']].append((e['t'], e['up']))
def nup(mid, tick, name):
    return sum(1 for (t, u) in upg[mid] if u == name and t < tick)
hits = [e for e in R.events if e['e'] == 'hit']
# ---- gun hit amounts
tab = collections.Counter()
for h in hits:
    if h['w'] != 'gun': continue
    src = h['src']; r = R.row(src, h['t'] - 1) or R.row(src, h['t'])
    cubes = r[MCU] if r else None
    dkind = 'mech' if h['dst'] < 100 else 'npc' if h['dst'] < 1000 else 'crate'
    arm = nup(h['dst'], h['t'], 'armor') if h['dst'] < 100 else 0
    tab[(cubes, nup(src, h['t'], 'gun_damage'), dkind, bool(h.get('rear')), arm, h['amt'])] += 1
print('gun hit amounts: (shooter cubes at hit time, gun_damage ups, dst kind, rear, dst armor ups, amt) -> n')
for k, v in sorted(tab.items(), key=lambda kv: (str(kv[0][0]), kv[0][1:])):
    cubes, gd, dk, rear, arm, amt = k
    pred = 45 * (1 + 0.04 * min(cubes or 0, 10)) * (1.15 ** gd) * (1.5 if rear else 1) * (1 - 0.08 * arm)
    print('  ', k, v, 'pred %.2f' % pred, '' if abs(pred - amt) < 0.02 else '<-- MISMATCH')
# note: cube count at hit time may differ from cube count at fire time (bullet flight); mismatches listed
# ---- max_hp vs cubes
mh = collections.Counter()
for mid in R.ids:
    for k in range(0, R.nf, 3):
        r = R.m[mid][k]
        if r: mh[(r[MCU], nup(mid, R.ticks[k], 'plating'), r[MMAX])] += 1
print('max_hp table (cubes, plating ups, max_hp):')
for k, v in sorted(mh.items()):
    pred = 1400 * (1 + 0.04 * min(k[0], 10)) * 1.15 ** k[1]
    print('  ', k, v, 'pred %.1f' % pred)
# ---- npc + zone amounts
print('npc hit amts', collections.Counter((h['amt'], bool(h.get('rear'))) for h in hits if h['w'] == 'npc'))
zc = collections.Counter()
for h in hits:
    if h['w'] == 'zone': zc[(h['amt'], h['t'] // 100 * 5)] += 1
print('zone hit amts by time(s) bucket:', sorted(zc.items(), key=lambda kv: kv[0][1]))
zt = [h['t'] for h in hits if h['w'] == 'zone']
print('zone hit tick spacing', collections.Counter(zt[i + 1] - zt[i] for i in range(len(zt) - 1)).most_common(5))
# ---- lightning amounts
print('lightning hit amts', collections.Counter((h['src'], h['amt'], bool(h.get('rear')), 'm' if h['dst'] < 100 else 'n' if h['dst'] < 1000 else 'c') for h in hits if h['w'] == 'lightning'))
# ---- crate HP
dmg = collections.defaultdict(float); last = {}
for e in R.events:
    if e['e'] == 'hit' and 1000 <= e['dst'] < 5000:
        dmg[e['dst']] += e['amt']
    if e['e'] == 'crate':
        last[e['id']] = dmg[e['id']]
print('crate total damage at destruction:', sorted(round(v, 1) for v in last.values()))
print('crates destroyed', len(last), 'of 36; crates damaged but not destroyed:', {k: v for k, v in dmg.items() if k not in last})
# ---- npc HP
nd = collections.defaultdict(float)
for e in R.events:
    if e['e'] == 'hit' and 100 <= e['dst'] < 1000: nd[e['dst']] += e['amt']
print('npc damage totals (dead ones):', {k: round(v, 1) for k, v in nd.items()}, 'npc deaths', [(e['id'], e['by'], e['t']) for e in R.events if e['e'] == 'death' and e['id'] >= 100])
# ---- HP regen: rate and delay
last_dmg = collections.defaultdict(lambda: -10 ** 9)   # last tick mech dealt or took damage
ev_by_tick = collections.defaultdict(list)
for h in hits: ev_by_tick[h['t']].append(h)
rates = collections.defaultdict(list); delays = collections.defaultdict(list)
for mid in R.ids:
    rows = R.m[mid]
    lt_take = -10 ** 9; lt_deal = -10 ** 9; lt_any = -10 ** 9
    tk = 0
    prev_regen = False
    for k in range(1, R.nf):
        a, b = rows[k - 1], rows[k]
        if a is None or b is None: continue
        for t in range(R.ticks[k - 1] + 1, R.ticks[k] + 1):
            for h in ev_by_tick.get(t, []):
                if h['dst'] == mid: lt_take = t
                if h['src'] == mid: lt_deal = t
        lt_any = max(lt_take, lt_deal)
        dh = b[MHP] - a[MHP]
        cube_change = b[MMAX] != a[MMAX]
        if dh > 0 and not cube_change and lt_any < R.ticks[k - 1]:
            nn = nup(mid, R.ticks[k], 'nanites')
            if b[MHP] < b[MMAX] - 1:
                rates[nn].append(dh / ((R.ticks[k] - R.ticks[k - 1]) * TICK))
            if not prev_regen:
                delays[nn].append(((R.ticks[k] - lt_any) * TICK, (R.ticks[k] - lt_take) * TICK, (R.ticks[k] - lt_deal) * TICK))
            prev_regen = True
        else:
            prev_regen = False
for nn in sorted(rates):
    c = collections.Counter(round(x) for x in rates[nn])
    print('HP regen rate with %d nanites: modes' % nn, c.most_common(5), 'n', len(rates[nn]))
    d = delays[nn]
    print('   regen onset: frame time since last damage dealt-or-taken: min %.2f p10 %.2f p50 %.2f ; n %d' % (min(x[0] for x in d), pct([x[0] for x in d], .1), pct([x[0] for x in d], .5), len(d)))
    print('   onset list (since any / since taken / since dealt):', sorted((round(x[0], 2), round(min(x[1], 999), 2), round(min(x[2], 999), 2)) for x in d)[:25])
# does dealing damage reset? find onsets where time since taken is long but since dealt is ~5
# ---- drop reward
for e in R.events:
    if e['e'] == 'drop' and e['op'] == 'take':
        mid = e['by']; a = R.row(mid, e['t'] - 2); b = R.row(mid, e['t'] + 1)
        print('drop take', e, 'before', a[MHP], a[MEN], a[MCU], a[MMAX], 'after', b[MHP], b[MEN], b[MCU], b[MMAX])
