# Range at which named mechs fire their gun / start laser charges at other mechs, from recorded showdowns (read-only).
import gzip, json, sys, math, statistics as st, collections
path = sys.argv[1]; targets = sys.argv[2].split(',')
data = json.load(gzip.open(path, 'rt'))
def ang(a, b): return (a - b + math.pi) % (2 * math.pi) - math.pi
def q(v, p):
    v = sorted(v); return round(v[min(len(v) - 1, int(p * len(v)))]) if v else None
for tname in targets:
    allr = []; allc = []; perimg = collections.defaultdict(list); hp_at_break = []
    for mi, m in enumerate(data):
        names = {x['id']: x['name'] for x in m['hdr']['mechs']}
        ids = [i for i, n in names.items() if n == tname]
        if not ids: continue
        me = ids[0]; img = m['hdr']['bots'][me][-6:]
        rr = []; cc = []
        for fr in m['frames']:
            P = {r[0]: r for r in fr['m']}
            row = P.get(me)
            if row is None or row[6] <= 0: continue
            for e in fr.get('ev', []):
                if e.get('id') != me: continue
                if e['e'] in ('fire', 'charge'):
                    best = None
                    for oid, o in P.items():
                        if oid == me or o[6] <= 0: continue
                        d = math.hypot(o[1] - row[1], o[2] - row[2])
                        off = abs(ang(row[4], math.atan2(o[2] - row[2], o[1] - row[1])))
                        if off < max(0.08, math.atan2(6, d)) and (best is None or d < best): best = d
                    if best is not None:
                        (rr if e['e'] == 'fire' else cc).append(best)
        print(f"{tname} m{mi} img {img}: gun rounds at mechs n={len(rr)} min {q(rr,0)} p10 {q(rr,0.1)} med {q(rr,0.5)} p90 {q(rr,0.9)} max {q(rr,0.999)} | laser charges at mechs n={len(cc)} min {q(cc,0)} med {q(cc,0.5)} max {q(cc,0.999)}")
        allr += rr; allc += cc; perimg[img] += rr
    print(f"## {tname} all: gun n={len(allr)} p10 {q(allr,0.1)} med {q(allr,0.5)} p90 {q(allr,0.9)} max {q(allr,0.999)}; laser n={len(allc)} p10 {q(allc,0.1)} med {q(allc,0.5)} p90 {q(allc,0.9)} max {q(allc,0.999)}")
    for k, v in perimg.items(): print('   img', k, 'gun med', q(v, 0.5), 'p90', q(v, 0.9), 'max', q(v, 0.999), 'n', len(v))
