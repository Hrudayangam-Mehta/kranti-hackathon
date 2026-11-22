"""Loot geometry: where crate / drone / mech-death drops appear, who collects, when (replay mech16)."""
import sys, os, math, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'forensics'))
from common import Replay
R = Replay()
crate_pos = {c['id']: c['pos'] for c in R.hdr['crates']}
ev = R.events
cube_spawn = {e['id']: e for e in ev if e['e'] == 'cube'}
cube_pick = {e['id']: e for e in ev if e['e'] == 'pickup'}
wspawn = [e for e in ev if e['e'] == 'weapon' and e['op'] == 'spawn']
wtake = {e['id']: e for e in ev if e['e'] == 'weapon' and e['op'] == 'take'}
wdrop = [e for e in ev if e['e'] == 'weapon' and e['op'] == 'drop']
def d2(a, b): return math.hypot(a[0]-b[0], a[1]-b[1])
def mechs_near(tick, p, excl=()):
    out = []
    for i in R.ids:
        if i in excl: continue
        q = R.pos(i, tick)
        if q is None: continue
        if R.death_tick.get(i, 1e9) <= tick: continue
        out.append((d2(q, p), abs(q[2]-p[2]), i))
    return sorted(out)
print('== crates destroyed')
for e in [e for e in ev if e['e'] == 'crate']:
    cp = crate_pos[e['id']]; t = e['t']
    cubes = [c for c in cube_spawn.values() if c['t'] == t and d2(c['at'], cp) < 6]
    ws = [w for w in wspawn if w.get('src') == e['id']]
    shooter = R.pos(e['by'], t)
    near = mechs_near(t, cp)
    line = f"crate {e['id']} t={t*0.05:.2f} z={cp[2]:.1f} by={e['by']} shooter_d={d2(shooter,cp):.1f}"
    for c in cubes:
        pk = cube_pick.get(c['id'])
        off = (c['at'][0]-cp[0], c['at'][1]-cp[1], c['at'][2]-cp[2])
        line += f" | cube off=({off[0]:.2f},{off[1]:.2f},{off[2]:.2f})"
        if pk:
            pp = R.pos(pk['by'], pk['t'])
            line += f" picked by {pk['by']} after {(pk['t']-t)*0.05:.2f}s at d={d2(pp,c['at']):.2f} dz={pp[2]-c['at'][2]:.2f}"
        else: line += ' never picked'
    for w in ws:
        off = (w['at'][0]-cp[0], w['at'][1]-cp[1], w['at'][2]-cp[2])
        tk = wtake.get(w['id'])
        line += f" | weapon {w['kind']} off=({off[0]:.2f},{off[1]:.2f},{off[2]:.2f}) " + (f"taken by {tk['by']} after {(tk['t']-t)*0.05:.1f}s" if tk else 'never taken')
    line += f" | nearest at break: " + ', '.join(f"{i}:{d:.0f}m" for d, dz, i in near[:3])
    print(line)
print('== npc deaths (cube drops)')
npc_last = {}
for e in [e for e in ev if e['e'] == 'death' and e['id'] >= 100]:
    t = e['t']; np_ = R.pos(e['id'], t-1) or R.pos(e['id'], t-2)
    cubes = [c for c in cube_spawn.values() if abs(c['t']-t) <= 1 and np_ and d2(c['at'], np_) < 8]
    s = f"npc {e['id']} t={t*0.05:.2f} by={e['by']}"
    if np_:
        killer = R.pos(e['by'], t) if e['by'] is not None and e['by'] < 100 else None
        s += f" killer_d={d2(killer,np_):.1f}" if killer else ''
        for c in cubes:
            off = (c['at'][0]-np_[0], c['at'][1]-np_[1], c['at'][2]-np_[2])
            pk = cube_pick.get(c['id'])
            s += f" | cube off=({off[0]:.2f},{off[1]:.2f},{off[2]:.2f})" + (f" picked by {pk['by']} after {(pk['t']-t)*0.05:.1f}s" if pk else ' never')
        near = mechs_near(t, np_)
        s += ' | nearest: ' + ', '.join(f"{i}:{d:.0f}m" for d, dz, i in near[:3])
    print(s)
print('== mech deaths (cube + weapon drops)')
for e in [e for e in ev if e['e'] == 'death' and e['id'] < 100]:
    t = e['t']; mp = R.pos(e['id'], t-1) or R.pos(e['id'], t-2)
    row = R.row(e['id'], t-1)
    cubes = [c for c in cube_spawn.values() if abs(c['t']-t) <= 1 and mp and d2(c['at'], mp) < 15]
    ws = [w for w in wdrop if abs(w['t']-t) <= 1 and w['by'] == e['id']]
    offs = [d2(c['at'], mp) for c in cubes]
    picked = [cube_pick[c['id']] for c in cubes if c['id'] in cube_pick]
    s = f"mech {e['id']} t={t*0.05:.2f} by={e['by']} held_cubes={row[9] if row else '?'} dropped={len(cubes)} r_off max={max(offs) if offs else 0:.2f} dz={[round(c['at'][2]-mp[2],2) for c in cubes][:3]}"
    s += f" picked={len(picked)} by={sorted(set(p['by'] for p in picked))} delays={sorted(round((p['t']-t)*0.05,1) for p in picked)}"
    for w in ws:
        tk = wtake.get(w['id'])
        s += f" | weapon {w['kind']} off={d2(w['at'],mp):.2f} " + (f"taken by {tk['by']} after {(tk['t']-t)*0.05:.1f}s" if tk else 'never taken')
    if cubes:
        kp = R.pos(e['by'], t) if e['by'] is not None and e['by'] < 100 else None
        s += f" | killer_d={d2(kp,mp):.0f}" if kp else ''
    print(s)
# pickup geometry: distance of picker to cube at the pickup tick, and was anyone else closer (within 3.5)?
print('== cube pickup distances')
ds = []
for cid, pk in cube_pick.items():
    c = cube_spawn[cid]; pp = R.pos(pk['by'], pk['t']); pp0 = R.pos(pk['by'], pk['t']-1)
    ds.append((round(d2(pp, c['at']), 2), round(d2(pp0, c['at']), 2) if pp0 else None, round(pp[2]-c['at'][2], 2), pk['t']-c['t']))
ds.sort()
print('picker horiz dist at pickup tick (sorted):', [x[0] for x in ds])
print('prev tick:', sorted(x[1] for x in ds if x[1] is not None))
print('dz:', sorted(x[2] for x in ds))
print('spawn->pickup ticks min:', sorted(x[3] for x in ds)[:10])
