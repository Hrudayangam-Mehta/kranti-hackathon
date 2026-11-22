import os, sys, shutil, subprocess, json, random
S = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions"
W = S + "/v5c"
PY = S + "/kit/venv/bin/python"
SCRIPTS = S + "/kit/unz/starter-duckdb/scripts"
BIN = sys.argv[1]
WIN = ("2026-10-01T00:00:00Z", "2026-10-15T00:00:00Z")
BASE = 1790812800000
DAY = 86400000
HEX32 = "0123456789abcdef0123456789abcdef"

def ids(prefix):
    h = HEX32
    return [
        prefix + "1", prefix + "01", prefix + "001", prefix.upper() + "1", prefix + "1 ", " " + prefix + "1", prefix + "1\r",
        prefix + "zzzzzzzzzzzz", prefix + "zzzzzzzzzzz", prefix + "zzzzzzzzzz", prefix + "0", prefix + "00", prefix + "z", prefix,
        prefix + h, prefix + h[:31], prefix + h + "0", prefix + h.upper(), prefix + "0000000000000000ffffffffffffffff",
        prefix + "ffffffffffffffffffffffffffffffff", prefix + "fffffffffffffffe0000000000000000", prefix + "0000000000000001" + "0" * 16,
        prefix + "g" + h[1:], prefix + h[:-1] + "g", prefix + "10", prefix + "100", prefix + "1a", prefix + "a1",
        "x1", "k1", "e1", "u1", "1", "01", h, h[:31], "A", "Z", "_", "a-b", prefix + "_1", prefix + "-1",
        prefix + "1" * 300, prefix + "f" * 200, prefix + "\xc3\xa9", "\xc3\xa9", prefix + "\x01",
        prefix + "aaaaaaaaaaa", prefix + "aaaaaaaaaaaa", prefix + "00000000000", prefix + "000000000000",
    ]

def quoted(s):
    return '"' + s + '"'

def f1(ms):
    import datetime as dt
    return dt.datetime.fromtimestamp(ms // 1000, dt.UTC).strftime("%Y-%m-%dT%H:%M:%SZ")

def build(case, seed, prefix_u, prefix_e, prefix_k, mode):
    rng = random.Random(seed)
    users = ids(prefix_u)
    events = ids(prefix_e)
    clicks = ids(prefix_k)
    if mode == "mostly_long":
        users += [prefix_u + "".join(rng.choice("0123456789abcdef") for _ in range(32)) for _ in range(80)]
        events += [prefix_e + "".join(rng.choice("0123456789abcdef") for _ in range(32)) for _ in range(400)]
        clicks += [prefix_k + "".join(rng.choice("0123456789abcdef") for _ in range(32)) for _ in range(200)]
    else:
        users += [prefix_u + "".join(rng.choice("0123456789abcdefghijklmnopqrstuvwxyz") for _ in range(rng.randint(1, 12))) for _ in range(80)]
        events += [prefix_e + "".join(rng.choice("0123456789abcdefghijklmnopqrstuvwxyz") for _ in range(rng.randint(1, 12))) for _ in range(400)]
        clicks += [prefix_k + "".join(rng.choice("0123456789abcdefghijklmnopqrstuvwxyz") for _ in range(rng.randint(1, 12))) for _ in range(200)]
    users = list(dict.fromkeys(users))
    events = list(dict.fromkeys(events))
    clicks = list(dict.fromkeys(clicks))
    if mode == "quotes":
        q = 0.6
    elif mode == "noprefix":
        users = [u.replace(prefix_u, "", 1) if rng.random() < 0.7 else u for u in users]
        q = 0.1
    else:
        q = 0.2
    def field(s):
        return quoted(s) if rng.random() < q and '"' not in s else s
    d = f"{W}/vdata/{case}"
    shutil.rmtree(d, ignore_errors=True)
    for sub in ("events", "clicks", "links"):
        os.makedirs(f"{d}/{sub}")
    open(f"{d}/manifest.json", "w").write(json.dumps({"window_start": WIN[0], "window_end": WIN[1]}))
    open(f"{d}/products.csv", "w").write("product_id,category\np1,shoes\np2,books\np3,games\n")
    open(f"{d}/campaigns.csv", "w").write("campaign_id,channel\nc_1,search\nc_2,social\nc_3,email\nc_4,video\n")
    links = []
    n = len(users)
    for _ in range(n // 2):
        a, b = rng.choice(users), rng.choice(users)
        links.append(f"{field(a)},{field(b)}")
    for i in range(0, 20, 2):
        links.append(f"{field(users[i])},{field(users[i + 1])}")
    links.append(f"{field(users[14])},{field(users[0])}")
    links.append(f"{field(users[18])},{field(users[19])}")
    links.append(f"{field(users[7])},{field(users[8])}")
    links.append(f"{field(users[42])},{field(users[43])}")
    links.append("u1,")
    links.append(",u1")
    links.append('"u1')
    links.append("u1,u2,u3")
    links.append("")
    links.append('u1,u"2')
    rng.shuffle(links)
    files = [[], [], []]
    for l in links:
        files[rng.randrange(3)].append(l)
    for i, f in enumerate(files):
        body = "user_id_a,user_id_b\n" + "\n".join(f) + ("\n" if i != 1 else "")
        open(f"{d}/links/l{i}.csv", "wb").write(body.encode("latin-1"))
    open(f"{d}/links/empty.csv", "w").write("user_id_a,user_id_b\n")
    ev_lines = []
    ingest_base = BASE + 3 * DAY
    for i in range(2400):
        e = rng.choice(events)
        u = rng.choice(users)
        day = rng.randrange(14)
        t = BASE + day * DAY + rng.randrange(0, DAY)
        if rng.random() < 0.3:
            t = BASE + day * DAY + rng.randrange(0, 40) * 1800000 + rng.choice([0, 1, 1800000, 1800001, 59000])
        ing = t + rng.choice([0, 1000, 60000, 3600000, 86400000, 86400001, -5000])
        typ = rng.choice(["view", "view", "cart", "purchase", "purchase", "Purchase", "view "])
        prod = rng.choice(["p1", "p2", "p3", "p9", "", "P1"])
        price = rng.choice(["", "100", "250", "0250", "0", "10000000", "10000001", "-5", "1.5", "abc"]) if typ == "purchase" else rng.choice(["", "7", "x"])
        tsf = str(t) if rng.random() < 0.4 else f1(t)
        ev_lines.append(",".join([field(e), field(u), field(tsf), f1(ing), field(typ), field(prod), field(price)]))
        if rng.random() < 0.08:
            delta = rng.choice([-1000, 1000, 5000, 0])
            u2 = rng.choice(users) if delta != 0 and rng.random() < 0.3 else u
            ev_lines.append(",".join([quoted(e) if '"' not in e else e, field(u2), tsf, f1(ing + delta), field(typ), field(prod), field(price)]))
    ev_lines += ["", ",u1,1790812800000,2026-10-01T00:00:00Z,view,p1,", 'e"1,u1,1790812800000,2026-10-01T00:00:00Z,view,p1,', "e1,u1,1790812800000,2026-10-01T00:00:00Z,view,p1"]
    rng.shuffle(ev_lines)
    k = 3
    parts = [[] for _ in range(k)]
    for l in ev_lines:
        parts[rng.randrange(k)].append(l)
    for i, f in enumerate(parts):
        body = "event_id,user_id,ts,ingest_ts,event_type,product_id,price_cents\n" + "\n".join(f) + ("\n" if i != 2 else "")
        open(f"{d}/events/e{i}.csv", "wb").write(body.encode("latin-1"))
    ck_lines = []
    pool = list(clicks)
    rng.shuffle(pool)
    alpha = "0123456789abcdefghijklmnopqrstuvwxyz"
    for i in range(1200):
        if pool:
            c = pool.pop()
        else:
            tag = ""
            v = i + 1
            while v:
                tag = alpha[v % 36] + tag
                v //= 36
            c = prefix_k + "".join(rng.choice(alpha) for _ in range(rng.randint(0, 6))) + "q" + tag
        u = rng.choice(users)
        day = rng.randrange(-7, 14)
        t = BASE + day * DAY + rng.randrange(0, DAY)
        if rng.random() < 0.3:
            t = BASE + rng.randrange(0, 14) * DAY + rng.randrange(0, 40) * 1800000 + rng.choice([0, 1, -1, 1800000])
        if rng.random() < 0.3:
            t -= rng.choice([0, 1, DAY * 7, DAY * 7 + 1])
        camp = rng.choice(["c_1", "c_2", "c_3", "c_4", "c_9", "C_1", ""])
        tsf = str(t) if rng.random() < 0.4 else f1(t)
        ck_lines.append(",".join([field(c), field(u), field(camp), field(tsf)]))
        if rng.random() < 0.1:
            ck_lines.append(",".join([quoted(c) if '"' not in c else c, quoted(u) if '"' not in u else u, camp, tsf]))
    used = set(clicks)
    tie_pool = [c for c in dict.fromkeys(ids(prefix_k + "t")) if c not in used]
    rng.shuffle(tie_pool)
    for i in range(60):
        v = i + 1
        tag = ""
        while v:
            tag = alpha[v % 36] + tag
            v //= 36
        tie_pool.append(prefix_k + "t" + "".join(rng.choice(alpha) for _ in range(rng.randint(0, 5))) + "w" + tag)
        tie_pool.append(prefix_k + "t" + "".join(rng.choice("0123456789abcdef") for _ in range(31)) + "f"[: rng.randint(0, 1)] + "0" + tag)
    rng.shuffle(tie_pool)
    starts = [l for l in ev_lines if l.count(",") == 6]
    while len(tie_pool) >= 3:
        line = rng.choice(starts).split(",")
        u = line[1].strip('"')
        tsf = line[2].strip('"')
        if not u or not tsf:
            continue
        k = min(len(tie_pool), rng.randint(3, 5))
        for _ in range(k):
            c = tie_pool.pop()
            ck_lines.append(",".join([field(c), field(u), field(rng.choice(["c_1", "c_2", "c_3"])), field(tsf)]))
    ck_lines += ["", ",u1,c_1,1790812800000", 'k"1,u1,c_1,1790812800000']
    rng.shuffle(ck_lines)
    parts = [[] for _ in range(2)]
    for l in ck_lines:
        parts[rng.randrange(2)].append(l)
    for i, f in enumerate(parts):
        body = "click_id,user_id,campaign_id,ts\n" + "\n".join(f) + "\n"
        open(f"{d}/clicks/k{i}.csv", "wb").write(body.encode("latin-1"))
    return d

def compare(a, b):
    p = subprocess.run([PY, "-B", SCRIPTS + "/compare.py", a, b], capture_output=True, text=True, cwd=SCRIPTS)
    return p.returncode == 0 and p.stdout.strip().endswith("MATCH"), p.stdout + p.stderr

cases = [
    ("craft_u", 1, "u", "e", "k", "plain"),
    ("craft_quotes", 2, "u", "e", "k", "quotes"),
    ("craft_long", 3, "u", "e", "k", "mostly_long"),
    ("craft_noprefix", 4, "u", "e", "k", "noprefix"),
    ("craft_other", 5, "x", "y", "z", "plain"),
    ("craft_same", 6, "u", "u", "u", "plain"),
]
only = sys.argv[2:]
for case, seed, pu, pe, pk, mode in cases:
    if only and case not in only:
        continue
    d = build(case, seed, pu, pe, pk, mode)
    out_r, out_e = f"{W}/vruns/{case}_ref", f"{W}/vruns/{case}_eng"
    for o in (out_r, out_e):
        shutil.rmtree(o, ignore_errors=True)
    os.makedirs(out_e)
    res = []
    for ncpu in ("1", "3"):
        shutil.rmtree(out_e, ignore_errors=True); os.makedirs(out_e)
        pe_ = subprocess.run(["env", "-i", f"DATA_DIR={d}", f"OUTPUT_DIR={out_e}", f"NCPU={ncpu}", "nice", "-n", "10", "taskset", "-c", "2,3", BIN], capture_output=True, text=True)
        if ncpu == "1":
            pr = subprocess.run(["nice", "-n", "10", "taskset", "-c", "2,3", PY, "-B", S + "/verify/ref.py", d, out_r], capture_output=True, text=True)
            if pr.returncode != 0:
                print(case, "REF CRASH", pr.stderr[-500:]); break
        if pe_.returncode != 0 or pe_.stdout != "":
            print(case, f"ENG CRASH rc={pe_.returncode} stdout={len(pe_.stdout)}", pe_.stderr[-800:]); break
        ok, txt = compare(out_e, out_r)
        ok2, txt2 = compare(out_r, out_e)
        tail = [l for l in pe_.stderr.splitlines() if l.startswith(("event copies", "id prefixes", "surviving"))]
        res.append(f"NCPU={ncpu} {'MATCH' if ok and ok2 else 'DIFFER'}")
        if not (ok and ok2):
            print(txt, txt2)
            print("\n".join(tail))
    print(case, mode, " ".join(res), "|", " | ".join(tail), flush=True)
