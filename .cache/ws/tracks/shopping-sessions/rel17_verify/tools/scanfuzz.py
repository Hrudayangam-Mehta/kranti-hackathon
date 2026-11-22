#!/usr/bin/env python3
import datetime as dt
import json
import os
import random
import shutil
import subprocess
import sys

sys.path.insert(0, "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/rel17_verify/tools")
from vt import V, PY, REF, run_bin, both_ways

B16 = f"{V}/bin/rel16"
B17 = f"{V}/bin/rel17v"
EPOCH = dt.datetime(1970, 1, 1, tzinfo=dt.timezone.utc)
WS = int((dt.datetime(2026, 10, 1, tzinfo=dt.timezone.utc) - EPOCH).total_seconds()) * 1000
WE = WS + 14 * 86_400_000
ALNUM = "abcdefghijklmnopqrstuvwxyz0123456789"


def f1(t):
    return dt.datetime.fromtimestamp(t // 1000, dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def f2(t, rnd):
    off = rnd.choice([0, 60, 330, -240, 765, -600]) * 60_000
    s = dt.datetime.fromtimestamp((t + off) // 1000, dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")
    a = abs(off) // 60_000
    return s + ("+" if off >= 0 else "-") + "%02d:%02d" % (a // 60, a % 60)


def ts_form(t, rnd):
    if t % 1000:
        return ("0" * rnd.choice([0, 0, 3])) + str(t)
    return rnd.choice([f1, lambda x: f2(x, rnd), lambda x: str(x)])(t)


def pad(rnd, base, top):
    n = rnd.choice([0, 0, 1, 3, 7, 12, 20, 30, 40, 50, 60, 70, 90, 120, 140])
    n = min(n, top)
    return base + "".join(rnd.choice(ALNUM) for _ in range(n))


def quote(fields, rnd, p):
    return [('"' + f + '"') if rnd.random() < p else f for f in fields]


def mutate(line, rnd):
    k = rnd.randrange(11)
    if k == 0 and line:
        i = rnd.randrange(len(line) + 1)
        return line[:i] + '"' + line[i:]
    if k == 1 and "," in line:
        idx = [i for i, c in enumerate(line) if c == ","]
        i = rnd.choice(idx)
        return line[:i] + line[i + 1:]
    if k == 2:
        i = rnd.randrange(len(line) + 1)
        return line[:i] + "," + line[i:]
    if k == 3:
        parts = line.split(",")
        j = rnd.randrange(len(parts))
        parts[j] = rnd.choice(['"' + parts[j], parts[j] + '"', parts[j][:1] + '""' + parts[j][1:], '"' + parts[j] + '"x'])
        return ",".join(parts)
    if k == 4:
        return ""
    if k == 5:
        return "," * rnd.randrange(0, 9)
    if k == 6:
        return line + "\r"
    if k == 7:
        return '"' + line + '"'
    if k == 8:
        return line + ","
    if k == 9:
        parts = line.split(",")
        j = rnd.randrange(len(parts))
        parts[j] = '""'
        return ",".join(parts)
    return line.replace(",", '","', 1)


def build(rnd, data, n_users):
    for sub in ("events", "clicks", "links"):
        os.makedirs(f"{data}/{sub}", exist_ok=True)
    with open(f"{data}/manifest.json", "w") as fh:
        json.dump({"window_start": f1(WS), "window_end": f1(WE)}, fh)
    with open(f"{data}/products.csv", "w") as fh:
        fh.write("product_id,category\np1,shoes\np2,books\np3,toys\np4,food\np5,garden\n")
    with open(f"{data}/campaigns.csv", "w") as fh:
        fh.write("campaign_id,channel\nc_1,search\nc_2,social\nc_3,email\n")
    events, clicks, links = [], [], []
    users = []
    eid = 0
    for u in range(n_users):
        user = pad(rnd, f"u{u}x", 140)
        users.append(user)
        t = WS + rnd.randrange(0, 13 * 86_400_000)
        if rnd.random() < 0.5:
            t = t // 1000 * 1000
        for _ in range(rnd.randrange(1, 5)):
            eid += 1
            kind = rnd.choice(["view", "view", "cart", "purchase"])
            prod = rnd.choice(["p1", "p2", "p3", "p4", "p5", pad(rnd, "px", 60)])
            price = str(rnd.randrange(1, 9000)) if kind == "purchase" else rnd.choice(["", "", "7", pad(rnd, "z", 70)])
            ing = (t // 1000) * 1000 + rnd.randrange(0, 3600) * 1000
            fields = [pad(rnd, f"e{eid}q", 100) if rnd.random() < 0.3 else f"e{eid}", user, ts_form(t, rnd), f1(ing),
                      kind, prod, price]
            line = ",".join(quote(fields, rnd, 0.2))
            if rnd.random() < 0.12:
                line = mutate(line, rnd)
            events.append(line)
            t += rnd.choice([1000, 60_000, 600_000, 1_800_000, 1_800_001, 3_600_000])
            if t >= WE:
                break
        if rnd.random() < 0.6:
            for _ in range(rnd.randrange(1, 3)):
                eid += 1
                tc = WS + rnd.randrange(-7 * 86_400_000, 14 * 86_400_000)
                fields = [pad(rnd, f"k{eid}q", 80), user, rnd.choice(["c_1", "c_2", "c_3", "c_9"]), ts_form(tc, rnd)]
                line = ",".join(quote(fields, rnd, 0.2))
                if rnd.random() < 0.12:
                    line = mutate(line, rnd)
                clicks.append(line)
    for _ in range(n_users // 6):
        a, b = rnd.choice(users), rnd.choice(users)
        line = ",".join(quote([a, b], rnd, 0.25))
        if rnd.random() < 0.15:
            line = mutate(line, rnd)
        links.append(line)
    for sub, header, lines in (("events", "event_id,user_id,ts,ingest_ts,event_type,product_id,price_cents", events),
                               ("clicks", "click_id,user_id,campaign_id,ts", clicks),
                               ("links", "user_id_a,user_id_b", links)):
        rnd.shuffle(lines)
        k = rnd.randrange(1, 6)
        cuts = sorted(rnd.sample(range(len(lines) + 1), min(k - 1, len(lines) + 1)))
        prev = 0
        for i, c in enumerate(cuts + [len(lines)]):
            part = lines[prev:c]
            prev = c
            body = header + "\n" + "\n".join(part)
            if part and rnd.random() < 0.7:
                body += "\n"
            with open(f"{data}/{sub}/part-{i:03d}.csv", "w", newline="") as fh:
                fh.write(body)
    return len(events), len(clicks), len(links)


def one(s):
    rnd = random.Random(s)
    data = f"{V}/data/sf{s}"
    shutil.rmtree(data, ignore_errors=True)
    ne, nc, nl = build(rnd, data, rnd.choice([3000, 8000, 15000]))
    out_r = f"{V}/runs/sf{s}_ref"
    shutil.rmtree(out_r, ignore_errors=True)
    pr = subprocess.run(["nice", "-n", "10", "taskset", "-c", "2,3", PY, "-B", REF, data, out_r], capture_output=True, text=True)
    if pr.returncode:
        return f"sf{s} REF CRASH {pr.stderr[-400:]}"
    ncpu = rnd.choice([1, 2, 3, 5, 8])
    res = []
    good = True
    for tag, b, extra in (("r17", B17, {}), ("r17scalar", B17, {"SESSIONS_SCALAR": "1"}), ("r16", B16, {})):
        out = f"{V}/runs/sf{s}_{tag}"
        r = run_bin(b, data, out, ncpu, extra)
        ok, txt = both_ways(out, out_r)
        res.append(f"{tag}:exit={r['rc']},stdout={r['stdout']},{'MATCH' if ok else 'DIFFER'}")
        if tag.startswith("r17"):
            good &= ok and r["rc"] == 0 and r["stdout"] == 0
        if not ok:
            res.append(txt[-1200:])
    ok16, txt16 = both_ways(f"{V}/runs/sf{s}_r17", f"{V}/runs/sf{s}_r16")
    ok16s, _ = both_ways(f"{V}/runs/sf{s}_r17scalar", f"{V}/runs/sf{s}_r16")
    res.append(f"r17==r16:{'MATCH' if ok16 else 'DIFFER'} r17scalar==r16:{'MATCH' if ok16s else 'DIFFER'}")
    good &= ok16 and ok16s
    line = f"sf{s} events={ne} clicks={nc} links={nl} NCPU={ncpu} " + " ".join(res) + (" OK" if good else " FAIL")
    if good:
        for d in [data, out_r] + [f"{V}/runs/sf{s}_{t}" for t in ("r17", "r17scalar", "r16")]:
            shutil.rmtree(d, ignore_errors=True)
    return line


def main():
    a, b = int(sys.argv[1]), int(sys.argv[2])
    with open(f"{V}/logs/scanfuzz.log", "a") as log:
        for s in range(a, b):
            r = one(s)
            print(r, flush=True)
            log.write(r + "\n")


if __name__ == "__main__":
    main()
