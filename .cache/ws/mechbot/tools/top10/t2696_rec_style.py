# Style fingerprint of named mechs in recorded showdowns (data only): torso turn in first 2 s, sweep amplitude,
# boost share, speed, nearest-mech distance at own gun fire, first-hit timing, weapon events.
import gzip, json, sys, math, statistics as st
data = json.load(gzip.open(sys.argv[1], 'rt'))
names_want = sys.argv[2].split(',')
def ang(a): return (a + math.pi) % (2*math.pi) - math.pi
for mi, m in enumerate(data):
    hdr = m['hdr']; names = {mm['id']: mm['name'] for mm in hdr['mechs']}
    for nm in names_want:
        ids = [i for i, n in names.items() if n == nm]
        if not ids: continue
        i = ids[0]
        rows = []
        for f in m['frames']:
            for r in f['m']:
                if r[0] == i: rows.append((f['t']/20.0, r))
        alive = [(t, r) for t, r in rows if r[6] > 0]
        if len(alive) < 5: continue
        turn2 = sum(abs(ang(alive[k+1][1][4]-alive[k][1][4])) for k in range(len(alive)-1) if alive[k][0] < 2.0)
        boost = sum(1 for t, r in alive if r[8] & 2) / len(alive)
        sp = []
        for k in range(len(alive)-1):
            dt = alive[k+1][0]-alive[k][0]
            if dt > 0: sp.append(math.hypot(alive[k+1][1][1]-alive[k][1][1], alive[k+1][1][2]-alive[k][1][2])/dt)
        still = sum(1 for s in sp if s < 1) / max(1, len(sp))
        # heading vs aim offset while moving
        offs = []
        for k in range(len(alive)-1):
            dx = alive[k+1][1][1]-alive[k][1][1]; dy = alive[k+1][1][2]-alive[k][1][2]
            if math.hypot(dx, dy) > 0.5:
                offs.append(abs(ang(alive[k][1][4]-math.atan2(dy, dx))))
        # gun fire distances to nearest live mech
        pos = {}
        firesd = []
        fr_by_t = {f['t']: f for f in m['frames']}
        for f in m['frames']:
            for e in f.get('ev', []):
                if e.get('e') == 'fire' and e.get('id') == i and e.get('w', 0) == 0:
                    me_ = [r for r in f['m'] if r[0] == i]
                    if not me_: continue
                    me_ = me_[0]
                    ds = [math.hypot(r[1]-me_[1], r[2]-me_[2]) for r in f['m'] if r[0] != i and r[6] > 0]
                    if ds: firesd.append(min(ds))
        ups = [e.get('up') for f in m['frames'] for e in f.get('ev', []) if e.get('e') == 'upgrade' and e.get('id') == i]
        wev = [(round(e['t']/20.0,1), e.get('op'), e.get('kind')) for f in m['frames'] for e in f.get('ev', []) if e.get('e') == 'weapon' and e.get('by') == i]
        life = alive[-1][0]
        print(f"m{mi} {nm:12s} life {life:6.1f}s turn<2s {turn2:4.1f} rad boost {boost:.2f} still {still:.2f} "
              f"aim-vs-heading med {st.median(offs) if offs else float('nan'):.2f} rad  gun-fire nearest med {st.median(firesd) if firesd else float('nan'):.0f} m (n={len(firesd)})")
        print(f"      weapons {wev[:6]} upgrades {ups}")
