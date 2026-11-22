#!/usr/bin/env python3
"""Hand-made edge cases, one rule clause each. Builds verify/edge/<case>/input, optionally
expected rows (hand-derived from rules.md), runs reference + engineer, compares exactly.
Usage: edge.py [CASE_PREFIX ...]
"""
import datetime as dt
import json
import os
import random
import shutil
import subprocess
import sys

V = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/rel17_verify/tools/edgekit"
T = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions"
PY = f"{T}/kit/venv/bin/python"
EDGE = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/rel17_verify/edge"
EPOCH = dt.datetime(1970, 1, 1, tzinfo=dt.timezone.utc)

EV_H = b"event_id,user_id,ts,ingest_ts,event_type,product_id,price_cents\n"
CK_H = b"click_id,user_id,campaign_id,ts\n"
LK_H = b"user_id_a,user_id_b\n"
PROD = b"product_id,category\np1,shoes\np2,books\n"
CAMP = b"campaign_id,channel\nc_1,search\nc_2,social\nc_3,email\n"
WIN = ("2026-10-01T00:00:00Z", "2026-10-15T00:00:00Z")


def ms(y, mo, d, h=0, mi=0, s=0, milli=0):
    return int((dt.datetime(y, mo, d, h, mi, s, tzinfo=dt.timezone.utc) - EPOCH).total_seconds()) * 1000 + milli


def f1(t_ms):
    return dt.datetime.fromtimestamp(t_ms // 1000, dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ").encode()


def b(x):
    return x if isinstance(x, bytes) else str(x).encode()


def ev(eid, uid, ts, ing, typ=b"view", prod=b"p1", price=b""):
    """ts/ing may be int ms (-> F3 for ts, F1 for ingest) or raw bytes."""
    ts_b = str(ts).encode() if isinstance(ts, int) else b(ts)
    ing_b = f1(ing) if isinstance(ing, int) else b(ing)
    return b",".join([b(eid), b(uid), ts_b, ing_b, b(typ), b(prod), b(price)])


def ck(cid, uid, camp, ts):
    ts_b = str(ts).encode() if isinstance(ts, int) else b(ts)
    return b",".join([b(cid), b(uid), b(camp), ts_b])


T10 = ms(2026, 10, 3, 10)  # default session start
ING = ms(2026, 10, 3, 12)  # default ingest


class Case:
    def __init__(self, name, win=WIN, prod=PROD, camp=CAMP, manifest=None):
        self.name = name
        self.files = {}  # relpath -> bytes
        self.files["manifest.json"] = manifest if manifest is not None else json.dumps(
            {"window_start": win[0], "window_end": win[1]}).encode()
        self.files["products.csv"] = prod
        self.files["campaigns.csv"] = camp
        self.expected = None  # (user_rows, camp_rows) sets, optional

    def put(self, rel, header, lines, trailing=True):
        body = header + b"\n".join(lines) + (b"\n" if trailing and lines else b"")
        self.files[rel] = body

    def raw(self, rel, data):
        self.files[rel] = data

    def build(self):
        root = f"{EDGE}/{self.name}/input"
        shutil.rmtree(f"{EDGE}/{self.name}", ignore_errors=True)
        for sub in ("events", "clicks", "links"):
            os.makedirs(f"{root}/{sub}", exist_ok=True)
        for rel, data in self.files.items():
            p = f"{root}/{rel}"
            os.makedirs(os.path.dirname(p), exist_ok=True)
            if data is None:  # directory marker
                os.makedirs(p, exist_ok=True)
                continue
            with open(p, "wb") as fh:
                fh.write(data)
        for sub, h in (("events", EV_H), ("clicks", CK_H), ("links", LK_H)):
            if not os.listdir(f"{root}/{sub}") and not getattr(self, "keep_empty_" + sub, False):
                with open(f"{root}/{sub}/part-00000.csv", "wb") as fh:
                    fh.write(h)
        return root


CASES = []


def case(fn):
    CASES.append(fn)
    return fn


def U(uid, day, s, e, rev, top):
    return (uid, day, s, e, rev, top)


def C(cid, chan, day, s, p, rev, a):
    return (cid, chan, day, s, p, rev, a)


@case
def x01_no_trailing_newline():
    c = Case("x01_no_trailing_newline")
    c.put("events/a.csv", EV_H, [ev("e1", "u1", T10, ING), ev("e2", "u2", T10, ING, "purchase", "p1", 700)], trailing=False)
    c.put("links/a.csv", LK_H, [b"u2,a2"], trailing=False)
    c.put("clicks/a.csv", CK_H, [ck("k1", "a2", "c_1", T10 - 3600_000)], trailing=False)
    c.expected = ({U("u1", "2026-10-03", 1, 1, 0, None), U("a2", "2026-10-03", 1, 1, 700, "shoes")},
                  {C("organic", "organic", "2026-10-03", 1, 0, 0, 0), C("c_1", "search", "2026-10-03", 1, 1, 700, 1)})
    return c


@case
def x02_empty_files():
    c = Case("x02_empty_files")
    c.raw("events/a.csv", b"")
    c.raw("events/b.csv", EV_H.rstrip(b"\n"))
    c.put("events/c.csv", EV_H, [ev("e1", "u1", T10, ING)])
    c.raw("events/d.csv", EV_H)
    c.raw("clicks/a.csv", b"")
    c.raw("clicks/b.csv", CK_H.rstrip(b"\n"))
    c.raw("links/a.csv", b"")
    c.raw("links/b.csv", LK_H.rstrip(b"\n"))
    c.expected = ({U("u1", "2026-10-03", 1, 1, 0, None)}, {C("organic", "organic", "2026-10-03", 1, 0, 0, 0)})
    return c


@case
def x03_crlf():
    c = Case("x03_crlf")
    L = [ev("e1", "u1", T10, ING, "view", "p1", ""), ev("e2", "u1", T10 + 60_000, ING, "purchase", "p1", "500"),
         ev("e3", "u5", T10, ING), b"", ev("e4", "u6", T10, ING, "cart", "p1", "x")]
    c.raw("events/a.csv", EV_H.replace(b"\n", b"\r\n") + b"\r\n".join(L) + b"\r\n")
    c.raw("links/a.csv", LK_H.replace(b"\n", b"\r\n") + b"u5,a1\r\n")
    c.raw("clicks/a.csv", CK_H.replace(b"\n", b"\r\n") + ck("k1", "u1", "c_1", f1(T10 - 60_000)) + b"\r\n"
          + ck("k2", "u6", "c_2", T10 - 60_000) + b"\r\n")
    # e2 price '500\r' -> dropped; 'u5' linked to 'a1\r' -> name 'a1\r'; clicks ts end with \r -> bad; empty->'\r' line
    c.expected = ({U("u1", "2026-10-03", 1, 1, 0, None), U("a1\r", "2026-10-03", 1, 1, 0, None),
                   U("u6", "2026-10-03", 1, 1, 0, None)},
                  {C("organic", "organic", "2026-10-03", 3, 0, 0, 0)})
    return c


@case
def x04_quotes():
    c = Case("x04_quotes")
    ts, ig = f1(T10), f1(ING)
    L = [
        b'"e1","u1","' + ts + b'","' + ig + b'","view","p1",""',          # all quoted -> valid
        b'e2,"u2,' + ts + b',' + ig + b',view,p1,',                         # stray quote -> malformed
        b'e3,u"3,' + ts + b',' + ig + b',view,p1,',                         # mid quote
        b'e4,"""",' + ts + b',' + ig + b',view,p1,',                        # """" -> malformed
        b'e5,""",' + ts + b',' + ig + b',view,p1,',                         # """ -> malformed
        b'e6,",' + ts + b',' + ig + b',view,p1,',                           # lone quote
        b'e7,u7,' + ts + b',' + ig + b',purchase,p1,"0250"',                # valid 250
        b'e8,"",' + ts + b',' + f1(ING - 1000) + b',view,p1,',              # empty user, earliest copy
        b'e8,u8,' + ts + b',' + ig + b',view,p1,',                          # later valid copy: not rescued
        b'"",u9,' + ts + b',' + ig + b',view,p1,',                          # empty event_id
        b'"e10 ",u10,' + ts + b',' + ig + b',view,p1,',
        b'e10,u10,' + ts + b',' + ig + b',view,p1,',                        # distinct id from "e10 "
        b'e11,"u11"x,' + ts + b',' + ig + b',view,p1,',                     # quote then text
        b'e12,x"u12",' + ts + b',' + ig + b',view,p1,',
        b'e13,u13,' + ts + b',' + ig + b',view,p1,"',                       # last field lone quote
        b'e14,u14,' + ts + b',' + ig + b',view,"p1",""',                    # quoted product -> shoes
        b'"e15",u15,"' + str(T10).encode() + b'",' + ig + b',"purchase","p1","100"',
        b'e16,u16,' + ts + b',' + ig + b',view,"",',                        # empty product -> drop
    ]
    c.put("events/a.csv", EV_H, L)
    c.put("links/a.csv", LK_H, [b'"u15","a15"', b'"u14",', b'"",u7', b'u7,"a7'])
    c.put("clicks/a.csv", CK_H, [b'"k1","u1","c_1","' + f1(T10 - 1000) + b'"', b'k2,u7,"c_1,' + f1(T10 - 1000)])
    users = [("u1", 1, 0, None), ("u7", 1, 250, "shoes"), ("u10", 2, 0, None), ("u14", 1, 0, None),
             ("a15", 1, 100, "shoes")]
    c.expected = ({U(u, "2026-10-03", 1, e, r, t) for u, e, r, t in users},
                  {C("c_1", "search", "2026-10-03", 1, 0, 0, 1), C("organic", "organic", "2026-10-03", 4, 2, 350, 0)})
    return c


@case
def x05_ts_forms():
    c = Case("x05_ts_forms")
    good = {
        "g1": b"2026-10-03T10:00:00Z", "g2": b"2026-10-03T12:00:00+02:00", "g3": b"2026-10-03T00:30:00-09:30",
        "g4": b"2026-10-03T10:00:00-00:00", "g5": b"2026-10-03T10:00:00+00:00", "g6": b"2026-10-04T09:59:00+23:59",
        "g7": b"2026-10-02T10:01:00-23:59", "g8": str(T10).encode(), "g9": b"0000" + str(T10).encode(),
        "g10": b"2026-10-31T10:00:00+00:00",  # Oct 31 valid day... outside window -> actually bad (window)
    }
    good.pop("g10")
    bad = [b"2026-10-03t10:00:00Z", b"2026-10-03T10:00:00z", b"2026-10-03 10:00:00Z", b"2026-10-03T10:00:00",
           b"2026-10-03T10:00:00.000Z", b"2026-10-03T10:00:00+0200", b"2026-10-03T10:00:00+24:00",
           b"2026-10-03T10:00:00+05:60", b"2026-13-03T10:00:00Z", b"2026-00-03T10:00:00Z", b"2026-10-00T10:00:00Z",
           b"2026-10-32T10:00:00Z", b"2026-09-31T10:00:00Z", b"2026-10-03T24:00:00Z", b"2026-10-03T10:60:00Z",
           b"2026-10-03T10:00:60Z", b" 2026-10-03T10:00:00Z", b"2026-10-03T10:00:00Z ", b"+2026-10-03T10:00:00Z",
           "2026-10-03T10:00:0０Z".encode(), "٢026-10-03T10:00:00Z".encode(), b"2026-10-03T10:00:00+2:00",
           b"2026-10-03T10:00:00+02:0", b"2026-10-03T10:00:00Z+02:00", b"2026-10-03T10:00:00+02:00Z",
           "2026-10-03T10:00:00−02:00".encode(), b"2026-10-03T10:00:00+02-00", b"2026/10/03T10:00:00Z",
           b"2026-10-03T10-00-00Z", b"2026-1-03T10:00:00Z", b"26-10-03T10:00:00Z", b"2026-10-03T1:00:00Z",
           b"1791021600000.0", b"1.79e12", b"-5", b"+1791021600000", b"1791021600000 ", b"", b"0x1A",
           b"2026-10-03T10:00:00+-2:00", b"2026-10-03T10:00:00-+2:00", b"2026-10-03T10:00:00 02:00",
           b"2026-10-03T10:00:00UTC", b"2026-10-03T10:00Z", b"20261003T100000Z", b"2026-10-03T10:00:00+02:00:00",
           b"2026-10-03T-1:00:00Z", b"2026-10-03T10:-1:00Z", b"2026-10-03T10:00:-1Z", b"2026--1-03T10:00:00Z"]
    L, kept = [], []
    for i, (u, ts) in enumerate(good.items()):
        L.append(ev(f"eg{i}", u, ts, ING))
        kept.append(u)
    for i, ts in enumerate(bad):
        L.append(ev(f"eb{i}", f"b{i}", ts, ING))
    c.put("events/a.csv", EV_H, L)
    days = {"g6": "2026-10-03", "g7": "2026-10-03"}
    c.expected = ({U(u, days.get(u, "2026-10-03"), 1, 1, 0, None) for u in kept},
                  {C("organic", "organic", "2026-10-03", len(kept), 0, 0, 0)})
    return c


@case
def x06_f3_extremes():
    c = Case("x06_f3_extremes")
    ws, we = ms(2026, 10, 1), ms(2026, 10, 15)
    vals = {
        "k_ws": str(ws).encode(), "k_we1": str(we - 1).encode(), "k_lz40": b"0" * 40 + str(T10).encode(),
        "k_lz1": b"0" + str(T10 + 5).encode(),
    }
    dropped = {"d_ws1": str(ws - 1).encode(), "d_we": str(we).encode(), "d_0": b"0", "d_00": b"0000",
               "d_short": b"86400000", "d_19": b"9" * 19, "d_20": b"1" + b"0" * 19, "d_25": b"1791021600000" + b"0" * 12,
               "d_u64": b"18446744073709551616", "d_wrap": str(2**64 + T10).encode(), "d_wrap63": str(2**63 + T10).encode(),
               "d_wrap32": str(2**32 + ws).encode()}
    L = []
    for i, (u, ts) in enumerate(list(vals.items()) + list(dropped.items())):
        ing = (we - 1) // 1000 * 1000 + 1000 if u == "k_we1" else ING
        if u == "k_ws":
            ing = ws
        L.append(ev(f"e{i}", u, ts, ing))
    c.put("events/a.csv", EV_H, L)
    c.expected = ({U("k_ws", "2026-10-01", 1, 1, 0, None), U("k_we1", "2026-10-14", 1, 1, 0, None),
                   U("k_lz40", "2026-10-03", 1, 1, 0, None), U("k_lz1", "2026-10-03", 1, 1, 0, None)},
                  {C("organic", "organic", "2026-10-01", 1, 0, 0, 0), C("organic", "organic", "2026-10-14", 1, 0, 0, 0),
                   C("organic", "organic", "2026-10-03", 2, 0, 0, 0)})
    return c


@case
def x07_prices():
    c = Case("x07_prices")
    good = {"p1": (b"1", 1), "p2": (b"10000000", 10000000), "p3": (b"0250", 250), "p4": (b"0" * 30 + b"7", 7),
            "p5": (b'"42"', 42), "p6": (b"0" * 30 + b"10000000", 10000000)}
    bad = [b"0", b"00", b"10000001", b"", b'""', b"+5", b"-5", b" 5", b"5 ", b"5.0", b"1e3", b"1" * 30,
           "５".encode(), "٥".encode(), b"5\t", b"18446744073709551617", b"4294967297", b"0x10",
           b"99999999999999999999999999999999999999"]
    L, users = [], []
    for i, (u, (p, v)) in enumerate(good.items()):
        L.append(ev(f"g{i}", "U" + u, T10 + i * 1000 + 100_000_000 * i, ING + 100_000_000 * i, "purchase", "p1", p))
        users.append(("U" + u, T10 + 100_000_000 * i, v))
    for i, p in enumerate(bad):
        L.append(ev(f"b{i}", f"B{i}", T10, ING, "purchase", "p1", p))
    L.append(ev("v1", "V1", T10, ING, "view", "p1", "-5"))
    L.append(ev("v2", "V2", T10, ING, "cart", "p1", "garbage\"x"))  # stray quote in ignored field still malformed
    L.append(ev("v3", "V3", T10, ING, "cart", "p1", "99999999999999999999"))
    c.put("events/a.csv", EV_H, L)
    exp_u, exp_c = set(), {}
    for u, t, v in users:
        day = dt.datetime.fromtimestamp((t + 0) // 1000, dt.timezone.utc).strftime("%Y-%m-%d")
        exp_u.add(U(u, day, 1, 1, v, "shoes"))
        k = ("organic", day)
        s, p, r = exp_c.get(k, (0, 0, 0))
        exp_c[k] = (s + 1, p + 1, r + v)
    exp_u |= {U("V1", "2026-10-03", 1, 1, 0, None), U("V3", "2026-10-03", 1, 1, 0, None)}
    s, p, r = exp_c[("organic", "2026-10-03")]
    exp_c[("organic", "2026-10-03")] = (s + 2, p, r)
    c.expected = (exp_u, {C(k[0], "organic", k[1], s, p, r, 0) for k, (s, p, r) in exp_c.items()})
    return c


@case
def x08_late():
    c = Case("x08_late")
    H = 86_400_000
    L = [
        ev("e1", "kept_exact", T10, T10 + H),                       # exactly 24h -> kept
        ev("e2", "drop_1ms", T10 - 1, T10 + H),                     # 24h + 1ms -> dropped
        ev("e3", "kept_1ms", T10 + 1, T10 + H),                     # 24h - 1ms -> kept
        ev("e4", "kept_before", T10, T10 - 3 * H),                  # ingest before ts -> kept
        ev("e5", "drop_1s", T10, T10 + H + 1000),
        ev("e6", "kept_f2", b"2026-10-03T12:00:00+02:00", T10 + H),
        ev("e7", "drop_f2", b"2026-10-03T11:59:59+02:00", T10 + H),
        ev("e8", "drop_days", T10, T10 + 5 * H),
    ]
    c.put("events/a.csv", EV_H, L)
    kept = ["kept_exact", "kept_1ms", "kept_before", "kept_f2"]
    c.expected = ({U(u, "2026-10-03", 1, 1, 0, None) for u in kept}, {C("organic", "organic", "2026-10-03", 4, 0, 0, 0)})
    return c


@case
def x09_dedup():
    c = Case("x09_dedup")
    t = T10
    A = [
        ev("d1", "u1", t, ING, "purchase", "p1", "100"), b'"d1",u1,' + str(t).encode() + b',' + f1(ING) + b',purchase,"p1",100',
        ev("d2", "u2", b"bad", ING - 5000), ev("d2", "u2", t, ING),                 # earliest invalid -> drop
        ev("d3", "u3", t, ING - 5000), ev("d3", "u3", b"bad", ING),                 # earliest valid -> kept
        ev("d4", "u4", t, ING), ev("d4", "other4", t, ING + 1000),                  # later copy other user
        ev("d5", "u5", t, ING + 2000), ev("d5", "u5", t + 60_000, ING - 2000), ev("d5", "u5", t + 120_000, ING),
        ev("d6", "u6", t, ING + 9 * 86_400_000), ev("d6", "u6", t, ING),            # kept copy listed later
        ev("d7", "u7", t - 2 * 86_400_000, ING - 1000), ev("d7", "u7", t, ING),     # earliest is late -> drop
        ev("d8", "u8", t, ING - 1000, "Purchase", "p1", "5"), ev("d8", "u8", t, ING, "purchase", "p1", "5"),
        b'd9,u9,' + str(t).encode() + b',' + f1(ING - 9000) + b',view,p1,"', ev("d9", "u9", t, ING),  # malformed early copy
        ev("d10", "u10", t, ING, "purchase", "p1", "0"), ev("d10", "u10", t, ING + 1000, "purchase", "p1", "5"),
    ]
    B = [ev("d4", "u4b", t, ING - 1000)]  # in another file: earliest copy of d4 names u4b
    c.put("events/a.csv", EV_H, A)
    c.put("events/b.csv", EV_H, B)
    c.put("events/c.csv", EV_H, [ev("d1", "u1", t, ING, "purchase", "p1", "100")])
    users = [("u1", 1, 100, "shoes"), ("u3", 1, 0, None), ("u4b", 1, 0, None), ("u5", 1, 0, None), ("u6", 1, 0, None),
             ("u9", 1, 0, None)]
    c.expected = ({U(u, "2026-10-03", 1, n, r, tc) for u, n, r, tc in users},
                  {C("organic", "organic", "2026-10-03", 6, 1, 100, 0)})
    return c


@case
def x10_gaps():
    c = Case("x10_gaps")
    G = 1_800_000
    t = T10
    A = [ev("a1", "u1", t, ING), ev("a2", "u1", t + G, ING), ev("a3", "u1", t + 2 * G + 1, ING),   # 2 sessions
         ev("b1", "u2", t + G + 1, ING), ev("b2", "u2", t, ING), ev("b3", "u2", t + G + 1, ING),     # 2 sessions
         ev("c1", "u3", t, ING), ev("c3", "u3", t + G, ING, "purchase", "p1", 9)]
    B = [ev("c2", "u3", t + G, ING), ev("c4", "u3", t + 2 * G, ING), ev("c5", "u3", t + 3 * G + 1, ING),
         ev("c6", "u3", t + 3 * G + 1, ING, "purchase", "p2", 4)]
    # chain across midnight: every 29 minutes from Oct 5 22:00 to Oct 6 04:00 -> one session on Oct 5
    base = ms(2026, 10, 5, 22)
    ch = [ev(f"m{i}", "u4", base + i * 29 * 60_000, base + i * 29 * 60_000 + 1000) for i in range(13)]
    ch.append(ev("mp", "u4", base + 12 * 29 * 60_000, base + 12 * 29 * 60_000, "purchase", "p2", 1234))
    late_start = ms(2026, 10, 6, 23, 59, 59, 999)
    ch += [ev("n1", "u5", late_start, late_start - 999 + 1000), ev("n2", "u5", late_start + 1, late_start + 1000)]
    c.put("events/a.csv", EV_H, A + ch)
    c.put("events/b.csv", EV_H, B)
    c.expected = ({U("u1", "2026-10-03", 2, 3, 0, None), U("u2", "2026-10-03", 2, 3, 0, None),
                   U("u3", "2026-10-03", 2, 6, 13, "shoes"), U("u4", "2026-10-05", 1, 14, 1234, "books"),
                   U("u5", "2026-10-06", 1, 2, 0, None)},
                  {C("organic", "organic", "2026-10-03", 6, 2, 13, 0), C("organic", "organic", "2026-10-05", 1, 1, 1234, 0),
                   C("organic", "organic", "2026-10-06", 1, 0, 0, 0)})
    return c


@case
def x11_top_category():
    prod = "product_id,category\np1,Zeta\np2,alpha\np3,ähnlich\np4,unknowm\np5,unknown_\np6, alpha\n".encode()
    c = Case("x11_top_category", prod=prod)
    t = T10
    P = lambda i, u, pr, price, dt_=0: ev(f"e{i}", u, t + dt_, ING, "purchase", pr, price)
    L = [P(1, "t1", "p1", 500), P(2, "t1", "p2", 500),                           # Zeta vs alpha -> Zeta
         P(3, "t2", "p2", 300), P(4, "t2", "p3", 300),                           # alpha vs ähnlich -> alpha
         P(5, "t3", "p9", 300), P(6, "t3", "p4", 300),                           # unknown vs unknowm -> unknowm
         P(7, "t4", "p9", 300), P(8, "t4", "p5", 300),                           # unknown vs unknown_ -> unknown
         P(9, "t5", "p1", 300), P(10, "t5", "p2", 200, 3 * 3600_000), P(11, "t5", "p2", 200, 3 * 3600_000 + 1),
         P(12, "t6", "p6", 10), P(13, "t6", "p2", 10),                           # ' alpha' < 'alpha'
         P(14, "t7", "P1", 10), P(15, "t7", "p1", 9),                            # P1 unknown 10 > Zeta 9
         ev("e16", "t8", t, ING, "view", "p1", ""), P(17, "t8", "p3", 1),
         ]
    c.put("events/a.csv", EV_H, L)
    d = "2026-10-03"
    c.expected = ({U("t1", d, 1, 2, 1000, "Zeta"), U("t2", d, 1, 2, 600, "alpha"), U("t3", d, 1, 2, 600, "unknowm"),
                   U("t4", d, 1, 2, 600, "unknown"), U("t5", d, 2, 3, 700, "alpha"), U("t6", d, 1, 2, 20, " alpha"),
                   U("t7", d, 1, 2, 19, "unknown"), U("t8", d, 1, 2, 1, "ähnlich")},
                  {C("organic", "organic", d, 9, 9, 1000 + 600 * 3 + 700 + 20 + 19 + 1, 0)})
    return c


@case
def x12_big_revenue():
    c = Case("x12_big_revenue")
    L = [ev(f"w{i}", "whale", T10 + i * 1000, T10 + i * 1000, "purchase", "p1", 10_000_000) for i in range(500)]
    L += [ev(f"x{i}", f"x{i}", T10, ING, "purchase", "p2", 10_000_000) for i in range(300)]
    c.put("events/a.csv", EV_H, L)
    c.put("clicks/a.csv", CK_H, [ck("k1", "whale", "c_1", T10 - 1)])
    d = "2026-10-03"
    exp_u = {U("whale", d, 1, 500, 5_000_000_000, "shoes")} | {U(f"x{i}", d, 1, 1, 10_000_000, "books") for i in range(300)}
    c.expected = (exp_u, {C("c_1", "search", d, 1, 1, 5_000_000_000, 1), C("organic", "organic", d, 300, 300, 3_000_000_000, 0)})
    return c


@case
def x13_click_bounds():
    c = Case("x13_click_bounds")
    W = 7 * 86_400_000
    ws, we = ms(2026, 10, 1), ms(2026, 10, 15)
    E = [ev("e1", "at_start", T10, ING), ev("e2", "after1", T10, ING), ev("e3", "week", T10, ING),
         ev("e4", "week1", T10, ING), ev("e5", "ws", ws, ws), ev("e6", "ws_m1", ws, ws), ev("e7", "we1", we - 1, we),
         ev("e8", "we", we - 1, we), ev("e9", "f2edge", ws, ws)]
    K = [ck("k1", "at_start", "c_1", T10), ck("k2", "after1", "c_1", T10 + 1), ck("k3", "week", "c_1", T10 - W),
         ck("k4", "week1", "c_1", T10 - W - 1), ck("k5", "ws", "c_2", ws - W), ck("k6", "ws_m1", "c_2", ws - W - 1),
         ck("k7", "we1", "c_3", we - 1), ck("k8", "we", "c_3", we), ck("k9", "f2edge", "c_2", b"2026-09-24T01:00:00+01:00")]
    c.put("events/a.csv", EV_H, E)
    c.put("clicks/a.csv", CK_H, K)
    d = "2026-10-03"
    c.expected = ({U(u, d, 1, 1, 0, None) for u in ("at_start", "after1", "week", "week1")}
                  | {U(u, "2026-10-01", 1, 1, 0, None) for u in ("ws", "ws_m1", "f2edge")}
                  | {U(u, "2026-10-14", 1, 1, 0, None) for u in ("we1", "we")},
                  {C("c_1", "search", d, 2, 0, 0, 2), C("organic", "organic", d, 2, 0, 0, 0),
                   C("c_2", "social", "2026-10-01", 2, 0, 0, 2), C("organic", "organic", "2026-10-01", 1, 0, 0, 0),
                   C("c_3", "email", "2026-10-14", 1, 0, 0, 1), C("organic", "organic", "2026-10-14", 1, 0, 0, 0)})
    return c


@case
def x14_click_tiebreak():
    c = Case("x14_click_tiebreak")
    pairs = [("k10", "k9"), ("K1", "k1"), ("k1-a", "k1_"), ("j1", "j1 "), ("kz", "kä"),
             ("kkkkkkkkkkk1", "kkkkkkkkkkk2"), ("k", "k\t"), ("kkkkkkkkkk", "kkkkkkkkkk0"), ("abcdefghi\x7f", "abcdefghij"),
             ("zzzzzzzzzzzzzzzzzzzzzzzz", "zzzzzzzzzzzzzzzzzzzzzzzy"), ("a.b", "a_b"), ("0", "00"), ("_", "a"),
             ("Z", "_z"), ("9", "A"), ("k~", "k\U0001F642"), ("kk\x00", "kk"), ("aaaaaaaaaa_", "aaaaaaaaaa-")]
    E, K, exp_c = [], [], {}
    for i, (x, y) in enumerate(pairs):
        u = f"t{i}"
        E.append(ev(f"e{i}", u, T10, ING))
        # x -> c_1, y -> c_2; same ts; listed in both orders
        if i % 2:
            K += [ck(y, u, "c_2", T10 - 600_000), ck(x, u, "c_1", T10 - 600_000)]
        else:
            K += [ck(x, u, "c_1", T10 - 600_000), ck(y, u, "c_2", T10 - 600_000)]
        win = "c_1" if x.encode() < y.encode() else "c_2"
        exp_c[win] = exp_c.get(win, 0) + 1
    c.put("events/a.csv", EV_H, E)
    c.put("clicks/a.csv", CK_H, K)
    d = "2026-10-03"
    n = len(pairs)
    c.expected = ({U(f"t{i}", d, 1, 1, 0, None) for i in range(n)},
                  {C("c_1", "search", d, exp_c.get("c_1", 0), 0, 0, n), C("c_2", "social", d, exp_c.get("c_2", 0), 0, 0, n)})
    return c


@case
def x15_person_names():
    c = Case("x15_person_names")
    comps = [["abcdefghijk", "abcdefghij"], ["u1-x", "u1_"], ["u1", "u1 "], ["zz", "é"], ["b", "\tb"], [" a", "a"],
             ["Zed", "abc"], ["x" * 300, "y"], ["u\U0001F642", "u~"], ["mmmmmmmmmm_", "mmmmmmmmmm"], ["n0", "n"],
             ["AAAAAAAAAAAAAAAA", "AAAAAAAAAAAAAAAB", "AAAAAAAAAAAAAAA"], ["p\x00", "p"], ["q.q", "q_q", "q-q"],
             ["r" * 10 + "A", "r" * 10 + "a"], ["中文", "中"], ["0", "_0", "00"]]
    E, Lk, exp_u = [], [], set()
    for i, ids in enumerate(comps):
        for a, b_ in zip(ids, ids[1:]):
            Lk.append(f"{a},{b_}".encode())
        name = min(ids, key=lambda s: s.encode())
        user = max(ids, key=lambda s: s.encode())  # an event by the largest id only
        E.append(ev(f"e{i}", user, T10, ING))
        exp_u.add(U(name, "2026-10-03", 1, 1, 0, None))
    c.put("events/a.csv", EV_H, E)
    c.put("links/a.csv", LK_H, Lk)
    c.expected = (exp_u, {C("organic", "organic", "2026-10-03", len(comps), 0, 0, 0)})
    return c


@case
def x16_long_chains():
    c = Case("x16_long_chains")
    rnd = random.Random(7)
    ids = [f"c{rnd.randrange(10**9):09d}x{i}" for i in range(3000)]
    order = ids[:]
    rnd.shuffle(order)
    links = [f"{a},{b_}".encode() if rnd.random() < 0.5 else f"{b_},{a}".encode() for a, b_ in zip(order, order[1:])]
    # two separate chains joined by one late link; plus a star
    ch2 = [f"d{i}" for i in range(500)]
    links += [f"{a},{b_}".encode() for a, b_ in zip(ch2[:250], ch2[1:250])]
    links += [f"{a},{b_}".encode() for a, b_ in zip(ch2[250:], ch2[251:])]
    links.append(f"{ch2[499]},{ch2[0]}".encode())
    links += [f"star,s{i}".encode() for i in range(400)]
    rnd.shuffle(links)
    for k in range(5):
        c.put(f"links/p{k}.csv", LK_H, links[k::5])
    E, K = [], []
    for i in range(400):
        t = T10 + i * 600_000 + rnd.randrange(3) * 1000
        E.append(ev(f"x{i}", rnd.choice(ids), t, t + 1000, "purchase" if i % 7 == 0 else "view", "p1", 100))
    for i in range(60):
        t = T10 + rnd.randrange(-86_400_000, 400 * 600_000)
        K.append(ck(f"k{i}", rnd.choice(ids), rnd.choice(["c_1", "c_2", "c_3"]), t))
    for i in range(100):
        t = T10 + i * 1_900_000
        E.append(ev(f"y{i}", rnd.choice(ch2), t, t + 1000))
        E.append(ev(f"z{i}", f"s{rnd.randrange(400)}", t, t + 1000))
    rnd.shuffle(E)
    for k in range(3):
        c.put(f"events/p{k}.csv", EV_H, E[k::3])
    c.put("clicks/a.csv", CK_H, K)
    return c


@case
def x17_link_dirt():
    c = Case("x17_link_dirt")
    Lk = [b"user_id_a,user_id_b", b"u1,u1", b"u2,u1", b"u1,u2", b'"u2","u1"', b'"",u3', b'u3,""', b"u3,", b",u3",
          b"u4,u5,u6", b"u4", b"", b"u7,u8\r", b"U9,u9", b'u10,"u11', b"u12 ,u13", b"\r", b"u14,u14\r"]
    E = [ev(f"e{i}", u, T10, ING) for i, u in enumerate(
        ["u1", "u2", "u3", "u4", "u5", "u6", "u7", "u8", "u8\r", "u9", "u10", "u11", "u12", "u13", "u12 ", "u14",
         "user_id_b"])]
    c.put("links/a.csv", LK_H, Lk)
    c.put("events/a.csv", EV_H, E)
    d = "2026-10-03"
    names = {"u1": "u1", "u2": "u1", "u3": "u3", "u4": "u4", "u5": "u5", "u6": "u6", "u7": "u7", "u8": "u8",
             "u8\r": "u7", "u9": "U9", "u10": "u10", "u11": "u11", "u12": "u12", "u13": "u12 ", "u12 ": "u12 ",
             "u14": "u14", "user_id_b": "user_id_a"}
    from collections import Counter
    cnt = Counter(names.values())
    c.expected = ({U(n, d, 1, k, 0, None) for n, k in cnt.items()},
                  {C("organic", "organic", d, len(cnt), 0, 0, 0)})
    return c


@case
def x18_file_selection():
    c = Case("x18_file_selection")
    c.put("events/a.csv", EV_H, [ev("e1", "u1", T10, ING)])
    c.put("events/README.txt", EV_H, [ev("e2", "txt", T10, ING)])
    c.put("events/a.csv.bak", EV_H, [ev("e3", "bak", T10, ING)])
    c.put("events/b.CSV", EV_H, [ev("e4", "upper", T10, ING)])
    c.put("events/sub/c.csv", EV_H, [ev("e5", "nested", T10, ING)])
    c.files["events/dir.csv"] = None
    c.put("clicks/x.txt", CK_H, [ck("k1", "u1", "c_1", T10)])
    c.put("links/x.json", LK_H, [b"u1,a0"])
    c.expected = ({U("u1", "2026-10-03", 1, 1, 0, None)}, {C("organic", "organic", "2026-10-03", 1, 0, 0, 0)})
    return c


@case
def x18b_hidden_csv():
    c = Case("x18b_hidden_csv")
    c.put("events/a.csv", EV_H, [ev("e1", "u1", T10, ING)])
    c.put("events/.hidden.csv", EV_H, [ev("e2", "hidden", T10, ING)])
    c.put("events/_under.csv", EV_H, [ev("e3", "under", T10, ING)])
    return c


@case
def x19_manifest_variants():
    m = b'{"window_end":"2026-10-14T06:00:00Z","extra":[1,2,{"seed":5}],\n\t"window_start" :  "2026-10-01T12:30:00Z"}'
    c = Case("x19_manifest_variants", manifest=m)
    ws, we = ms(2026, 10, 1, 12, 30), ms(2026, 10, 14, 6)
    E = [ev("e1", "in_ws", ws, ws), ev("e2", "out_ws", ws - 1, ws), ev("e3", "in_we", we - 1, we), ev("e4", "out_we", we, we),
         ev("e5", "mid", T10, ING)]
    K = [ck("k1", "in_ws", "c_1", ws - 7 * 86_400_000), ck("k2", "in_we", "c_1", ws - 7 * 86_400_000 - 1)]
    c.put("events/a.csv", EV_H, E)
    c.put("clicks/a.csv", CK_H, K)
    c.expected = ({U("in_ws", "2026-10-01", 1, 1, 0, None), U("in_we", "2026-10-14", 1, 1, 0, None),
                   U("mid", "2026-10-03", 1, 1, 0, None)},
                  {C("c_1", "search", "2026-10-01", 1, 0, 0, 1), C("organic", "organic", "2026-10-14", 1, 0, 0, 0),
                   C("organic", "organic", "2026-10-03", 1, 0, 0, 0)})
    return c


@case
def x20_long_window():
    c = Case("x20_long_window", win=("2026-01-01T00:00:00Z", "2026-12-31T00:00:00Z"))
    E, K = [], []
    for i, (mo, d) in enumerate([(1, 1), (2, 28), (3, 1), (6, 15), (9, 30), (12, 30)]):
        t = ms(2026, mo, d, 10)
        E.append(ev(f"e{i}", "u1", t, t, "purchase", "p1", 100 + i))
        K.append(ck(f"k{i}", "u1", "c_1" if i % 2 else "c_2", t - 3600_000))
    t = ms(2025, 12, 25)
    K.append(ck("kpre", "u2", "c_3", t))
    E.append(ev("ep", "u2", ms(2026, 1, 1, 0), ms(2026, 1, 1, 0)))
    c.put("events/a.csv", EV_H, E)
    c.put("clicks/a.csv", CK_H, K)
    return c


@case
def x21_leap_and_newyear():
    c = Case("x21_leap", win=("2028-02-25T00:00:00Z", "2028-03-03T00:00:00Z"))
    E = [ev("e1", "a", b"2028-02-29T23:30:00-01:00", ms(2028, 3, 1, 1)),   # Mar 1 00:30Z
         ev("e2", "b", b"2028-03-01T00:30:00+01:00", ms(2028, 3, 1, 1)),   # Feb 29 23:30Z
         ev("e3", "b", ms(2028, 3, 1, 0, 0), ms(2028, 3, 1, 1), "purchase", "p1", 50),
         ev("e4", "c", b"2028-02-25T00:00:00Z", ms(2028, 2, 25, 1)),
         ev("e4b", "c2", b"2028-02-29T12:00:00Z", ms(2028, 2, 29, 13)),
         ev("e5", "d", b"2028-02-30T12:00:00Z", ms(2028, 2, 29, 13)),
         ev("e6", "e", b"2028-03-03T01:00:00+02:00", ms(2028, 3, 3, 0)),   # Mar 2 23:00Z in
         ev("e7", "f", b"2028-02-25T01:00:00+02:00", ms(2028, 3, 1, 0))]   # Feb 24 23:00Z out
    K = [ck("k1", "c", "c_1", b"2028-02-18T00:00:00Z"), ck("k2", "c", "c_2", b"2028-02-17T23:59:59Z")]
    c.put("events/a.csv", EV_H, E)
    c.put("clicks/a.csv", CK_H, K)
    c.expected = ({U("a", "2028-03-01", 1, 1, 0, None), U("b", "2028-02-29", 1, 2, 50, "shoes"),
                   U("c", "2028-02-25", 1, 1, 0, None), U("c2", "2028-02-29", 1, 1, 0, None), U("e", "2028-03-02", 1, 1, 0, None)},
                  {C("organic", "organic", "2028-03-01", 1, 0, 0, 0), C("organic", "organic", "2028-02-29", 2, 1, 50, 0),
                   C("c_1", "search", "2028-02-25", 1, 0, 0, 1), C("organic", "organic", "2028-03-02", 1, 0, 0, 0)})
    return c


@case
def x21b_newyear():
    c = Case("x21b_newyear", win=("2027-12-28T00:00:00Z", "2028-01-04T00:00:00Z"))
    E = [ev("e1", "a", b"2028-01-01T01:00:00+02:00", ms(2028, 1, 1)), ev("e2", "b", b"2027-12-31T23:00:00-02:00", ms(2028, 1, 1, 2)),
         ev("e3", "c", b"2027-02-29T10:00:00Z", ms(2028, 1, 1, 2)), ev("e4", "d", b"2027-12-27T23:00:00-01:00", ms(2027, 12, 28, 1))]
    c.put("events/a.csv", EV_H, E)
    c.put("clicks/a.csv", CK_H, [ck("k1", "a", "c_1", b"2027-12-21T00:00:00+01:00"), ck("k2", "d", "c_1", b"2027-12-21T00:00:00-00:00")])
    c.expected = ({U("a", "2027-12-31", 1, 1, 0, None), U("b", "2028-01-01", 1, 1, 0, None), U("d", "2027-12-28", 1, 1, 0, None)},
                  {C("organic", "organic", "2027-12-31", 1, 0, 0, 0), C("organic", "organic", "2028-01-01", 1, 0, 0, 0),
                   C("c_1", "search", "2027-12-28", 1, 0, 0, 1)})
    return c


@case
def x22_assists():
    c = Case("x22_assists")
    D = 86_400_000
    E = [ev("e1", "u1", T10, ING, "purchase", "p1", 10), ev("e2", "u1", T10 + 2 * D, T10 + 2 * D),
         ev("e3", "u1", T10 + 9 * D, T10 + 9 * D), ev("e4", "u2", T10, ING)]
    K = [ck("k1", "u1", "c_1", T10 - 3 * D), ck("k2", "u1", "c_1", T10 - 2 * D), ck("k3", "alt", "c_1", T10 - D),
         ck("k4", "u1", "c_2", T10 - 5 * D), ck("k5", "alt", "c_2", T10 - 4 * D), ck("k6", "u1", "c_3", T10 - 60_000),
         ck("k7", "u1", "c_3", T10 + 2 * D + 1), ck("k8", "nobody", "c_2", T10), ck("k9", "", "c_2", T10),
         ck("", "u2", "c_2", T10), ck('""', "u2", "c_2", T10), ck("k10", "u2", "C_2", T10), ck("k11", "u2", " c_2", T10),
         ck("k12", "u2", "c_2 ", T10)]
    c.put("events/a.csv", EV_H, E)
    c.put("clicks/a.csv", CK_H, K)
    c.put("links/a.csv", LK_H, [b"u1,alt"])
    d3, d5, d12 = "2026-10-03", "2026-10-05", "2026-10-12"
    # alt < u1 -> name 'alt'
    c.expected = ({U("alt", d3, 1, 1, 10, "shoes"), U("alt", d5, 1, 1, 0, None), U("alt", d12, 1, 1, 0, None),
                   U("u2", d3, 1, 1, 0, None)},
                  {C("c_3", "email", d3, 1, 1, 10, 1), C("c_1", "search", d3, 0, 0, 0, 1), C("c_2", "social", d3, 0, 0, 0, 1),
                   C("organic", "organic", d3, 1, 0, 0, 0),
                   C("c_3", "email", d5, 1, 0, 0, 1), C("c_1", "search", d5, 0, 0, 0, 1), C("c_2", "social", d5, 0, 0, 0, 1),
                   C("c_3", "email", d12, 1, 0, 0, 1)})
    return c


@case
def x23_all_invalid():
    c = Case("x23_all_invalid")
    c.put("events/a.csv", EV_H, [ev("e1", "u1", b"bad", ING), ev("e2", "", T10, ING)])
    c.put("clicks/a.csv", CK_H, [ck("k1", "u1", "c_1", T10)])
    c.expected = (set(), set())
    return c


@case
def x23b_no_files():
    c = Case("x23b_no_files")
    c.keep_empty_events = c.keep_empty_clicks = c.keep_empty_links = True
    c.expected = (set(), set())
    return c


@case
def x24_unicode():
    prod = "product_id,category\np1,shoes\nрод,обувь\n".encode()
    camp = "campaign_id,channel\nc_1,search\nc_é,réseau social\n".encode()
    c = Case("x24_unicode", prod=prod, camp=camp)
    ids = ["用户", "\U0001F600", "é", "é", "ｕ１", "u​1", "﻿u1", "u1"]
    E = [ev(f"e{i}", u, T10, ING, "purchase", "род", 10 + i) for i, u in enumerate(ids)]
    E.append(ev("事件", "u1", T10 + 1, ING, "view", "род"))
    K = [ck("ké", "\U0001F600", "c_é", T10 - 1), ck("k1", "\U0001F600", "c_1", T10 - 1)]
    c.put("events/a.csv", EV_H, E)
    c.put("clicks/a.csv", CK_H, K)
    c.put("links/a.csv", LK_H, ["é,é".encode()])
    return c


@case
def x24b_nul_and_controls():
    c = Case("x24b_nul_and_controls")
    ids = ["u\x00", "u\x01", "u\x7f", "u\x1b[0m", "u\t", "u\x0b", "u\x0c"]
    E = [ev(f"e{i}", u, T10, ING) for i, u in enumerate(ids)]
    c.put("events/a.csv", EV_H, E)
    c.put("links/a.csv", LK_H, [b"u\x00,u\x01"])
    return c


@case
def x25_huge_fields():
    c = Case("x25_huge_fields")
    big_u = "U" * 5000
    big_e = "E" * 5000
    E = [ev(big_e, big_u, T10, ING, "purchase", "P" * 3000, 77), ev(big_e, "other", T10, ING + 1000),
         ev("e2", big_u + "x", T10, ING), ev("e3", "u3", T10, ING, "view", "p1", "z" * 100000)]
    c.put("events/a.csv", EV_H, E)
    c.put("links/a.csv", LK_H, [(big_u + "x," + big_u).encode()])
    c.put("clicks/a.csv", CK_H, [ck("K" * 4000, big_u + "x", "c_2", T10), ck("K" * 4000 + "a", big_u, "c_1", T10)])
    c.expected = ({U(big_u, "2026-10-03", 1, 2, 77, "unknown"), U("u3", "2026-10-03", 1, 1, 0, None)},
                  {C("c_2", "social", "2026-10-03", 1, 1, 77, 1), C("c_1", "search", "2026-10-03", 0, 0, 0, 1),
                   C("organic", "organic", "2026-10-03", 1, 0, 0, 0)})
    return c


@case
def x26_equal_ts_order():
    c = Case("x26_equal_ts_order")
    G = 1_800_000
    t = T10
    files = [[ev("a3", "p_b", t + G + 1, ING), ev("a1", "p_a", t, ING)],
             [ev("a4", "p_a", t + G + 1, ING, "purchase", "p2", 5), ev("a2", "p_b", t, ING)],
             [ev("a5", "p_b", t + G + 1, ING, "purchase", "p1", 5), ev("a6", "p_a", t + 2 * G + 1, ING)]]
    for i, f in enumerate(files):
        c.put(f"events/f{i}.csv", EV_H, f)
    c.put("links/a.csv", LK_H, [b"p_b,p_a"])
    c.put("clicks/a.csv", CK_H, [ck("k1", "p_b", "c_1", t + G + 1), ck("k2", "p_a", "c_2", t + G + 1)])
    # sessions: [t] (a1,a2), [t+G+1] (a3,a4,a5) -> credited k1 (tie: k1<k2) -> c_1, assists c_1,c_2; [t+2G+1]? gap = G -> same session
    c.expected = ({U("p_a", "2026-10-03", 2, 6, 10, "books")},
                  {C("organic", "organic", "2026-10-03", 1, 0, 0, 0), C("c_1", "search", "2026-10-03", 1, 1, 10, 1),
                   C("c_2", "social", "2026-10-03", 0, 0, 0, 1)})
    return c


@case
def x28_dup_clicks():
    c = Case("x28_dup_clicks")
    t = T10 - 60_000
    K = [ck("k1", "u1", "c_1", t), b'"k1","u1","c_1","' + str(t).encode() + b'"', b'k1,"u1",c_1,' + str(t).encode(),
         ck("k2", "u1", "c_1", t), ck("k3", "u1", "c_2", t - 1), b'k3,u1,c_2,"' + str(t - 1).encode(),
         ck("k4", "u2", "c_2", t), ck("k4", "u2", "c_2", t)]
    c.put("clicks/a.csv", CK_H, K[:4])
    c.put("clicks/b.csv", CK_H, K[4:])
    c.put("events/a.csv", EV_H, [ev("e1", "u1", T10, ING), ev("e2", "u2", T10, ING)])
    d = "2026-10-03"
    c.expected = ({U("u1", d, 1, 1, 0, None), U("u2", d, 1, 1, 0, None)},
                  {C("c_1", "search", d, 1, 0, 0, 1), C("c_2", "social", d, 1, 0, 0, 2)})
    return c


@case
def x29_header_skip():
    c = Case("x29_header_skip")
    c.raw("events/a.csv", ev("e0", "u0", T10, ING) + b"\n" + ev("e1", "u1", T10, ING) + b"\n")
    c.raw("events/b.csv", b"x\n" + ev("e2", "u2", T10, ING) + b"\n")
    c.raw("events/c.csv", EV_H.replace(b"\n", b"\r\n") + ev("e3", "u3", T10, ING) + b"\n")
    c.raw("links/a.csv", b"u1,u2\nu2,u3\n")
    c.raw("clicks/a.csv", ck("k0", "u1", "c_1", T10) + b"\n" + ck("k1", "u2", "c_2", T10) + b"\n")
    c.expected = ({U("u1", "2026-10-03", 1, 1, 0, None), U("u2", "2026-10-03", 1, 2, 0, None)},
                  {C("c_2", "social", "2026-10-03", 1, 0, 0, 1), C("organic", "organic", "2026-10-03", 1, 0, 0, 0)})
    return c


@case
def x19b_manifest_nested():
    m = b'{"note":{"window_start":"1999-01-01T00:00:00Z","window_end":"1999-01-02T00:00:00Z"},"window_start":"2026-10-01T00:00:00Z","window_end":"2026-10-15T00:00:00Z"}'
    c = Case("x19b_manifest_nested", manifest=m)
    c.put("events/a.csv", EV_H, [ev("e1", "u1", T10, ING)])
    c.expected = ({U("u1", "2026-10-03", 1, 1, 0, None)}, {C("organic", "organic", "2026-10-03", 1, 0, 0, 0)})
    return c


@case
def x31_event_types():
    c = Case("x31_event_types")
    types = {"view": 1, "cart": 1, '"purchase"': 1, "VIEW": 0, " view": 0, "view ": 0, "views": 0, "vie": 0,
             "cart\t": 0, "Cart": 0, "": 0, '""': 0, "purchases": 0, "view": 1, "vіew": 0}
    E = []
    exp = set()
    for i, (tp, ok) in enumerate(types.items()):
        E.append(ev(f"e{i}", f"t{i}", T10, ING, tp, "p1", 5))
        if ok:
            pur = "purchase" in tp
            exp.add(U(f"t{i}", "2026-10-03", 1, 1, 5 if pur else 0, "shoes" if pur else None))
    c.put("events/a.csv", EV_H, E)
    c.expected = (exp, {C("organic", "organic", "2026-10-03", len(exp), 1, 5, 0)})
    return c


@case
def x32_whale_ties():
    c = Case("x32_whale_ties")
    rnd = random.Random(3)
    E, K = [], []
    for i in range(20000):
        t = T10 + rnd.randrange(0, 5 * 86_400_000) // 60_000 * 60_000
        E.append(ev(f"w{i}", rnd.choice(["w1", "w2", "w3"]), t, t + rnd.randrange(0, 86_400_001),
                    rnd.choice(["view", "view", "cart", "purchase"]), rnd.choice(["p1", "p2", "p9"]), rnd.randrange(1, 50)))
    for i in range(3000):
        t = T10 - 7 * 86_400_000 + rnd.randrange(0, 12 * 86_400_000) // 60_000 * 60_000
        K.append(ck(f"k{rnd.randrange(10**6)}", rnd.choice(["w1", "w2", "w3"]), rnd.choice(["c_1", "c_2", "c_3"]), t))
    c.put("events/a.csv", EV_H, E)
    c.put("clicks/a.csv", CK_H, K)
    c.put("links/a.csv", LK_H, [b"w1,w2"])
    return c


@case
def x33_click_copies_differ():
    """Outside the rules' guarantee (copies of a click identical): documents behaviour only."""
    c = Case("x33_click_copies_differ")
    c.put("events/a.csv", EV_H, [ev("e1", "u1", T10, ING)])
    c.put("clicks/a.csv", CK_H, [ck("k1", "u1", "c_1", T10 - 60_000), ck("k1", "u1", "c_2", T10 - 60_000)])
    return c


def load_dir(out):
    sys.path.insert(0, f"{T}/kit/unz/starter-duckdb/scripts")
    from run_fixtures import SCHEMAS, load_actual
    res = []
    for table, schema in SCHEMAS.items():
        df = load_actual(os.path.join(out, table), schema)
        rows = set()
        for r in df.rows():
            rows.add(tuple(v.isoformat() if isinstance(v, dt.date) else v for v in r))
        res.append(rows)
    return res


def run(cmd, data, out, extra_env=None):
    if os.path.exists(out):
        shutil.rmtree(out)
    os.makedirs(out)
    env = dict(os.environ, DATA_DIR=data, OUTPUT_DIR=out)
    p = subprocess.run(cmd + [data, out], capture_output=True, text=True, env=env)
    return p


def main():
    sel = sys.argv[1:]
    sys.path.insert(0, f"{T}/kit/unz/starter-duckdb/scripts")
    summary = []
    for fn in CASES:
        if sel and not any(fn.__name__.startswith(s) for s in sel):
            continue
        cs = fn()
        data = cs.build()
        outs = {}
        notes = []
        for who, cmd in (("ref", [PY, "-B", "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/verify/ref.py"]), ("eng", [f"{V}/eng.sh"])):
            out = f"{EDGE}/{cs.name}/out_{who}"
            p = run(cmd, data, out)
            if p.returncode != 0:
                notes.append(f"{who} exit {p.returncode}: {p.stderr.strip()[-400:]}")
                continue
            try:
                outs[who] = load_dir(out)
            except Exception as e:  # noqa
                notes.append(f"{who} unreadable output: {e}")
        status = []
        if "ref" in outs and "eng" in outs:
            for ti, tname in enumerate(("user_daily", "campaign_daily")):
                a, b_ = outs["eng"][ti], outs["ref"][ti]
                if a != b_:
                    status.append(f"ENG!=REF {tname}: only eng {sorted(a - b_, key=repr)[:6]} only ref {sorted(b_ - a, key=repr)[:6]}")
        if cs.expected is not None:
            for who in outs:
                for ti, tname in enumerate(("user_daily", "campaign_daily")):
                    a, e = outs[who][ti], cs.expected[ti]
                    if a != e:
                        status.append(f"{who.upper()}!=HAND {tname}: only {who} {sorted(a - e, key=repr)[:6]} only hand {sorted(e - a, key=repr)[:6]}")
        verdict = "PASS" if not status and not notes else "CHECK"
        line = f"{verdict} {cs.name} (hand={'yes' if cs.expected is not None else 'no'}) " \
               f"rows u={len(outs.get('ref', [()])[0]) if 'ref' in outs else '?'}"
        print(line)
        for s in notes + status:
            print("   ", s)
        summary.append((cs.name, verdict, notes + status))
    with open("/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/rel17_verify/logs/edge_" + os.environ.get("EDGE_TAG", "x") + ".json", "w") as fh:
        json.dump(summary, fh, indent=1, default=repr)


if __name__ == "__main__":
    main()
