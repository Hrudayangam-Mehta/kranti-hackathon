import json, sys, statistics as S, collections
for fn in sys.argv[1:]:
    rows = []
    for l in open(fn):
        try: d = json.loads(l)
        except Exception: continue
        rows.append(d)
    by = collections.defaultdict(list)
    for d in rows:
        by[d.get("bot")].append(d)
    print("==", fn, len(rows), "rows,", len(by), "bots")
    tab = []
    for b, L in by.items():
        sc = [d["score"] for d in L if "score" in d]
        if not sc: continue
        tab.append((S.mean(sc), b, len(sc), S.mean(d.get("timeAlive",0) for d in L), S.mean(d.get("kills",0) for d in L), S.mean(d.get("cubes",0) for d in L)))
    tab.sort(reverse=True)
    for i, (m, b, n, ta, k, c) in enumerate(tab):
        if "kestrel" in b or i < 12:
            print("%2d %-28s n=%2d score %.2f alive %.0f s kills %.2f cubes %.1f" % (i+1, b, n, m, ta, k, c))
    for d in by.get("kestrel_G3_8671068", []):
        print("  seed", d["seed"], "pl", d["place"], "t", d["timeAlive"], "k", d["kills"], "cause", d.get("cause"), d.get("killRange"), "hunters", d.get("hunters"), d.get("loadout"), d.get("upgrades"))
