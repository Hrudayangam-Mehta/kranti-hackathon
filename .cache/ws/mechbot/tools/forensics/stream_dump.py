import gzip, json, sys, collections
path = sys.argv[1]
with gzip.open(path, 'rt') as f:
    lines = [json.loads(l) for l in f]
print(len(lines), collections.Counter(l.get('type') for l in lines))
obs = [l for l in lines if l.get('type') == 'obs']
print('ticks', obs[0]['tick'], obs[-1]['tick'])
prev = None
for o in obs:
    s = o['self']; w = s['weapons'][0]
    ev = [(e['type'], e.get('amount'), e.get('weapon'), e.get('target', e.get('by')), e.get('rear')) for e in o['events']]
    print(o['tick'], 'hp', s['hp'], 'en', s['energy'], 'gr', s['grounded'], 'pos', s['pos'], 'vel', s['vel'], 'aim', s['aim'], 'w0', (w['cooldown'], w.get('ammo'), w.get('reload')) if w else None, 'w1', (lambda x: (x['kind'], x['cooldown'], x.get('charge')) if x else None)(s['weapons'][1]), ev if ev else '')
