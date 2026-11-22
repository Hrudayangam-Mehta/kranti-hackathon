"""Section 9: death forensics (10 s before each mech death)."""
import sys, os, math, collections, json, bisect
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
R = Replay(); W = World()
G = json.load(open(os.path.join(OUT, 'gunshots.json')))
hits = [e for e in R.events if e['e'] == 'hit']
gun_tg = collections.defaultdict(list)
for o in G:
    if o['tgt'] is not None and o['tgt'] < 100: gun_tg[o['s']].append((o['tf'], o['tgt']))
deaths = sorted([e for e in R.events if e['e'] == 'death' and e['id'] < 100], key=lambda e: e['t'])
rows = []; out = []
tot_w = collections.Counter(); kill_w = collections.Counter()
for e in deaths:
    V = e['id']; td = e['t']; t0 = td - 200
    hs = [h for h in hits if h['dst'] == V and t0 <= h['t'] <= td]
    dmg_by = collections.Counter(); dmg_w = collections.Counter(); rear_d = 0; rear_n = 0; n = 0
    dists = collections.defaultdict(list)
    for h in hs:
        src = h['src'] if h['src'] is not None else 'zone'
        dmg_by[src] += h['amt']; dmg_w[h['w']] += h['amt']
        if h['w'] != 'zone':
            n += 1
            if h.get('rear'): rear_d += h['amt']; rear_n += 1
            if isinstance(src, int):
                pv = R.pos(V, h['t'] - 1) or R.pos(V, h['t'] - 2); pa = R.pos(src, h['t'] - 1) or R.pos(src, h['t'] - 2)
                if pv and pa: dists[src].append(math.dist(pv, pa))
    tot = sum(dmg_by.values())
    for w, a in dmg_w.items(): tot_w[w] += a
    last = hs[-1] if hs else None
    kill_w[R.result[V]['killed_with']] += 1
    mech_att = [s for s in dmg_by if isinstance(s, int) and s < 100]
    r10 = R.row(V, t0) or R.m[V][0]
    rl = R.row(V, td - 2) or R.row(V, td - 4)
    # cover: distance to nearest wall at death and mean over last 10 s
    wd = []
    for t in range(max(0, t0), td, 20):
        p = R.pos(V, t)
        if p: wd.append(W.wall_dist(p[0], p[1], p[2]))
    # victim's own targets in the window
    vt = collections.Counter(tg for (t, tg) in gun_tg.get(V, []) if t0 <= t <= td)
    main = max(mech_att, key=lambda s: dmg_by[s]) if mech_att else None
    third = [s for s in mech_att if s not in vt]
    # time from first damage in an unbroken sequence (gaps < 5 s) to death = time-to-kill
    seq = [h['t'] for h in hits if h['dst'] == V and h['t'] <= td and h['w'] != 'zone']
    start = td
    for t in reversed(seq):
        if start - t <= 100: start = t
        else: break
    hp_start = (R.row(V, start - 2) or R.m[V][0])[MHP]
    air = sum(1 for t in range(max(0, t0), td, 2) if R.row(V, t) and not (R.row(V, t)[MFL] & 1)) / 100.0
    nearby = sum(1 for m in R.ids if m != V and R.pos(m, td - 2) and math.dist(R.pos(m, td - 2), R.pos(V, td - 2)) <= 150) if R.pos(V, td - 2) else 0
    rec = {'V': V, 'type': R.names[V], 't': td * TICK, 'place': R.result[V]['place'], 'killer': e['by'], 'killed_with': R.result[V]['killed_with'], 'n_att': len(mech_att),
           'dmg10': tot, 'by': {str(k): round(v) for k, v in dmg_by.items()}, 'by_w': {k: round(v) for k, v in dmg_w.items()}, 'rear_share_dmg': rear_d / tot if tot else 0, 'rear_share_hits': rear_n / n if n else 0,
           'hp_10s_before': r10[MHP], 'maxhp': rl[MMAX] if rl else None, 'dist_main': median(dists[main]) if main is not None and dists[main] else None, 'wall_at_death': wd[-1] if wd else None, 'wall_mean': mean(wd) if wd else None,
           'victim_targets': dict(vt), 'third_party_attackers': third, 'ttk_s': (td - start) * TICK, 'hp_at_fight_start': hp_start, 'air_share': air, 'mechs_within_150m': nearby, 'cubes': rl[MCU] if rl else None}
    out.append(rec)
    rows.append([V, R.names[V], '%.1f' % rec['t'], rec['place'], str(e['by']) + ' ' + (R.names[e['by']] if e['by'] is not None else 'zone'), rec['killed_with'], rec['n_att'], rec['dmg10'], ' '.join('%s:%d' % (k, v) for k, v in sorted(rec['by_w'].items(), key=lambda kv: -kv[1])),
                 ' '.join('%s:%d' % (k, v) for k, v in sorted(rec['by'].items(), key=lambda kv: -kv[1])), '%.0f' % rec['dist_main'] if rec['dist_main'] else '-', 100 * rec['rear_share_dmg'], rec['hp_10s_before'], '%.1f' % rec['ttk_s'], '%.0f' % rec['wall_at_death'] if rec['wall_at_death'] is not None else '-', '%.0f' % rec['wall_mean'] if rec['wall_mean'] is not None else '-', 100 * air, str(rec['victim_targets']), str(third)])
print(table(['victim', 'type', 't s', 'place', 'killer', 'weapon', '# mech attackers (10 s)', 'dmg taken in last 10 s', 'by weapon', 'by source', 'median dist to main attacker', '% dmg from rear', 'HP 10 s before', 'continuous-fight duration s', 'wall dist at death m', 'mean wall dist 10 s', '% airborne', "victim's gun targets (shots)", 'attackers the victim never shot at'], rows))
n = len(out)
print('\nsummary over %d mech deaths:' % n)
print('  killing blow weapon:', dict(kill_w))
tw = sum(tot_w.values()); print('  damage in the last 10 s by weapon:', {k: '%d (%.0f%%)' % (v, 100 * v / tw) for k, v in tot_w.most_common()})
print('  number of mech attackers in last 10 s:', sorted(collections.Counter(r['n_att'] for r in out).items()))
print('  deaths with >= 2 attackers: %d ; with an attacker the victim never shot back at: %d' % (sum(1 for r in out if r['n_att'] >= 2), sum(1 for r in out if r['third_party_attackers'])))
print('  rear damage share: mean %.0f%% ; deaths with >= 30%% rear damage: %d' % (100 * mean([r['rear_share_dmg'] for r in out]), sum(1 for r in out if r['rear_share_dmg'] >= 0.3)))
print('  median distance to main attacker: p25 %.0f p50 %.0f p75 %.0f' % tuple(pct([r['dist_main'] for r in out if r['dist_main']], q) for q in (.25, .5, .75)))
wds = [r['wall_at_death'] for r in out if r['wall_at_death'] is not None]
print('  wall distance at death: p25 %.0f p50 %.0f p75 %.0f ; in the open (> 20 m from any wall >= 4 m tall): %d of %d' % (pct(wds, .25), pct(wds, .5), pct(wds, .75), sum(1 for w in wds if w > 20), len(wds)))
print('  HP 10 s before death: median %.0f ; fight duration to death: median %.1f s (p25 %.1f p75 %.1f)' % (median([r['hp_10s_before'] for r in out]), median([r['ttk_s'] for r in out]), pct([r['ttk_s'] for r in out], .25), pct([r['ttk_s'] for r in out], .75)))
print('  airborne share in last 10 s: mean %.0f%%' % (100 * mean([r['air_share'] for r in out])))
# overall damage by weapon and rear share
tot = collections.Counter(); rear = collections.Counter(); cnt = collections.Counter()
for h in hits:
    if h['dst'] < 100:
        tot[h['w']] += h['amt']; cnt[h['w']] += 1
        if h.get('rear'): rear[h['w']] += h['amt']
print('\nall damage to mechs by weapon (whole match):')
print(table(['weapon', 'hits', 'damage', '% of total', '% of that from rear hits'], [[w, cnt[w], tot[w], 100 * tot[w] / sum(tot.values()), 100 * rear[w] / tot[w]] for w, _ in tot.most_common()]))
rh = sum(1 for h in hits if h['dst'] < 100 and h['w'] in ('gun', 'laser', 'lightning', 'mortar', 'npc') and h.get('rear')); ah = sum(1 for h in hits if h['dst'] < 100 and h['w'] in ('gun', 'laser', 'lightning', 'mortar', 'npc'))
print('rear hits: %d of %d weapon hits (%.0f%%)' % (rh, ah, 100 * rh / ah))
# kills by killer type and placement
print('kills / damage dealt / place by mech:', [(m, R.names[m], R.result[m]['kills'], R.result[m]['damage_dealt'], R.result[m]['place']) for m in sorted(R.ids, key=lambda m: R.result[m]['place'])])
dump('deaths.json', out)
