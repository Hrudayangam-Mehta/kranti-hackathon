#!/usr/bin/env python3
"""quant.py LOG... : pooled wall quantiles, user/sys medians and phase wall medians per binary name."""
import json, sys, statistics as st
acc = {}
for path in sys.argv[1:]:
    for line in open(path):
        d = json.loads(line)
        for name, runs in d["runs"].items():
            acc.setdefault(name, []).extend(runs)
def q(v, p):
    v = sorted(v); return v[int(p * (len(v) - 1))]
for name, runs in acc.items():
    w = [r["wall"] * 1e3 for r in runs]
    ph = {}
    for r in runs:
        l = r["laps"]; prev = 0.0
        for k in ("setup", "parse", "dedup", "people", "write", "exit"):
            if k in l:
                ph.setdefault(k, []).append(l[k] - prev); prev = l[k]
        if "teardown_ms" in l:
            ph.setdefault("tear", []).append(l["teardown_ms"])
    print(f"{name:12s} n={len(runs):2d} wall q10 {q(w,.1):7.1f} q25 {q(w,.25):7.1f} med {q(w,.5):7.1f} | user {st.median(r['user'] for r in runs):.3f} sys {st.median(r['sys'] for r in runs):.3f} | "
          + " ".join(f"{k} {st.median(v):.1f}" for k, v in ph.items()))
print("cpu phases (median ms):")
for name, runs in acc.items():
    ph = {}
    for r in runs:
        l = r["laps"]; prev = l.get("startup_cpu_ms", None)
        if prev is None or "cpu_setup" not in l:
            continue
        for k in ("setup", "parse", "dedup", "people", "write", "exit"):
            if "cpu_" + k in l:
                ph.setdefault(k, []).append(l["cpu_" + k] - prev); prev = l["cpu_" + k]
    if ph:
        print(f"  {name:12s} " + " ".join(f"{k} {st.median(v):.1f}" for k, v in ph.items()))
