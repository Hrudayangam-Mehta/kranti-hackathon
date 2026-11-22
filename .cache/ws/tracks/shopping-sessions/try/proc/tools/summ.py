#!/usr/bin/env python3
"""summ.py LOG... : per binary, raw medians of 5+ pinned runs plus uncontended-run medians (sys <= 1.4 x min sys)."""
import json, sys, statistics as st
acc = {}
for path in sys.argv[1:]:
    for line in open(path):
        d = json.loads(line)
        for name, runs in d["runs"].items():
            acc.setdefault(name, []).extend(runs)
def phases(rs):
    ph = {}
    for r in rs:
        l = r["laps"]; prev = 0.0
        for k in ("setup", "parse", "dedup", "people", "write", "exit"):
            if k in l:
                ph.setdefault(k, []).append(l[k] - prev); prev = l[k]
        if "teardown_ms" in l: ph.setdefault("tear", []).append(l["teardown_ms"])
    return " ".join(f"{k} {st.median(v):.1f}" for k, v in ph.items())
for name, runs in acc.items():
    raw = [r["wall"] * 1e3 for r in runs]
    lim = 1.4 * min(r["sys"] for r in runs)
    c = [r for r in runs if r["sys"] <= lim]
    cw = [r["wall"] * 1e3 for r in c]
    print(f"{name:6s} raw n={len(runs):2d} med {st.median(raw):6.0f} min {min(raw):6.0f} user {st.median(r['user'] for r in runs):.2f} sys {st.median(r['sys'] for r in runs):.2f} | {phases(runs)}")
    print(f"{'':6s} clean {len(c):2d}  med {st.median(cw):6.0f} min {min(cw):6.0f} user {st.median(r['user'] for r in c):.2f} sys {st.median(r['sys'] for r in c):.2f} | {phases(c)}")
