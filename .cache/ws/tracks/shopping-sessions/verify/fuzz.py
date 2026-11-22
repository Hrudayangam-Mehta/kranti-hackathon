#!/usr/bin/env python3
"""Verifier's own mutation fuzzer: generator data + injected dirt that stays inside the rules'
guarantees (click copies identical; event copies with equal ingest identical).
Usage: fuzz.py ROUND_FROM ROUND_TO   -> appends to runs/fuzz.log
"""
import datetime as dt
import json
import os
import random
import shutil
import subprocess
import sys

V = os.path.dirname(os.path.abspath(__file__))
T = os.path.dirname(V)
sys.path.insert(0, V)
import ref  # noqa: E402  (parse helpers only)

GEN = f"{T}/kit/build/generator/target/release/generate"
PY = f"{T}/kit/venv/bin/python"
SCRIPTS = f"{T}/kit/unz/starter-duckdb/scripts"
DAY = 86_400_000
EPOCH = dt.datetime(1970, 1, 1, tzinfo=dt.timezone.utc)


def f1(t):
    return dt.datetime.fromtimestamp(t // 1000, dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ").encode()


def f2(t, rnd):
    """t must be whole seconds; random offset."""
    off = rnd.choice([0, 60, 330, 600, -600, -240, 765, -59, 1439, -1439]) * 60_000
    loc = t + off
    s = dt.datetime.fromtimestamp(loc // 1000, dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S").encode()
    sign = b"+" if off >= 0 else b"-"
    a = abs(off) // 60_000
    if off == 0 and rnd.random() < 0.5:
        sign = b"-"
    return s + sign + b"%02d:%02d" % (a // 60, a % 60)


def f3(t, rnd):
    return b"0" * rnd.choice([0, 0, 0, 1, 5, 30]) + str(t).encode()


def ts_any(t, rnd):
    if t % 1000:
        return f3(t, rnd)
    return rnd.choice([f1, lambda x: f2(x, rnd), lambda x: f3(x, rnd)])(t)


def quote_some(fields, rnd, p=0.3):
    return [b'"' + f + b'"' if rnd.random() < p else f for f in fields]


def join(fields):
    return b",".join(fields)


def mutate(data, rnd):
    man = json.load(open(f"{data}/manifest.json"))
    ws = ref.parse_ts(man["window_start"].encode())
    we = ref.parse_ts(man["window_end"].encode())
    # ---- read all event / click / link rows
    def rows(sub, n):
        out = []
        for p in ref.csv_files(f"{data}/{sub}"):
            for line in ref.data_lines(p):
                out.append((line, ref.parse_line(line, n)))
        return out
    evs, cks, lks = rows("events", 7), rows("clicks", 4), rows("links", 2)
    camps = [l.split(b",")[0] for l in open(f"{data}/campaigns.csv", "rb").read().split(b"\n")[1:] if l]
    good_ev = [f for _, f in evs if f is not None and ref.parse_ts(f[2]) is not None and f[1]]
    users = list({f[1] for f in good_ev})
    ingests = {}
    for _, f in evs:
        if f is not None:
            ingests.setdefault(f[0], set()).add(f[3])
    new_ev, new_ck, new_lk = [], [], []
    nid = [0]

    def fresh(prefix):
        nid[0] += 1
        return f"{prefix}{rnd.randrange(10**6)}z{nid[0]}".encode()

    # 1. per-line cosmetic dirt that keeps meaning: requote fields
    out_ev = []
    for line, f in evs:
        if f is not None and rnd.random() < 0.15:
            line = join(quote_some(f, rnd))
        out_ev.append(line)
    # 2. targeted events
    for _ in range(rnd.randrange(50, 300)):
        f = rnd.choice(good_ev)
        t = ref.parse_ts(f[2])
        u = f[1]
        kind = rnd.randrange(14)
        if kind == 0:  # exact gap / gap+1 follow-up
            t2 = t + rnd.choice([1_800_000, 1_800_001, 1_799_999, 0])
            new_ev.append(join([fresh("g"), u, ts_any(t2, rnd), f1(t2 + rnd.randrange(0, 3600) * 1000), b"view", b"p1", b""]))
        elif kind == 1:  # duplicate copy with a different user / bad ts, distinct ingest
            ing = ref.parse_ts(f[3]) + rnd.choice([-1, 1]) * rnd.randrange(1, 600) * 1000
            ib = f1(ing)
            if ib in ingests.get(f[0], set()):
                continue
            ingests.setdefault(f[0], set()).add(ib)
            g = list(f)
            g[3] = ib
            r = rnd.random()
            if r < 0.4:
                g[1] = rnd.choice(users)
            elif r < 0.6:
                g[2] = rnd.choice([b"bad", f[2] + b" ", b"2026-13-01T00:00:00Z"])
            elif r < 0.8:
                g[4] = rnd.choice([b"view", b"cart", b"Purchase", b"purchase"])
                g[6] = rnd.choice([b"5", b"0", b"", b"0250"])
            new_ev.append(join(quote_some(g, rnd)))
        elif kind == 2:  # identical copy (same ingest), re-quoted
            new_ev.append(join(quote_some(f, rnd, 0.5)))
        elif kind == 3:  # window boundary events
            tb = rnd.choice([ws, ws - 1, we - 1, we, ws + 1, we - 1000])
            new_ev.append(join([fresh("w"), u, ts_any(tb, rnd), f1(tb + 1000), rnd.choice([b"view", b"purchase"]), b"p1", b"100"]))
        elif kind == 4:  # late boundary
            d = rnd.choice([DAY, DAY + 1000, DAY - 1000, -5 * DAY])
            t0 = t // 1000 * 1000 + rnd.choice([0, 1, 999])
            ing = (t0 + d) // 1000 * 1000
            new_ev.append(join([fresh("l"), u, ts_any(t0, rnd), f1(ing), b"cart", b"p2", b"x"]))
        elif kind == 5:  # spaces / case / CR variants of ids (new ids)
            v = rnd.choice([b" " + u, u + b" ", u.upper(), u + b"\r", b'"' + u + b'"'])
            new_ev.append(join([fresh("s"), v, f[2], f[3], f[4], f[5], f[6]]))
        elif kind == 6:  # malformed variants
            v = rnd.choice([join(list(f) + [b""]), join(f[:6]), join(f).replace(b",", b',"', 1), b"", b"\r",
                            join(f) + b'"', join([b'"' + f[0]] + list(f[1:]))])
            new_ev.append(v)
        elif kind == 7:  # purchase with tricky prices / products
            new_ev.append(join([fresh("p"), u, ts_any(t, rnd), f[3], b"purchase",
                                rnd.choice([b"p1", b"P1", b" p1", b"p_missing", b"p2"]),
                                rnd.choice([b"1", b"10000000", b"10000001", b"0" * 20 + b"9", b"7\r", b"+7"])]))
        elif kind == 8:  # header copy inside data
            new_ev.append(b"event_id,user_id,ts,ingest_ts,event_type,product_id,price_cents")
        elif kind == 9:  # unicode ids
            new_ev.append(join([fresh("ü".encode().decode() and "u"), "é中".encode() + u, f[2], f[3], b"view", b"p1", b""]))
        elif kind == 10:  # same-ms ties with a purchase
            new_ev.append(join([fresh("t"), u, f3(t, rnd), f[3], b"purchase", b"p2", b"321"]))
        elif kind == 11:  # F2 forms at the same instant (whole seconds only)
            ts_ = t // 1000 * 1000
            new_ev.append(join([fresh("o"), u, f2(ts_, rnd), f1(ts_ + 5000), b"view", b"p1", b""]))
        elif kind == 12:  # bad timestamp forms
            bad = rnd.choice([f[2] + b"Z", f[2].lower(), b"2027-02-29T10:00:00Z", b"2028-02-29T10:00:00z",
                              f1(t).replace(b"T", b" "), f1(t)[:-1] + b"+0000", f1(t)[:-1] + b"+24:00"])
            new_ev.append(join([fresh("b"), u, bad, f[3], b"view", b"p1", b""]))
        else:  # empty event id / empty user / empty product
            new_ev.append(rnd.choice([join([b"", u, f[2], f[3], b"view", b"p1", b""]),
                                      join([fresh("e"), b'""', f[2], f[3], b"view", b"p1", b""]),
                                      join([fresh("e"), u, f[2], f[3], b"view", b"", b""])]))
    # 3. clicks: re-quote, identical duplicates, boundary clicks
    out_ck = []
    good_ck = [f for _, f in cks if f is not None]
    for line, f in cks:
        if f is not None and rnd.random() < 0.15:
            line = join(quote_some(f, rnd))
        out_ck.append(line)
    for _ in range(rnd.randrange(50, 300)):
        kind = rnd.randrange(6)
        if kind == 0 and good_ck:
            f = rnd.choice(good_ck)
            new_ck.append(join(quote_some(f, rnd, 0.5)))
        else:
            f = rnd.choice(good_ev)
            t = ref.parse_ts(f[2])
            u = f[1]
            if kind == 1:
                tc = t + rnd.choice([0, 1, -1, -7 * DAY, -7 * DAY - 1, -7 * DAY + 1])
            elif kind == 2:
                tc = rnd.choice([ws - 7 * DAY, ws - 7 * DAY - 1, we - 1, we])
            else:
                tc = t - rnd.randrange(0, 8 * DAY)
            cid = fresh(rnd.choice(["k", "K", "k_", "k-", "kk"]))
            c = rnd.choice(camps + [b"c_99999", b"C_1", b" c_1"])
            line = join([cid, rnd.choice([u, u, u.upper(), b""]), c, ts_any(tc, rnd)])
            new_ck.append(line)
            if rnd.random() < 0.3:  # tie at the same ms with another id
                new_ck.append(join([fresh("k"), u, rnd.choice(camps), ts_any(tc, rnd)]))
    # 4. links: chains, self links, uppercase, empty sides, header copies
    out_lk = [l for l, _ in lks]
    for _ in range(rnd.randrange(20, 120)):
        a, b_ = rnd.choice(users), rnd.choice(users)
        kind = rnd.randrange(7)
        if kind == 0:
            new_lk.append(join([a, b_]))
        elif kind == 1:
            new_lk.append(join([a, a]))
        elif kind == 2:
            new_lk.append(join([a.upper(), a]))
        elif kind == 3:
            new_lk.append(rnd.choice([join([a, b""]), join([b'""', a]), join([a, b_, b"x"]), b""]))
        elif kind == 4:
            new_lk.append(b"user_id_a,user_id_b")
        elif kind == 5:
            chain = [fresh("q") for _ in range(rnd.randrange(3, 40))] + [a]
            rnd.shuffle(chain)
            new_lk += [join([x, y]) for x, y in zip(chain, chain[1:])]
        else:
            new_lk.append(join(quote_some([a, b_], rnd, 0.6)))
    return (out_ev + new_ev, out_ck + new_ck, out_lk + new_lk)


def write_split(folder, header, lines, rnd):
    shutil.rmtree(folder, ignore_errors=True)
    os.makedirs(folder)
    rnd.shuffle(lines)
    k = rnd.randrange(1, 9)
    cuts = sorted(rnd.sample(range(len(lines) + 1), min(k - 1, len(lines) + 1))) if lines else []
    parts, prev = [], 0
    for c in cuts + [len(lines)]:
        parts.append(lines[prev:c])
        prev = c
    for i, part in enumerate(parts):
        body = header + b"\n" + b"\n".join(part)
        r = rnd.random()
        if part and r < 0.7:
            body += b"\n"
        with open(f"{folder}/part-{i:03d}.csv", "wb") as fh:
            fh.write(body)
    with open(f"{folder}/empty-{rnd.randrange(99)}.csv", "wb") as fh:
        fh.write(rnd.choice([b"", header, header + b"\n"]))


def one(rnd_seed):
    rnd = random.Random(rnd_seed)
    seed = 1000 + rnd_seed
    ev = rnd.choice([5000, 20000, 60000])
    ck = rnd.choice([ev // 4, ev, ev * 2])
    data = f"{V}/data/fz{rnd_seed}"
    shutil.rmtree(data, ignore_errors=True)
    subprocess.run([GEN, "--seed", str(seed), "--events", str(ev), "--clicks", str(ck), "--output", data, "--threads", "1"],
                   check=True, capture_output=True)
    E, C, L = mutate(data, rnd)
    write_split(f"{data}/events", b"event_id,user_id,ts,ingest_ts,event_type,product_id,price_cents", E, rnd)
    write_split(f"{data}/clicks", b"click_id,user_id,campaign_id,ts", C, rnd)
    write_split(f"{data}/links", b"user_id_a,user_id_b", L, rnd)
    out_r, out_e = f"{V}/runs/fz{rnd_seed}_ref", f"{V}/runs/fz{rnd_seed}_eng"
    for d in (out_r, out_e):
        shutil.rmtree(d, ignore_errors=True)
    os.makedirs(out_e)
    ncpu = str(rnd.choice([1, 2, 3, 5, 8]))
    pe = subprocess.run([f"{V}/eng.sh", data, out_e], capture_output=True, text=True, env=dict(os.environ, NCPU=ncpu))
    pr = subprocess.run(["taskset", "-c", "2,3", PY, "-B", f"{V}/ref.py", data, out_r], capture_output=True, text=True)
    if pe.returncode or pr.returncode:
        return f"fz{rnd_seed} CRASH eng={pe.returncode} ref={pr.returncode} {pe.stderr[-500:]} {pr.stderr[-500:]}"
    p = subprocess.run([PY, "-B", f"{SCRIPTS}/compare.py", out_e, out_r], capture_output=True, text=True, cwd=SCRIPTS)
    st = "MATCH" if p.returncode == 0 else "DIFFER"
    line = f"fz{rnd_seed} gen_seed={seed} E={ev} C={ck} lines_ev={len(E)} NCPU={ncpu} {st}"
    if st == "MATCH":
        for d in (out_r, out_e, data):
            shutil.rmtree(d, ignore_errors=True)
    else:
        line += "\n" + p.stdout
    return line


def main():
    a, b_ = int(sys.argv[1]), int(sys.argv[2])
    with open(f"{V}/runs/fuzz.log", "a") as log:
        for s in range(a, b_):
            r = one(s)
            print(r, flush=True)
            log.write(r + "\n")


if __name__ == "__main__":
    main()
