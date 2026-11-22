"""HP regen: which events reset the 5 s timer (taking damage, dealing to mech / npc / crate)?"""
import sys, os, math, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
R = Replay()
hits = [e for e in R.events if e['e'] == 'hit']
by_src = collections.defaultdict(list); by_dst = collections.defaultdict(list)
for h in hits:
    if h['src'] is not None and h['src'] < 100: by_src[h['src']].append(h)
    if h['dst'] < 100: by_dst[h['dst']].append(h)
zone_r = lambda tick: None
# regen frames: HP increase with unchanged max_hp
out = collections.Counter(); ex = collections.defaultdict(list)
for mid in R.ids:
    rows = R.m[mid]
    for k in range(1, R.nf):
        a, b = rows[k - 1], rows[k]
        if not a or not b or b[MMAX] != a[MMAX] or b[MCU] != a[MCU]: continue
        t = R.ticks[k]
        if b[MHP] <= a[MHP]: continue
        # regenerating during (t-2, t].  time since last events:
        def since(lst, pred):
            c = [h['t'] for h in lst if h['t'] <= t and pred(h)]
            return (t - max(c)) * TICK if c else 999
        s_take = since(by_dst[mid], lambda h: True)
        s_mech = since(by_src[mid], lambda h: h['dst'] < 100 and h['dst'] != mid)
        s_npc = since(by_src[mid], lambda h: 100 <= h['dst'] < 1000)
        s_crate = since(by_src[mid], lambda h: h['dst'] >= 1000)
        for name, s in (('take', s_take), ('deal_mech', s_mech), ('deal_npc', s_npc), ('deal_crate', s_crate)):
            if s < 4.9:
                out[name] += 1
                if len(ex[name]) < 6: ex[name].append((mid, t, round(s, 2), a[MHP], b[MHP]))
        out['regen_frames'] += 1
print(dict(out)); print(dict(ex))
# min observed delay since taking damage among regen frames
mins = collections.defaultdict(list)
for mid in R.ids:
    rows = R.m[mid]
    for k in range(1, R.nf):
        a, b = rows[k - 1], rows[k]
        if not a or not b or b[MMAX] != a[MMAX]: continue
        if b[MHP] > a[MHP]:
            t = R.ticks[k]
            c = [h['t'] for h in by_dst[mid] if h['t'] <= t]
            if c: mins[mid].append((t - max(c)) * TICK)
print('min delay since last damage taken at any regen frame, per mech:', {m: round(min(v), 2) for m, v in mins.items()})
# is regen suppressed for 5 s after dealing damage to a MECH?  count frames 0..5s after dealing to mech, >5 s after taking, hp<max: regen or not
c = collections.Counter()
for mid in R.ids:
    rows = R.m[mid]
    for k in range(1, R.nf):
        a, b = rows[k - 1], rows[k]
        if not a or not b or b[MMAX] != a[MMAX] or a[MHP] >= a[MMAX] - 1: continue
        t = R.ticks[k]
        tk = [h['t'] for h in by_dst[mid] if h['t'] <= t]
        if tk and (t - max(tk)) * TICK < 5.15: continue   # still in taken-delay
        dm = [h['t'] for h in by_src[mid] if h['t'] <= t and h['dst'] < 100 and h['dst'] != mid]
        dn = [h['t'] for h in by_src[mid] if h['t'] <= t and h['dst'] >= 100]
        recent_m = bool(dm) and (t - max(dm)) * TICK < 4.9
        recent_o = bool(dn) and (t - max(dn)) * TICK < 4.9
        c[('dealt_mech<5s' if recent_m else 'dealt_other<5s' if recent_o else 'quiet', 'regen' if b[MHP] > a[MHP] else 'no_regen')] += 1
print('frames with hp<max and >5.15 s since damage taken:', dict(c))
# finer: separate npc vs crate, exclude same-tick edge (0.1..(delay-0.1) s window), account for nanites
upg = collections.defaultdict(list)
for e in R.events:
    if e['e'] == 'upgrade': upg[e['id']].append((e['t'], e['up']))
c = collections.Counter()
for mid in R.ids:
    rows = R.m[mid]
    for k in range(1, R.nf):
        a, b = rows[k - 1], rows[k]
        if not a or not b or b[MMAX] != a[MMAX] or a[MHP] >= a[MMAX] - 1: continue
        t = R.ticks[k]
        nn = sum(1 for (tt, u) in upg[mid] if u == 'nanites' and tt < t)
        delay = 5.0 - 1.5 * nn
        tk = [h['t'] for h in by_dst[mid] if h['t'] <= t]
        if tk and (t - max(tk)) * TICK < delay + 0.15: continue
        def rec(pred):
            cc = [h['t'] for h in by_src[mid] if h['t'] <= t and pred(h)]
            return bool(cc) and 0.15 < (t - max(cc)) * TICK < delay - 0.15
        rm = rec(lambda h: h['dst'] < 100 and h['dst'] != mid)
        rn = rec(lambda h: 100 <= h['dst'] < 1000)
        rc = rec(lambda h: h['dst'] >= 1000)
        key = 'mech' if rm else 'npc' if rn else 'crate' if rc else 'quiet'
        c[(key, 'regen' if b[MHP] > a[MHP] else 'no_regen')] += 1
print('finer (damage-taken timer already expired; inside the would-be dealt-damage window):', dict(c))
