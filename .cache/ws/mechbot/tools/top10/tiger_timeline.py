# Compact timeline of one named mech in each recorded showdown (our own analysis; read-only).
import gzip, json, sys, math, collections
path, tname = sys.argv[1], sys.argv[2]
step = float(sys.argv[3]) if len(sys.argv) > 3 else 2.0
tmax = float(sys.argv[4]) if len(sys.argv) > 4 else 60.0
only = set(int(x) for x in sys.argv[5].split(',')) if len(sys.argv) > 5 else None
data = json.load(gzip.open(path, 'rt'))
WK = ["gun", "mortar", "laser", "lightning"]
def ang(a, b):
    return (a - b + math.pi) % (2 * math.pi) - math.pi
for mi, m in enumerate(data):
    if only and mi not in only: continue
    names = {x['id']: x['name'] for x in m['hdr']['mechs']}
    ids = [i for i, n in names.items() if n == tname]
    if not ids: continue
    me = ids[0]
    frames = m['frames']
    print(f"=== {tname} match {mi} id {me} spawn {m['hdr']['mechs'][me]['spawn']}")
    nxt = 0.0
    prev = None
    dealt = collections.Counter(); taken = collections.Counter(); fired = 0
    for fr in frames:
        t = fr['t'] / 20.0
        P = {r[0]: r for r in fr['m']}
        row = P.get(me)
        for e in fr.get('ev', []):
            if e['e'] == 'hit':
                if e['src'] == me: dealt[names.get(e['dst'], 'crate' if e['dst'] >= 1000 else 'drone')[:10]] += e['amt']
                if e['dst'] == me: taken[names.get(e['src'], 'drone')[:10] + '/' + e['w'][:3]] += e['amt']
            if e['e'] == 'fire' and e['id'] == me: fired += 1
            if e['e'] == 'death' and e['id'] == me:
                print(f"   t={t:6.1f} DEATH by {names.get(e.get('by'), e.get('by'))}")
        if row is None or row[6] <= 0:
            continue
        if t >= nxt:
            sp = None
            if prev is not None and t > prev[0]:
                sp = math.hypot(row[1] - prev[1][1], row[2] - prev[1][2]) / (t - prev[0])
            # nearest mech and the mech closest to the aim line
            best = None; aimed = None
            for oid, o in P.items():
                if oid == me or o[6] <= 0: continue
                d = math.hypot(o[1] - row[1], o[2] - row[2])
                brg = math.atan2(o[2] - row[2], o[1] - row[1])
                off = abs(ang(row[4], brg))
                if best is None or d < best[0]: best = (d, names[oid], off)
                if off < 0.15 and (aimed is None or d < aimed[0]): aimed = (d, names[oid])
            fl = row[8]
            print(f"   t={t:6.1f} hp {row[6]/max(1,row[10]):.2f} en {row[7]:3.0f} spd {sp if sp is None else round(sp,1)} {'B' if fl&2 else '-'}{'A' if not fl&1 else '-'}{'C' if fl&4 else '-'} cubes {row[9]} w {WK[row[11]] if row[11]>=0 else '-'}/{WK[row[12]] if row[12]>=0 else '-'} near {best and (round(best[0]), best[1][:12], round(best[2],2))} aim_on {aimed and (round(aimed[0]), aimed[1][:12])} fired {fired} dealt {dict(dealt)} taken {dict(taken)}")
            dealt.clear(); taken.clear(); fired = 0
            nxt = t + step
            prev = (t, row)
        if t > tmax: break
