#!/usr/bin/env python3
import os, random, sys, datetime
E = os.environ
out = sys.argv[1]
rng = random.Random(int(sys.argv[2]) if len(sys.argv) > 2 else 1)
for d in ("events", "clicks", "links"):
    os.makedirs(f"{out}/{d}", exist_ok=True)
WS = datetime.datetime(2026, 3, 1, tzinfo=datetime.timezone.utc)
WE = datetime.datetime(2026, 3, 15, tzinfo=datetime.timezone.utc)
ws_ms = int(WS.timestamp() * 1000); we_ms = int(WE.timestamp() * 1000)
with open(f"{out}/manifest.json", "w") as f:
    f.write('{"window_start": "2026-03-01T00:00:00Z", "window_end": "2026-03-15T00:00:00Z"}\n')

def f1(ms):
    return datetime.datetime.fromtimestamp(ms // 1000, datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
def f2(ms):
    off = rng.choice([-10, -5, -1, 1, 5, 12]) * 3600
    t = datetime.datetime.fromtimestamp(ms // 1000 + off, datetime.timezone.utc)
    sign = "+" if off >= 0 else "-"
    return t.strftime("%Y-%m-%dT%H:%M:%S") + f"{sign}{abs(off)//3600:02d}:00"
def anyts(ms):
    r = rng.random()
    if ms % 1000:
        return str(ms)
    if r < 0.4: return f1(ms)
    if r < 0.6: return f1(ms) if E.get("CRAFT_NO_F2") else f2(ms)
    if r < 0.7: return str(ms) if E.get("CRAFT_NO_ZEROS") else "000" + str(ms)
    return str(ms)
def q(v):
    return '"' + v + '"' if rng.random() < 0.25 and not E.get("CRAFT_NO_QUOTES") else v
def qa(v):
    return '"' + v + '"'

# ---- users
users = []
users += ["u1", "U1", " u1", "u1 ", "u 1", "u-1", "u.1", "u:1", "#1", "~", "a", "z", "0", "_", "u1\r", "ab", "ab ", "ab\t", "aB", "Ab"]
users += ["ü1", "日本", "😀", "é", "é", "ÿ", "ÿþ"]
for L in [1, 2, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 23, 24, 25, 31, 32, 33, 47, 48, 49, 63, 64, 65, 100, 127, 128, 129, 200, 255, 256, 257, 300, 1000, 5000, 20000]:
    base = f"L{L}_"
    if L <= len(base):
        users.append("qwertyuiopasdfghjkl"[:L].upper() + "")
    else:
        users.append(base + "k" * (L - len(base)))
prefix = "sharedprefix_" + "p" * 40
for i in range(1500):
    users.append(prefix + f"{i:04d}")
users += [prefix + "0000a", prefix + "0000b", prefix + "0000 ", prefix + "0000\t", prefix + "000", prefix + "00", prefix, prefix[:-1]]
users += ["pre", "prefix", "prefixed", "prefixed_more", "prefixed_more_and_more_and_more_and_more"]
hexr = "0123456789abcdef"
hx = "".join(rng.choice(hexr) for _ in range(32))
users += ["u" + hx, "v" + hx, "u" + hx[:-1] + ("0" if hx[-1] != "0" else "1"), "u" + hx + "0", "u" + hx[:-1]]
# last-byte variants of a 16/17/32/33 byte id
for L in (16, 17, 32, 33, 48, 49):
    stem = ("lastbyte" + "z" * L)[:L - 1]
    users += [stem + c for c in "abc"]
users = list(dict.fromkeys(users))
if E.get("CRAFT_SIMPLE_USERS"):
    users = [f"u{i}" for i in range(int(E.get("CRAFT_NUSERS", "300")))]
assert all(u for u in users)

# ---- links
links = []
if E.get("CRAFT_SIMPLE_USERS"):
    users_backup = users
links.append(("u1", "L200_" + "k" * 195))
links.append(("😀", "u1"))
links.append((" u1", "😀"))           # name of this person: " u1"
links.append(("U1", "zz"))
links.append(("zz", "L1000_" + "k" * 994))  # name: "L1000..." < "U1"? 'L' (0x4c) < 'U' (0x55) -> name L1000...
links.append(("u-1", "!never"))       # "!never" never used in rows, is the name
links.append(("u.1", qa("u:1")))
links.append((qa("u.1"), "u:1"))
links.append(("u 1", "u 1"))         # self link
links.append(("ab", "ab "))          # distinct ids joined; name "ab"
links.append((prefix + "0001", prefix + "0002"))
links.append((prefix + "0002", prefix + "0003"))
links.append((prefix + "0003", prefix + "0001"))
links.append((prefix + "0000a", prefix + "0000b"))
links.append((prefix + "0000b", prefix + "0000a"))
links.append(("pre", "prefixed_more_and_more_and_more_and_more"))
links.append(("prefix", "prefixed"))
for L in (16, 32, 48):
    stem = ("lastbyte" + "z" * L)[:L - 1]
    links.append((stem + "a", stem + "c"))
# chain of 60 long ids
chain = [] if E.get("CRAFT_NO_CHAIN") else [f"chain_{i:03d}_" + "c" * 30 for i in range(60)]
users += chain
rng.shuffle(chain)
for a, b in zip(chain, chain[1:]):
    links.append((a, b))
# dirt
bad_links = ["x,y,z", '"unbalanced,u1', "", ",u1", "u1,", '"",u1', "u1,u1,"]
link_lines = ([f"{q(a)},{q(b)}" for a, b in links] + bad_links) if not E.get("CRAFT_SIMPLE_USERS") else []
rng.shuffle(link_lines)
with open(f"{out}/links/part-0.csv", "w", newline="") as f:
    f.write("user_id_a,user_id_b\n" + "\n".join(link_lines) + "\n")
with open(f"{out}/links/part-1.csv", "w", newline="") as f:
    f.write("user_id_a,user_id_b\n")

# ---- products, campaigns
products = [f"p{i}" for i in range(1, 60)] + ["prod_" + "x" * 60, "prod_" + "x" * 59 + "y", "P1", "p1 ", " p1"]
cats = ["cat_a", "cat_b", "cat_c", "cat_d", "cat_e", "Cat_a", "zzz", "aaa"]
with open(f"{out}/products.csv", "w", newline="") as f:
    f.write("product_id,category\n")
    for p in products:
        f.write(f"{p},{rng.choice(cats)}\n")
campaigns = [f"c_{i}" for i in range(1, 25)] + ([] if E.get("CRAFT_NO_ODDCAMP") else ["camp_" + "y" * 50, "camp_" + "y" * 49 + "z", "C_1", "c_1 ", " c_1", "c-1"])
channels = ["search", "social", "email", "display", "affiliate"]
with open(f"{out}/campaigns.csv", "w", newline="") as f:
    f.write("campaign_id,channel\n")
    for c in campaigns:
        f.write(f"{c},{rng.choice(channels)}\n")

# ---- events and clicks
events = []
clicks = []
eid = [0]
def new_eid():
    eid[0] += 1
    k = eid[0]
    r = rng.random()
    if r < 0.1: return f"e{k}" + "_" + "h" * 32
    if r < 0.2: return "E" * 40 + f"{k:07d}"
    if r < 0.25: return f"e{k:09d}"
    return f"e{k}"
cid = [0]
def new_cid():
    cid[0] += 1
    k = cid[0]
    r = rng.random()
    if E.get("CRAFT_NO_LONGCLICK"): return f"k{k}"
    if r < 0.3: return f"k{k}" + "_" + "h" * 32
    if r < 0.4: return "K" * 40 + f"{k:07d}"
    return f"k{k}"

all_users = users
for u in all_users:
    nsess = rng.choice([1, 1, 2, 3, 5])
    for s in range(nsess):
        start = ws_ms + rng.randrange(0, 14 * 86400) * 1000
        n = rng.choice([1, 2, 3, 6])
        t = start
        for j in range(n):
            if j:
                t += rng.choice([1000, 60000, 1799999, 1800000, 1800001, 3600000])
            et = rng.choice(["view", "view", "cart", "purchase"])
            price = str(rng.randrange(1, 60000)) if et == "purchase" else rng.choice(["", "0", "abc"])
            prod = rng.choice(products + ["nope", "", "p1"])
            e = new_eid()
            ingest = t + rng.choice([0, 60000, 3600000, 86400000, 86400001, 5 * 86400000])
            if t >= we_ms:
                t = we_ms - 1
            line = f"{q(e)},{q(u)},{q(anyts(t))},{f1(ingest)},{q(et)},{q(prod)},{q(price)}"
            events.append(line)
            if rng.random() < 0.08 and not E.get("CRAFT_NO_DUPEVENT"):  # duplicate copy later ingest, maybe other user
                u2 = rng.choice(all_users) if rng.random() < 0.3 else u
                events.append(f"{qa(e) if rng.random()<0.5 else e},{u2},{anyts(t)},{f1(ingest + 5000)},{et},{prod},{price}")
            if rng.random() < 0.03 and not E.get("CRAFT_NO_EVVARIANT"):  # distinct event ids differing only in last byte, and a prefix one
                events.append(f"{e}xa,{u},{anyts(t)},{f1(ingest)},{et},{prod},{price}")
                events.append(f"{e}xb,{u},{anyts(t)},{f1(ingest)},{et},{prod},{price}")
                events.append(f"{e}x,{u},{anyts(t)},{f1(ingest)},{et},{prod},{price}")
        # clicks around the session start
        for _ in range(rng.choice([0, 1, 1, 2, 4])):
            dt = rng.choice([1000, 3600000, 2 * 86400000] if E.get("CRAFT_NO_BOUNDARY") else [0, 1, -1, 1000, 86400000 * 7, 86400000 * 7 + 1, 86400000 * 7 - 1, 3600000, 2 * 86400000])
            ct = start - dt
            camp = rng.choice(campaigns + ["c_999", "organic", ""])
            c = new_cid()
            clicks.append(f"{q(c)},{q(u)},{q(camp)},{q(anyts(ct))}")
            if rng.random() < 0.3 and not E.get("CRAFT_NO_TIES"):  # tie: same ts, distinct click ids differing in last byte, and a prefix one
                clicks.append(f"{c}xa,{u},{rng.choice(campaigns)},{anyts(ct)}")
                clicks.append(f"{c}xb,{u},{rng.choice(campaigns)},{anyts(ct)}")
                clicks.append(f"{c}x,{u},{rng.choice(campaigns)},{anyts(ct)}")
            if rng.random() < 0.2 and not E.get("CRAFT_NO_DUPCLICK"):  # duplicate click, quoted differently
                clicks.append(f"{qa(c)},{qa(u)},{camp},{qa(anyts(ct))}")
# dirt lines
bad = ["a,b,c", '"x,u1,2026-03-02T00:00:00Z,2026-03-02T00:00:00Z,view,p1,', "", ",u1,2026-03-02T00:00:00Z,2026-03-02T00:00:00Z,view,p1,1",
       'e9999999,"",2026-03-02T00:00:00Z,2026-03-02T00:00:00Z,view,p1,1', "e9999998,u1,2026-03-02T00:00:00Z,2026-03-02T00:00:00Z,view,,1",
       "e9999997,u1,2026-03-02T00:00:00z,2026-03-02T00:00:00Z,view,p1,1", "e9999996,u1,2026-02-28T23:59:59Z,2026-03-01T00:00:00Z,view,p1,1",
       "e9999995,u1,2026-03-14T23:59:59Z,2026-03-15T00:00:00Z,purchase,p1,10000000", "e9999994,u1,2026-03-14T23:59:59Z,2026-03-15T00:00:00Z,purchase,p1,10000001",
       "e9999993,u1,2026-03-14T23:59:59Z,2026-03-15T00:00:00Z,purchase,p1,0250", "e9999992,u1,1772496000000,2026-03-03T00:00:00Z,Purchase,p1,5",
       "e9999991,u1,1772496000500,2026-03-03T00:00:00Z,view,p1,5\r", "e9999990,u1,2026-03-03T00:00:00+24:00,2026-03-03T00:00:00Z,view,p1,5"]
if not E.get("CRAFT_NO_DIRT"):
    events += bad
rng.shuffle(events)
nfiles = 7
chunks = [events[i::nfiles] for i in range(nfiles)]
hdr = "event_id,user_id,ts,ingest_ts,event_type,product_id,price_cents\n"
for i, ch in enumerate(chunks):
    with open(f"{out}/events/part-{i}.csv", "w", newline="") as f:
        f.write(hdr + "\n".join(ch) + ("\n" if i % 2 == 0 else ""))
with open(f"{out}/events/part-empty.csv", "w", newline="") as f:
    f.write(hdr)
pass
if not E.get("CRAFT_NO_DIRT"):
  clicks += ["a,b", '"k,u1,c_1,2026-03-02T00:00:00Z', "", ",u1,c_1,2026-03-02T00:00:00Z", "k9999999,,c_1,2026-03-02T00:00:00Z",
           "k9999998,u1,c_1,2026-02-21T23:59:59Z", "k9999997,u1,c_1,2026-02-22T00:00:00Z", "k9999996,u1,c_1,2026-03-15T00:00:00Z"]
rng.shuffle(clicks)
chdr = "click_id,user_id,campaign_id,ts\n"
for i in range(3):
    with open(f"{out}/clicks/part-{i}.csv", "w", newline="") as f:
        f.write(chdr + "\n".join(clicks[i::3]) + "\n")
print(len(users), "users", len(events), "event lines", len(clicks), "click lines", len(link_lines), "link lines")
