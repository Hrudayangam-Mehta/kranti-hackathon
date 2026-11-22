#!/usr/bin/env python3
"""Verifier F2 mutation sets: attacks on the event-number buckets, boundary stitching and
irregular-person routing of stage F2.

The generator writes event IDs 'e' + base36(scramble(number, event_key)) with each person's
events numbered consecutively in time order (kit generator user.rs:151-158, 311-314,
plan.rs:209-216). These kinds re-number events (interleave, swap, scatter into free numbers,
reverse), craft new events at bucket edges and at the number cap, add copies across files with
other users and side-record ingests, add odd links, split persons, change categories and the
window. A random 10% of events is 'protected' (never changed); the first 6 event files and
first 5 link files hold only protected lines, so the engine's key samples see clean generator
rows and stage F2 stays on in automatic mode while the rest of the input is adversarial.

Every produced line keeps the rules' input guarantees: event copies with equal ingest_ts are
identical, click copies identical, ingest_ts valid F1, no comma/quote/newline inside a value.
Usage (library): build(base, out, kind, seed, rng) -> DS
"""
import datetime as dt
import json
import os
import random
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "verify"))
import genmodel as gm  # noqa: E402
import ref  # noqa: E402

EV_H = b"event_id,user_id,ts,ingest_ts,event_type,product_id,price_cents"
CK_H = b"click_id,user_id,campaign_id,ts"
LK_H = b"user_id_a,user_id_b"
SEC = 1000
MIN = 60_000
DAY = 86_400_000
WEEK = 7 * DAY
SLOTS = 1 << 15


def f1(t):
    return dt.datetime.fromtimestamp(t // 1000, dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ").encode()


def b36(v):
    return gm.base36(v).encode()


def decode(s, prefix, key):
    """Canonical prefix + base36 (1..8 digits, no leading zero, <= 2^40-1) -> unscrambled number."""
    if len(s) < 2 or len(s) > 9 or s[:1] != prefix:
        return None
    body = s[1:]
    if any(c not in b"0123456789abcdefghijklmnopqrstuvwxyz" for c in body):
        return None
    if len(body) > 1 and body[:1] == b"0":
        return None
    v = int(body, 36)
    if v > gm.MASK40:
        return None
    return gm.unscramble(v, key)


def ncap_of(event_bytes, bits=15):
    slots = 1 << bits
    raw = min(max(event_bytes // 30 + 65536, 1), 1 << 36)
    return -(-raw // slots) * slots


def gcap_of(event_bytes):
    return min(max(event_bytes // 60 // 30 * 2 + 1024, 1), 1 << 31)


class DS:
    def __init__(self, base, seed, rnd, protect=0.10):
        self.base = base
        self.rnd = rnd
        self.seed = seed
        ws, uk, ek, ck = gm.plan_keys(seed)
        self.uk, self.ek, self.ck = uk & gm.MASK40, ek & gm.MASK40, ck & gm.MASK40
        man = json.load(open(f"{base}/manifest.json"))
        self.manifest = man
        self.ws = ref.parse_ts(man["window_start"].encode())
        self.we = ref.parse_ts(man["window_end"].encode())
        self.cws = self.ws - WEEK
        self.ev = self._rows("events", 7)
        self.ck_rows = self._rows("clicks", 4)
        self.lk = self._rows("links", 2)
        self.products = open(f"{base}/products.csv", "rb").read()
        self.campaigns_txt = open(f"{base}/campaigns.csv", "rb").read()
        self.camps = [l.split(b",")[0] for l in self.campaigns_txt.split(b"\n")[1:] if l]
        self.notes = []
        self.new_ev, self.new_ck, self.new_lk = [], [], []
        self.extra_ev_lines = []
        self.n = 0
        # per event id: copies (indexes into self.ev), number, owner person g
        self.copies = {}
        for i, (line, f) in enumerate(self.ev):
            if f is not None and f[0]:
                self.copies.setdefault(f[0], []).append(i)
        self.num = {}
        self.used_nums = set()
        for eid in self.copies:
            n = decode(eid, b"e", self.ek)
            self.num[eid] = n
            if n is not None:
                self.used_nums.add(n)
        self.E = max(self.used_nums) + 1
        self.owner = {}
        self.persons = {}
        for eid, idx in self.copies.items():
            gs = {}
            for i in idx:
                d = gm.decode(self.ev[i][1][1], self.uk)
                if d is not None:
                    gs[d[0]] = gs.get(d[0], 0) + 1
                    self.persons.setdefault(d[0], set()).add(d[1])
            if gs:
                self.owner[eid] = max(gs, key=gs.get)
        for _, f in self.ck_rows + self.lk:
            if f is None:
                continue
            for u in (f[1:2] if len(f) == 4 else f):
                d = gm.decode(u, self.uk)
                if d is not None and d[0] < (1 << 29):
                    self.persons.setdefault(d[0], set()).add(d[1])
        eids = sorted(self.copies)
        rnd.shuffle(eids)
        k = int(len(eids) * protect)
        self.protected = set(e for e in eids[:k] if self.num.get(e) is not None)
        self.by_owner = {}
        for eid, g in self.owner.items():
            if self.num.get(eid) is not None:
                self.by_owner.setdefault(g, []).append(eid)
        for g in self.by_owner:
            self.by_owner[g].sort(key=lambda e: self.num[e])
        self.ingests = {eid: {self.ev[i][1][3] for i in idx} for eid, idx in self.copies.items()}
        self.evid = set(self.copies)
        self.ckid = {f[0] for _, f in self.ck_rows if f is not None}
        self.renum = {}
        self.renum_new = {}
        self.good = []
        for eid, idx in self.copies.items():
            f = self.ev[idx[0]][1]
            t = ref.parse_ts(f[2])
            if t is not None and self.ws <= t < self.we and f[1]:
                self.good.append(eid)
        self.gmax = max(self.persons)
        self.est_bytes = sum(len(l) + 1 for l, _ in self.ev)
        self.free_lo = self.E
        self.free_hi = ncap_of(self.est_bytes) - 1
        self.cap_targets = []

    # ------------------------------------------------------------ helpers
    def _rows(self, sub, n):
        out = []
        for p in ref.csv_files(f"{self.base}/{sub}"):
            for line in ref.data_lines(p):
                out.append((line, ref.parse_line(line, n)))
        return out

    def uid(self, g, a):
        return gm.user_id(g * 512 + a, self.uk).encode()

    def eid_of(self, n):
        return b"e" + b36(gm.scramble(n, self.ek))

    def mutable(self, eid):
        return eid not in self.protected and self.num.get(eid) is not None

    def person_events(self, g):
        return [e for e in self.by_owner.get(g, []) if self.mutable(e)]

    def ts_text(self, t):
        r = self.rnd.random()
        if t % 1000 or r < 0.35:
            return str(t).encode() if self.rnd.random() < 0.9 else b"000" + str(t).encode()
        if r < 0.8:
            return f1(t)
        off = self.rnd.choice([-600, -570, -240, 0, 330, 345, 720])
        loc = t + off * MIN
        s = f1(loc)[:-1]
        sign = b"+" if off >= 0 or self.rnd.random() < 0.5 else b"-"
        if off < 0:
            sign = b"-"
        a = abs(off)
        return s + sign + b"%02d:%02d" % (a // 60, a % 60)

    def fresh_cid(self, kind=None):
        while True:
            self.n += 1
            c = b"k" + b36(self.rnd.getrandbits(40)) if kind is None else kind
            if c not in self.ckid:
                self.ckid.add(c)
                return c
            if kind is not None:
                return None

    def free_number(self):
        while True:
            n = self.rnd.randrange(self.free_lo, self.free_hi)
            if n not in self.used_nums:
                self.used_nums.add(n)
                return n

    def new_event(self, eid, user, t, ing=None, typ=None, price=None, prod=None, copies=None):
        """Add a brand-new event (eid must be new). copies: list of (ingest_ms, field overrides)."""
        if eid in self.evid:
            return None
        self.evid.add(eid)
        n = decode(eid, b"e", self.ek)
        if n is not None:
            self.used_nums.add(n)
        typ = typ or self.rnd.choice([b"view", b"view", b"cart", b"purchase"])
        if price is None:
            price = str(self.rnd.randrange(100, 50000)).encode() if typ == b"purchase" else b""
        prod = prod or b"p%d" % self.rnd.randrange(1, 50001)
        ing = ing if ing is not None else (t // 1000 * 1000 + self.rnd.randrange(0, 600) * 1000)
        base = [eid, user, self.ts_text(t), f1(ing), typ, prod, price]
        self.new_ev.append(base)
        seen = {base[3]: base}
        for c_ing, over in copies or []:
            row = list(base)
            row[3] = f1(c_ing)
            for k, v in over.items():
                row[k] = v
            if row[3] in seen:
                if seen[row[3]] != row:
                    continue
            seen[row[3]] = row
            self.new_ev.append(row)
        self.ingests[eid] = set(seen)
        return eid

    def add_copy(self, eid, row):
        """Add one more copy of an existing event; refuses an ingest already used by that event."""
        if row[3] in self.ingests.setdefault(eid, set()):
            return False
        self.ingests[eid].add(row[3])
        self.new_ev.append(row)
        return True

    def add_click(self, user, t, camp=None, cid=None):
        camp = camp or self.rnd.choice(self.camps)
        cid = cid or self.fresh_cid()
        if cid is None:
            return
        self.new_ck.append([cid, user, camp, self.ts_text(t)])

    def add_link(self, a, b):
        if self.rnd.random() < 0.5:
            a, b = b, a
        self.new_lk.append([a, b])

    def first_valid(self, eid):
        f = self.ev[self.copies[eid][0]][1]
        return f

    def renumber(self, mapping):
        """mapping: eid -> new number. New numbers must be free or freed by the same mapping."""
        targets = list(mapping.values())
        assert len(set(targets)) == len(targets)
        old = {self.num[e] for e in mapping}
        for n in targets:
            assert n not in self.used_nums or n in old, n
        for e, n in mapping.items():
            assert e not in self.protected
            self.renum[e] = self.eid_of(n)
        self.used_nums -= old
        self.used_nums |= set(targets)
        for e, n in mapping.items():
            self.num[e] = n

    def write(self, out, files=40, link_files=8, click_files=12):
        shutil.rmtree(out, ignore_errors=True)
        os.makedirs(out)
        open(f"{out}/products.csv", "wb").write(self.products)
        open(f"{out}/campaigns.csv", "wb").write(self.campaigns_txt)
        with open(f"{out}/manifest.json", "w") as fh:
            json.dump(self.manifest, fh)
        rq = lambda fields: b",".join(b'"' + x + b'"' if self.rnd.random() < 0.2 else x for x in fields)  # noqa: E731
        prot_lines, other_lines = [], []
        for line, f in self.ev:
            if f is not None and f[0] in self.renum:
                parts = line.split(b",")
                q = parts[0][:1] == b'"'
                nid = self.renum[f[0]]
                parts[0] = b'"' + nid + b'"' if q else nid
                line = b",".join(parts)
            if f is not None and f[0] in self.protected:
                prot_lines.append(line)
            else:
                other_lines.append(line)
        new_rows = []
        for r in self.new_ev:
            if r[0] in self.renum_new:
                r = [self.renum_new[r[0]]] + r[1:]
            new_rows.append(rq(r))
        other_lines += new_rows + self.extra_ev_lines
        self.rnd.shuffle(prot_lines)
        ev_dir = f"{out}/events"
        os.makedirs(ev_dir)
        at = 0
        for i in range(6):
            chunk = prot_lines[at:at + 1100]
            at += 1100
            open(f"{ev_dir}/a{i:04d}.csv", "wb").write(EV_H + b"\n" + b"\n".join(chunk) + b"\n")
        other_lines += prot_lines[at:]
        split_zipf(ev_dir, EV_H, other_lines, self.rnd, files, "p")
        lk_prot, lk_other = [], []
        for line, f in self.lk:
            (lk_prot if (f is not None and self.rnd.random() < 0.5 and len(lk_prot) < 2700) else lk_other).append(line)
        lk_other += [rq(r) for r in self.new_lk]
        lk_dir = f"{out}/links"
        os.makedirs(lk_dir)
        for i in range(5):
            chunk = lk_prot[i * 540:(i + 1) * 540]
            open(f"{lk_dir}/a{i:04d}.csv", "wb").write(LK_H + b"\n" + b"\n".join(chunk) + b"\n")
        lk_other += lk_prot[5 * 540:]
        split_zipf(lk_dir, LK_H, lk_other, self.rnd, link_files, "p")
        ck_lines = [l for l, _ in self.ck_rows] + [rq(r) for r in self.new_ck]
        ck_dir = f"{out}/clicks"
        os.makedirs(ck_dir)
        split_zipf(ck_dir, CK_H, ck_lines, self.rnd, click_files, "p")
        self.out = out
        return sum(os.path.getsize(f"{ev_dir}/{x}") for x in os.listdir(ev_dir) if x.endswith(".csv"))


def split_zipf(folder, header, lines, rnd, k, prefix):
    rnd.shuffle(lines)
    weights = [1.0 / (i + 1) for i in range(k)]
    rnd.shuffle(weights)
    tot = sum(weights)
    at = 0
    for i, w in enumerate(weights):
        n = int(len(lines) * w / tot) if i < k - 1 else len(lines) - at
        part = lines[at:at + n]
        at += n
        body = header + b"\n" + b"\n".join(part)
        if part and rnd.random() < 0.85:
            body += b"\n"
        open(f"{folder}/{prefix}{i:05d}.csv", "wb").write(body)
    for j in range(rnd.randrange(1, 4)):
        open(f"{folder}/{prefix}z{j}.csv", "wb").write(rnd.choice([header, header + b"\n"]))


# ------------------------------------------------------------------ kinds
def persons_by_size(d, lo=1, hi=10 ** 9, exclude=()):
    return [g for g, es in d.by_owner.items() if lo <= len(es) <= hi and g not in exclude]


def k_interleave(d):
    """Adjacent persons' events interleaved in number order: every event its own run."""
    gs = sorted(d.by_owner, key=lambda g: d.num[d.by_owner[g][0]])
    pairs = [(0, 1), (2, 3)]
    pos = {g: i for i, g in enumerate(gs)}
    cand = [g for g in gs if len(d.by_owner[g]) >= 3 and g > 7]
    for g in d.rnd.sample(cand, min(60, len(cand))):
        i = pos[g]
        if i + 1 < len(gs):
            pairs.append((g, gs[i + 1]))
    triples = []
    for g in d.rnd.sample(cand, min(10, len(cand))):
        i = pos[g]
        if i + 2 < len(gs):
            triples.append((g, gs[i + 1], gs[i + 2]))
    done = set()
    total = 0
    for grp in [list(p) for p in pairs] + [list(t) for t in triples]:
        if any(g in done for g in grp) or any(g not in d.by_owner for g in grp):
            continue
        done.update(grp)
        lists = [d.person_events(g) for g in grp]
        nums = sorted(d.num[e] for L in lists for e in L)
        order = []
        while any(lists):
            for L in lists:
                if L:
                    order.append(L.pop(0))
        mapping = {e: n for e, n in zip(order, nums)}
        d.renumber(mapping)
        total += len(mapping)
    d.notes.append(f"interleave: {len(done)} persons, {total} events re-numbered (whales 0-3 included)")


def k_swap(d):
    """Random swaps of event numbers between persons; extra swaps across bucket edges."""
    pool = [e for e in d.num if d.mutable(e)]
    nswap = max(50, len(pool) // 200)
    swapped = set()
    count = 0
    for _ in range(nswap):
        a, b = d.rnd.sample(pool, 2)
        if a in swapped or b in swapped or d.owner.get(a) == d.owner.get(b):
            continue
        swapped |= {a, b}
        d.renumber({a: d.num[b], b: d.num[a]})
        count += 1
    by_num = {d.num[e]: e for e in pool if e not in swapped}
    edge = 0
    for k in range(1, d.E // SLOTS + 1):
        lo, hi = by_num.get(k * SLOTS - 1), by_num.get(k * SLOTS)
        far = by_num.get(k * SLOTS - 1 - d.rnd.randrange(1, 5000))
        if lo and hi and far and len({lo, hi, far}) == 3 and d.owner.get(lo) != d.owner.get(far):
            d.renumber({lo: d.num[far], far: d.num[lo]})
            edge += 1
    d.notes.append(f"swap: {count} random swaps, {edge} swaps at bucket edges")


def k_scatter(d):
    """Events moved to free numbers above the generator's range: runs in far buckets; whale 2
    moved to a block straddling a bucket edge; whale 3 spread over every free bucket."""
    gs = persons_by_size(d, 2, exclude={0, 1, 2, 3, 4, 5, 6, 7})
    moved = 0
    for g in d.rnd.sample(gs, min(300, len(gs))):
        evs = d.person_events(g)
        frac = d.rnd.choice([0.3, 0.6, 1.0])
        sel = [e for e in evs if d.rnd.random() < frac]
        m = {}
        for e in sel:
            m[e] = d.free_number()
        d.used_nums -= set(m.values())
        d.renumber(m)
        moved += len(m)
    for w in (2, 3):
        evs = d.person_events(w)
        if not evs:
            continue
        if w == 2:
            half = min(len(evs) // 2, 4000)
            first_edge = ((d.free_lo + half) // SLOTS + 1) * SLOTS
            start = first_edge - half
            nums = [start + i for i in range(len(evs))]
            if any(n in d.used_nums for n in nums) or nums[-1] >= d.free_hi:
                continue
        else:
            nums = []
            while len(nums) < len(evs):
                n = d.free_number()
                nums.append(n)
            d.used_nums -= set(nums)
            nums.sort()
        d.renumber(dict(zip(evs, nums)))
        moved += len(evs)
    d.notes.append(f"scatter: {moved} events moved to free numbers [{d.free_lo}, {d.free_hi}]")


def k_reverse(d):
    """Persons whose numbering runs against time (reversed or shuffled): the order check fails."""
    gs = persons_by_size(d, 3, exclude={0, 1, 2, 3, 5, 6, 7})
    sel = d.rnd.sample(gs, min(300, len(gs))) + [4]
    n = 0
    for i, g in enumerate(sel):
        evs = d.person_events(g)
        nums = [d.num[e] for e in evs]
        if i % 2 == 0 or g == 4:
            new = list(reversed(nums))
        else:
            new = nums[:]
            d.rnd.shuffle(new)
        d.renumber(dict(zip(evs, new)))
        n += len(evs)
    d.notes.append(f"reverse: {len(sel)} persons (whale 4 reversed), {n} events")


def k_bigrun(d):
    """Whale 0's events alternate with other persons' events: one person with thousands of runs."""
    w = d.person_events(0)
    others = []
    for g in persons_by_size(d, 1, exclude={0, 1, 2, 3, 4, 5, 6, 7}):
        others += d.person_events(g)
        if len(others) >= len(w):
            break
    others = others[:len(w)]
    nums = sorted(d.num[e] for e in w + others)
    order = []
    for a, b in zip(w, others):
        order += [a, b]
    order += w[len(others):]
    d.renumber(dict(zip(order, nums)))
    d.notes.append(f"bigrun: whale 0 has {len(w)} mutable events alternating with {len(others)} others")


def session_starts(d, g):
    ts = sorted(ref.parse_ts(d.first_valid(e)[2]) for e in d.by_owner.get(g, [])
                if ref.parse_ts(d.first_valid(e)[2]) is not None)
    ts = [t for t in ts if d.ws <= t < d.we]
    starts = []
    prev = None
    for t in ts:
        if prev is None or t - prev > 30 * MIN:
            starts.append(t)
        prev = t
    return ts, starts


def k_boundary(d):
    """New events at bucket edges and around the number cap, for persons whose other events are
    elsewhere, timed to merge, bridge, extend or exactly-touch their existing sessions."""
    gs = persons_by_size(d, 2, exclude={5, 6, 7})
    nums = set()
    for k in range(d.free_lo // SLOTS, d.free_hi // SLOTS + 1):
        for n in (k * SLOTS - 1, k * SLOTS, k * SLOTS + 1, k * SLOTS + SLOTS // 2):
            if d.free_lo <= n < d.free_hi and n not in d.used_nums:
                nums.add(n)
    nums |= {d.free_lo, d.free_lo + 1}
    made = 0
    for n in sorted(nums):
        g = d.rnd.choice(gs[:50] if d.rnd.random() < 0.3 else gs)
        made += craft_for(d, g, n)
    d.cap_targets = [(g, d.rnd.choice(sorted(d.persons[g]))) for g in d.rnd.sample(gs, 12)]
    d.notes.append(f"boundary: {made} events at {len(nums)} edge numbers; cap events added at write time")


def craft_for(d, g, n, eid=None):
    """One crafted event of person g at number n, timed against g's sessions."""
    ts, starts = session_starts(d, g)
    if not ts:
        return 0
    a = d.rnd.choice(sorted(d.persons[g])) if d.rnd.random() < 0.5 else min(d.persons[g])
    if a >= 16:
        a = min(d.persons[g])
    user = d.uid(g, a)
    mode = d.rnd.randrange(6)
    s = d.rnd.choice(starts)
    if mode == 0:
        t = s - 30 * MIN
    elif mode == 1:
        t = s - 30 * MIN - 1
    elif mode == 2:
        t = s - d.rnd.randrange(1, 30 * MIN)
    elif mode == 3:
        i = d.rnd.randrange(len(ts))
        t = ts[i] + d.rnd.choice([0, 1, 30 * MIN, 30 * MIN + 1])
    elif mode == 4:
        t = s
    else:
        t = s + d.rnd.randrange(0, 20 * MIN)
    if not (d.ws <= t < d.we):
        return 0
    eid = eid or d.eid_of(n)
    if eid in d.evid:
        return 0
    d.used_nums.add(n)
    ing = t // 1000 * 1000 + d.rnd.randrange(0, 900) * 1000
    copies = []
    if d.rnd.random() < 0.4:
        copies.append((ing + d.rnd.randrange(1, 600) * 1000, {1: d.uid(d.rnd.choice(sorted(d.by_owner)), 0)}))
    if d.rnd.random() < 0.2:
        copies.append((ing - d.rnd.randrange(1, 600) * 1000, {2: b"2027-02-29T10:00:00Z"}))
    d.new_event(eid, user, t, ing=ing, typ=d.rnd.choice([b"view", b"purchase", b"cart"]), copies=copies)
    return 1


def add_cap_events(d, ncap):
    """Events at ncap-1 (last slot, bucket) and ncap, ncap+1 (general dedup), 2^40-1, for persons
    with events in bucket 0. Called after the size is known."""
    made = []
    for i, n in enumerate([ncap - 1, ncap - 2, ncap - SLOTS, ncap, ncap + 1, ncap + SLOTS, gm.MASK40]):
        if n in d.used_nums:
            continue
        g, a = d.cap_targets[i % len(d.cap_targets)]
        eid = d.eid_of(n)
        if eid in d.evid:
            continue
        d.used_nums.add(n)
        if craft_for(d, g, n, eid):
            made.append(n)
    return made


def k_oddmix(d):
    """Persons made odd (alias 16, cross-person, upper-case, kiosk links) with events swapped into
    Lane F runs; whale 1 odd; an odd person with crafted events in far buckets."""
    gs = persons_by_size(d, 2, exclude={0, 2, 3, 4, 5, 6, 7})
    odd = d.rnd.sample(gs, min(120, len(gs))) + [1]
    for i, g in enumerate(odd):
        m = i % 5
        if m == 0:
            d.add_link(d.uid(g, 0), d.uid(g, 16))
        elif m == 1:
            d.add_link(d.uid(g, 0), d.uid(d.rnd.choice(gs), 0))
        elif m == 2:
            d.add_link(d.uid(g, 0), d.uid(g, 0).upper())
        elif m == 3:
            d.add_link(d.uid(g, 0), gm.user_id(gm.KIOSK_BASE + d.rnd.randrange(1, 9), d.uk).encode())
        else:
            d.add_link(d.uid(g, 1), d.uid(g, 17))
    pool_f = [e for e in d.num if d.mutable(e) and d.owner.get(e) not in set(odd)]
    swaps = 0
    taken = set()
    for g in odd:
        for e in d.person_events(g)[:20]:
            f = d.rnd.choice(pool_f)
            if f in taken or e in taken:
                continue
            taken |= {e, f}
            d.renumber({e: d.num[f], f: d.num[e]})
            swaps += 1
    far = 0
    for g in odd[:30]:
        for _ in range(3):
            far += craft_for(d, g, d.free_number())
    d.notes.append(f"oddmix: {len(odd)} odd persons (whale 1 odd), {swaps} swaps into Lane F runs, {far} far events")


def k_dupcross(d):
    """Copies of events across files with other users, side-record and clamped ingests,
    invalid earliest copies; new events whose every copy is clamped."""
    gs = sorted(d.by_owner)
    odd_g = d.rnd.sample(gs[8:], 8)
    for g in odd_g:
        d.add_link(d.uid(g, 0), d.uid(g, 16))
    cands = [e for e in d.good if d.mutable(e)]
    chosen = d.rnd.sample(cands, min(len(cands), max(300, len(cands) // 40)))
    stats = {}
    for i, e in enumerate(chosen):
        f = list(d.first_valid(e))
        ing = ref.parse_ts(f[3])
        t = ref.parse_ts(f[2])
        mode = i % 14
        row = list(f)
        if mode == 0:
            row[1] = d.uid(d.rnd.choice(gs), 0)
            row[3] = f1(ing - d.rnd.randrange(1, 600) * 1000)
        elif mode == 1:
            row[1] = f[1].upper()
            row[3] = f1(ing - 1000)
        elif mode == 2:
            row[1] = d.uid(d.rnd.choice(odd_g), 0)
            row[3] = f1(ing - 2000)
        elif mode == 3:
            row[3] = b"2000-01-01T00:00:00Z"
            row[1] = d.uid(d.rnd.choice(gs), d.rnd.randrange(16))
        elif mode == 4:
            row[3] = b"1970-01-01T00:00:00Z"
            row[2] = b"2027-13-01T00:00:00Z"
        elif mode == 5:
            row[3] = b"9999-12-31T23:59:59Z"
            row[1] = d.uid(d.rnd.choice(gs), 0)
        elif mode == 6:
            row[3] = f1(d.cws)
            row[1] = d.uid(d.rnd.choice(gs), 1)
        elif mode == 7:
            row[3] = f1(d.cws - 1000)
            row[4] = b"Purchase"
        elif mode == 8:
            row[3] = f1(ing - 3000)
            row[5] = b""
        elif mode == 9:
            row[3] = f1(ing - 4000)
            row[4] = b"purchase"
            row[6] = b"0"
        elif mode == 10:
            row[3] = f1(ing - 5000)
            row[1] = b""
        elif mode == 11:
            row[3] = f1(t + DAY + 1000 if t % 1000 == 0 else t - t % 1000 + DAY + 2000)
            if ref.parse_ts(row[3]) >= ing:
                row[3] = f1(ing - 6000)
                row[2] = str(ref.parse_ts(row[3]) - DAY - 1).encode()
        elif mode == 12:
            row[3] = f1(ing + d.rnd.randrange(1, 600) * 1000)
            row[1] = d.uid(d.rnd.choice(gs), 0)
        else:
            row[3] = f1(ing - 7000)
            row[1] = b"u0" + f[1][1:] if f[1][:1] == b"u" else b"x" + f[1]
        if d.add_copy(e, row):
            stats[mode] = stats.get(mode, 0) + 1
    clamp = 0
    for _ in range(200):
        g = d.rnd.choice(gs)
        ts, starts = session_starts(d, g)
        if not ts:
            continue
        t = d.rnd.choice(ts)
        n = d.free_number() if d.rnd.random() < 0.7 else None
        eid = d.eid_of(n) if n is not None else b"e" + b36(d.rnd.getrandbits(40))
        if eid in d.evid:
            continue
        big = [b"2099-01-01T00:00:00Z", b"9999-12-31T23:59:59Z", b"2500-06-30T12:00:00Z"]
        base_ing = ref.parse_ts(d.rnd.choice(big))
        cps = [(base_ing - 1000 * k, {1: d.uid(d.rnd.choice(gs), 0)}) for k in range(1, d.rnd.randrange(2, 4))]
        d.new_event(eid, d.uid(g, 0), t, ing=base_ing, copies=cps)
        clamp += 1
    d.notes.append(f"dupcross: copy modes {sorted(stats.items())}; {clamp} new events with only clamped ingests")


def k_evid(d):
    """Non-canonical event IDs (distinct events) that a lax decoder could merge with canonical
    ones; canonical IDs above the number cap; 'e', 'e0'."""
    cands = [e for e in d.good if d.mutable(e)]
    made = 0
    for e in d.rnd.sample(cands, min(400, len(cands))):
        f = list(d.first_valid(e))
        body = e[1:].decode()
        v = int(body, 36)
        j = d.rnd.randrange(len(body))
        variants = ["E" + body, "e" + body[:j] + body[j].upper() + body[j + 1:], "e0" + body, "e00" + body,
                    "e" + gm.base36(v + (1 << 40)), "e" + gm.base36(v + 36 * (1 << 40)), "ee" + body,
                    "e" + body + "0", "e" + body[:-1] if len(body) > 1 else "e0" + body, "e_" + body,
                    "e" + body.replace("0", "٠"), " e" + body, "e" + body + " ", "e" + body + "é"]
        for w in d.rnd.sample(variants, 3):
            w = w.encode("utf-8")
            if w in d.evid or b"," in w:
                continue
            ing = ref.parse_ts(f[3])
            row = list(f)
            row[0] = w
            d.new_event(w, row[1], ref.parse_ts(f[2]), ing=ing + d.rnd.randrange(0, 5) * 1000,
                        typ=row[4] if row[4] in (b"view", b"cart", b"purchase") else b"view",
                        price=row[6] if row[4] == b"purchase" else None, prod=row[5] or None)
            made += 1
    for w in (b"e", b"e0", b"e1", b"ez", b"e00", b"e01", b"ezzzzzzzz", b"e" + b36(gm.MASK40), b"e" + b36(gm.MASK40 + 1)):
        if w in d.evid:
            continue
        g = d.rnd.choice(sorted(d.by_owner))
        ts, _ = session_starts(d, g)
        if ts:
            d.new_event(w, d.uid(g, 0), d.rnd.choice(ts))
            made += 1
    d.notes.append(f"evid: {made} non-canonical / out-of-range event IDs as distinct events")


def k_components(d):
    """Persons split into several alias components (new forests on aliases 0-15, 5% of generator
    intra-person lines malformed), with their events swapped across buckets and clicks on every
    component."""
    gs = persons_by_size(d, 3, exclude={0, 1, 2, 3, 4, 5, 6, 7})
    chosen = set(d.rnd.sample(gs, min(250, len(gs))))
    for g in sorted(chosen):
        aliases = list(range(16))
        d.rnd.shuffle(aliases)
        k = d.rnd.randrange(1, 6)
        for grp in (aliases[i::k] for i in range(k)):
            for i in range(1, len(grp)):
                d.add_link(d.uid(g, grp[d.rnd.randrange(i)]), d.uid(g, grp[i]))
        ts, starts = session_starts(d, g)
        for a in d.rnd.sample(range(16), d.rnd.randrange(2, 7)):
            if ts:
                for _ in range(d.rnd.randrange(1, 4)):
                    t = d.rnd.choice(ts) + d.rnd.randrange(-600, 600) * 1000
                    if d.ws <= t < d.we:
                        d.new_event(d.eid_of(d.free_number()), d.uid(g, a), t)
                if starts:
                    s = d.rnd.choice(starts)
                    d.add_click(d.uid(g, a), s - d.rnd.choice([0, 1000, 3600_000, WEEK]))
    out = []
    dropped = 0
    for line, f in d.lk:
        if f is not None and f[0] and f[1]:
            da, db = gm.decode(f[0], d.uk), gm.decode(f[1], d.uk)
            if da and db and da[0] == db[0] and da[0] not in chosen and d.rnd.random() < 0.05:
                out.append((b'"' + f[0] + b"," + f[1], None))
                dropped += 1
                continue
        out.append((line, f))
    d.lk = out
    pool = [e for e in d.num if d.mutable(e)]
    sw = 0
    taken = set()
    for g in sorted(chosen):
        for e in d.person_events(g)[:6]:
            o = d.rnd.choice(pool)
            if o in taken or e in taken or d.owner.get(o) == g:
                continue
            taken |= {e, o}
            d.renumber({e: d.num[o], o: d.num[e]})
            sw += 1
    d.notes.append(f"components: {len(chosen)} persons split into forests, {dropped} intra lines malformed, {sw} swaps")


CATNAMES = [b"apparel", b"unknowm", b"unknown_", b"unknowo", b"uo", b"UNKNOWN", b"Unknown", b"unk", b"aaa", b"zzz",
            b"~tilde", b"_under", b"0digits", b"9", b"\xc3\xa9t\xc3\xa9", b"\xe6\x97\xa5\xe6\x9c\xac", b"A", b"a",
            b"b", b"books", b"bookz", b"toys", b"video_games", b"Z"]


def k_cats(d, count=None):
    """products.csv with many categories (ranks 32 and up become side records), odd names around
    'unknown', and sessions whose top category ties."""
    count = count or d.rnd.choice([33, 40, 64, 200, 254])
    names = list(CATNAMES)
    while len(names) < count:
        names.append(b"c%03d_" % len(names) + b36(d.rnd.getrandbits(20)))
    names = names[:count]
    lines = [b"product_id,category"]
    prod_cat = {}
    for pid in range(1, 50001):
        c = d.rnd.choice(names)
        prod_cat[pid] = c
        lines.append(b"p%d,%s" % (pid, c))
    d.products = b"\n".join(lines) + b"\n"
    gs = persons_by_size(d, 2, exclude={5, 6, 7})
    ties = 0
    by_cat = {}
    for pid, c in prod_cat.items():
        by_cat.setdefault(c, []).append(pid)
    for g in d.rnd.sample(gs, min(300, len(gs))):
        ts, starts = session_starts(d, g)
        if not starts:
            continue
        s = d.rnd.choice(starts)
        c1, c2 = d.rnd.sample(names, 2)
        price = d.rnd.randrange(100, 9000)
        for c in (c1, c2):
            pid = d.rnd.choice(by_cat[c])
            n = d.free_number() if d.rnd.random() < 0.6 else None
            eid = d.eid_of(n) if n is not None else b"x" + b36(d.rnd.getrandbits(40))
            if eid in d.evid:
                continue
            d.new_event(eid, d.uid(g, min(a for a in d.persons[g] if a < 16) if any(a < 16 for a in d.persons[g]) else 0),
                        s + d.rnd.randrange(0, 60) * 1000, typ=b"purchase", price=str(price).encode(), prod=b"p%d" % pid)
        if d.rnd.random() < 0.3:
            n = d.free_number()
            d.new_event(d.eid_of(n), d.uid(g, 0), s + 5000, typ=b"purchase", price=str(price).encode(),
                        prod=b"P%d" % d.rnd.randrange(1, 50001))
        ties += 1
    d.notes.append(f"cats: {count} categories (names incl. {names[:8]}), {ties} tie sessions")


def k_clickties(d):
    """Clicks at exact session boundaries and same-millisecond groups with IDs of every shape,
    on several aliases (other components) of Lane F persons, single- and multi-run."""
    gs = persons_by_size(d, 2, exclude={5, 6, 7})
    shapes = [b"k1", b"k10", b"k2", b"k", b"kA", b"k_", b"K1", b"k\xc3\xa4", b"kzzzzzzzzzzzz", b"kzzzzzzzzzzzy",
              b"kabcdefghi", b"kabcdefgh", b"k0", b"k00", b"k9999999999", b"k~", b"k ", b" k1"]
    made = 0
    for g in d.rnd.sample(gs, min(250, len(gs))) + [0, 1, 2, 3, 4]:
        ts, starts = session_starts(d, g)
        if not starts:
            continue
        s = d.rnd.choice(starts)
        aliases = sorted(a for a in d.persons.get(g, {0}) if a < 16) or [0]
        offs = [0, -1, 1, -WEEK, -WEEK - 1, -WEEK + 1]
        for off in offs:
            d.add_click(d.uid(g, d.rnd.choice(aliases)), s + off)
            made += 1
        t = s - d.rnd.randrange(0, 3 * DAY // 1000) * 1000
        for sh in d.rnd.sample(shapes, 5):
            cid = sh + b"_" + b36(d.rnd.getrandbits(30)) if d.rnd.random() < 0.5 else sh + b36(made)
            if cid in d.ckid or b"," in cid:
                continue
            d.ckid.add(cid)
            d.add_click(d.uid(g, d.rnd.choice(aliases)), t, cid=cid)
            made += 1
    d.notes.append(f"clickties: {made} boundary and same-ms clicks")


def k_window(d, mode=None):
    """Manifest windows of other lengths and starts (F2 guards at 16.27 days), with rows of 30%
    of persons shifted in time so the longer windows hold events past day 14."""
    import zlib
    choices = {"w1d": (0, 1 * DAY), "w7d_noon": (13 * 3600_000 + 37 * 60_000 + 11_000, 7 * DAY),
               "w16d": (0, 16 * DAY), "w_guard": (0, 1_405_951_000), "w_guard1": (0, 1_405_952_000),
               "w17d": (0, 17 * DAY), "w18d": (0, 18 * DAY), "w25d": (0, 25 * DAY), "w40d": (0, 40 * DAY),
               "w13d_late": (5 * 3600_000, 13 * DAY + 3_000)}
    mode = mode or d.rnd.choice(sorted(choices))
    off, length = choices[mode]
    ws = d.ws + off
    we = ws + length
    d.manifest = {"window_start": f1(ws).decode(), "window_end": f1(we).decode()}
    shift_max = max(0, length - 14 * DAY)
    moved = 0
    if shift_max > 0:
        gs = sorted(d.by_owner)
        sel = set(g for g in gs if zlib.crc32(b"%d" % g) % 10 < 3 and g > 7)
        shifts = {g: d.rnd.randrange(0, shift_max // 1000) * 1000 for g in sel}
        new_ev = []
        for line, f in d.ev:
            if f is None:
                new_ev.append((line, f))
                continue
            dd = gm.decode(f[1], d.uk)
            g = d.owner.get(f[0])
            if g in shifts and f[0] not in d.protected:
                sh = shifts[g]
                t = ref.parse_ts(f[2])
                row = list(f)
                if t is not None:
                    row[2] = shift_text(f[2], t, sh)
                row[3] = f1(ref.parse_ts(f[3]) + sh)
                new_ev.append((b",".join(row), row))
                moved += 1
            else:
                new_ev.append((line, f))
        d.ev = new_ev
        new_ck = []
        for line, f in d.ck_rows:
            if f is not None:
                dd = gm.decode(f[1], d.uk)
                if dd is not None and dd[0] in shifts:
                    t = ref.parse_ts(f[3])
                    if t is not None:
                        row = list(f)
                        row[3] = shift_text(f[3], t, shifts[dd[0]])
                        new_ck.append((b",".join(row), row))
                        continue
            new_ck.append((line, f))
        d.ck_rows = new_ck
    d.ws, d.we, d.cws = ws, we, ws - WEEK
    d.notes.append(f"window {mode}: {d.manifest} ; {moved} event lines shifted")
    if mode in ("w_guard", "w16d", "w13d_late"):
        gs = persons_by_size(d, 2, exclude={5, 6, 7})
        made = 0
        for g in d.rnd.sample(gs, 40):
            for t, ing in ((we - 1000, we - 1000 + DAY), (we - 1000, we - 1000 + DAY + 1000), (we - 1, we - 1 + DAY),
                           (ws, ws + DAY), (ws - 1, ws), (we, we)):
                n = d.free_number()
                d.new_event(d.eid_of(n), d.uid(g, 0), t, ing=ing - ing % 1000)
                made += 1
        d.notes.append(f"window edge events: {made}")


def shift_text(text, t, sh):
    """The same timestamp form, moved by sh ms."""
    nt = t + sh
    if text.isdigit():
        return str(nt).encode()
    if len(text) == 20:
        return f1(nt)
    sign = 1 if text[19:20] == b"+" else -1
    off = sign * (int(text[20:22]) * 60 + int(text[23:25]))
    return f1(nt + off * MIN)[:-1] + text[19:25]


def k_eperm(d):
    """Every mutable event gets a random other mutable event's number: persons scattered over all
    buckets, every person a multi unit."""
    pool = [e for e in d.num if d.mutable(e)]
    nums = [d.num[e] for e in pool]
    d.rnd.shuffle(nums)
    d.renumber(dict(zip(pool, nums)))
    d.notes.append(f"eperm: {len(pool)} event numbers permuted")


def k_erekey(d):
    """Every canonical event ID re-encoded with a new random event key (numbers unchanged)."""
    newkey = d.rnd.getrandbits(40)
    for e, n in d.num.items():
        if n is not None:
            d.renum[e] = b"e" + b36(gm.scramble(n, newkey))
    d.ek_expected = newkey
    d.notes.append(f"erekey: new event key {newkey:#x}")


def k_extraonly(d):
    """Persons all of whose events carry non-canonical or out-of-cap event IDs (every copy renamed
    consistently): only the general dedup sees them, so the person exists only as extras; plus
    persons with one canonical run and the rest renamed."""
    gs = persons_by_size(d, 2, exclude={0, 1, 2, 3, 4, 5, 6, 7})
    sel = d.rnd.sample(gs, min(200, len(gs)))
    n = 0
    for i, g in enumerate(sel):
        evs = d.person_events(g)
        if i % 2 == 1:
            evs = evs[1:]
        for e in evs:
            body = e[1:]
            m = (i + n) % 4
            if m == 0:
                new = b"E" + body
            elif m == 1:
                new = b"e0" + body
            elif m == 2:
                new = b"x" + body
            else:
                new = b"e" + b36(gm.scramble(d.free_hi + 1 + d.rnd.randrange(1 << 30), d.ek))
            if new in d.evid:
                continue
            d.evid.add(new)
            d.renum[e] = new
            d.used_nums.discard(d.num[e])
            n += 1
    d.notes.append(f"extraonly: {len(sel)} persons, {n} events renamed to general-dedup IDs")


KINDS = ["extraonly", "eperm", "erekey", "interleave", "swap", "scatter", "reverse", "bigrun", "boundary", "oddmix", "dupcross", "evid",
         "components", "cats", "clickties", "window", "all"]


def build(base, out, kind, seed, rng, window_mode=None, cats=None):
    d = DS(base, seed, random.Random(rng))
    fns = {"interleave": k_interleave, "swap": k_swap, "scatter": k_scatter, "reverse": k_reverse,
           "bigrun": k_bigrun, "boundary": k_boundary, "oddmix": k_oddmix, "dupcross": k_dupcross,
           "evid": k_evid, "components": k_components, "clickties": k_clickties, "eperm": k_eperm,
           "erekey": k_erekey, "extraonly": k_extraonly}
    if kind == "all":
        for name in ("interleave", "swap", "scatter", "reverse", "oddmix", "dupcross", "evid", "components",
                     "clickties", "boundary"):
            fns[name](d)
        k_cats(d, cats)
    elif kind == "cats":
        k_cats(d, cats)
    elif kind == "window":
        k_window(d, window_mode)
    else:
        fns[kind](d)
    size = d.write(out)
    if d.cap_targets:
        for _ in range(4):
            ncap = ncap_of(size)
            made = add_cap_events(d, ncap)
            size = d.write(out)
            if ncap_of(size) == ncap:
                d.notes.append(f"cap events at {made} (number cap {ncap}, event bytes {size})")
                break
            d.new_ev = [r for r in d.new_ev if decode(r[0], b"e", d.ek) not in set(made)]
            for n in made:
                d.evid.discard(d.eid_of(n))
                d.used_nums.discard(n)
    d.notes.append(f"keys: user {d.uk:#x} event {getattr(d, 'ek_expected', d.ek):#x}; E={d.E}; event bytes {size}; "
                   f"expected ncap {ncap_of(size)}")
    with open(out + ".notes.txt", "w") as fh:
        fh.write("\n".join(d.notes) + "\n")
    return d


if __name__ == "__main__":
    base, out, kind, seed = sys.argv[1:5]
    rng = int(sys.argv[5]) if len(sys.argv) > 5 else 1
    d = build(base, out, kind, int(seed), rng)
    print("\n".join(d.notes))
