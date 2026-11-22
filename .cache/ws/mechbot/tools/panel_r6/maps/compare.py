#!/usr/bin/env python3
"""Diff the brain's decisions on a transformed map (mapped back) against the base map (equiv.mjs output).
usage: python3 compare.py <eq dir> [names...]"""
import json
import math
import os
import sys

INV_VEC = {'mirx': lambda x, y: (-x, y), 'miry': lambda x, y: (x, -y), 'rot90': lambda x, y: (y, -x)}
INV_YAW = {'mirx': lambda a: math.pi - a, 'miry': lambda a: -a, 'rot90': lambda a: a - math.pi / 2}
INV_PT = {'mirx': lambda x, y: (-x, y), 'miry': lambda x, y: (x, -y), 'rot90': lambda x, y: (y, -x), 'tr300': lambda x, y: (x - 300, y - 300)}


def wrap(a):
    return math.atan2(math.sin(a), math.cos(a))


def main():
    d = sys.argv[1]
    names = sys.argv[2:] or ['tr300', 'lift40', 'mirx', 'miry', 'rot90', 'zs070', 'zs130', 'zt070', 'wide', 'v3dir']
    base = json.load(open(os.path.join(d, 'base.json')))['rec']
    print('map      n   mode%  leg%  tgt%  fire%  aim>0.1%  move>30deg%  goal>5m%  first-diff(tick:what)')
    for n in names:
        f = os.path.join(d, n + '.json')
        if not os.path.exists(f):
            continue
        rec = json.load(open(f))['rec']
        iv = INV_VEC.get(n, lambda x, y: (x, y)); iy = INV_YAW.get(n, lambda a: a); ip = INV_PT.get(n, lambda x, y: (x, y))
        N = min(len(rec), len(base))
        c = dict(mode=0, leg=0, tgt=0, fire=0, aim=0, move=0, moveN=0, goal=0, goalN=0)
        first = None
        for k in range(N):
            a, b = rec[k], base[k]
            what = []
            if a['mode'] != b['mode']: c['mode'] += 1; what.append('mode %s/%s' % (b['mode'], a['mode']))
            if a['leg'] != b['leg']: c['leg'] += 1; what.append('leg %s/%s' % (b['leg'], a['leg']))
            if a['tgt'] != b['tgt']: c['tgt'] += 1; what.append('tgt')
            if a['fire'] != b['fire']: c['fire'] += 1; what.append('fire')
            ya = iy(a['aim'][0]); yb = b['aim'][0]
            if abs(wrap(ya - yb)) > 0.1: c['aim'] += 1; what.append('aim %.2f' % wrap(ya - yb))
            mx, my = iv(*a['move']); bx, by = b['move']
            la, lb = math.hypot(mx, my), math.hypot(bx, by)
            if la > 0.2 or lb > 0.2:
                c['moveN'] += 1
                if la < 0.05 or lb < 0.05 or abs(wrap(math.atan2(my, mx) - math.atan2(by, bx))) > math.radians(30):
                    c['move'] += 1; what.append('move')
            if a['goal'] and b['goal']:
                c['goalN'] += 1
                gx, gy = ip(*a['goal'])
                if math.hypot(gx - b['goal'][0], gy - b['goal'][1]) > 5: c['goal'] += 1; what.append('goal')
            if what and first is None:
                first = '%d:%s' % (a['tick'], ','.join(what[:3]))
        pc = lambda v, t=N: 100.0 * v / max(1, t)
        print('%-7s %4d %6.1f %5.1f %5.1f %6.1f %9.1f %12.1f %9.1f  %s' % (n, N, pc(c['mode']), pc(c['leg']), pc(c['tgt']), pc(c['fire']), pc(c['aim']),
              pc(c['move'], c['moveN']), pc(c['goal'], c['goalN']), first))


if __name__ == '__main__':
    main()
