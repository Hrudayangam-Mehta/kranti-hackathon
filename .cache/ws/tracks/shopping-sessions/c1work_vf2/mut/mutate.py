#!/usr/bin/env python3
"""Verifier F1 mutation sets that break the generator's user-ID structure.

Usage: mutate.py BASE_DATA OUT_DATA KIND GEN_SEED [RNG]
KIND in: upper lzero noncanon xlinks kiosk alias16 clickonly split dupuser
         rand_str rand_canon rekey combined linkdirt gcap
Every produced line stays inside the rules' input guarantees: click copies identical,
event copies with equal ingest_ts identical, no comma/quote/newline inside a value.
"""
import json
import os
import random
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "verify"))
import genmodel as gm  # noqa: E402
import ref  # noqa: E402  (verifier reference, parse helpers only)

EV_H = b"event_id,user_id,ts,ingest_ts,event_type,product_id,price_cents"
CK_H = b"click_id,user_id,campaign_id,ts"
LK_H = b"user_id_a,user_id_b"
SEC = 1000
DAY = 86_400_000


def f1(t):
    import datetime as dt
    return dt.datetime.fromtimestamp(t // 1000, dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ").encode()


class DS:
    def __init__(self, base, seed, rnd):
        self.base = base
        self.rnd = rnd
        self.seed = seed
        ws, uk, ek, ck = gm.plan_keys(seed)
        self.key = uk & gm.MASK40
        man = json.load(open(f"{base}/manifest.json"))
        self.ws = ref.parse_ts(man["window_start"].encode())
        self.we = ref.parse_ts(man["window_end"].encode())
        self.ev = self._rows("events", 7)
        self.ck = self._rows("clicks", 4)
        self.lk = self._rows("links", 2)
        self.camps = [l.split(b",")[0] for l in open(f"{base}/campaigns.csv", "rb").read().split(b"\n")[1:] if l]
        self.persons = {}
        for _, f in self.ev + self.ck:
            if f is not None:
                d = gm.decode(f[1], self.key)
                if d is not None and d[0] < (1 << 29):
                    self.persons.setdefault(d[0], set()).add(d[1])
        for _, f in self.lk:
            if f is not None:
                for u in f:
                    d = gm.decode(u, self.key)
                    if d is not None and d[0] < (1 << 29):
                        self.persons.setdefault(d[0], set()).add(d[1])
        self.gmax = max(self.persons)
        self.evid = {f[0] for _, f in self.ev if f is not None}
        self.ckid = {f[0] for _, f in self.ck if f is not None}
        self.ingests = {}
        for _, f in self.ev:
            if f is not None:
                self.ingests.setdefault(f[0], set()).add(f[3])
        self.good_ev = [f for _, f in self.ev if f is not None and f[0] and f[1]
                        and ref.parse_ts(f[2]) is not None and self.ws <= ref.parse_ts(f[2]) < self.we]
        self.by_g = {}
        for f in self.good_ev:
            d = gm.decode(f[1], self.key)
            if d is not None:
                self.by_g.setdefault(d[0], []).append(f)
        self.new_ev, self.new_ck, self.new_lk = [], [], []
        self.n = 0
        self.notes = []

    def _rows(self, sub, n):
        out = []
        for p in ref.csv_files(f"{self.base}/{sub}"):
            for line in ref.data_lines(p):
                out.append((line, ref.parse_line(line, n)))
        return out

    def uid(self, g, alias):
        return gm.user_id(g * 512 + alias, self.key).encode()

    def fresh_eid(self):
        while True:
            self.n += 1
            if self.rnd.random() < 0.5:
                e = b"e" + gm.base36(self.rnd.getrandbits(40)).encode()
            else:
                e = b"xm%dq%d" % (self.n, self.rnd.randrange(10 ** 6))
            if e not in self.evid:
                self.evid.add(e)
                return e

    def fresh_cid(self):
        while True:
            self.n += 1
            if self.rnd.random() < 0.5:
                c = b"k" + gm.base36(self.rnd.getrandbits(40)).encode()
            else:
                c = b"km%dq%d" % (self.n, self.rnd.randrange(10 ** 6))
            if c not in self.ckid:
                self.ckid.add(c)
                return c

    def ts_text(self, t):
        r = self.rnd.random()
        if t % 1000 or r < 0.4:
            return str(t).encode()
        if r < 0.8:
            return f1(t)
        off = self.rnd.choice([-600, -240, 0, 330, 720])
        loc = t + off * 60_000
        s = f1(loc)[:-1]
        sign = b"+" if off >= 0 else b"-"
        a = abs(off)
        return s + sign + b"%02d:%02d" % (a // 60, a % 60)

    def add_event(self, user, t, ing=None, typ=None, price=None, eid=None):
        typ = typ or self.rnd.choice([b"view", b"view", b"cart", b"purchase"])
        if price is None:
            price = str(self.rnd.randrange(100, 50000)).encode() if typ == b"purchase" else b""
        ing = ing if ing is not None else (t // 1000 * 1000 + self.rnd.randrange(0, 600) * 1000)
        eid = eid or self.fresh_eid()
        prod = b"p%d" % self.rnd.randrange(1, 50001)
        self.new_ev.append([eid, user, self.ts_text(t), f1(ing), typ, prod, price])
        return eid

    def add_click(self, user, t, camp=None):
        camp = camp or self.rnd.choice(self.camps)
        self.new_ck.append([self.fresh_cid(), user, camp, self.ts_text(t)])

    def add_link(self, a, b):
        if self.rnd.random() < 0.5:
            a, b = b, a
        self.new_lk.append([a, b])

    def session_like(self, user, start=None, n=None):
        """A small session for user near a random valid event time, plus a click before it."""
        f = self.rnd.choice(self.good_ev)
        t = ref.parse_ts(f[2]) if start is None else start
        n = n or self.rnd.randrange(1, 5)
        for i in range(n):
            self.add_event(user, t + i * self.rnd.randrange(1, 300) * 1000)
        if self.rnd.random() < 0.6:
            self.add_click(user, t - self.rnd.randrange(0, 3 * DAY // 1000) * 1000)
        return t

    def remap_users(self, fn):
        """Rewrite user fields of existing parsed rows through fn(user)->user (None = keep).
        One decision per click_id and per (event_id, ingest_ts), so copies the rules call
        identical stay identical."""
        def rq(fields):
            return [b'"' + x + b'"' if self.rnd.random() < 0.2 else x for x in fields]
        decided = {}
        for name, idx in (("ev", (1,)), ("ck", (1,)), ("lk", (0, 1))):
            rows = getattr(self, name)
            out = []
            for line, f in rows:
                if f is None:
                    out.append((line, f))
                    continue
                g = list(f)
                ch = False
                for i in idx:
                    if g[i]:
                        if name == "ev":
                            rk = ("ev", f[0], f[3], f[1])
                        elif name == "ck":
                            rk = ("ck", f[0], f[1])
                        else:
                            rk = None
                        if rk is not None and rk in decided:
                            nu = decided[rk]
                        else:
                            nu = fn(g[i])
                            if rk is not None:
                                decided[rk] = nu
                        if nu is not None and nu != g[i]:
                            g[i] = nu
                            ch = True
                if ch:
                    out.append((b",".join(rq(g)), g))
                else:
                    out.append((line, f))
            setattr(self, name, out)

    def write(self, out, files=(7, 5, 4)):
        shutil.rmtree(out, ignore_errors=True)
        os.makedirs(out)
        for fn in ("products.csv", "campaigns.csv", "manifest.json"):
            shutil.copy(f"{self.base}/{fn}", f"{out}/{fn}")

        def q(fields):
            return b",".join(b'"' + x + b'"' if self.rnd.random() < 0.2 else x for x in fields)
        groups = (("events", EV_H, [l for l, _ in self.ev] + [q(f) for f in self.new_ev], files[0]),
                  ("clicks", CK_H, [l for l, _ in self.ck] + [q(f) for f in self.new_ck], files[1]),
                  ("links", LK_H, [l for l, _ in self.lk] + [q(f) for f in self.new_lk], files[2]))
        for sub, h, lines, k in groups:
            write_split(f"{out}/{sub}", h, lines, self.rnd, k)
        self.out = out


def write_split(folder, header, lines, rnd, k):
    os.makedirs(folder, exist_ok=True)
    rnd.shuffle(lines)
    cuts = sorted(rnd.sample(range(len(lines) + 1), min(k - 1, len(lines) + 1))) if lines else []
    prev = 0
    for i, c in enumerate(cuts + [len(lines)]):
        part = lines[prev:c]
        prev = c
        body = header + b"\n" + b"\n".join(part)
        if part and rnd.random() < 0.8:
            body += b"\n"
        with open(f"{folder}/part-{i:05d}.csv", "wb") as fh:
            fh.write(body)
    with open(f"{folder}/zz-empty.csv", "wb") as fh:
        fh.write(header + b"\n")


# ------------------------------------------------------------------ kinds
def k_upper(d):
    d.notes.append("upper: 1% of rows upper-cased; 3 persons fully upper-cased; whale 0 10%; link sides; U/u links")
    victims = d.rnd.sample(sorted(g for g in d.by_g if g >= 8), 3)
    whole = {d.uid(g, a) for g in victims for a in d.persons[g]}

    def fn(u):
        if u in whole:
            return u.upper()
        dd = gm.decode(u, d.key)
        if dd is None:
            return None
        if dd[0] == 0 and d.rnd.random() < 0.10:
            return u.upper()
        if d.rnd.random() < 0.01:
            return u.upper()
        if d.rnd.random() < 0.002:
            j = d.rnd.randrange(1, len(u))
            return u[:j] + u[j:j + 1].upper() + u[j + 1:]
        return None
    d.remap_users(fn)
    gs = sorted(d.by_g)
    for _ in range(40):
        g = d.rnd.choice(gs)
        u = d.uid(g, 0)
        d.add_link(u.upper(), u)
    for _ in range(20):
        g = d.rnd.choice(gs)
        u = d.uid(g, 0)
        d.session_like(u.upper())
        d.session_like(b"U" + u[1:])


def k_lzero(d):
    d.notes.append("lzero: u0<body>, u00<body> rows/clicks/links; u, u0, u00 IDs")
    gs = sorted(d.by_g)

    def fn(u):
        dd = gm.decode(u, d.key)
        if dd is None:
            return None
        r = d.rnd.random()
        if r < 0.01:
            return b"u0" + u[1:]
        if r < 0.012:
            return b"u00" + u[1:]
        if r < 0.013:
            return b"u000000000" + u[1:]
        return None
    d.remap_users(fn)
    for _ in range(60):
        g = d.rnd.choice(gs)
        u = d.uid(g, 0)
        z = b"u0" + u[1:]
        kind = d.rnd.randrange(4)
        if kind == 0:
            d.add_link(z, u)
        elif kind == 1:
            d.add_link(z, b"u0" + d.uid(g, max(d.persons[g]))[1:])
        elif kind == 2:
            d.session_like(z)
        else:
            d.add_link(z, d.uid(d.rnd.choice(gs), 0))
    for u in (b"u", b"u0", b"u00", b"u000", b"u0" * 5, b"u1", b"u01", b"u001"):
        d.session_like(u)
        d.add_link(u, d.uid(d.rnd.choice(gs), 0))
    zero = gm.unscramble(0, d.key)
    d.notes.append(f"u0 decodes to person {zero >> 9} alias {zero & 511}")


def alias_variants(d, u):
    """Strings that a lax decoder could confuse with canonical u."""
    v = int(u[1:].decode(), 36)
    body = u[1:].decode()
    out = []
    for m in (1, 2, 3, 35, 36, 1000):
        out.append("u" + gm.base36(v + m * (1 << 40)))
    for m in (1, 2, 7):
        out.append("u" + gm.base36(v + m * (1 << 64)))
        out.append("u" + gm.base36(v + m * (1 << 64) * 36))
    out.append("u" + gm.base36(v + (1 << 128)))
    out += ["u" + body + c for c in ("0", "a", "z", " ", "\x00", "\t", "é", "-", "_")]
    out += ["u" + body + "0" * 8, "uu" + body, "U" + body, "v" + body, " u" + body, "u " + body]
    for c in ("/", ":", "@", "[", "`", "{", "-", "_", ".", "~", "\x7f", "\u0080"):
        j = d.rnd.randrange(0, len(body) + 1)
        out.append("u" + body[:j] + c + body[j:])
    j = d.rnd.randrange(len(body))
    out.append("u" + body[:j] + body[j].upper() + body[j + 1:])
    out.append("u" + body.replace("0", "０").replace("1", "１").replace("a", "а"))
    out.append("u" + body[:-1])
    out.append("u" + body[1:])
    out.append("u" + body + body)
    return [o.encode("utf-8") for o in out]


def k_noncanon(d):
    d.notes.append("noncanon: mask/overflow aliases (v + m*2^40, v + m*2^64), suffix/prefix/char variants")
    gs = sorted(d.by_g)
    pick = [0, 1, 2, 3, 4, 5, 6] + d.rnd.sample(gs, 40)
    for g in pick:
        if g not in d.persons:
            continue
        a = d.rnd.choice(sorted(d.persons[g]))
        u = d.uid(g, a)
        for w in alias_variants(d, u):
            if not w or b"," in w or b'"' in w or b"\n" in w or b"\r" in w:
                continue
            r = d.rnd.random()
            if r < 0.5:
                d.session_like(w)
            elif r < 0.8:
                d.add_link(w, d.uid(d.rnd.choice(gs), 0))
                d.session_like(w)
            else:
                d.add_link(w, w)
                d.session_like(w)
            if d.rnd.random() < 0.3:
                f = d.rnd.choice(d.by_g[g]) if g in d.by_g else d.rnd.choice(d.good_ev)
                d.add_click(w, ref.parse_ts(f[2]) - 1000)


def k_xlinks(d):
    d.notes.append("xlinks: cross-person links (ordinary, whales, chain persons, long cross chains)")
    gs = sorted(d.by_g)
    for _ in range(200):
        a, b = d.rnd.sample(gs, 2)
        d.add_link(d.uid(a, d.rnd.choice(sorted(d.persons[a]))), d.uid(b, d.rnd.choice(sorted(d.persons[b]))))
    d.add_link(d.uid(0, 0), d.uid(3, 1))
    d.add_link(d.uid(1, 2), d.uid(d.rnd.choice(gs[10:]), 0))
    for c in (5, 6, 7):
        if c in d.persons:
            d.add_link(d.uid(c, d.rnd.choice(sorted(d.persons[c]))), d.uid(d.rnd.choice(gs[10:]), 0))
    chain = d.rnd.sample(gs[8:], 30)
    for a, b in zip(chain, chain[1:]):
        d.add_link(d.uid(a, 0), d.uid(b, 0))


def kiosk_id(d, k):
    return gm.user_id(gm.KIOSK_BASE + k, d.key).encode()


def k_kiosk(d):
    d.notes.append("kiosk: whales linked to shared-device IDs; kiosk IDs in rows; two kiosks joined")
    for w, k in ((0, 1), (1, 2), (2, 1), (4, 7)):
        if w in d.persons:
            d.add_link(d.uid(w, d.rnd.choice(sorted(d.persons[w]))), kiosk_id(d, k))
    d.add_link(kiosk_id(d, 1), kiosk_id(d, 2))
    for k in (1, 2, 3, 7, 0, 511):
        d.session_like(kiosk_id(d, k))
    gs = sorted(d.by_g)
    for _ in range(30):
        d.add_link(d.uid(d.rnd.choice(gs), 0), kiosk_id(d, d.rnd.randrange(1, 8)))


def k_alias16(d, cap_hint=None):
    d.notes.append("alias16: aliases 15,16,17,31,32,100,511; g near/over caps; alias&15 collisions")
    gs = sorted(d.by_g)
    uc = d.gmax + 1
    sample = d.rnd.sample(gs[8:], 60) + [0, 1, 2]
    for i, g in enumerate(sample):
        mode = i % 6
        if mode == 0:
            for a in (16, 17, 31, 32, 100, 511):
                d.session_like(d.uid(g, a))
        elif mode == 1:
            d.add_link(d.uid(g, 16), d.uid(g, 0))
            d.session_like(d.uid(g, 16))
        elif mode == 2:
            h = d.rnd.choice(gs)
            d.add_link(d.uid(g, 17), d.uid(h, 1))
            d.session_like(d.uid(h, 1))
        elif mode == 3:
            d.add_link(d.uid(g, 15), d.uid(g, 0))
            d.session_like(d.uid(g, 15))
            d.add_link(d.uid(g, 14), d.uid(g, 15))
        elif mode == 4:
            d.session_like(d.uid(g, 0))
            d.session_like(d.uid(g, 16))
            d.session_like(d.uid(g, 32))
            d.session_like(d.uid(g, 1))
            d.session_like(d.uid(g, 17))
        else:
            d.add_link(d.uid(g, 20), d.uid(g, 21))
            d.add_link(d.uid(g, 21), d.uid(g, 2))
            d.session_like(d.uid(g, 20))
    caps = {uc - 1, uc, uc + 1, 2 * uc, 3 * uc, 3 * uc + 1, 4 * uc, 1 << 20, 1 << 25, (1 << 30) - 1, 1 << 30,
            (1 << 31) - 1, (1 << 31), (1 << 31) + 5, gm.MASK40 >> 9}
    if cap_hint:
        caps |= {cap_hint - 2, cap_hint - 1, cap_hint, cap_hint + 1}
    for g in sorted(caps):
        if g < 0 or g > (gm.MASK40 >> 9):
            continue
        for a in (0, 1, 15):
            u = d.uid(g, a)
            d.session_like(u)
        d.add_link(d.uid(g, 0), d.uid(g, 1))
        if d.rnd.random() < 0.5:
            d.add_link(d.uid(g, 1), d.uid(d.rnd.choice(gs), 0))
        d.notes.append(f"g={g} ids {d.uid(g, 0)!r} {d.uid(g, 1)!r} {d.uid(g, 15)!r}")


def k_clickonly(d):
    d.notes.append("clickonly: IDs seen only in clicks, linked and unlinked, canonical and not")
    gs = sorted(d.by_g)
    for i, g in enumerate(d.rnd.sample(gs, 120)):
        free = [a for a in range(9, 16) if a not in d.persons[g]]
        if not free:
            continue
        a = d.rnd.choice(free)
        cu = d.uid(g, a)
        evs = d.by_g[g]
        mode = i % 5
        for f in d.rnd.sample(evs, min(3, len(evs))):
            t = ref.parse_ts(f[2])
            if mode == 0:
                d.add_click(cu, t - d.rnd.choice([0, 1000, 60_000, 7 * DAY]))
            elif mode == 1:
                d.add_click(cu, t - d.rnd.choice([0, 1000, 60_000, 7 * DAY]))
            elif mode == 2:
                d.add_click(cu.upper(), t - 5000)
            elif mode == 3:
                d.add_click(d.uid(g, 16 + a), t - 5000)
            else:
                d.add_click(b"clk-" + cu, t - 5000)
        if mode == 1:
            d.add_link(cu, d.uid(g, 0) if 0 in d.persons[g] else d.uid(g, min(d.persons[g])))
        elif mode == 2:
            d.add_link(cu.upper(), d.uid(g, min(d.persons[g])))
        elif mode == 3:
            d.add_link(d.uid(g, 16 + a), d.uid(g, min(d.persons[g])))
        elif mode == 4:
            d.add_link(b"clk-" + cu, d.uid(g, min(d.persons[g])))
    for _ in range(50):
        g = d.rnd.choice(gs)
        f = d.rnd.choice(d.good_ev)
        d.add_click(d.uid(g + 7, 3), ref.parse_ts(f[2]))


def k_split(d):
    d.notes.append("split: whales + 20 persons scattered one-row-per-file; dups across files")
    gs = sorted(d.by_g)
    targets = {0, 1, 2, 3, 4} | set(d.rnd.sample(gs[8:], 20))
    keep, moved = [], []
    for line, f in d.ev:
        dd = gm.decode(f[1], d.key) if f is not None else None
        if dd is not None and dd[0] in targets and d.rnd.random() < 0.3:
            moved.append(line)
        else:
            keep.append((line, f))
    d.ev = keep
    d.split_lines = moved
    for g in list(targets)[:10]:
        for f in d.rnd.sample(d.by_g[g], min(5, len(d.by_g[g]))):
            ing = ref.parse_ts(f[3])
            for k in range(1, 3):
                ni = f1(ing + k * 1000 * d.rnd.randrange(1, 50))
                if ni in d.ingests[f[0]]:
                    continue
                d.ingests[f[0]].add(ni)
                g2 = list(f)
                g2[3] = ni
                d.split_lines.append(b",".join(g2))


def write_split_kind(d, out):
    d.write(out, files=(3, 3, 3))
    lines = d.split_lines
    d.rnd.shuffle(lines)
    i = 0
    n = 0
    while i < len(lines):
        k = d.rnd.choice([1, 1, 2, 3, 50, 400])
        part = lines[i:i + k]
        i += k
        body = EV_H + b"\n" + b"\n".join(part) + (b"\n" if d.rnd.random() < 0.7 else b"")
        with open(f"{out}/events/s{n:05d}.csv", "wb") as fh:
            fh.write(body)
        n += 1
        if d.rnd.random() < 0.1:
            with open(f"{out}/events/s{n:05d}h.csv", "wb") as fh:
                fh.write(EV_H + (b"\n" if d.rnd.random() < 0.5 else b""))
    d.notes.append(f"{n} scatter files")


def k_dupuser(d):
    d.notes.append("dupuser: copies naming different users, earlier and later ingest, across lanes")
    gs = sorted(d.by_g)
    odd_g = d.rnd.sample(gs[8:], 10)
    for g in odd_g:
        d.add_link(d.uid(g, 0), d.uid(d.rnd.choice(gs), 0))
    cands = [f for f in d.good_ev if f[0] in d.ingests and len(d.ingests[f[0]]) == 1]
    chosen = d.rnd.sample(cands, min(len(cands), max(200, len(cands) // 30)))
    stats = {}
    for i, f in enumerate(chosen):
        ing = ref.parse_ts(f[3])
        dd = gm.decode(f[1], d.key)
        mode = i % 12
        other_g = d.rnd.choice(gs)
        if mode in (0, 6):
            nu = d.uid(other_g, 0)
        elif mode in (1, 7):
            nu = f[1].upper()
        elif mode in (2, 8):
            nu = d.uid(dd[0], 16) if dd else b"x" + f[1]
        elif mode in (3, 9):
            nu = d.uid(d.rnd.choice(odd_g), 0)
        elif mode == 4:
            nu = kiosk_id(d, 1)
        elif mode == 10:
            nu = b"u0" + f[1][1:]
        else:
            nu = d.uid(other_g, d.rnd.choice(sorted(d.persons[other_g])))
        earlier = mode >= 6
        delta = d.rnd.randrange(1, 600) * 1000
        ni = ing - delta if earlier else ing + delta
        nib = f1(ni)
        if nib in d.ingests[f[0]]:
            continue
        d.ingests[f[0]].add(nib)
        g2 = list(f)
        g2[1] = nu
        g2[3] = nib
        if mode == 11 and earlier:
            g2[2] = b"2027-02-29T10:00:00Z"
        d.new_ev.append(g2)
        stats[mode] = stats.get(mode, 0) + 1
        if d.rnd.random() < 0.3:
            ni2 = f1(max(ing, ni) + d.rnd.randrange(1, 600) * 1000)
            if ni2 not in d.ingests[f[0]]:
                d.ingests[f[0]].add(ni2)
                g3 = list(f)
                g3[3] = ni2
                g3[1] = d.rnd.choice([f[1], nu, d.uid(d.rnd.choice(gs), 0), f[1].upper()])
                d.new_ev.append(g3)
    for i in range(100):
        g = d.rnd.choice(gs)
        f = d.rnd.choice(d.by_g[g])
        t = ref.parse_ts(f[2])
        eid = d.fresh_eid()
        ing = t // 1000 * 1000 + 5000
        users = [f[1].upper(), f[1], d.uid(g, 16), d.uid(d.rnd.choice(gs), 0)]
        d.rnd.shuffle(users)
        for k, u in enumerate(users):
            d.new_ev.append([eid, u, d.ts_text(t), f1(ing + k * 1000), b"purchase", b"p7", b"777"])
    d.notes.append(f"dup modes {sorted(stats.items())}")


def k_linkdirt(d):
    d.notes.append("linkdirt: malformed/empty-side cross lines (must not merge), CRLF link file, quoted sides")
    gs = sorted(d.by_g)
    raw = []
    for _ in range(300):
        a, b = d.rnd.sample(gs, 2)
        ua, ub = d.uid(a, 0), d.uid(b, 0)
        raw.append(d.rnd.choice([b'"' + ua + b"," + ub, ua + b"," + ub + b'"', ua + b",", b"," + ub,
                                 ua + b"," + ub + b",", ua + b'"",' + ub, ua + b',""', b'"",' + ub,
                                 ua + b"," + ub + b"\r", b'"' + ua + b'",' + ub + b"\r",
                                 ua + b" ," + ub, ua + b", " + ub]))
    d.extra_link_lines = raw
    for _ in range(50):
        a = d.rnd.choice(gs)
        d.new_lk.append([b'"' + d.uid(a, 0) + b'"', d.uid(a, d.rnd.choice(sorted(d.persons[a])))])


def k_rand(d, mode):
    """Consistent injective remap of every user ID."""
    seen = {}
    used = set()
    other_key = None
    if mode == "rekey":
        other_key = d.rnd.getrandbits(40)
        d.notes.append(f"rekey: new key {other_key:#x}")

    def fn(u):
        if u in seen:
            return seen[u]
        while True:
            if mode == "rand_str":
                n = d.rnd.randrange(1, 21)
                alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-.:/ "
                s = "".join(d.rnd.choice(alphabet) for _ in range(n)).encode()
            elif mode == "rand_canon":
                s = ("u" + gm.base36(d.rnd.getrandbits(40))).encode()
            else:
                dd = gm.decode(u, d.key)
                if dd is None:
                    s = u
                else:
                    x = dd[0] * 512 + dd[1]
                    s = ("u" + gm.base36(gm.scramble(x, other_key))).encode()
            if s and s not in used:
                break
            if mode == "rekey":
                raise SystemExit("rekey collision")
        used.add(s)
        seen[u] = s
        return s
    d.remap_users(fn)
    d.notes.append(f"{mode}: remapped {len(seen)} distinct user IDs")


def k_intra(d):
    """Per-person union-find stress: new aliases 8..15 with random forests inside one person,
    some generator intra-person lines malformed away (splitting persons), rows on every alias."""
    d.notes.append("intra: random alias forests over 0..15 inside persons; split persons; rows on all aliases")
    gs = sorted(g for g in d.by_g if g >= 8)
    chosen = set(d.rnd.sample(gs, min(300, len(gs))))
    for g in sorted(chosen):
        aliases = list(range(16))
        d.rnd.shuffle(aliases)
        k = d.rnd.randrange(1, 6)
        groups = [aliases[i::k] for i in range(k)]
        for grp in groups:
            if len(grp) < 2:
                continue
            shape = d.rnd.randrange(3)
            for i in range(1, len(grp)):
                if shape == 0:
                    a, b = grp[i - 1], grp[i]
                elif shape == 1:
                    a, b = grp[0], grp[i]
                else:
                    a, b = grp[d.rnd.randrange(i)], grp[i]
                d.add_link(d.uid(g, a), d.uid(g, b))
                if d.rnd.random() < 0.1:
                    d.add_link(d.uid(g, b), d.uid(g, a))
            if d.rnd.random() < 0.2:
                x = d.rnd.choice(grp)
                d.add_link(d.uid(g, x), d.uid(g, x))
        for a in d.rnd.sample(range(16), d.rnd.randrange(2, 9)):
            d.session_like(d.uid(g, a))
    out = []
    dropped = 0
    for line, f in d.lk:
        if f is not None and f[0] and f[1]:
            da, db = gm.decode(f[0], d.key), gm.decode(f[1], d.key)
            if da and db and da[0] == db[0] and da[0] not in chosen and d.rnd.random() < 0.05:
                out.append((b'"' + f[0] + b"," + f[1], None))
                dropped += 1
                continue
        out.append((line, f))
    d.lk = out
    d.notes.append(f"intra: {len(chosen)} persons rebuilt, {dropped} generator intra lines malformed")


KINDS = ["upper", "lzero", "noncanon", "xlinks", "kiosk", "alias16", "clickonly", "split", "dupuser",
         "linkdirt", "rand_str", "rand_canon", "rekey", "combined", "intra"]


def build(base, out, kind, seed, rng, cap_hint=None):
    d = DS(base, seed, random.Random(rng))
    d.extra_link_lines = []
    if kind == "split":
        k_split(d)
        write_split_kind(d, out)
        with open(out + ".notes.txt", "w") as fh:
            fh.write("\n".join(d.notes) + "\n")
        return d
    if kind in ("rand_str", "rand_canon", "rekey"):
        k_rand(d, kind)
    elif kind == "combined":
        for fn in (k_upper, k_lzero, k_noncanon, k_xlinks, k_kiosk, k_clickonly, k_dupuser, k_linkdirt):
            fn(d)
        k_alias16(d, cap_hint)
    elif kind == "alias16":
        k_alias16(d, cap_hint)
    else:
        globals()["k_" + kind](d)
    d.write(out)
    with open(out + ".notes.txt", "w") as fh:
        fh.write("\n".join(d.notes) + "\n")
    if d.extra_link_lines:
        body = LK_H + b"\r\n" + b"\n".join(d.extra_link_lines) + b"\n"
        with open(f"{out}/links/part-dirt.csv", "wb") as fh:
            fh.write(body)
    return d


if __name__ == "__main__":
    base, out, kind, seed = sys.argv[1:5]
    rng = int(sys.argv[5]) if len(sys.argv) > 5 else 1
    cap = int(sys.argv[6]) if len(sys.argv) > 6 else None
    d = build(base, out, kind, int(seed), rng, cap)
    print("\n".join(d.notes[:6]))
