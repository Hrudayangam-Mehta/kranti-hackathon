"""Section 5: roofs / bridges: time share, how they get up, what they do there, shots at roof targets."""
import sys, os, math, collections, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
R = Replay(); W = World()
G = json.load(open(os.path.join(OUT, 'gunshots.json')))
TYPES = ['expert', 'hard', 'medium', 'brawler', 'sniper', 'thirdparty', 'farmer']
# per frame: height above terrain; support kind
H = {}
tot = collections.Counter(); roof = collections.Counter(); air = collections.Counter()
roof_frames = collections.defaultdict(list)
for mid in R.ids:
    for k, r in enumerate(R.m[mid]):
        if not r: continue
        g = W.ground(r[MX], r[MY]); h = r[MZ] - g
        H[(mid, k)] = h
        ty = R.names[mid]
        tot[ty] += 1; tot[mid] += 1
        if r[MFL] & 1:
            if h > 3.0:
                roof[ty] += 1; roof[mid] += 1
                kind, sz, err = W.support(r[MX], r[MY], r[MZ])
                roof_frames[mid].append((k, h, kind))
        else:
            air[ty] += 1
print('## share of alive time grounded more than 3 m above terrain (roof / bridge / stadium deck)')
rows = []
for ty in TYPES:
    rows.append([ty, tot[ty] / 10.0, roof[ty] / 10.0, 100.0 * roof[ty] / tot[ty], 100.0 * air[ty] / tot[ty]])
rows.append(['ALL', sum(tot[t] for t in TYPES) / 10.0, sum(roof[t] for t in TYPES) / 10.0, 100.0 * sum(roof[t] for t in TYPES) / sum(tot[t] for t in TYPES), 100.0 * sum(air[t] for t in TYPES) / sum(tot[t] for t in TYPES)])
print(table(['type', 'alive s', 'roof s', '% on roof', '% airborne'], rows))
print('per mech roof seconds:', {mid: round(roof[mid] / 10.0, 1) for mid in R.ids if roof[mid]})
# roof visits (contiguous episodes allowing gaps <=1 s)
visits = []
for mid, lst in roof_frames.items():
    cur = None
    for (k, h, kind) in lst:
        if cur and k - cur['k1'] <= 10:
            cur['k1'] = k; cur['hs'].append(h); cur['kinds'][kind] += 1
        else:
            cur = {'mid': mid, 'k0': k, 'k1': k, 'hs': [h], 'kinds': collections.Counter({kind: 1})}
            visits.append(cur)
crate_pos = {c['id']: c['pos'] for c in R.hdr['crates']}
pick_pos = {p['id']: p['pos'] for p in R.hdr['pickups']}
print('\nroof visits (>= 0.5 s):')
rows = []
for v in visits:
    dur = (v['k1'] - v['k0'] + 1) / 10.0
    if dur < 0.5: continue
    mid = v['mid']; t0 = R.ticks[v['k0']]; t1 = R.ticks[v['k1']]
    r0 = R.m[mid][v['k0']]
    # how did it get up: look back for the take-off point (last grounded frame with h<=3)
    k = v['k0'] - 1; jet = 0; e_top = r0[MEN]
    while k > 0 and R.m[mid][k] and not (R.m[mid][k][MFL] & 1):
        jet += 1 if R.m[mid][k][MFL] & 2 else 0; k -= 1
    rs = R.m[mid][k] if k >= 0 else None
    take_h = H.get((mid, k)); climb = r0[MZ] - rs[MZ] if rs else None; e_used = (rs[MEN] - e_top) if rs else None
    hd = math.hypot(r0[MX] - rs[MX], r0[MY] - rs[MY]) if rs else None
    shots = [o for o in G if o['s'] == mid and t0 <= o['tf'] <= t1]
    took = [e for e in R.events if e['e'] == 'weapon' and e['op'] == 'take' and e['by'] == mid and t0 <= e['t'] <= t1]
    cubes = [e for e in R.events if e['e'] == 'pickup' and e['by'] == mid and t0 <= e['t'] <= t1]
    crates = [e for e in R.events if e['e'] == 'crate' and e['by'] == mid and t0 <= e['t'] <= t1]
    dmg = sum(h['amt'] for h in R.events if h['e'] == 'hit' and h['dst'] == mid and h['w'] != 'zone' and t0 <= h['t'] <= t1)
    # nearest roof crate/pickup at arrival
    near = min([math.dist(r0[1:4], p) for p in list(crate_pos.values()) + list(pick_pos.values()) if p[2] - W.ground(p[0], p[1]) > 3] or [999])
    rows.append([mid, R.names[mid], t0 * TICK, dur, median(v['hs']), v['kinds'].most_common(1)[0][0], '%.1f' % climb if climb is not None else '?', '%.0f' % hd if hd is not None else '?', '%d' % e_used if e_used is not None else '?',
                 len(shots), sum(1 for o in shots if o['tgt'] is not None and o['tgt'] < 100), len(took), len(cubes), len(crates), dmg, near])
print(table(['mech', 'type', 't (s)', 'duration s', 'median height above terrain', 'surface', 'climb m from take-off', 'horiz m', 'energy used', 'gun shots', '..at mechs', 'weapons taken', 'cubes', 'crates killed', 'dmg taken', 'dist to nearest roof loot at arrival'], rows))
hs = [h for v in visits for h in v['hs']]
print('roof height above terrain: p10 %.1f p50 %.1f p90 %.1f max %.1f' % (pct(hs, .1), pct(hs, .5), pct(hs, .9), max(hs)))
# roof loot: how much roof loot existed and how much was taken
rc = [c for c in R.hdr['crates'] if c['pos'][2] - W.ground(c['pos'][0], c['pos'][1]) > 3]
rp = [p for p in R.hdr['pickups'] if p['pos'][2] - W.ground(p['pos'][0], p['pos'][1]) > 3]
dead_cr = {e['id'] for e in R.events if e['e'] == 'crate'}; taken = {e['id'] for e in R.events if e['e'] == 'weapon' and e['op'] == 'take'}
print('roof crates: %d of %d (destroyed: %d) ; roof weapon pickups: %d of %d (taken: %d) ; ground crates destroyed %d of %d ; ground pickups taken %d of %d' % (len(rc), len(R.hdr['crates']), sum(1 for c in rc if c['id'] in dead_cr), len(rp), len(R.hdr['pickups']), sum(1 for p in rp if p['id'] in taken), sum(1 for c in R.hdr['crates'] if c['id'] in dead_cr and c not in rc), len(R.hdr['crates']) - len(rc), sum(1 for p in R.hdr['pickups'] if p['id'] in taken and p not in rp), len(R.hdr['pickups']) - len(rp)))
print('roof crate heights above terrain:', sorted(round(c['pos'][2] - W.ground(c['pos'][0], c['pos'][1]), 1) for c in rc))
print('roof pickup heights above terrain:', sorted(round(p['pos'][2] - W.ground(p['pos'][0], p['pos'][1]), 1) for p in rp))
# shots at roof crates from the ground
rcid = {c['id'] for c in rc}
sh = [o for o in G if o['tgt'] in rcid]
print('gun shots at roof crates: %d by %s' % (len(sh), dict(collections.Counter((o['s'], o['type']) for o in sh))))
# shots at mechs that are on roofs / much higher
print('\n## shots at elevated targets (target feet more than 3 m above its terrain and grounded = on a roof)')
mm = [o for o in G if o['tgt'] is not None and o['tgt'] < 100]
def on_roof(mid, tick):
    r = R.row(mid, tick)
    return r and (r[MFL] & 1) and r[MZ] - W.ground(r[MX], r[MY]) > 3
up = [o for o in mm if on_roof(o['tgt'], o['tf'] - 1) and not on_roof(o['s'], o['tf'] - 1)]
dn = [o for o in mm if on_roof(o['s'], o['tf'] - 1) and not on_roof(o['tgt'], o['tf'] - 1)]
print('ground shooter -> roof target: %d shots, %d hits (%.0f%%), blocked by geometry %d, median range %.0f' % (len(up), sum(1 for o in up if o['hit']), 100 * sum(1 for o in up if o['hit']) / max(1, len(up)), sum(1 for o in up if o['blocked']), median([o['rng'] for o in up]) if up else float('nan')))
print('roof shooter -> ground target: %d shots, %d hits (%.0f%%), blocked %d, median range %.0f' % (len(dn), sum(1 for o in dn if o['hit']), 100 * sum(1 for o in dn if o['hit']) / max(1, len(dn)), sum(1 for o in dn if o['blocked']), median([o['rng'] for o in dn]) if dn else float('nan')))
print('  by shooter (ground->roof):', dict(collections.Counter((o['s'], o['tgt']) for o in up)), ' (roof->ground):', dict(collections.Counter((o['s'], o['tgt']) for o in dn)))
# height difference effect in general
rows = []
for lo, hi in ((-99, -6), (-6, -2), (-2, 2), (2, 6), (6, 99)):
    g = [o for o in mm if lo <= o['t_dz'] < hi and 40 <= o['rng'] < 130]
    rows.append(['%d..%d' % (lo, hi), len(g), sum(1 for o in g if o['hit']), 100.0 * sum(1 for o in g if o['hit']) / max(1, len(g)), 100.0 * sum(1 for o in g if o['blocked']) / max(1, len(g))])
print(table(['target feet z minus shooter feet z (m), range 40-130', 'shots', 'hits', 'hit %', '% blocked'], rows))
# time-on-roof while being a tracked target vs seen: enemies with geometric LOS to roof mech vs to ground mechs
dump('roofs.json', {'visits': rows})
