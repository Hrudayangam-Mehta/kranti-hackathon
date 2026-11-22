#!/usr/bin/env python3
"""Readable event timeline of one team in every recorded showdown (data from sd_load).
usage: sd_timeline.py TEAM [max_t]"""
import sys, os, math, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sd_load
team = sys.argv[1]
MAXT = float(sys.argv[2]) if len(sys.argv) > 2 else 1e9
d = sd_load.load()
d.sort(key=lambda r: (r['hdr']['showdown']['id'], r['hdr']['showdown']['match']))
WK = ['gun', 'mortar', 'laser', 'lightning']
def who(names, i):
    if i is None: return '?'
    if i < 16: return names[i]
    if i < 1000: return 'drone%d' % i
    return 'crate%d' % i
for r in d:
    me = sd_load.idx(r, team)
    if me < 0: continue
    names = [m['name'] for m in r['hdr']['mechs']]
    res = r['result']['mechs'][me]
    print('\n######## %s m%d seed %s img %s place %d' % (r['hdr']['showdown']['title'], r['hdr']['showdown']['match'], r['seed'], r['hdr']['bots'][me][-6:], res['place']))
    pos = {}
    lastline = None
    agg = None   # aggregate consecutive hits (src,dst,w)
    def flush():
        global agg
        if agg:
            print('  %6.1f-%-6.1f %-4s %s -> %s x%d dmg %d range %.0f-%.0f m  (victim hp %s -> %s, my hp %s)' % (
                agg['t0'], agg['t1'], agg['w'], agg['src'], agg['dst'], agg['n'], agg['amt'], agg['rmin'], agg['rmax'], agg['hp0'], agg['hp1'], agg['myhp']))
        agg = None
    hp = {}
    for f in r['frames']:
        t = f['t'] / 20.0
        if t > MAXT: break
        for row in f['m']:
            pos[row[0]] = row
        for n in f.get('n', []):
            pos[n[0]] = n
        for e in f.get('ev', []):
            te = e['t'] / 20.0
            k = e['e']
            if k == 'hit' and (e['src'] == me or e['dst'] == me):
                s, dd = e['src'], e['dst']
                if s not in pos or (dd not in pos and dd < 1000):
                    rng = float('nan')
                else:
                    if dd >= 1000:
                        c = [c for c in r['hdr']['crates'] if c['id'] == dd]
                        p2 = c[0]['pos'] if c else [float('nan')] * 3
                    else:
                        p2 = pos[dd][1:4]
                    p1 = pos[s][1:4]
                    rng = math.hypot(p1[0] - p2[0], p1[1] - p2[1])
                vhp = pos[dd][6] if dd < 16 and dd in pos else None
                key = (s, dd, e.get('w'))
                if agg and agg['key'] == key and te - agg['t1'] <= 2.0:
                    agg['t1'] = te; agg['n'] += 1; agg['amt'] += e['amt']; agg['rmin'] = min(agg['rmin'], rng); agg['rmax'] = max(agg['rmax'], rng); agg['hp1'] = vhp
                else:
                    flush()
                    agg = dict(key=key, t0=te, t1=te, w=e.get('w'), src=who(names, s), dst=who(names, dd), n=1, amt=e['amt'], rmin=rng, rmax=rng, hp0=vhp, hp1=vhp, myhp=pos[me][6] if me in pos else None)
            elif k == 'weapon' and e.get('by') == me:
                flush(); print('  %6.1f weapon %s %s slot %s' % (te, e['op'], e['kind'], e.get('slot')))
            elif k == 'upgrade' and e.get('id') == me:
                flush(); print('  %6.1f upgrade %s (cubes %s)' % (te, e['up'], pos[me][9] if me in pos else '?'))
            elif k == 'death' and (e.get('id') == me or e.get('by') == me):
                flush(); print('  %6.1f DEATH of %s by %s' % (te, who(names, e['id']), who(names, e.get('by'))))
            elif k == 'crate' and e.get('by') == me:
                flush(); print('  %6.1f crate destroyed' % te)
            elif k == 'short' and (e.get('id') == me or e.get('by') == me):
                flush(); print('  %6.1f laser short: %s shorted by %s' % (te, who(names, e['id']), who(names, e['by'])))
            elif k == 'drop' and e.get('by') == me:
                flush(); print('  %6.1f drop %s' % (te, e))
            elif k == 'cookoff' and (e.get('id') == me or e.get('by') == me):
                flush(); print('  %6.1f cookoff %s by %s' % (te, who(names, e['id']), who(names, e['by'])))
    flush()
