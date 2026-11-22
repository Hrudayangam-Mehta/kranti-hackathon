"""Panel R2 (placement/behaviour): measurements on the official house-bot FFA replay.
Run: python3 -I replay_placement.py   (stdlib only; reads P/replay/mech16.jsonl.gz)
ONE match, older balance: ratios and orderings are indicative only.
"""
import gzip, json, math, os, statistics as st
HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.dirname(os.path.dirname(HERE))
with gzip.open(os.path.join(P, 'replay', 'mech16.jsonl.gz'), 'rt') as f:
    L = [json.loads(l) for l in f]
hdr, res, frames = L[0], L[-1], L[1:-1]
names = {m['id']: m['name'] for m in hdr['mechs']}
resm = {m['id']: m for m in res['mechs']}
TICK = 0.05
# per-frame rows
rows = {i: {} for i in names}
for fr in frames:
    for r in fr['m']:
        rows[r[0]][fr['t']] = r
ticks = [fr['t'] for fr in frames]
def row(i, t):
    t = t - (t % 2)
    while t >= 0 and t not in rows[i]:
        t -= 2
    return rows[i].get(t)
ev = [e for fr in frames for e in fr.get('ev', [])]
hits = [e for e in ev if e['e'] == 'hit' and e.get('src') is not None and e['src'] < 100 and e['dst'] < 100]   # mech on mech
zone_hits = [e for e in ev if e['e'] == 'hit' and e.get('src') is None]
deaths = sorted([e for e in ev if e['e'] == 'death' and e['id'] < 100], key=lambda e: e['t'])
death_t = {e['id']: e['t'] for e in deaths}
end_t = res['ticks']
alive_t = {i: death_t.get(i, end_t) * TICK for i in names}

print('== deaths ==')
alive = 16
for e in deaths:
    i = e['id']; k = e.get('by')
    att = {}
    for h in hits:
        if h['dst'] == i and e['t'] - 200 <= h['t'] <= e['t']:
            att[h['src']] = att.get(h['src'], 0) + h['amt']
    kr = row(k, e['t']) if k is not None and k < 100 else None
    print(f"t={e['t']*TICK:6.1f} alive_before={alive:2d} id={i:2d} {names[i]:10s} place={resm[i]['place']:2d} by={k} "
          f"killer_hp={'%.2f' % (kr[6]/kr[10]) if kr else 'NA'} attackers_last10s={len(att)} cause={resm[i].get('killed_with')}")
    alive -= 1
gaps = [ (deaths[n+1]['t']-deaths[n]['t'])*TICK for n in range(len(deaths)-1)]
print('death times', [round(e['t']*TICK,1) for e in deaths])

# aggression metrics
print('\n== per-bot aggression vs place ==')
met = {}
for i in names:
    dealt = [h for h in hits if h['src'] == i]
    taken = [h for h in hits if h['dst'] == i]
    T = alive_t[i]
    first_dealt = min([h['t'] for h in dealt], default=None)
    first_taken = min([h['t'] for h in taken], default=None)
    # combat seconds: union of 5 s windows after any mech damage dealt/taken
    marks = sorted([h['t'] for h in dealt + taken])
    comb = 0; cur_s = None; cur_e = None
    for t in marks:
        if cur_e is None or t > cur_e:
            if cur_e is not None: comb += cur_e - cur_s
            cur_s = t; cur_e = t + 100
        else:
            cur_e = t + 100
    if cur_e is not None: comb += min(cur_e, death_t.get(i, end_t)) - cur_s
    met[i] = dict(place=resm[i]['place'], name=names[i], T=T, dealt=sum(h['amt'] for h in dealt), taken=sum(h['amt'] for h in taken),
                  first_dealt=(first_dealt or 0) * TICK if first_dealt else None, first_taken=(first_taken or 0) * TICK if first_taken else None,
                  comb_frac=comb * TICK / T, opp=len(set(h['dst'] for h in dealt)), kills=resm[i]['kills'], cubes=resm[i]['cubes_max'])
for i in sorted(met, key=lambda i: met[i]['place']):
    m = met[i]
    print(f"place {m['place']:2d} {m['name']:10s} alive {m['T']:6.1f}s dealt {m['dealt']:5.0f} ({m['dealt']/m['T']:5.1f}/s) taken {m['taken']:5.0f} "
          f"first_dealt {m['first_dealt']} first_taken {m['first_taken']} combat_frac {m['comb_frac']:.2f} opponents {m['opp']} kills {m['kills']} cubes {m['cubes']}")
def spearman(xs, ys):
    def rk(v):
        o = sorted(range(len(v)), key=lambda k: v[k]); r = [0] * len(v)
        j = 0
        while j < len(o):
            k = j
            while k + 1 < len(o) and v[o[k + 1]] == v[o[j]]: k += 1
            for q in range(j, k + 1): r[o[q]] = (j + k) / 2 + 1
            j = k + 1
        return r
    rx, ry = rk(xs), rk(ys); mx, my = st.mean(rx), st.mean(ry)
    num = sum((a - mx) * (b - my) for a, b in zip(rx, ry)); den = math.sqrt(sum((a - mx) ** 2 for a in rx) * sum((b - my) ** 2 for b in ry))
    return num / den if den else 0
ids = list(met)
sc = [16 - met[i]['place'] for i in ids]
for key, fn in [('damage dealt per alive s', lambda m: m['dealt'] / m['T']), ('combat fraction of alive time', lambda m: m['comb_frac']),
                ('time of first damage dealt', lambda m: m['first_dealt'] if m['first_dealt'] is not None else 999),
                ('time first damaged', lambda m: m['first_taken'] if m['first_taken'] is not None else 999),
                ('damage taken per alive s', lambda m: m['taken'] / m['T']), ('kills', lambda m: m['kills']), ('max cubes', lambda m: m['cubes']),
                ('dealt/taken ratio', lambda m: m['dealt'] / max(1, m['taken']))]:
    print(f"spearman(score, {key}) = {spearman(sc, [fn(met[i]) for i in ids]):+.2f}")

# pairwise engagements: hits between i and j with gaps < 8 s
print('\n== engagements (pair, gap<8 s) ==')
pair = {}
for h in sorted(hits, key=lambda h: h['t']):
    k = (min(h['src'], h['dst']), max(h['src'], h['dst']))
    pair.setdefault(k, []).append(h)
engs = []
for k, hs in pair.items():
    cur = [hs[0]]
    for h in hs[1:]:
        if h['t'] - cur[-1]['t'] > 160:
            engs.append(cur); cur = [h]
        else: cur.append(h)
    engs.append(cur)
stats = dict(n=0, init_died=0, resp_died=0, both_survive=0, third=0, init_dmg=0, resp_dmg=0)
tp_delay = []; dur = []; init_first_unanswered = []
init_hp_adv = []
rows_out = []
for e in engs:
    if sum(h['amt'] for h in e) < 135: continue    # ignore stray hits (<3 rounds)
    a = e[0]['src']; b = e[0]['dst']; t0, t1 = e[0]['t'], e[-1]['t']
    stats['n'] += 1
    da = sum(h['amt'] for h in e if h['src'] == a); db = sum(h['amt'] for h in e if h['src'] == b)
    stats['init_dmg'] += da; stats['resp_dmg'] += db
    ad = a in death_t and t0 <= death_t[a] <= t1 + 200
    bd = b in death_t and t0 <= death_t[b] <= t1 + 200
    stats['init_died'] += ad; stats['resp_died'] += bd; stats['both_survive'] += (not ad and not bd)
    # third party: any other mech hitting a or b during [t0, t1+100]
    th = [h for h in hits if t0 <= h['t'] <= t1 + 100 and h['src'] not in (a, b) and h['dst'] in (a, b)]
    if th:
        stats['third'] += 1; tp_delay.append((min(h['t'] for h in th) - t0) * TICK)
    dur.append((t1 - t0) * TICK)
    # damage landed by initiator before the first return hit
    fr = min([h['t'] for h in e if h['src'] == b], default=None)
    init_first_unanswered.append(sum(h['amt'] for h in e if h['src'] == a and (fr is None or h['t'] < fr)))
    ra, rb = row(a, t0 - 2), row(b, t0 - 2)
    if ra and rb: init_hp_adv.append(ra[6] / ra[10] - rb[6] / rb[10])
    rows_out.append((t0 * TICK, a, b, da, db, ad, bd, bool(th)))
n = stats['n']
print(f"engagements >=135 dmg: {n}; initiator died {stats['init_died']} ({stats['init_died']/n:.0%}), responder died {stats['resp_died']} ({stats['resp_died']/n:.0%}), "
      f"neither {stats['both_survive']} ({stats['both_survive']/n:.0%})")
print(f"damage by initiator {stats['init_dmg']} vs responder {stats['resp_dmg']} (ratio {stats['init_dmg']/max(1,stats['resp_dmg']):.2f})")
print(f"third party hit a participant in {stats['third']}/{n} ({stats['third']/n:.0%}); delay s: median {st.median(tp_delay):.1f}, quartiles {st.quantiles(tp_delay, n=4)}")
print(f"engagement duration s: median {st.median(dur):.1f}, p75 {st.quantiles(dur, n=4)[2]:.1f}")
print(f"unanswered damage by the initiator before first return hit: median {st.median(init_first_unanswered):.0f}, mean {st.mean(init_first_unanswered):.0f}")
print(f"initiator hp-fraction advantage at start: median {st.median(init_hp_adv):+.2f}")
# third-party by alive count
def alive_at(t): return 16 - sum(1 for d in death_t.values() if d < t)
by = {}
for (t0, a, b, da, db, ad, bd, th) in rows_out:
    n_al = alive_at(t0 / TICK); key = '>=9' if n_al >= 9 else ('5-8' if n_al >= 5 else '<=4')
    s = by.setdefault(key, [0, 0, 0, 0]); s[0] += 1; s[1] += th; s[2] += ad; s[3] += bd
for k, s in by.items(): print(f"alive {k}: engagements {s[0]}, third-partied {s[1]} ({s[1]/s[0]:.0%}), initiator died {s[2]}, responder died {s[3]}")

# third-party entrants: mech c whose first hit on a/b came while a-b engagement was ongoing and who had not been hit by them before
print('\n== third-party entrants ==')
tp = dict(n=0, dealt=0, taken=0, died=0, killcredit=0)
for e in engs:
    if sum(h['amt'] for h in e) < 135: continue
    a = e[0]['src']; b = e[0]['dst']; t0, t1 = e[0]['t'], e[-1]['t']
    cs = {}
    for h in hits:
        if t0 + 20 <= h['t'] <= t1 + 100 and h['src'] not in (a, b) and h['dst'] in (a, b):
            cs.setdefault(h['src'], h['t'])
    for c, tc in cs.items():
        # skip if a or b had hit c in the 10 s before tc (c was already fighting them)
        if any(h['dst'] == c and h['src'] in (a, b) and tc - 200 <= h['t'] < tc for h in hits): continue
        tp['n'] += 1
        tp['dealt'] += sum(h['amt'] for h in hits if h['src'] == c and h['dst'] in (a, b) and tc <= h['t'] <= tc + 300)
        tp['taken'] += sum(h['amt'] for h in hits if h['dst'] == c and tc <= h['t'] <= tc + 300)
        tp['died'] += (c in death_t and tc <= death_t[c] <= tc + 300)
        tp['killcredit'] += sum(1 for d in deaths if d.get('by') == c and d['id'] in (a, b) and tc <= d['t'] <= tc + 300)
print(tp, 'dealt/taken in 15 s after entry = %.2f' % (tp['dealt'] / max(1, tp['taken'])))

# cubes / max hp over time
print('\n== cubes and max hp of the living over time ==')
for T in (60, 100, 150, 200):
    t = int(T / TICK); t -= t % 2
    cs = [rows[i][t][9] for i in names if t in rows[i]]
    mh = [rows[i][t][10] for i in names if t in rows[i]]
    if cs: print(f"t={T}: alive {len(cs)}, cubes median {st.median(cs)}, max {max(cs)}, max_hp median {st.median(mh)}, max {max(mh)}")
# non-combat deaths
print('\nzone/other deaths:', [(d['id'], names[d['id']], resm[d['id']].get('killed_with')) for d in deaths if d.get('by') is None or (d.get('by') or 0) >= 100])
npc_hits = sum(e['amt'] for e in ev if e['e'] == 'hit' and e.get('src') is not None and e['src'] >= 100 and e['dst'] < 100)
print('zone damage events:', len(zone_hits), 'total', sum(e['amt'] for e in zone_hits), 'victims', sorted(set(e['dst'] for e in zone_hits)))
print('total drone damage on mechs:', npc_hits, ' total mech-on-mech:', sum(h['amt'] for h in hits))
