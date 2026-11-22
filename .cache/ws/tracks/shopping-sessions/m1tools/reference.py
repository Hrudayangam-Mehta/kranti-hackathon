"""Slow, direct reference written from rules.md for differential tests (not shipped).
Usage: reference.py DATA_DIR OUT_DIR   (writes OUT_DIR/user_daily/part-0.parquet and campaign_daily/part-0.parquet)
"""
import bisect
import datetime
import json
import os
import re
import sys
from collections import defaultdict

import polars as pl

DAY = 86_400_000
GAP = 1_800_000
WEEK = 7 * DAY

DIGITS = re.compile(rb"[0-9]+")
F1 = re.compile(rb"([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})Z")
F2 = re.compile(rb"([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})([+-])([0-9]{2}):([0-9]{2})")
EPOCH = datetime.date(1970, 1, 1)


def file_lines(path):
    with open(path, "rb") as f:
        data = f.read()
    return data.split(b"\n")[1:]


def folder_lines(folder):
    if not os.path.isdir(folder):
        return
    for name in sorted(os.listdir(folder)):
        if name.endswith(".csv") and not name.startswith("."):
            yield from file_lines(os.path.join(folder, name))


def split(line, n):
    if line == b"":
        return None
    parts = line.split(b",")
    if len(parts) != n:
        return None
    out = []
    for p in parts:
        if b'"' in p:
            if len(p) >= 2 and p.startswith(b'"') and p.endswith(b'"') and b'"' not in p[1:-1]:
                out.append(p[1:-1])
            else:
                return None
        else:
            out.append(p)
    return out


def civil_ms(y, mo, d, h, mi, s):
    if y < 1 or not (1 <= mo <= 12) or h > 23 or mi > 59 or s > 59:
        return None
    try:
        date = datetime.date(y, mo, d)
    except ValueError:
        return None
    days = (date - EPOCH).days
    return (((days * 24 + h) * 60 + mi) * 60 + s) * 1000


def ts_ms(text):
    if DIGITS.fullmatch(text):
        v = int(text)
        return v if v < 2**63 else None
    m = F1.fullmatch(text)
    if m:
        return civil_ms(*map(int, m.groups()))
    m = F2.fullmatch(text)
    if m:
        g = m.groups()
        base = civil_ms(*map(int, g[:6]))
        oh, om = int(g[7]), int(g[8])
        if base is None or oh > 23 or om > 59:
            return None
        off = (oh * 60 + om) * 60_000
        return base - off if g[6] == b"+" else base + off
    return None


def main():
    data, out = sys.argv[1], sys.argv[2]
    manifest = json.load(open(os.path.join(data, "manifest.json")))
    ws = ts_ms(manifest["window_start"].encode())
    we = ts_ms(manifest["window_end"].encode())

    category = {}
    for line in file_lines(os.path.join(data, "products.csv")):
        f = split(line, 2)
        if f and f[0] not in category:
            category[f[0]] = f[1]
    channel = {}
    for line in file_lines(os.path.join(data, "campaigns.csv")):
        f = split(line, 2)
        if f and f[0] not in channel:
            channel[f[0]] = f[1]

    parent = {}

    def find(x):
        root = x
        while parent[root] != root:
            root = parent[root]
        while parent[x] != root:
            parent[x], x = root, parent[x]
        return root

    for line in folder_lines(os.path.join(data, "links")):
        f = split(line, 2)
        if not f or f[0] == b"" or f[1] == b"":
            continue
        for x in f:
            parent.setdefault(x, x)
        ra, rb = find(f[0]), find(f[1])
        if ra != rb:
            parent[ra] = rb
    smallest = {}
    for x in parent:
        r = find(x)
        if r not in smallest or x < smallest[r]:
            smallest[r] = x

    def person(uid):
        return smallest[find(uid)] if uid in parent else uid

    best = {}
    for line in folder_lines(os.path.join(data, "events")):
        f = split(line, 7)
        if not f or f[0] == b"":
            continue
        ingest = ts_ms(f[3])
        if ingest is None:
            ingest = float("inf")
        if f[0] not in best or ingest < best[f[0]][0]:
            best[f[0]] = (ingest, f)

    events = defaultdict(list)
    for ingest, f in best.values():
        _, user, ts, _, etype, product, price = f
        if user == b"" or product == b"" or ingest == float("inf"):
            continue
        t = ts_ms(ts)
        if t is None or not (ws <= t < we):
            continue
        if etype not in (b"view", b"cart", b"purchase"):
            continue
        cents, cat = 0, None
        if etype == b"purchase":
            if not DIGITS.fullmatch(price):
                continue
            cents = int(price)
            if not (1 <= cents <= 10_000_000):
                continue
            cat = category.get(product, b"unknown")
        if ingest - t > DAY:
            continue
        events[person(user)].append((t, cents, cat))

    seen_clicks = set()
    clicks = defaultdict(list)
    for line in folder_lines(os.path.join(data, "clicks")):
        f = split(line, 4)
        if not f or f[0] == b"":
            continue
        cid, user, camp, ts = f
        if cid in seen_clicks:
            continue
        seen_clicks.add(cid)
        if user == b"" or camp not in channel:
            continue
        t = ts_ms(ts)
        if t is None or not (ws - WEEK <= t < we):
            continue
        clicks[person(user)].append((t, cid, camp))

    user_rows = {}
    camp_rows = defaultdict(lambda: [0, 0, 0, 0])
    for p, evs in events.items():
        evs.sort(key=lambda e: e[0])
        sessions = []
        for e in evs:
            if sessions and e[0] - sessions[-1]["last"] <= GAP:
                s = sessions[-1]
            else:
                s = {"start": e[0], "events": []}
                sessions.append(s)
            s["events"].append(e)
            s["last"] = e[0]
        cl = sorted(clicks.get(p, []))
        cl_ts = [c[0] for c in cl]
        for s in sessions:
            start = s["start"]
            day = start // DAY
            revenue = sum(e[1] for e in s["events"])
            purchased = any(e[1] > 0 for e in s["events"])
            lo = bisect.bisect_left(cl_ts, start - WEEK)
            hi = bisect.bisect_right(cl_ts, start)
            cands = cl[lo:hi]
            if cands:
                chosen = min(cands, key=lambda c: (-c[0], c[1]))
                credit = chosen[2]
            else:
                credit = b"organic"
            row = camp_rows[(credit, day)]
            row[0] += 1
            row[1] += 1 if purchased else 0
            row[2] += revenue
            for camp in {c[2] for c in cands}:
                camp_rows[(camp, day)][3] += 1
            u = user_rows.setdefault((p, day), {"sessions": 0, "events": 0, "revenue": 0, "cats": defaultdict(int)})
            u["sessions"] += 1
            u["events"] += len(s["events"])
            u["revenue"] += revenue
            for e in s["events"]:
                if e[1] > 0:
                    u["cats"][e[2]] += e[1]

    def top(cats):
        if not cats:
            return None
        return min(cats.items(), key=lambda kv: (-kv[1], kv[0]))[0].decode()

    def date(d):
        return EPOCH + datetime.timedelta(days=d)

    ud = pl.DataFrame(
        {
            "user_id": [k[0].decode() for k in user_rows],
            "day": [date(k[1]) for k in user_rows],
            "sessions": [v["sessions"] for v in user_rows.values()],
            "events": [v["events"] for v in user_rows.values()],
            "revenue_cents": [v["revenue"] for v in user_rows.values()],
            "top_category": [top(v["cats"]) for v in user_rows.values()],
        },
        schema={"user_id": pl.String, "day": pl.Date, "sessions": pl.Int64, "events": pl.Int64,
                "revenue_cents": pl.Int64, "top_category": pl.String},
    )
    cd = pl.DataFrame(
        {
            "campaign_id": [k[0].decode() for k in camp_rows],
            "channel": [("organic" if k[0] == b"organic" else channel[k[0]].decode()) for k in camp_rows],
            "day": [date(k[1]) for k in camp_rows],
            "sessions": [v[0] for v in camp_rows.values()],
            "purchasing_sessions": [v[1] for v in camp_rows.values()],
            "revenue_cents": [v[2] for v in camp_rows.values()],
            "assisted_sessions": [v[3] for v in camp_rows.values()],
        },
        schema={"campaign_id": pl.String, "channel": pl.String, "day": pl.Date, "sessions": pl.Int64,
                "purchasing_sessions": pl.Int64, "revenue_cents": pl.Int64, "assisted_sessions": pl.Int64},
    )
    for name, df in (("user_daily", ud), ("campaign_daily", cd)):
        os.makedirs(os.path.join(out, name), exist_ok=True)
        df.write_parquet(os.path.join(out, name, "part-0.parquet"))


if __name__ == "__main__":
    main()
