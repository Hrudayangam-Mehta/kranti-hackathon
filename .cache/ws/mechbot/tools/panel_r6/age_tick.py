"""Panel R6 I/O: which sim tick does `age` 0.1 / 0.05 name? Kit stream (current build).
For every enemy gun bullet listed in an obs whose shooter is listed too, back-trace the bullet to the shooter axis:
travel = distance from the muzzle point (feet + 7 m on the axis) along the bullet line. A bullet fired on the first tick
after the previous decision (tick N+1 of the window N..N+2) is 3 + 2 x 12.6 = 28.2 m out, one fired on tick N+2 is 15.6 m.
Compare with the gun sound ages of the same obs. stdlib; python3 -I."""
import gzip, json, math, os, collections
HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.dirname(os.path.dirname(HERE))
msgs = [json.loads(l) for l in gzip.open(os.path.join(P, 'kit', 'check', 'stream.jsonl.gz'), 'rt') if l.strip()]
obs = [m for m in msgs if m['type'] == 'obs']
first = {}
rows = collections.Counter()
for k, o in enumerate(obs):
    mechs = {m['id']: m for m in o['mechs'] if m['kind'] == 'mech'}
    for pr in o['projectiles']:
        if pr['kind'] != 'gun' or pr['id'] in first: continue
        first[pr['id']] = k
        best = None
        for m in mechs.values():
            mx, my, mz = m['pos'][0], m['pos'][1], m['pos'][2] + 7
            dx, dy, dz = pr['pos'][0] - mx, pr['pos'][1] - my, pr['pos'][2] - mz
            sp = math.sqrt(sum(v * v for v in pr['vel']))
            along = (dx * pr['vel'][0] + dy * pr['vel'][1] + dz * pr['vel'][2]) / sp
            off = math.sqrt(max(0, dx * dx + dy * dy + dz * dz - along * along))
            if off < 3 and along > 0 and (best is None or along < best[0]): best = (along, m['id'], off)
        if best:
            ages = sorted(s['age'] for s in o['sounds'] if s['kind'] == 'gun')
            print(f"tick {o['tick']} bullet {pr['id']} shooter {best[1]} travel {best[0]:.1f} m (off-axis {best[2]:.2f}); gun sound ages {ages}")
