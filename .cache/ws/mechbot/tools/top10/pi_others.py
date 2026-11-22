import subprocess, sys, os, datetime as dt
P = sys.argv[1]
T = dt.datetime.fromisoformat("2026-11-21T02:10:49.761979+00:00").timestamp()
hits = []
for base in ("_meta", "_meta_other"):
    d = os.path.join(P, "intel", base)
    if not os.path.isdir(d): continue
    for r in sorted(os.listdir(d)):
        g = os.path.join(d, r)
        try:
            out = subprocess.run(["git", "-C", g, "log", "--all", "--format=%h %ct %s"], capture_output=True, text=True, timeout=20).stdout
        except Exception:
            continue
        for l in out.splitlines():
            parts = l.split(" ", 2)
            if len(parts) < 2: continue
            try: ct = int(parts[1])
            except ValueError: continue
            gap = T - ct
            if -5 <= gap <= 300:
                hits.append((gap, r, parts[0], (parts[2] if len(parts) > 2 else "")[:70]))
for h in sorted(hits):
    print("%+7.1f s  %-50s %s %s" % h)
