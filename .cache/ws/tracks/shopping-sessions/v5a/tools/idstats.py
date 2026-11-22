import sys, glob, collections
d = sys.argv[1]
def rows(folder, n):
    for f in sorted(glob.glob(f"{d}/{folder}/*.csv")):
        with open(f, "rb") as fh:
            next(fh, None)
            for line in fh:
                parts = line.rstrip(b"\n").split(b",")
                if len(parts) != n: continue
                yield [p[1:-1] if len(p) >= 2 and p[:1] == b'"' and p[-1:] == b'"' else p for p in parts]
users = collections.Counter(); ev = collections.Counter(); ck = collections.Counter(); linked = set()
for r in rows("events", 7):
    ev[r[0]] += 1; users[r[1]] += 1
for r in rows("clicks", 4):
    ck[r[0]] += 1; users[r[1]] += 1
for r in rows("links", 2):
    users[r[0]] += 1; users[r[1]] += 1; linked.add(r[0]); linked.add(r[1])
def summ(name, c):
    lens = collections.Counter(len(k) for k in c)
    occ = sum(c.values()); longd = sum(1 for k in c if len(k) > 16); longo = sum(v for k, v in c.items() if len(k) > 16)
    top = sorted(c.values(), reverse=True)
    cum = 0; marks = {}
    for i, v in enumerate(top):
        cum += v
        for q in (0.5, 0.8, 0.9, 0.99):
            if q not in marks and cum >= q * occ: marks[q] = i + 1
    print(f"{name}: distinct {len(c)} occ {occ} long distinct {longd} long occ {longo} lens {sorted(lens.items())[:12]} top-k covering {marks}")
summ("users", users); summ("events", ev); summ("clicks", ck)
print("linked distinct", len(linked))
