#!/usr/bin/env python3
import sys

sys.path.insert(0, "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/rel17_verify/tools")
from vt import V, DEV, DEV_ANSWER, run_bin, both_ways, fmt


def main():
    binary = sys.argv[1]
    tag = sys.argv[2]
    ncpus = sys.argv[3].split(",")
    extra = dict(kv.split("=", 1) for kv in sys.argv[4:])
    all_ok = True
    for n in ncpus:
        out = f"{V}/runs/dev_{tag}_n{n}"
        r = run_bin(binary, DEV, out, n, extra)
        ok, txt = both_ways(out, DEV_ANSWER)
        good = ok and r["rc"] == 0 and r["stdout"] == 0
        all_ok &= good
        print(f"dev {tag} NCPU={n} {' '.join(sys.argv[4:])}: {fmt(r)} {'MATCH/MATCH' if ok else 'DIFFER'}", flush=True)
        if not ok:
            print(txt)
    print("DEV-ALL-OK" if all_ok else "DEV-FAIL")


if __name__ == "__main__":
    main()
