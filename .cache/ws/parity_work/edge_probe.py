import gzip, json, sys
replay, world = sys.argv[1], sys.argv[2]
b = json.load(open(world))['bounds']
mn = 1e9; n = 0; hist = {}
keys=None
with gzip.open(replay, 'rt') as f:
    for i, line in enumerate(f):
        try: d = json.loads(line)
        except Exception: continue
        if keys is None and isinstance(d, dict): keys = list(d.keys())[:12]
        def walk(o):
            global mn, n
            if isinstance(o, dict):
                p = o.get('pos')
                if isinstance(p, list) and len(p) == 3 and ('hp' in o) and ('aim' in o):
                    x, y = p[0], p[1]
                    db = min(x - b['minX'], b['maxX'] - x, y - b['minY'], b['maxY'] - y)
                    n += 1
                    k = int(db // 10) * 10
                    if k < 80: hist[k] = hist.get(k, 0) + 1
                    if db < mn: mn = db
                for v in o.values(): walk(v)
            elif isinstance(o, list):
                for v in o: walk(v)
        walk(d)
print('first keys', keys); print('samples', n, 'min dist to bounds', round(mn, 2)); print(sorted(hist.items()))
