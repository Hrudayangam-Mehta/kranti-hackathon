"""Section 6: loot economy: weapons, crates, cubes, drones, supply drops, upgrades."""
import sys, os, math, collections, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
R = Replay(); W = World()
G = json.load(open(os.path.join(OUT, 'gunshots.json')))
TYPES = ['expert', 'hard', 'medium', 'brawler', 'sniper', 'thirdparty', 'farmer']
ev = R.events
# ---- weapons
pk = {p['id']: dict(p) for p in R.hdr['pickups']}
for e in ev:
    if e['e'] == 'weapon' and e['op'] in ('spawn', 'drop') and 'at' in e:
        pk[e['id']] = {'id': e['id'], 'kind': e['kind'], 'pos': e['at'], 't': e['t']}
print('## weapon timeline per mech (t s: op kind [distance of that pickup from spawn point / nearest other pickup kind])')
spawn = {m['id']: m['spawn'] for m in R.hdr['mechs']}
rows = []
first = {}
for mid in R.ids:
    seq = []
    for e in ev:
        if e['e'] == 'weapon' and e.get('by') == mid:
            seq.append('%.1fs %s %s' % (e['t'] * TICK, e['op'], e['kind']))
            if e['op'] == 'take' and mid not in first: first[mid] = e
    death = R.death_tick.get(mid, R.end_tick) * TICK
    # nearest floor pickup at spawn (ground-level ones)
    gp = [(math.dist(spawn[mid][:2], p['pos'][:2]), p['kind'], p['pos'][2] - W.ground(p['pos'][0], p['pos'][1])) for p in R.hdr['pickups']]
    gp.sort()
    nearest_ground = [g for g in gp if g[2] < 3][0]
    rows.append([mid, R.names[mid], '%.1f' % death, '%.1f' % (first[mid]['t'] * TICK) if mid in first else 'never', first[mid]['kind'] if mid in first else '-', '%.0f m %s' % (nearest_ground[0], nearest_ground[1]),
                 '%.0f' % math.dist(spawn[mid][:2], pk[first[mid]['id']]['pos'][:2]) if mid in first else '-', '; '.join(seq)])
print(table(['mech', 'type', 'died at s', 'first weapon s', 'kind', 'nearest ground pickup at spawn', 'dist spawn->first taken', 'sequence'], rows))
# take decisions: at time of take, was it the nearest pickup? what kinds were nearer but skipped?
print('\nswaps (take with a drop on the same tick): kept/dropped')
for e in ev:
    if e['e'] == 'weapon' and e['op'] == 'drop':
        tk = [x for x in ev if x['e'] == 'weapon' and x['op'] == 'take' and x['by'] == e['by'] and x['t'] == e['t']]
        dt = R.death_tick.get(e['by'])
        print('   t=%.1f mech %d (%s) dropped %s %s' % (e['t'] * TICK, e['by'], R.names[e['by']], e['kind'], ('and took ' + tk[0]['kind']) if tk else ('(death drop)' if dt is not None and abs(dt - e['t']) <= 1 else '(plain drop)')))
kinds = collections.Counter((R.names[e['by']], e['kind']) for e in ev if e['e'] == 'weapon' and e['op'] == 'take')
print('takes by type and kind:', dict(kinds))
print('initial floor pickups by kind:', collections.Counter(p['kind'] for p in R.hdr['pickups']), ' total takes:', sum(kinds.values()))
# final loadout at death
print('loadout at death/end by type:', {ty: collections.Counter(tuple(R.result[m]['loadout']) for m in R.ids if R.names[m] == ty) for ty in TYPES})
# pickups passed by: for each mech, count ground pickups it came within 15 m of without taking, while having an empty slot
passed = collections.Counter(); passed_ex = []
for mid in R.ids:
    for pid, p in pk.items():
        if p['pos'][2] - W.ground(p['pos'][0], p['pos'][1]) > 3: continue
        takers = [e for e in ev if e['e'] == 'weapon' and e['op'] == 'take' and e['id'] == pid]
        taken_t = min([e['t'] for e in takers] or [10 ** 9])
        if any(e['by'] == mid for e in takers): continue      # its own approach to a pickup it then took
        t_spawn = p.get('t', 0)
        best = None
        for k in range(0, R.nf, 2):
            r = R.m[mid][k]
            if not r: continue
            t = R.ticks[k]
            if t < t_spawn or t >= taken_t: continue
            d = math.hypot(r[MX] - p['pos'][0], r[MY] - p['pos'][1])
            if d < 15 and (best is None or d < best[0]): best = (d, t, r[MS1])
        if best:
            passed[(R.names[mid], 'empty slot' if best[2] < 0 else 'had ' + R.wk[best[2]], p['kind'])] += 1
print('ground pickups approached within 15 m and never taken by that mech (type, slot-1 state, pickup kind): n')
print('   total with an empty slot: %d ; while holding another kind: %d ; while holding the same kind: %d' % (sum(v for k, v in passed.items() if k[1] == 'empty slot'), sum(v for k, v in passed.items() if k[1] != 'empty slot' and k[1] != 'had ' + k[2]), sum(v for k, v in passed.items() if k[1] == 'had ' + k[2])))
for k, v in sorted(passed.items()): print('   ', k, v)
# ---- crates
print('\n## crates')
cr = {c['id']: c['pos'] for c in R.hdr['crates']}
ch = collections.defaultdict(lambda: collections.Counter())
for h in ev:
    if h['e'] == 'hit' and 1000 <= h['dst'] < 5000: ch[h['src']][h['w']] += 1
rows = []
for ty in TYPES:
    ids = [m for m in R.ids if R.names[m] == ty]
    shots = sum(1 for o in G if o['type'] == ty and o['tgt'] is not None and o['tgt'] >= 1000)
    killed = sum(1 for e in ev if e['e'] == 'crate' and R.names.get(e['by']) == ty)
    alive_s = sum((R.death_tick.get(m, R.end_tick)) * TICK for m in ids)
    rows.append([ty, shots, sum(sum(ch[m].values()) for m in ids), killed, killed / alive_s * 60, shots / alive_s * 60])
print(table(['type', 'gun shots at crates', 'crate hits (all weapons)', 'crates destroyed', 'crates/min alive', 'crate shots/min alive'], rows))
# range at which they shoot crates
rg = [math.dist(o['ax'], cr[o['tgt']]) for o in G if o['tgt'] is not None and o['tgt'] >= 1000]
print('range when shooting crates: p10 %.0f p50 %.0f p90 %.0f max %.0f' % (pct(rg, .1), pct(rg, .5), pct(rg, .9), max(rg)))
# crate destroyed -> cube pickup delay & by whom
cube_at = {e['id']: e for e in ev if e['e'] == 'cube'}
pick = {e['id']: e for e in ev if e['e'] == 'pickup'}
src_of_cube = {}
crate_ev = [e for e in ev if e['e'] == 'crate']
death_ev = [e for e in ev if e['e'] == 'death']
for cid, c in cube_at.items():
    src = None
    for e in crate_ev:
        if e['t'] == c['t'] and math.dist(cr[e['id']][:2], c['at'][:2]) < 6: src = ('crate', e['by'], e['id'])
    if src is None:
        for e in death_ev:
            if abs(e['t'] - c['t']) <= 1:
                p = R.pos(e['id'], e['t'] - 1) or R.pos(e['id'], e['t'] - 2)
                if p and math.dist(p[:2], c['at'][:2]) < 8: src = ('npc' if e['id'] >= 100 else 'mech', e['by'], e['id'])
    src_of_cube[cid] = src
cs = collections.Counter(s[0] if s else 'unknown' for s in src_of_cube.values())
print('\n## cubes: spawned %d (%s) ; picked up %d' % (len(cube_at), dict(cs), len(pick)))
rows = []
for kind in ('crate', 'npc', 'mech'):
    ids = [c for c, s in src_of_cube.items() if s and s[0] == kind]
    pd = [(pick[c]['t'] - cube_at[c]['t']) * TICK for c in ids if c in pick]
    same = sum(1 for c in ids if c in pick and pick[c]['by'] == src_of_cube[c][1])
    rows.append([kind, len(ids), len(pd), 100.0 * len(pd) / max(1, len(ids)), median(pd) if pd else float('nan'), pct(pd, .9) if pd else float('nan'), same])
print(table(['cube source', 'cubes', 'picked up', '%', 'median delay s', 'p90 delay s', 'picked by the killer'], rows))
unp = [c for c in cube_at if c not in pick]
print('cubes never picked up: %d ; heights above terrain: %s' % (len(unp), sorted(round(cube_at[c]['at'][2] - W.ground(cube_at[c]['at'][0], cube_at[c]['at'][1]), 1) for c in unp)))
rows = []
for ty in TYPES:
    ids = [m for m in R.ids if R.names[m] == ty]
    rows.append([ty, sum(1 for e in pick.values() if R.names[e['by']] == ty), mean([R.result[m]['cubes_max'] for m in ids]), max(R.result[m]['cubes_max'] for m in ids), ', '.join('%d:%s' % (m, '+'.join(R.result[m]['upgrades']) or '-') for m in ids)])
print(table(['type', 'cube pickups', 'mean cubes_max', 'max', 'upgrades per mech'], rows))
print('upgrade picks overall:', collections.Counter(e['up'] for e in ev if e['e'] == 'upgrade').most_common())
# time from cube count hitting threshold to upgrade event
# ---- drones
print('\n## NPC drones')
rows = []
for ty in TYPES:
    ids = [m for m in R.ids if R.names[m] == ty]
    sh = sum(1 for o in G if o['type'] == ty and o['tgt'] is not None and 100 <= o['tgt'] < 1000)
    dealt = sum(h['amt'] for h in ev if h['e'] == 'hit' and h['src'] in ids and 100 <= h['dst'] < 1000)
    taken = sum(h['amt'] for h in ev if h['e'] == 'hit' and h['dst'] in ids and h['w'] == 'npc')
    kills = sum(1 for e in ev if e['e'] == 'death' and e['id'] >= 100 and e['by'] in ids)
    rows.append([ty, sh, dealt, kills, taken])
print(table(['type', 'gun shots at drones', 'damage dealt to drones', 'drones killed', 'damage taken from drones'], rows))
for e in ev:
    if e['e'] == 'death' and e['id'] >= 100:
        nid = e['id']; by = e['by']
        first_hit = min(h['t'] for h in ev if h['e'] == 'hit' and h['dst'] == nid)
        taken = sum(h['amt'] for h in ev if h['e'] == 'hit' and h['w'] == 'npc' and h['dst'] == by and first_hit - 100 <= h['t'] <= e['t'] + 40)
        p0 = R.pos(by, first_hit); pn = R.pos(nid, first_hit)
        print('   drone %d killed by %d (%s) at %.1fs: fight lasted %.1f s, first-hit range %.0f m, killer took %.0f dmg from drones meanwhile' % (nid, by, R.names[by], e['t'] * TICK, (e['t'] - first_hit) * TICK, math.dist(p0, pn) if p0 and pn else -1, taken))
print('drones alive at end:', sorted(n for n in R.n if R.n[n][-1] is not None), ' homes distance from final zone centre:', {n: round(math.hypot(R.hdr['npcs'][n - 100]['spawn'][0] - 37.35, R.hdr['npcs'][n - 100]['spawn'][1] + 89.64)) for n in R.n if R.n[n][-1] is not None})
# who gets hit by drones without attacking them (aggro on passers-by)
agg = collections.Counter()
for h in ev:
    if h['e'] == 'hit' and h['w'] == 'npc':
        attacked = any(x['e'] == 'hit' and x['src'] == h['dst'] and x['dst'] == h['src'] and h['t'] - 200 <= x['t'] <= h['t'] for x in ev)
        agg['victim had attacked that drone in the last 10 s' if attacked else 'victim had NOT attacked that drone'] += 1
print('drone hits on mechs:', dict(agg))
# ---- supply drops
print('\n## supply drops')
for d in R.hdr['drops']:
    did = d['id']
    evs = [e for e in ev if e['e'] == 'drop' and e['id'] == did]
    print(' drop %d at (%.0f,%.0f) called %ds lands %ds ; events: %s' % (did, d['pos'][0], d['pos'][1], d['call_t'], d['land_t'], [(e['op'], e['t'] * TICK, e.get('by')) for e in evs]))
    # who approaches: min distance of each alive mech to the drop between call and take/end, and time of arrival within 8 m
    t_call = d['call_t'] * 20; t_take = min([e['t'] for e in evs if e['op'] == 'take'] or [R.end_tick])
    if t_call > R.end_tick: print('   (match ended before call)'); continue
    info = []
    for mid in R.ids:
        best = (1e9, None); first_in = None; d_call = None
        for k in range(R.fi(t_call), R.fi(t_take) + 1):
            r = R.m[mid][k]
            if not r: continue
            dd = math.hypot(r[MX] - d['pos'][0], r[MY] - d['pos'][1])
            if d_call is None: d_call = dd
            if dd < best[0]: best = (dd, R.ticks[k])
            if dd <= 8 and first_in is None: first_in = R.ticks[k]
        if d_call is not None:
            info.append((mid, R.names[mid], round(d_call), round(best[0]), round(best[1] * TICK, 1) if best[1] else None, round(first_in * TICK, 1) if first_in else None))
    info.sort(key=lambda x: x[3])
    print('   alive at call: (mech, type, dist at call, min dist until take, at s, first inside ring s)')
    for i in info: print('     ', i)
    # states from frames
    st = collections.Counter()
    for fr in R.frames:
        for dd in fr.get('d', []):
            if dd[0] == did: st[(dd[1], dd[2])] += 1
    print('   frame states (state, holder): frames', dict(st))
dump('loot.json', {'first_weapon': {m: (first[m]['t'] * TICK if m in first else None) for m in R.ids}})
