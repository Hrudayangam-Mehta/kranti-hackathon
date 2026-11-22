import sys, re, collections
lines = open(sys.argv[1]).read().splitlines()
th = collections.defaultdict(dict)
setup = []
clock = None
wall = None
for l in lines:
    m = re.match(r"trace (t\d+) (\S+) ([\d.]+) ([\d.]+) ([\d.]+) (\d+)", l)
    if m:
        th[m.group(1)][m.group(2)] = tuple(float(x) for x in m.group(3, 4, 5)) + (int(m.group(6)),)
        continue
    m = re.match(r"trace m setup:(\S+) ([\d.]+)", l)
    if m:
        setup.append((m.group(1), float(m.group(2)))); continue
    m = re.match(r"trace m clock start ([\d.]+) exit ([\d.]+) at ([\d.]+)", l)
    if m:
        clock = tuple(float(x) for x in m.groups()); continue
    m = re.match(r"exit \d+ stdout_bytes \d+ wall ([\d.]+)", l)
    if m:
        wall = float(m.group(1))
print("setup marks:", " ".join(f"{n}={t:.2f}" for n, t in setup))
ids = sorted(th, key=lambda x: int(x[1:]))
phases = [("parse", ["links", "events", "clicks", "wait_links"], "bar_parse"),
          ("dedup", ["unmap", "dedup"], "bar_dedup"),
          ("people", ["people", "user_write", "campaign", "last_write"], "bar_end"),
          ("all", ["links", "events", "clicks", "unmap", "dedup", "order", "people", "user_write", "campaign", "last_write", "release"], None)]
for name, stages, bar in phases:
    ends, busy, starts = [], [], []
    for t in ids:
        d = th[t]
        e = max((d[s][1] for s in stages if s in d), default=0)
        b = sum(d[s][2] for s in stages if s in d)
        st = min((d[s][0] for s in stages if s in d), default=0)
        ends.append(e); busy.append(b); starts.append(st)
    span_end = max(ends)
    start = min(starts)
    idle = [span_end - e for e in ends]
    waits = sum(th[t][w][2] for t in ids for w in ("wait_links", "bar_parse", "wait_events", "bar_dedup", "bar_order", "bar_end", "wait_jobs") if w in th[t])
    print(f"{name:7s} start {start:8.2f} end {span_end:8.2f} span {span_end-start:7.2f} busy sum {sum(busy):8.2f} "
          f"per-thread end spread {min(ends):.2f}..{max(ends):.2f} tail idle sum {sum(idle):7.2f} max {max(idle):6.2f}" + (f" | all waits {waits:.2f}" if bar is None else ""))
for t in ids:
    d = th[t]
    parts = []
    for s in ["links", "events", "clicks", "wait_links", "bar_parse", "wait_events", "unmap", "dedup", "bar_dedup", "order", "bar_order", "people", "user_write", "campaign", "last_write", "bar_end", "wait_jobs", "release"]:
        if s in d:
            f, l, b, c = d[s]
            parts.append(f"{s}[{f:.1f}-{l:.1f} b{b:.1f} n{c}]")
    print(t, " ".join(parts))
if clock:
    print(f"internal end-before-exit {clock[2]:.2f} ms; wall {wall}")
