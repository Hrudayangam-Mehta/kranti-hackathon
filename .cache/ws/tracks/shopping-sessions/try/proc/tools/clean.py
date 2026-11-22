#!/usr/bin/env python3
"""clean.py MAXSYS LOG... : like quant.py but only runs whose sys time < MAXSYS seconds (uncontended runs)."""
import json, sys, statistics as st
maxsys = float(sys.argv[1])
acc, total = {}, {}
for path in sys.argv[2:]:
    for line in open(path):
        d = json.loads(line)
        for name, runs in d["runs"].items():
            total[name] = total.get(name, 0) + len(runs)
            acc.setdefault(name, []).extend(r for r in runs if r["sys"] < maxsys)
def q(v, p):
    v = sorted(v); return v[int(p * (len(v) - 1))]
for name, runs in acc.items():
    if not runs:
        print(name, "no clean runs"); continue
    w = [r["wall"] * 1e3 for r in runs]
    ph = {}
    for r in runs:
        l = r["laps"]; prev = 0.0
        for k in ("setup", "parse", "dedup", "people", "write", "exit"):
            if k in l:
                ph.setdefault(k, []).append(l[k] - prev); prev = l[k]
        if "teardown_ms" in l:
            ph.setdefault("tear", []).append(l["teardown_ms"])
    cpu = [(r["user"] + r["sys"]) * 1e3 for r in runs]
    print(f"{name:12s} clean {len(runs):2d}/{total[name]:2d} wall min {min(w):7.1f} q25 {q(w,.25):7.1f} med {q(w,.5):7.1f} | cpu med {st.median(cpu):7.1f} user {st.median(r['user'] for r in runs):.3f} sys {st.median(r['sys'] for r in runs):.3f} | "
          + " ".join(f"{k} {st.median(v):.1f}" for k, v in ph.items()))
