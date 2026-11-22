import json
import os
import statistics as st
import sys

V = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rows = []
for name in sys.argv[1:]:
    with open(os.path.join(V, name)) as f:
        rows += [json.loads(x) for x in f if x.strip()]
keys = []
for r in rows:
    k = (r["label"], r["data"], r["mode"], r["ncpu"])
    if k not in keys:
        keys.append(k)
print("| build | data | mode | n | CPU s median (min-max) | user | sys | wall s median (min-max) | RSS MB | majflt | read MB |")
print("|---|---|---|---|---|---|---|---|---|---|---|")
med = {}
for k in keys:
    g = [r for r in rows if (r["label"], r["data"], r["mode"], r["ncpu"]) == k]
    c = [r["cpu"] for r in g]
    w = [r["wall"] for r in g]
    med[k] = st.median(c)
    print(f"| {k[0]} | {k[1]} | {k[2]} | {len(g)} | {st.median(c):.2f} ({min(c):.2f}-{max(c):.2f}) | {st.median([r['user'] for r in g]):.2f} | {st.median([r['sys'] for r in g]):.2f} | "
          f"{st.median(w):.2f} ({min(w):.2f}-{max(w):.2f}) | {st.median([r['maxrss_mb'] for r in g]):.0f} | {st.median([r['majflt'] for r in g]):.0f} | {st.median([r['inblock_mb'] for r in g]):.0f} |")
print()
datas = []
for k in keys:
    if k[1] not in datas:
        datas.append(k[1])
base = datas[0]
for d in datas[1:]:
    print(f"paired CPU ratio {d} / {base} per round:")
    for lab in sorted({k[0] for k in keys}, key=[k[0] for k in keys].index):
        rs = []
        for rnd in sorted({r["round"] for r in rows}):
            a = [r["cpu"] for r in rows if r["label"] == lab and r["data"] == base and r["round"] == rnd]
            b = [r["cpu"] for r in rows if r["label"] == lab and r["data"] == d and r["round"] == rnd]
            if a and b:
                rs.append(b[0] / a[0])
        if rs:
            print(f"  {lab}: median {st.median(rs):.2f} range {min(rs):.2f}-{max(rs):.2f} ({len(rs)} pairs)")
