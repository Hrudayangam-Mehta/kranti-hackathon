import os, sys, shutil, subprocess, json, random, datetime as dt
S = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions"
V = S + "/v5c_verify"
PY = S + "/kit/venv/bin/python"
SCRIPTS = S + "/kit/unz/starter-duckdb/scripts"
ROWDIFF = S + "/panel_s/threads/tools"
BIN = sys.argv[1]
WIN = (b"2028-02-16T00:00:00Z", b"2028-03-01T00:00:00Z")
BASE = 1834444800000
DAY = 86400000
HEX = b"0123456789abcdef"
B36 = b"0123456789abcdefghijklmnopqrstuvwxyz"
H32 = b"0123456789abcdef0123456789abcdef"


def crafted(p):
    out = [
        p + b"1", p + b"01", p + b"001", p + b"0001", p + b"10", p + b"100", p + b"1000", p + b"0", p + b"00", p + b"000",
        p + b"z", p + b"zz", p + b"zzzzzzzzzzz", p + b"zzzzzzzzzzzz", p + b"zzzzzzzzzzzzz", p + b"00000000000", p + b"000000000000",
        p + b"0000000000000000000000000000000", p + b"00000000000000000000000000000000", p + b"000000000000000000000000000000000",
        p + b"a", p + b"f", p + b"g", p + b"fg", p + b"gf", p + b"0g", p + b"g0", p + b"0f", p + b"f0",
        p + H32, p + H32[:31], p + H32 + b"0", p + H32 + b"g", p + H32.upper(), p + H32[:16] + H32[:16].upper(),
        p + H32[:31] + b"g", p + b"g" + H32[1:], p + H32[:15] + b"G" + H32[16:],
        p + b"0" * 16 + b"f" * 16, p + b"0" * 15 + b"1" + b"f" * 16, p + b"f" * 16 + b"0" * 16, p + b"f" * 15 + b"e" + b"0" * 16, p + b"f" * 32,
        p + b"0" * 31 + b"1", p + b"1" + b"0" * 31, p + b"f" * 31 + b"e",
        p + b"0123", p + b"0124", p + b"0123456789ab", p + b"0123456789a", p + b"0123456789abc", p + b"0123456789abcdef",
        p + b"0123456789abcdef0123456789abcde", p + b"0123456789abcdef0123456789abcdef", p + b"0123456789abcdef0123456789abcdeg",
        p + b"0123456789abcdef0123456789abcdef0", p + b"0123456789abcdef0123456789abcdefg", p + b"0123456789abcdeg0123456789abcdef",
        p + b"1 ", b" " + p + b"1", p + b"1\r", p + b" ", p + b"\r", p + b"1\t", p + b"\x01", p + b"\x7f", p + b"\xc3\xa9", b"\xc3\xa9", p + b"\xe2\x82\xac", b"\xe2\x82\xac" + p + b"1", p + b"1\xc3\xa9",
        p.upper() + b"1", p + b"A", p + b"Z", p + b"_", p + b"-", p + b"a-b", p + b"a_b", p + b"A1", p + b"1A",
        p + p + b"1", p + p, p, b"", b"1", b"01", b"a", b"z", b"x1", b"u1", b"k1", b"e1", b"U1", b"0", b"00",
        H32, H32[:31], H32 + b"0", H32.upper(), b"0" * 32, b"f" * 32, b"0" * 16 + b"f" * 16,
        p + b"1" * 300, p + b"f" * 200, p + b"f" * 33, p + b"f" * 31, b"f" * 31, b"z" * 11, b"z" * 12,
        p + b"aaaaaaaaaaa", p + b"aaaaaaaaaaaa", p + b"a" * 10, p + b"0" * 10 + b"1", p + b"1" + b"0" * 10, p + b"1" + b"0" * 11,
        p + b"\"", p + b"\"1\"", p + b",", p + b"\n",
    ]
    for n in range(1, 41):
        out.append(p + b"0" * n)
        out.append(p + b"z" * n)
        out.append(p + b"f" * n)
        out.append(p + (b"0123456789abcdefghijklmnopqrstuvwxyz0123" * 2)[:n])
        out.append(p + (b"fedcba9876543210fedcba9876543210fedcba98")[:n])
    return out


def randoms(rng, p, n):
    out = []
    for _ in range(n):
        kind = rng.random()
        if kind < 0.35:
            out.append(p + bytes(rng.choice(B36) for _ in range(rng.randint(1, 12))))
        elif kind < 0.55:
            out.append(p + bytes(rng.choice(HEX) for _ in range(32)))
        elif kind < 0.65:
            out.append(p + bytes(rng.choice(HEX) for _ in range(rng.choice([31, 33, 32, 32, 16, 30]))))
        elif kind < 0.72:
            s = bytearray(p + bytes(rng.choice(HEX) for _ in range(32)))
            s[rng.randrange(len(s))] = rng.choice(b"ABCDEFG z-")
            out.append(bytes(s))
        elif kind < 0.80:
            s = bytearray(p + bytes(rng.choice(B36) for _ in range(rng.randint(1, 12))))
            s[rng.randrange(len(s))] = rng.choice(b"ABCZ _-\r")
            if rng.random() < 0.2:
                s += b"\xc3\xa9"
            out.append(bytes(s))
        elif kind < 0.88:
            out.append(p + b"0" * rng.randint(0, 20) + bytes(rng.choice(B36) for _ in range(rng.randint(0, 12))))
        elif kind < 0.94:
            out.append(bytes(rng.choice(B36) for _ in range(rng.randint(1, 12))))
        else:
            out.append(rng.choice([b"x", b"X", b"", b" "]) + p + bytes(rng.choice(B36) for _ in range(rng.randint(1, 12))))
    return out


def f1(ms):
    return dt.datetime.fromtimestamp(ms // 1000, dt.UTC).strftime("%Y-%m-%dT%H:%M:%SZ").encode()


def build(case, seed, pu, pe, pk, mode):
    rng = random.Random(seed)
    users = crafted(pu) + randoms(rng, pu, 20000 if mode in ("big", "big_old") else 600)
    events = crafted(pe) + randoms(rng, pe, 60000 if mode in ("big", "big_old") else 3000)
    clicks = crafted(pk) + randoms(rng, pk, 30000 if mode in ("big", "big_old") else 1500)
    if mode == "noprefix":
        users = [u[1:] if u.startswith(pu) and rng.random() < 0.7 else u for u in users]
        events = [u[1:] if u.startswith(pe) and rng.random() < 0.7 else u for u in events]
    if mode == "halfprefix":
        users = [b"x" + u[1:] if u.startswith(pu) and rng.random() < 0.5 else u for u in users]
    users = [u for u in dict.fromkeys(users) if b"," not in u and b"\n" not in u and b'"' not in u]
    events = [u for u in dict.fromkeys(events) if b"," not in u and b"\n" not in u and b'"' not in u]
    clicks = [u for u in dict.fromkeys(clicks) if b"," not in u and b"\n" not in u and b'"' not in u]
    q = 0.7 if mode == "quotes" else 0.2

    def field(s):
        return b'"' + s + b'"' if rng.random() < q else s

    d = f"{V}/vdata/{case}".encode()
    shutil.rmtree(d, ignore_errors=True)
    for sub in (b"events", b"clicks", b"links"):
        os.makedirs(d + b"/" + sub)
    open(d + b"/manifest.json", "wb").write(b'{"window_start": "' + WIN[0] + b'", "window_end": "' + WIN[1] + b'"}')
    open(d + b"/products.csv", "wb").write(b"product_id,category\np1,shoes\np2,books\np3,games\np4,toys\n")
    open(d + b"/campaigns.csv", "wb").write(b"campaign_id,channel\nc_1,search\nc_2,social\nc_3,email\nc_4,video\nc_5,push\n")
    links = []
    n = len(users)
    for _ in range(n // 3):
        links.append(field(rng.choice(users)) + b"," + field(rng.choice(users)))
    groups = max(1, n // 40)
    for i in range(0, n - 1):
        if rng.random() < 0.6:
            j = min(n - 1, i + rng.randint(1, 40))
            links.append(field(users[i]) + b"," + field(users[j]))
    for i in range(0, min(n, 400), 3):
        links.append(field(users[i]) + b"," + field(users[(i * 7 + 3) % n]))
    links += [b"u1,", b",u1", b'"u1', b"u1,u2,u3", b"", b'u1,u"2', b"u1 ,u1", b" u1,u1\r"]
    rng.shuffle(links)
    files = [[], [], [], []]
    for l in links:
        files[rng.randrange(4)].append(l)
    for i, f in enumerate(files):
        body = b"user_id_a,user_id_b\n" + b"\n".join(f) + (b"\n" if i != 1 else b"")
        open(d + b"/links/l%d.csv" % i, "wb").write(body)
    open(d + b"/links/empty.csv", "wb").write(b"user_id_a,user_id_b\n")
    ev_lines = []
    if mode == "big_old":
        ne = 150000
        base_order = None
    else:
        ne = len(events)
        base_order = list(events)
        rng.shuffle(base_order)
    for i in range(ne):
        e = rng.choice(events) if base_order is None else base_order[i]
        u = rng.choice(users)
        day = rng.randrange(14)
        t = BASE + day * DAY + rng.randrange(0, DAY)
        if rng.random() < 0.3:
            t = BASE + day * DAY + rng.randrange(0, 40) * 1800000 + rng.choice([0, 1, 1800000, 1800001, 59000])
        ing = t + rng.choice([0, 1000, 60000, 3600000, 86400000, 86400001, -5000])
        typ = rng.choice([b"view", b"view", b"cart", b"purchase", b"purchase", b"Purchase", b"view "])
        prod = rng.choice([b"p1", b"p2", b"p3", b"p4", b"p9", b"", b"P1"])
        price = rng.choice([b"", b"100", b"250", b"0250", b"0", b"10000000", b"10000001", b"-5", b"1.5", b"abc", b"7"]) if typ == b"purchase" else rng.choice([b"", b"7", b"x"])
        tsf = str(t).encode() if rng.random() < 0.4 else f1(t)
        ev_lines.append(b",".join([field(e), field(u), field(tsf), f1(ing), field(typ), field(prod), field(price)]))
        if rng.random() < 0.15:
            delta = rng.choice([-1000, 1000, 5000, 0, 600000])
            u2 = rng.choice(users) if delta != 0 and rng.random() < 0.3 else u
            tsf2 = tsf if delta == 0 else rng.choice([tsf, b"bad", str(t + 7).encode()])
            ev_lines.append(b",".join([field(e), field(u2), tsf2, f1(ing + delta), field(typ), field(prod), field(price)]))
    ev_lines += [b"", b",u1,1834444800000,2028-02-16T00:00:00Z,view,p1,", b'e"1,u1,1834444800000,2028-02-16T00:00:00Z,view,p1,', b"e1,u1,1834444800000,2028-02-16T00:00:00Z,view,p1"]
    rng.shuffle(ev_lines)
    k = 5
    parts = [[] for _ in range(k)]
    for l in ev_lines:
        parts[rng.randrange(k)].append(l)
    for i, f in enumerate(parts):
        body = b"event_id,user_id,ts,ingest_ts,event_type,product_id,price_cents\n" + b"\n".join(f) + (b"\n" if i != 2 else b"")
        open(d + b"/events/e%d.csv" % i, "wb").write(body)
    open(d + b"/events/empty.csv", "wb").write(b"event_id,user_id,ts,ingest_ts,event_type,product_id,price_cents\n")
    ck_lines = []
    pool = list(clicks)
    rng.shuffle(pool)
    nk = 80000 if mode in ("big", "big_old") else 4000
    for i in range(nk):
        if pool:
            c = pool.pop()
        else:
            c = pk + bytes(rng.choice(B36) for _ in range(rng.randint(1, 8))) + b"q%d" % i
        u = rng.choice(users)
        day = rng.randrange(-7, 14)
        t = BASE + day * DAY + rng.randrange(0, DAY)
        if rng.random() < 0.3:
            t = BASE + rng.randrange(0, 14) * DAY + rng.randrange(0, 40) * 1800000 + rng.choice([0, 1, -1, 1800000])
        if rng.random() < 0.3:
            t -= rng.choice([0, 1, DAY * 7, DAY * 7 + 1])
        camp = rng.choice([b"c_1", b"c_2", b"c_3", b"c_4", b"c_5", b"c_9", b"C_1", b""])
        tsf = str(t).encode() if rng.random() < 0.4 else f1(t)
        ck_lines.append(b",".join([field(c), field(u), field(camp), field(tsf)]))
        if rng.random() < 0.1:
            ck_lines.append(b",".join([b'"' + c + b'"', b'"' + u + b'"', camp, tsf]))
    starts = [l for l in ev_lines if l.count(b",") == 6 and l.split(b",")[1].strip(b'"') and l.split(b",")[2].strip(b'"') not in (b"", b"bad")]
    tie_ids = [c for c in crafted(pk + b"t")] + [pk + b"t" + bytes(rng.choice(HEX) for _ in range(31)) for _ in range(100)] + [pk + b"t" + bytes(rng.choice(B36) for _ in range(rng.randint(1, 11))) for _ in range(200)]
    tie_ids = [c for c in dict.fromkeys(tie_ids) if b"," not in c and b"\n" not in c and b'"' not in c and c not in set(clicks)]
    rng.shuffle(tie_ids)
    ties = 0
    while len(tie_ids) >= 2:
        line = rng.choice(starts).split(b",")
        u = line[1].strip(b'"')
        tsf = line[2].strip(b'"')
        m = min(len(tie_ids), rng.randint(2, 6))
        camps = rng.sample([b"c_1", b"c_2", b"c_3", b"c_4", b"c_5"], min(5, m))
        for j in range(m):
            c = tie_ids.pop()
            ck_lines.append(b",".join([field(c), field(u), field(camps[j % len(camps)]), field(tsf)]))
        ties += 1
    ck_lines += [b"", b",u1,c_1,1834444800000", b'k"1,u1,c_1,1834444800000']
    rng.shuffle(ck_lines)
    parts = [[] for _ in range(3)]
    for l in ck_lines:
        parts[rng.randrange(3)].append(l)
    for i, f in enumerate(parts):
        body = b"click_id,user_id,campaign_id,ts\n" + b"\n".join(f) + b"\n"
        open(d + b"/clicks/k%d.csv" % i, "wb").write(body)
    return d.decode(), len(users), len(events), len(clicks), ties


def compare(a, b):
    p = subprocess.run([PY, "-B", SCRIPTS + "/compare.py", a, b], capture_output=True, text=True, cwd=SCRIPTS)
    return p.returncode == 0 and p.stdout.strip().endswith("MATCH"), p.stdout + p.stderr


def rowdiff(a, b):
    p = subprocess.run([PY, "-B", ROWDIFF + "/rowdiff.py", a, b], capture_output=True, text=True, cwd=ROWDIFF)
    return p.returncode == 0 and p.stdout.strip().endswith("IDENTICAL"), p.stdout + p.stderr


cases = [
    ("vc_u", 11, b"u", b"e", b"k", "plain"),
    ("vc_quotes", 12, b"u", b"e", b"k", "quotes"),
    ("vc_noprefix", 13, b"u", b"e", b"k", "noprefix"),
    ("vc_halfprefix", 14, b"u", b"e", b"k", "halfprefix"),
    ("vc_hexprefix", 15, b"f", b"0", b"a", "plain"),
    ("vc_same", 16, b"u", b"u", b"u", "plain"),
    ("vc_oddprefix", 17, b" ", b"\xc3\xa9", b"U", "plain"),
    ("vc_big", 18, b"u", b"e", b"k", "big"),
]
def run_cases(only):
  for case, seed, pu, pe, pk, mode in cases:
      if only and case not in only:
          continue
      d, nu, nev, nck, ties = build(case, seed, pu, pe, pk, mode)
      out_r = f"{V}/vruns/{case}_ref"
      shutil.rmtree(out_r, ignore_errors=True)
      pr = subprocess.run(["nice", "-n", "10", "taskset", "-c", "2,3", PY, "-B", S + "/verify/ref.py", d, out_r], capture_output=True, text=True)
      if pr.returncode != 0:
          print(case, "REF CRASH", pr.stderr[-500:], flush=True)
          continue
      res = []
      tail = []
      for ncpu in ("1", "3", "8"):
          out_e = f"{V}/vruns/{case}_eng"
          shutil.rmtree(out_e, ignore_errors=True)
          os.makedirs(out_e)
          pe_ = subprocess.run(["env", "-i", f"DATA_DIR={d}", f"OUTPUT_DIR={out_e}", f"NCPU={ncpu}", "nice", "-n", "10", "taskset", "-c", "2,3", BIN], capture_output=True, text=True)
          if pe_.returncode != 0 or pe_.stdout != "":
              res.append(f"NCPU={ncpu} ENG CRASH rc={pe_.returncode} stdout={len(pe_.stdout)} {pe_.stderr[-800:]}")
              continue
          ok, txt = compare(out_e, out_r)
          ok2, txt2 = compare(out_r, out_e)
          ok3, txt3 = rowdiff(out_e, out_r)
          tail = [l for l in pe_.stderr.splitlines() if l.startswith(("event copies", "id prefixes", "surviving"))]
          res.append(f"NCPU={ncpu} {'MATCH' if ok and ok2 and ok3 else 'DIFFER'}")
          if not (ok and ok2 and ok3):
              res.append(txt + txt2 + txt3)
          shutil.rmtree(out_e, ignore_errors=True)
      print(case, mode, f"users={nu} events={nev} clicks={nck} tiegroups={ties}", " ".join(res), "|", " | ".join(tail), flush=True)
      shutil.rmtree(out_r, ignore_errors=True)
      shutil.rmtree(d, ignore_errors=True)


if __name__ == '__main__':
    run_cases(sys.argv[2:])
