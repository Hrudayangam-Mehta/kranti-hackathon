import sys, re, collections
WORK = ["links", "events", "clicks", "unmap", "dedup", "order", "people", "user_write", "campaign", "last_write", "release"]
WAIT = ["wait_links", "bar_parse", "wait_events", "bar_dedup", "bar_order", "bar_end", "wait_jobs"]
for path in sys.argv[1:]:
    th = collections.defaultdict(dict); setup = {}; at = None
    for l in open(path):
        m = re.match(r"trace (t\d+) (\S+) ([\d.]+) ([\d.]+) ([\d.]+) (\d+)", l)
        if m: th[m.group(1)][m.group(2)] = tuple(map(float, m.group(3, 4, 5))); continue
        m = re.match(r"trace m setup:(\S+) ([\d.]+)", l)
        if m: setup[m.group(1)] = float(m.group(2)); continue
        m = re.match(r"trace m clock start [\d.]+ exit [\d.]+ at ([\d.]+)", l)
        if m: at = float(m.group(1))
    n = len(th)
    start = min(v[0] for d in th.values() for v in d.values())
    ends = {t: max(v[1] for k, v in d.items() if k in WORK) for t, d in th.items()}
    end = max(ends.values())
    busy = sum(v[2] for d in th.values() for k, v in d.items() if k in WORK)
    waits = collections.Counter()
    for d in th.values():
        for k in WAIT:
            if k in d: waits[k] += d[k][2]
    endidle = sum(end - e for e in ends.values())
    span = end - start
    # dedup start = first dedup unit start; parse end = last events/clicks end
    pe = max(d[k][1] for d in th.values() for k in ("events", "clicks") if k in d)
    ds = min(d["dedup"][0] for d in th.values() if "dedup" in d)
    de = max(d["dedup"][1] for d in th.values() if "dedup" in d)
    ps = min(d["people"][0] for d in th.values() if "people" in d)
    lw = max(d[k][1] for d in th.values() for k in ("last_write", "campaign") if k in d)
    lp = max(d["people"][1] for d in th.values() if "people" in d)
    print(f"{path.split('/')[-1]}: threads {n} setup-serial {start:.1f} ms | worker span {span:.1f} | busy {busy:.0f} thread-ms, efficiency {busy/(n*span):.3f} | "
          f"waits {sum(waits.values()):.1f} ({', '.join(f'{k} {v:.1f}' for k, v in waits.items())}) | end idle {endidle:.1f} | "
          f"last parse {pe:.1f}, first dedup {ds:.1f}, last dedup {de:.1f}, first people {ps:.1f}, last people {lp:.1f}, last final write {lw:.1f}, tail after people {lw-lp:.1f} | exit at {at:.1f}")
