import sys, os, math, collections, gzip, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
R = Replay()
with gzip.open(os.path.join(P, 'kit/check/stream.jsonl.gz'), 'rt') as f:
    sh = json.loads(f.readline())
he = json.load(open(HELLO))
print('stream hello == hello_example config:', sh['config'] == he['config'], 'slot', sh.get('slot'), he.get('slot'), 'seed', sh.get('seed'), he.get('seed'))
if sh['config'] != he['config']:
    for k in sh['config']:
        if sh['config'][k] != he['config'].get(k): print('DIFF', k, sh['config'][k], he['config'].get(k))
ev = R.events
ch = [e for e in ev if e['e'] == 'charge']; la = [e for e in ev if e['e'] == 'laser']
print('charges', len(ch), 'lasers', len(la))
print('charge durs', collections.Counter(e['dur'] for e in ch), 'ranges', collections.Counter(e['range'] for e in ch))
print('charge tick parity', collections.Counter(e['t'] % 2 for e in ch), 'laser parity', collections.Counter(e['t'] % 2 for e in la))
byid = collections.defaultdict(list)
for e in ch + la: byid[e['id']].append(e)
for mid, es in sorted(byid.items()):
    es.sort(key=lambda e: e['t'])
    out = []
    last = None
    for e in es:
        if e['e'] == 'charge': last = e['t']
        else:
            hits = e['hits']
            amts = [(h['dst'], h['amt'], h.get('rear'), h.get('fx')) for h in ev if h['e'] == 'hit' and h['t'] == e['t'] and h['w'] == 'laser' and h['src'] == mid]
            r = R.row(mid, e['t'])
            out.append((last, e['t'], e['t'] - last if last else None, hits, amts, 'cubes', r[MCU] if r else None))
            last = None
    print(mid, R.names[mid], out, 'dangling charge' if last else '')
print([e for e in ev if e['e'] in ('cookoff', 'short')])
