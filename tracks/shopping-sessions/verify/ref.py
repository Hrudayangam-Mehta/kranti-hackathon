#!/usr/bin/env python3
"""Independent, deliberately plain reference implementation of kit/rules.md.

Written by the verifier from rules.md only (no engineer code read).
Usage: ref.py [DATA_DIR OUTPUT_DIR]   (falls back to $DATA_DIR / $OUTPUT_DIR)
Writes OUTPUT_DIR/user_daily/part-0.parquet and OUTPUT_DIR/campaign_daily/part-0.parquet
(via polars, used only as a Parquet writer). Diagnostics go to stderr.
Everything is handled as bytes; comparisons are byte-wise (Python bytes order).
"""
import datetime
import json
import os
import sys
from bisect import bisect_left, bisect_right

DIGITS = frozenset(b"0123456789")
DAY_MS = 86_400_000
GAP_MS = 1_800_000
WEEK_MS = 7 * DAY_MS
LATE_MS = 86_400_000
EPOCH = datetime.date(1970, 1, 1)

diag = {}


def note(key, n=1):
    diag[key] = diag.get(key, 0) + n


# ---------------------------------------------------------------- CSV dialect
def csv_files(folder):
    """Every *.csv regular file directly in folder (sorted, for determinism)."""
    if not os.path.isdir(folder):
        return []
    out = []
    for name in sorted(os.listdir(folder)):
        p = os.path.join(folder, name)
        if name.endswith(".csv") and os.path.isfile(p):
            out.append(p)
    return out


def data_lines(path):
    """Lines after the header. Only \\n ends a line; a final line without \\n still counts."""
    with open(path, "rb") as fh:
        data = fh.read()
    if not data:
        return []
    lines = data.split(b"\n")
    if data.endswith(b"\n"):
        lines.pop()  # the terminator of the last line, not an empty line
    return lines[1:]  # skip exactly one header line


def parse_line(line, nfields):
    """Return list of field values (bytes; b'' = null) or None if malformed."""
    if line == b"":
        return None  # empty line is malformed
    parts = line.split(b",")
    if len(parts) != nfields:
        return None
    out = []
    for p in parts:
        if b'"' in p:
            if len(p) >= 2 and p[:1] == b'"' and p[-1:] == b'"' and b'"' not in p[1:-1]:
                out.append(p[1:-1])
            else:
                return None  # a quote anywhere except around the whole field
        else:
            out.append(p)
    return out


def all_digits(b):
    return len(b) > 0 and all(c in DIGITS for c in b)


# ---------------------------------------------------------------- timestamps
def is_leap(y):
    return y % 4 == 0 and (y % 100 != 0 or y % 400 == 0)


def month_len(y, m):
    if m == 2:
        return 29 if is_leap(y) else 28
    return 30 if m in (4, 6, 9, 11) else 31


def days_from_civil(y, m, d):
    """Days since 1970-01-01 in the proleptic Gregorian calendar (H. Hinnant)."""
    y -= m <= 2
    era = (y if y >= 0 else y - 399) // 400
    yoe = y - era * 400
    doy = (153 * (m + (-3 if m > 2 else 9)) + 2) // 5 + d - 1
    doe = yoe * 365 + yoe // 4 - yoe // 100 + doy
    return era * 146097 + doe - 719468


def num(b):
    return int(b) if all_digits(b) else None


def parse_ts(b):
    """F1 / F2 / F3 -> integer epoch ms, or None when bad."""
    if not b:
        return None
    if all_digits(b):  # F3
        return int(b)
    if len(b) == 20 and b[19:20] == b"Z":
        off_ms = 0
    elif len(b) == 25 and b[19:20] in (b"+", b"-") and b[22:23] == b":":
        oh, om = num(b[20:22]), num(b[23:25])
        if oh is None or om is None or not (0 <= oh <= 23) or not (0 <= om <= 59):
            return None
        off_ms = (oh * 3600 + om * 60) * 1000
        if b[19:20] == b"-":
            off_ms = -off_ms
    else:
        return None
    if b[4:5] != b"-" or b[7:8] != b"-" or b[10:11] != b"T" or b[13:14] != b":" or b[16:17] != b":":
        return None
    y, mo, d = num(b[0:4]), num(b[5:7]), num(b[8:10])
    h, mi, s = num(b[11:13]), num(b[14:16]), num(b[17:19])
    if None in (y, mo, d, h, mi, s):
        return None
    if not (1 <= mo <= 12) or not (1 <= d <= month_len(y, mo)):
        return None
    if not (0 <= h <= 23 and 0 <= mi <= 59 and 0 <= s <= 59):
        return None
    local_ms = (days_from_civil(y, mo, d) * 86400 + h * 3600 + mi * 60 + s) * 1000
    return local_ms - off_ms  # subtract the offset to get UTC


# ---------------------------------------------------------------- linked IDs
class DSU:
    def __init__(self):
        self.parent = {}

    def find(self, x):
        self.parent.setdefault(x, x)
        root = x
        while self.parent[root] != root:
            root = self.parent[root]
        while self.parent[x] != root:
            self.parent[x], x = root, self.parent[x]
        return root

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.parent[ra] = rb


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    data_dir = args[0] if len(args) >= 2 else os.environ["DATA_DIR"]
    out_dir = args[1] if len(args) >= 2 else os.environ["OUTPUT_DIR"]

    with open(os.path.join(data_dir, "manifest.json"), "rb") as fh:
        manifest = json.load(fh)
    ws = parse_ts(manifest["window_start"].encode())
    we = parse_ts(manifest["window_end"].encode())
    assert ws is not None and we is not None, "manifest window not parseable"
    cws = ws - WEEK_MS

    # products / campaigns (clean, but parsed with the same dialect anyway)
    category = {}
    for line in data_lines(os.path.join(data_dir, "products.csv")):
        f = parse_line(line, 2)
        if f is None:
            note("products_malformed")
            continue
        category[f[0]] = f[1]
    channel = {}
    for line in data_lines(os.path.join(data_dir, "campaigns.csv")):
        f = parse_line(line, 2)
        if f is None:
            note("campaigns_malformed")
            continue
        channel[f[0]] = f[1]

    # links
    dsu = DSU()
    for path in csv_files(os.path.join(data_dir, "links")):
        for line in data_lines(path):
            f = parse_line(line, 2)
            if f is None or f[0] == b"" or f[1] == b"":
                note("links_dropped")
                continue
            dsu.union(f[0], f[1])
    members = {}
    for x in list(dsu.parent):
        members.setdefault(dsu.find(x), []).append(x)
    name_of = {}
    for root, ids in members.items():
        nm = min(ids)
        for x in ids:
            name_of[x] = nm

    def person(uid):
        return name_of.get(uid, uid)

    # events: parse, dedup (smallest ingest), then validate the kept copy
    kept = {}
    for path in csv_files(os.path.join(data_dir, "events")):
        for line in data_lines(path):
            f = parse_line(line, 7)
            if f is None or f[0] == b"":
                note("events_parse_dropped")
                continue
            ing = parse_ts(f[3])
            if ing is None:
                note("events_bad_ingest(!)")
                ing = float("inf")
            cur = kept.get(f[0])
            if cur is None:
                kept[f[0]] = (ing, f)
            else:
                if ing < cur[0]:
                    kept[f[0]] = (ing, f)
                elif ing == cur[0] and cur[1] != f:
                    note("events_equal_ingest_but_different(!)")
    by_person = {}
    n_ok = 0
    for eid, (ing, f) in kept.items():
        uid, ts_b, typ, prod, price_b = f[1], f[2], f[4], f[5], f[6]
        if uid == b"":
            note("ev_bad_user")
            continue
        ts = parse_ts(ts_b)
        if ts is None or not (ws <= ts < we):
            note("ev_bad_ts")
            continue
        if typ not in (b"view", b"cart", b"purchase"):
            note("ev_bad_type")
            continue
        if prod == b"":
            note("ev_bad_product")
            continue
        price = 0
        cat = None
        if typ == b"purchase":
            if not all_digits(price_b):
                note("ev_bad_price")
                continue
            price = int(price_b)
            if not (1 <= price <= 10_000_000):
                note("ev_bad_price")
                continue
            cat = category.get(prod, b"unknown")
        if ing - ts > LATE_MS:
            note("ev_late")
            continue
        n_ok += 1
        by_person.setdefault(person(uid), []).append((ts, typ == b"purchase", price, cat))
    note("ev_surviving", n_ok)

    # clicks: parse, dedup on click_id (keep the first copy), validate
    seen_click = {}
    for path in csv_files(os.path.join(data_dir, "clicks")):
        for line in data_lines(path):
            f = parse_line(line, 4)
            if f is None or f[0] == b"":
                note("clicks_parse_dropped")
                continue
            if f[0] in seen_click:
                if seen_click[f[0]] != f:
                    note("clicks_dup_with_different_values(!)")
                continue
            seen_click[f[0]] = f
    clicks_of = {}
    for cid, f in seen_click.items():
        uid, camp, ts_b = f[1], f[2], f[3]
        if uid == b"":
            note("ck_bad_user")
            continue
        ts = parse_ts(ts_b)
        if ts is None or not (cws <= ts < we):
            note("ck_bad_ts")
            continue
        if camp not in channel:
            note("ck_bad_campaign")
            continue
        clicks_of.setdefault(person(uid), []).append((ts, cid, camp))

    user_rows = {}  # (person, day) -> [sessions, events, revenue, {cat: sum}]
    camp_rows = {}  # (campaign, day) -> [sessions, purchasing, revenue, assisted]
    for pname, evs in by_person.items():
        evs.sort(key=lambda e: e[0])
        sessions = []
        prev = None
        for e in evs:
            if prev is None or e[0] - prev > GAP_MS:
                sessions.append([e[0], []])
            sessions[-1][1].append(e)
            prev = e[0]
        cks = sorted(clicks_of.get(pname, []))  # by ts, then click_id bytes
        cts = [c[0] for c in cks]
        for start, sev in sessions:
            day = start // DAY_MS
            rev = sum(e[2] for e in sev if e[1])
            purch = any(e[1] for e in sev)
            ur = user_rows.setdefault((pname, day), [0, 0, 0, {}])
            ur[0] += 1
            ur[1] += len(sev)
            ur[2] += rev
            for e in sev:
                if e[1]:
                    ur[3][e[3]] = ur[3].get(e[3], 0) + e[2]
            lo = bisect_left(cts, start - WEEK_MS)
            hi = bisect_right(cts, start)
            window = cks[lo:hi]  # clicks with start-7d <= ts <= start
            if window:
                top_ts = window[-1][0]
                credited = min(c[1] for c in window if c[0] == top_ts)
                camp = [c[2] for c in window if c[0] == top_ts and c[1] == credited][0]
                assists = set(c[2] for c in window)
            else:
                camp = b"organic"
                assists = set()
            cr = camp_rows.setdefault((camp, day), [0, 0, 0, 0])
            cr[0] += 1
            cr[1] += 1 if purch else 0
            cr[2] += rev
            for a in assists:
                camp_rows.setdefault((a, day), [0, 0, 0, 0])[3] += 1

    write_outputs(out_dir, user_rows, camp_rows, channel)
    tot_s_u = sum(v[0] for v in user_rows.values())
    tot_s_c = sum(v[0] for v in camp_rows.values())
    print(f"ref: user_daily {len(user_rows)} rows, campaign_daily {len(camp_rows)} rows, "
          f"sessions {tot_s_u}/{tot_s_c}, diag {diag}", file=sys.stderr)


def top_category(cats):
    if not cats:
        return None
    best = max(cats.values())
    return min(c for c, v in cats.items() if v == best)


def write_outputs(out_dir, user_rows, camp_rows, channel):
    import polars as pl

    def s(b):
        return b.decode("utf-8")

    def d(day):
        return EPOCH + datetime.timedelta(days=day)

    u = {"user_id": [], "day": [], "sessions": [], "events": [], "revenue_cents": [], "top_category": []}
    for (pname, day), (ns, ne, rev, cats) in user_rows.items():
        tc = top_category(cats)
        u["user_id"].append(s(pname))
        u["day"].append(d(day))
        u["sessions"].append(ns)
        u["events"].append(ne)
        u["revenue_cents"].append(rev)
        u["top_category"].append(None if tc is None else s(tc))
    c = {"campaign_id": [], "channel": [], "day": [], "sessions": [], "purchasing_sessions": [],
         "revenue_cents": [], "assisted_sessions": []}
    for (camp, day), (ns, npur, rev, ast) in camp_rows.items():
        c["campaign_id"].append(s(camp))
        c["channel"].append("organic" if camp == b"organic" else s(channel[camp]))
        c["day"].append(d(day))
        c["sessions"].append(ns)
        c["purchasing_sessions"].append(npur)
        c["revenue_cents"].append(rev)
        c["assisted_sessions"].append(ast)
    ud = pl.DataFrame(u, schema={"user_id": pl.String, "day": pl.Date, "sessions": pl.Int64,
                                 "events": pl.Int64, "revenue_cents": pl.Int64, "top_category": pl.String})
    cd = pl.DataFrame(c, schema={"campaign_id": pl.String, "channel": pl.String, "day": pl.Date,
                                 "sessions": pl.Int64, "purchasing_sessions": pl.Int64,
                                 "revenue_cents": pl.Int64, "assisted_sessions": pl.Int64})
    for name, df in (("user_daily", ud), ("campaign_daily", cd)):
        folder = os.path.join(out_dir, name)
        os.makedirs(folder, exist_ok=True)
        df.write_parquet(os.path.join(folder, "part-0.parquet"))


if __name__ == "__main__":
    main()
