import json
import os
import statistics as st
import sys

M = os.path.dirname(os.path.abspath(__file__))


def load(name):
    rows = []
    p = os.path.join(M, name)
    if os.path.exists(p):
        with open(p) as f:
            rows = [json.loads(x) for x in f if x.strip()]
    return rows


def med(xs):
    xs = [x for x in xs if x is not None]
    return st.median(xs) if xs else float("nan")


def summarize(rows, title):
    print(f"### {title}")
    print("| build | NCPU | n | wall s | user s | sys s | user+sys s | parse ms | dedup ms | people ms | wall-last lap ms | minflt | majflt | read MB | RSS MB | PSI |")
    print("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|")
    keys = sorted({(r["label"], r["ncpu"]) for r in rows}, key=lambda k: (k[1], k[0]))
    out = {}
    for lab, n in keys:
        g = [r for r in rows if r["label"] == lab and r["ncpu"] == n]
        lp = lambda k: [r["laps"].get(k) for r in g]
        parse = med(lp("parse"))
        dedup = med([r["laps"].get("dedup", 0) - r["laps"].get("parse", 0) for r in g])
        people = med([r["laps"].get("people", 0) - r["laps"].get("dedup", 0) for r in g])
        tail = med([1000 * r["wall"] - r["laps"].get("write", r["laps"].get("people", 0)) for r in g])
        row = dict(
            wall=med([r["wall"] for r in g]),
            user=med([r["user"] for r in g]),
            sys=med([r["sys"] for r in g]),
            cpu=med([r["user"] + r["sys"] for r in g]),
            parse=parse,
            dedup=dedup,
            people=people,
            tail=tail,
            minflt=med([r["minflt"] for r in g]),
            majflt=med([r["majflt"] for r in g]),
            readmb=med([r["inblock"] * 512 / 1e6 for r in g]),
            rss=med([r["maxrss_mb"] for r in g]),
            psi=med([r["psi"] for r in g]),
        )
        out[(lab, n)] = row
        print(
            f"| {lab} | {n} | {len(g)} | {row['wall']:.2f} | {row['user']:.2f} | {row['sys']:.2f} | {row['cpu']:.2f} | {row['parse']:.0f} | {row['dedup']:.0f} | {row['people']:.0f} | {row['tail']:.0f} | {row['minflt']:.0f} | {row['majflt']:.0f} | {row['readmb']:.0f} | {row['rss']:.0f} | {row['psi']:.0f} |"
        )
    print()
    return out


w = summarize(load("warm.jsonl"), "warm page cache (medians)")
c = summarize(load("cold.jsonl"), "input evicted before each run (medians)")
extra = [a for a in sys.argv[1:]]
for name in extra:
    summarize(load(name), name)
