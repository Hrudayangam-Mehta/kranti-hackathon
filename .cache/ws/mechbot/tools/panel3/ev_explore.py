import gzip, json, sys, collections
path = sys.argv[1]
lines = [json.loads(l) for l in gzip.open(path, 'rt')]
hdr, res, frames = lines[0], lines[-1], lines[1:-1]
print('hdr keys', list(hdr.keys()))
print('weapon_kinds', hdr.get('weapon_kinds'))
print('zone', json.dumps(hdr.get('zone'))[:600])
print('drops', json.dumps(hdr.get('drops'))[:600])
print('result', json.dumps(res)[:1500])
ex = {}
cnt = collections.Counter()
for fr in frames:
    for e in fr.get('ev', []):
        cnt[e['e']] += 1
        ex.setdefault(e['e'], []).append(e)
print(cnt)
for k, v in ex.items():
    print(k, json.dumps(v[:3]))
print('frame keys', list(frames[100].keys()), 'nframes', len(frames), 't last', frames[-1]['t'])
