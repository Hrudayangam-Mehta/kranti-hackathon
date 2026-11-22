#!/usr/bin/env python3
"""Robustness maps for the panel R6 audit (standard library only).

Writes transformed copies of kit/arena/v2 (world.json + terrain.i16, same format), a matching hello
(config from notes/hello_example.json, zone moved with the map) and a matching conformance stream (the kit's
recorded stream with every coordinate, velocity and bearing moved the same way) for each variant:

  base     identity (same pipeline, baseline)
  mirx     x -> -x                   miry   y -> -y
  rot90    (x, y) -> (-y, x)         tr300  (x, y) -> (x + 300, y + 300)
  lift40   z -> z + 40 (terrain, prisms, trees, observations)
  zs070    base map, zone radii x 0.7   zs130  base map, zone radii x 1.3
  zt070    base map, zone hold / shrink times x 0.7, match duration x 0.7
  wide     map doubled along x (original + its mirror image), zone at the seam, radius 800
  v3dir    base map stored under v3/ instead of v2/ (hello.map.files says v3/...)

usage: python3 make_maps.py [names...]     (default: all)
"""
import array
import copy
import gzip
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
SRC = os.path.join(P, 'kit', 'arena', 'v2')
HELLO = os.path.join(P, 'notes', 'hello_example.json')
STREAM = os.path.join(P, 'kit', 'check', 'stream.jsonl.gz')


def load():
    w = json.load(open(os.path.join(SRC, 'world.json')))
    h = array.array('h')
    with open(os.path.join(SRC, w['terrain']['file']), 'rb') as f:
        h.frombytes(f.read())
    if sys.byteorder != 'little':
        h.byteswap()
    return w, h


class Xf:
    """Isometry of the plane (plus a z shift): point map, linear map, yaw map."""
    def __init__(self, kind, dx=0.0, dy=0.0, dz=0.0):
        self.kind, self.dx, self.dy, self.dz = kind, dx, dy, dz

    def pt(self, x, y):
        k = self.kind
        if k == 'mirx': return -x, y
        if k == 'miry': return x, -y
        if k == 'rot90': return -y, x
        return x + self.dx, y + self.dy

    def vec(self, x, y):
        k = self.kind
        if k == 'mirx': return -x, y
        if k == 'miry': return x, -y
        if k == 'rot90': return -y, x
        return x, y

    def yaw(self, a):
        k = self.kind
        if k == 'mirx': a = math.pi - a
        elif k == 'miry': a = -a
        elif k == 'rot90': a = a + math.pi / 2
        return math.atan2(math.sin(a), math.cos(a))

    def z(self, z):
        return z + self.dz


def r2(v):
    return round(v, 3)


def xf_flat(flat, X):
    out = []
    for i in range(0, len(flat) - 1, 2):
        x, y = X.pt(flat[i], flat[i + 1])
        out += [r2(x), r2(y)]
    return out


def xf_terrain(w, h, X):
    t = w['terrain']
    nx, ny, mnx, mny, st = t['nx'], t['ny'], t['minX'], t['minY'], t['step']
    k = X.kind
    if k in ('mirx', 'miry', 'rot90'):
        out = array.array('h', [0]) * (nx * ny)
        if k == 'mirx':
            for j in range(ny):
                row = h[j * nx:(j + 1) * nx]
                row.reverse()
                out[j * nx:(j + 1) * nx] = row
            nt = dict(t, minX=-(mnx + (nx - 1) * st))
        elif k == 'miry':
            for j in range(ny):
                out[j * nx:(j + 1) * nx] = h[(ny - 1 - j) * nx:(ny - j) * nx]
            nt = dict(t, minY=-(mny + (ny - 1) * st))
        else:
            nx2, ny2 = ny, nx
            for j2 in range(ny2):          # j2 = old i
                base = j2 * nx2
                for i2 in range(nx2):      # old j = ny - 1 - i2
                    out[base + i2] = h[(ny - 1 - i2) * nx + j2]
            nt = dict(t, nx=nx2, ny=ny2, minX=-(mny + (ny - 1) * st), minY=mnx)
        return nt, out
    out = array.array('h', h)
    if X.dz:
        dcm = int(round(X.dz * 100))
        for i in range(len(out)):
            out[i] = max(-32768, min(32767, out[i] + dcm))
    return dict(t, minX=mnx + X.dx, minY=mny + X.dy), out


def xf_world(w, h, X):
    w2 = copy.deepcopy(w)
    b = w['bounds']
    cs = [X.pt(b['minX'], b['minY']), X.pt(b['maxX'], b['minY']), X.pt(b['minX'], b['maxY']), X.pt(b['maxX'], b['maxY'])]
    w2['bounds'] = {'minX': r2(min(c[0] for c in cs)), 'maxX': r2(max(c[0] for c in cs)), 'minY': r2(min(c[1] for c in cs)), 'maxY': r2(max(c[1] for c in cs))}
    w2['terrain'], h2 = xf_terrain(w, h, X)
    for p in w2['prisms']:
        p['ring'] = xf_flat(p['ring'], X)
        p['holes'] = [xf_flat(q, X) for q in p.get('holes') or []]
        p['base'] = r2(X.z(p['base'])); p['top'] = r2(X.z(p['top']))
    F = w['trees']['fields']; D = w2['trees']['data']; s = len(F)
    ix, iy, iz = F.index('x'), F.index('y'), F.index('z')
    icx = F.index('crownX') if 'crownX' in F else -1
    icy = F.index('crownY') if 'crownY' in F else -1
    for o in range(0, len(D) - s + 1, s):
        D[o + ix], D[o + iy] = map(r2, X.pt(D[o + ix], D[o + iy]))
        if icx >= 0 and isinstance(D[o + icx], (int, float)) and isinstance(D[o + icy], (int, float)):
            D[o + icx], D[o + icy] = map(r2, X.pt(D[o + icx], D[o + icy]))
        D[o + iz] = r2(X.z(D[o + iz]))
    # scenery the server ignores: dropped (the bot does not read it either)
    for k in ('stadium', 'cars', 'parking', 'water', 'barriers'):
        w2.pop(k, None)
    return w2, h2


def wide_world(w, h):
    """Original + its mirror image about the terrain's last column (x doubled)."""
    t = w['terrain']; nx, ny, mnx, st = t['nx'], t['ny'], t['minX'], t['step']
    X1 = mnx + (nx - 1) * st
    nx2 = 2 * nx - 1
    out = array.array('h', [0]) * (nx2 * ny)
    for j in range(ny):
        row = h[j * nx:(j + 1) * nx]
        rev = array.array('h', row); rev.reverse()
        out[j * nx2:j * nx2 + nx] = row
        out[j * nx2 + nx:(j + 1) * nx2] = rev[1:]
    w2 = copy.deepcopy(w)
    w2['terrain'] = dict(t, nx=nx2)
    w2['bounds'] = dict(w['bounds'], maxX=r2(2 * X1 - w['bounds']['minX']))
    M = Xf('mirx')
    extra = []
    for p in w['prisms']:
        q = copy.deepcopy(p)
        q['ring'] = [r2(2 * X1 - v) if i % 2 == 0 else v for i, v in enumerate(p['ring'])]
        q['holes'] = [[r2(2 * X1 - v) if i % 2 == 0 else v for i, v in enumerate(hh)] for hh in p.get('holes') or []]
        extra.append(q)
    w2['prisms'] = w2['prisms'] + extra
    F = w['trees']['fields']; D = list(w['trees']['data']); s = len(F)
    ix = F.index('x'); icx = F.index('crownX') if 'crownX' in F else -1
    add = []
    for o in range(0, len(D) - s + 1, s):
        rec = D[o:o + s]
        rec[ix] = r2(2 * X1 - rec[ix])
        if icx >= 0 and isinstance(rec[icx], (int, float)): rec[icx] = r2(2 * X1 - rec[icx])
        add += rec
    w2['trees'] = dict(w['trees'], data=D + add)
    for k in ('stadium', 'cars', 'parking', 'water', 'barriers', 'blocks'):
        w2.pop(k, None)
    return w2, out, X1


def write_map(name, w2, h2, sub='v2'):
    d = os.path.join(HERE, name, sub)
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, 'world.json'), 'w') as f:
        json.dump(w2, f, separators=(',', ':'))
    hh = array.array('h', h2)
    if sys.byteorder != 'little':
        hh.byteswap()
    with open(os.path.join(d, w2['terrain']['file']), 'wb') as f:
        f.write(hh.tobytes())


def xf_config(cfg, X, rk=1.0, tk=1.0, center=None, r0=None):
    c = copy.deepcopy(cfg)
    z = c['zone']
    if center is not None:
        z['start_center'] = list(center)
    else:
        z['start_center'] = [r2(v) for v in X.pt(*z['start_center'])]
    if r0 is not None:
        z['start_radius'] = r0
    z['start_radius'] = r2(z['start_radius'] * rk)
    for ph in z['phases']:
        ph['radius'] = r2(ph['radius'] * rk)
        ph['hold_s'] = r2(ph['hold_s'] * tk); ph['shrink_s'] = r2(ph['shrink_s'] * tk)
    if tk != 1.0:
        c['match']['duration_s'] = r2(c['match']['duration_s'] * tk)
        c['drops']['times'] = [r2(v * tk) for v in c['drops']['times']]
    return c


def xf_obs(o, X, rk=1.0, tk=1.0):
    o = copy.deepcopy(o)
    def P3(p):
        x, y = X.pt(p[0], p[1]); return [r2(x), r2(y), r2(X.z(p[2]))]
    def V3(v):
        x, y = X.vec(v[0], v[1]); return [r2(x), r2(y), v[2]]
    def A2(a):
        return [round(X.yaw(a[0]), 4), a[1]]
    s = o['self']
    s['pos'] = P3(s['pos']); s['vel'] = V3(s['vel']); s['aim'] = A2(s['aim'])
    for m in o.get('mechs') or []:
        m['pos'] = P3(m['pos']); m['vel'] = V3(m['vel']); m['aim'] = A2(m['aim'])
    for p in o.get('projectiles') or []:
        p['pos'] = P3(p['pos']); p['vel'] = V3(p['vel'])
    for k in ('crates', 'cubes', 'pickups', 'drops'):
        for it in o.get(k) or []:
            it['pos'] = P3(it['pos'])
    for sd in o.get('sounds') or []:
        if isinstance(sd.get('bearing'), (int, float)): sd['bearing'] = round(X.yaw(sd['bearing']), 4)
    for e in o.get('events') or []:
        if isinstance(e.get('bearing'), (int, float)): e['bearing'] = round(X.yaw(e['bearing']), 4)
    for bm in o.get('beams') or []:
        bm['path'] = [P3(q) for q in bm['path']]
    z = o.get('zone')
    if z:
        z['center'] = [r2(v) for v in X.pt(*z['center'])]
        z['next_center'] = [r2(v) for v in X.pt(*z['next_center'])]
        z['radius'] = r2(z['radius'] * rk); z['next_radius'] = r2(z['next_radius'] * rk)
        z['shrink_start'] = r2(z['shrink_start'] * tk); z['shrink_end'] = r2(z['shrink_end'] * tk)
    return o


def write_hello_and_stream(name, X, rk=1.0, tk=1.0, sub='v2', center=None, r0=None, obs_shift=True):
    d = os.path.join(HERE, name)
    os.makedirs(d, exist_ok=True)
    hello = json.load(open(HELLO))
    hello['config'] = xf_config(hello['config'], X, rk, tk, center, r0)
    hello['map'] = {'dir': d, 'files': [sub + '/world.json', sub + '/terrain.i16']}
    json.dump(hello, open(os.path.join(d, 'hello.json'), 'w'))
    msgs = [json.loads(l) for l in gzip.open(STREAM, 'rt') if l.strip()]
    out = []
    for m in msgs:
        if m.get('type') == 'hello':
            m = copy.deepcopy(m)
            m['config'] = xf_config(m['config'], X, rk, tk, center, r0)
            m['map'] = {'dir': m['map']['dir'], 'files': [sub + '/world.json', sub + '/terrain.i16']}
        elif m.get('type') == 'obs':
            m = xf_obs(m, X if obs_shift else Xf('id'), rk, tk)
        out.append(m)
    with gzip.open(os.path.join(d, 'stream.jsonl.gz'), 'wt') as f:
        for m in out:
            f.write(json.dumps(m, separators=(',', ':')) + '\n')


def main():
    names = sys.argv[1:] or ['base', 'mirx', 'miry', 'rot90', 'tr300', 'lift40', 'zs070', 'zs130', 'zt070', 'wide', 'v3dir']
    w, h = load()
    for n in names:
        if n in ('base', 'zs070', 'zs130', 'zt070', 'v3dir'):
            X = Xf('id')
        elif n == 'tr300':
            X = Xf('tr', 300, 300)
        elif n == 'lift40':
            X = Xf('tr', 0, 0, 40)
        elif n in ('mirx', 'miry', 'rot90'):
            X = Xf(n)
        elif n == 'wide':
            w2, h2, X1 = wide_world(w, h)
            write_map(n, w2, h2)
            write_hello_and_stream(n, Xf('id'), center=[X1, 27.0], r0=800)
            print(n, 'done', w2['bounds'], w2['terrain']['nx'], w2['terrain']['ny'], len(w2['prisms']))
            continue
        else:
            raise SystemExit('unknown ' + n)
        w2, h2 = xf_world(w, h, X)
        sub = 'v3' if n == 'v3dir' else 'v2'
        write_map(n, w2, h2, sub)
        rk = {'zs070': 0.7, 'zs130': 1.3}.get(n, 1.0)
        tk = 0.7 if n == 'zt070' else 1.0
        write_hello_and_stream(n, X, rk, tk, sub)
        print(n, 'done', w2['bounds'], w2['terrain']['minX'], w2['terrain']['minY'], w2['terrain']['nx'], w2['terrain']['ny'])


if __name__ == '__main__':
    main()
