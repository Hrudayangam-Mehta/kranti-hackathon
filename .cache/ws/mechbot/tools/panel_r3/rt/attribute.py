#!/usr/bin/env python3
"""attribute.py RUN.json RUN.err [threshold_ms=5]
For each decision slower than the threshold, list the timestamped stderr lines (GC logs, JIT compile reports)
that arrived while it ran (plus 2 ms), and sum: GC pause ms (p=... of each GC), compile ms reported."""
import json, re, sys

R = json.load(open(sys.argv[1]))
th = float(sys.argv[3]) if len(sys.argv) > 3 else 5.0
ev = []
for l in open(sys.argv[2], errors="replace"):
    m = re.match(r"([0-9.]+) (.*)", l)
    if m:
        ev.append((float(m.group(1)), m.group(2)))
gc_re = re.compile(r"cycle ([0-9.]+)ms END")
gcp_re = re.compile(r"=> (Eden|Full)Collection")
comp_re = re.compile(r"using (Baseline|DFG|FTL) with \w+ into \d+ bytes in ([0-9.]+) ms")
tot = {"slow": 0, "with_gc": 0, "with_compile": 0, "neither": 0}
rows = []
times, wall = R["times_ms"], R["wall_ms"]
# whole-run totals of GC cycles and compiles after ready
start = wall[0] if wall else 0
gcs = [float(gc_re.search(t).group(1)) for ts, t in ev if ts >= start and gc_re.search(t)]
comps = [(m.group(1), float(m.group(2))) for ts, t in ev if ts >= start for m in [comp_re.search(t)] if m]
for i, (x, w) in enumerate(zip(times, wall)):
    if x is None or x < th:
        continue
    lo, hi = w - 0.5, w + x + 2.0
    inside = [t for ts, t in ev if lo <= ts <= hi]
    g = [float(gc_re.search(t).group(1)) for t in inside if gc_re.search(t)]
    kinds = [gcp_re.search(t).group(1) for t in inside if gcp_re.search(t)]
    c = [(m.group(1), float(m.group(2))) for t in inside for m in [comp_re.search(t)] if m]
    tot["slow"] += 1
    if g: tot["with_gc"] += 1
    if c: tot["with_compile"] += 1
    if not g and not c: tot["neither"] += 1
    rows.append((i, x, sum(g), kinds, round(sum(b for _, b in c), 2), len(c), max((b for _, b in c), default=0)))
print(f"after ready: GC cycles {len(gcs)} (sum {sum(gcs):.1f} ms, max {max(gcs, default=0):.2f} ms); compiles {len(comps)}"
      f" (Baseline {sum(1 for k, _ in comps if k == 'Baseline')}, DFG {sum(1 for k, _ in comps if k == 'DFG')}; sum {sum(b for _, b in comps):.1f} ms, max {max((b for _, b in comps), default=0):.2f} ms)")
print(f"decisions >= {th} ms: {tot}")
for r in sorted(rows, key=lambda r: -r[1])[:25]:
    print(f"  i={r[0]:5d} {r[1]:6.2f} ms  gc={r[2]:.2f} ms {r[3]}  compiles={r[5]} sum={r[4]} max={r[6]:.2f}")
