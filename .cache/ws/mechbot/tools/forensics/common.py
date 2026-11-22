"""Shared loader + geometry helpers for the mech16 replay forensics.

Stdlib only.  Run the analysis scripts with `python3 -I <script> `.
All paths are derived from this file's location (P/tools/forensics/common.py).
"""
import gzip, json, math, os, struct, array, bisect

HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.dirname(os.path.dirname(HERE))
REPLAY = os.path.join(P, 'replay', 'mech16.jsonl.gz')
WORLD = os.path.join(P, 'kit', 'arena', 'v2', 'world.json')
HELLO = os.path.join(P, 'notes', 'hello_example.json')
OUT = os.path.join(HERE, 'out')

TICK = 0.05
G_FLAG, B_FLAG, C_FLAG = 1, 2, 4
# mech row indices
MI, MX, MY, MZ, MYAW, MPIT, MHP, MEN, MFL, MCU, MMAX, MS0, MS1 = range(13)


def load_config():
    return json.load(open(HELLO))['config']


class Replay:
    def __init__(self, path=REPLAY):
        with gzip.open(path, 'rt') as f:
            lines = [json.loads(l) for l in f]
        self.hdr = lines[0]
        self.res = lines[-1]
        self.frames = lines[1:-1]
        self.ticks = [fr['t'] for fr in self.frames]
        self.nf = len(self.frames)
        self.names = {m['id']: m['name'] for m in self.hdr['mechs']}
        self.types = sorted(set(self.names.values()))
        self.ids = sorted(self.names)
        # per mech: list of rows aligned to frames (None when absent/dead)
        self.m = {i: [None] * self.nf for i in self.ids}
        self.n = {}
        for k, fr in enumerate(self.frames):
            for row in fr['m']:
                self.m[row[0]][k] = row
            for row in fr['n']:
                self.n.setdefault(row[0], [None] * self.nf)[k] = row
        self.events = []
        for fr in self.frames:
            for e in fr.get('ev', []):
                self.events.append(e)
        self.death_tick = {}
        for e in self.events:
            if e['e'] == 'death' and e['id'] < 100:
                self.death_tick[e['id']] = e['t']
        self.end_tick = self.res['ticks']
        self.result = {m['id']: m for m in self.res['mechs']}
        self.wk = self.hdr['weapon_kinds']

    def fi(self, tick):
        """frame index whose tick is the largest <= tick"""
        k = bisect.bisect_right(self.ticks, tick) - 1
        return max(0, k)

    def row(self, mid, tick):
        """state row at frame at/just before tick (no interpolation)"""
        src = self.m if mid < 100 else self.n
        if mid not in src:
            return None
        return src[mid][self.fi(tick)]

    def pos(self, mid, tick):
        """linearly interpolated (x,y,z) at an arbitrary tick; None if absent."""
        src = self.m if mid < 100 else self.n
        if mid not in src:
            return None
        rows = src[mid]
        k = self.fi(tick)
        a = rows[k]
        if a is None:
            return None
        ta = self.ticks[k]
        if ta == tick or k + 1 >= self.nf or rows[k + 1] is None:
            return (a[1], a[2], a[3])
        b = rows[k + 1]
        tb = self.ticks[k + 1]
        u = (tick - ta) / (tb - ta)
        return (a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u, a[3] + (b[3] - a[3]) * u)

    def vel(self, mid, tick, back=True):
        """finite-difference velocity (m/s).  back=True: over the frame interval ending at
        the frame at/before tick (what an observer at that frame knows)."""
        src = self.m if mid < 100 else self.n
        if mid not in src:
            return None
        rows = src[mid]
        k = self.fi(tick)
        if back:
            k0, k1 = k - 1, k
        else:
            k0, k1 = k, k + 1
        if k0 < 0 or k1 >= self.nf or rows[k0] is None or rows[k1] is None:
            k0, k1 = (k, k + 1) if back else (k - 1, k)
            if k0 < 0 or k1 >= self.nf or rows[k0] is None or rows[k1] is None:
                return None
        a, b = rows[k0], rows[k1]
        dt = (self.ticks[k1] - self.ticks[k0]) * TICK
        return ((b[1] - a[1]) / dt, (b[2] - a[2]) / dt, (b[3] - a[3]) / dt)

    def alive(self, mid, tick):
        return self.row(mid, tick) is not None

    def scale(self, mid, tick):
        r = self.row(mid, tick)
        return 1.0 + 0.05 * (r[MCU] if r else 0)


class World:
    def __init__(self, path=WORLD):
        w = json.load(open(path))
        self.b = w['bounds']
        tg = w['terrain']
        self.tx0, self.ty0, self.tnx, self.tny = tg['minX'], tg['minY'], tg['nx'], tg['ny']
        raw = open(os.path.join(os.path.dirname(path), tg['file']), 'rb').read()
        a = array.array('h')
        a.frombytes(raw)
        if struct.pack('=h', 1) != struct.pack('<h', 1):
            a.byteswap()
        self.h = a
        self.scale = tg['scale']
        self.prisms = []
        for p in w['prisms']:
            edges = []
            for ring in [p['ring']] + p['holes']:
                n = len(ring) // 2
                for i in range(n):
                    j = (i + 1) % n
                    edges.append((ring[2 * i], ring[2 * i + 1], ring[2 * j], ring[2 * j + 1]))
            xs = [e[0] for e in edges]
            ys = [e[1] for e in edges]
            self.prisms.append({'kind': p['kind'], 'base': p['base'], 'top': p['top'], 'edges': edges,
                                'minX': min(xs), 'maxX': max(xs), 'minY': min(ys), 'maxY': max(ys)})
        self.cell = 16.0
        self.gx0 = self.b['minX'] - 16
        self.gy0 = self.b['minY'] - 16
        self.gnx = int((self.b['maxX'] - self.b['minX']) / 16) + 4
        self.gny = int((self.b['maxY'] - self.b['minY']) / 16) + 4
        self.grid = [[] for _ in range(self.gnx * self.gny)]
        for idx, p in enumerate(self.prisms):
            i0 = int((p['minX'] - self.gx0) / 16)
            i1 = int((p['maxX'] - self.gx0) / 16)
            j0 = int((p['minY'] - self.gy0) / 16)
            j1 = int((p['maxY'] - self.gy0) / 16)
            for j in range(j0, j1 + 1):
                for i in range(i0, i1 + 1):
                    self.grid[j * self.gnx + i].append(idx)

    def ground(self, x, y):
        fx = min(max(x - self.tx0, 0.0), self.tnx - 1.000001)
        fy = min(max(y - self.ty0, 0.0), self.tny - 1.000001)
        i = int(fx)
        j = int(fy)
        u = fx - i
        v = fy - j
        h = self.h
        nx = self.tnx
        k = j * nx + i
        return ((h[k] * (1 - u) + h[k + 1] * u) * (1 - v) + (h[k + nx] * (1 - u) + h[k + nx + 1] * u) * v) * self.scale

    def _cell(self, x, y):
        i = int((x - self.gx0) / 16)
        j = int((y - self.gy0) / 16)
        if i < 0 or j < 0 or i >= self.gnx or j >= self.gny:
            return ()
        return self.grid[j * self.gnx + i]

    @staticmethod
    def _inside(p, x, y):
        if x < p['minX'] or x > p['maxX'] or y < p['minY'] or y > p['maxY']:
            return False
        c = False
        for (x0, y0, x1, y1) in p['edges']:
            if (y0 > y) != (y1 > y):
                if x < x0 + (y - y0) * (x1 - x0) / (y1 - y0):
                    c = not c
        return c

    def prisms_at(self, x, y):
        return [self.prisms[i] for i in self._cell(x, y) if self._inside(self.prisms[i], x, y)]

    def surface_z(self, x, y, zmax=float('inf')):
        """highest walkable surface (terrain or prism top) with height <= zmax"""
        best = self.ground(x, y)
        for p in self.prisms_at(x, y):
            if p['top'] <= zmax and p['top'] > best:
                best = p['top']
        return best

    def support(self, x, y, z, tol=1.0):
        """(kind, surfaceZ) of the surface a grounded mech at feet height z stands on."""
        g = self.ground(x, y)
        best = ('terrain', g)
        bd = abs(z - g)
        for p in self.prisms_at(x, y):
            d = abs(z - p['top'])
            if d < bd:
                bd = d
                best = (p['kind'], p['top'])
        return best + (bd,)

    def in_solid(self, x, y, z):
        if z < self.ground(x, y) - 0.05:
            return True
        for i in self._cell(x, y):
            p = self.prisms[i]
            if p['base'] < z < p['top'] and self._inside(p, x, y):
                return True
        return False

    def los(self, ax, ay, az, bx, by, bz, step=1.0):
        """fraction in [0,1] of the first blocked sample along a->b, or 1.0 if clear
        (terrain + prisms; trees ignored)."""
        dx, dy, dz = bx - ax, by - ay, bz - az
        d = math.sqrt(dx * dx + dy * dy + dz * dz)
        n = max(2, int(d / step))
        for k in range(1, n):
            u = k / n
            if self.in_solid(ax + dx * u, ay + dy * u, az + dz * u):
                return u
        return 1.0

    def wall_dist(self, x, y, z, rmax=40.0, zclear=4.0):
        """approx horizontal distance to the nearest prism that would give cover to a mech with
        feet at z (prism top > z + zclear, base < z + 8).  Brute force over nearby cells."""
        best = rmax
        i0 = int((x - rmax - self.gx0) / 16)
        i1 = int((x + rmax - self.gx0) / 16)
        j0 = int((y - rmax - self.gy0) / 16)
        j1 = int((y + rmax - self.gy0) / 16)
        seen = set()
        for j in range(max(0, j0), min(self.gny - 1, j1) + 1):
            for i in range(max(0, i0), min(self.gnx - 1, i1) + 1):
                for idx in self.grid[j * self.gnx + i]:
                    if idx in seen:
                        continue
                    seen.add(idx)
                    p = self.prisms[idx]
                    if p['top'] < z + zclear or p['base'] > z + 8:
                        continue
                    for (x0, y0, x1, y1) in p['edges']:
                        ex, ey = x1 - x0, y1 - y0
                        l2 = ex * ex + ey * ey
                        u = 0.0 if l2 == 0 else max(0.0, min(1.0, ((x - x0) * ex + (y - y0) * ey) / l2))
                        d = math.hypot(x - (x0 + ex * u), y - (y0 + ey * u))
                        if d < best:
                            best = d
        return best


def angdiff(a, b):
    d = (a - b + math.pi) % (2 * math.pi) - math.pi
    return d


def pct(xs, q):
    if not xs:
        return float('nan')
    s = sorted(xs)
    k = (len(s) - 1) * q
    lo = int(math.floor(k))
    hi = min(len(s) - 1, lo + 1)
    return s[lo] + (s[hi] - s[lo]) * (k - lo)


def mean(xs):
    return sum(xs) / len(xs) if xs else float('nan')


def sd(xs):
    if len(xs) < 2:
        return float('nan')
    m = mean(xs)
    return math.sqrt(sum((x - m) ** 2 for x in xs) / (len(xs) - 1))


def median(xs):
    return pct(xs, 0.5)


def fmt(x, n=2):
    if x is None or (isinstance(x, float) and math.isnan(x)):
        return 'n/a'
    if isinstance(x, float):
        return f'{x:.{n}f}'
    return str(x)


def table(headers, rows):
    out = ['| ' + ' | '.join(headers) + ' |', '|' + '|'.join(['---'] * len(headers)) + '|']
    for r in rows:
        out.append('| ' + ' | '.join(fmt(c) if not isinstance(c, str) else c for c in r) + ' |')
    return '\n'.join(out)


def dump(name, obj):
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name), 'w') as f:
        json.dump(obj, f, indent=1)
