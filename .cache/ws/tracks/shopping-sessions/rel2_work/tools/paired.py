import json, statistics as st, sys
path, a_name, b_name = sys.argv[1:4]
d = json.loads(open(path).readlines()[-1])
a = d["runs"][a_name]; b = d["runs"][b_name]
def ph(r, k, prev):
    l = r["laps"]; return l.get(k, float("nan")) - l.get(prev, 0)
rows = [("wall", lambda r: r["wall"] * 1e3), ("user+sys", lambda r: (r["user"] + r["sys"]) * 1e3), ("sys", lambda r: r["sys"] * 1e3),
        ("setup", lambda r: r["laps"].get("setup", float("nan"))), ("parse", lambda r: ph(r, "parse", "setup")),
        ("dedup", lambda r: ph(r, "dedup", "parse")), ("people", lambda r: ph(r, "people", "dedup")),
        ("after people", lambda r: r["wall"] * 1e3 - r["laps"].get("people", float("nan")))]
print(f"{path.split('/')[-1]} load {d['load'][0]:.1f}, {len(a)} interleaved rounds, NCPU {d['ncpu']} on cpus {d['cpus']}")
for label, f in rows:
    xa = [f(r) for r in a]; xb = [f(r) for r in b]
    diffs = [y - x for x, y in zip(xa, xb)]
    wins = sum(1 for v in diffs if v < 0)
    print(f"  {label:12s} median {st.median(xa):8.1f} -> {st.median(xb):8.1f} ms   paired median diff {st.median(diffs):+8.1f} ms   {b_name} lower in {wins}/{len(diffs)}")
