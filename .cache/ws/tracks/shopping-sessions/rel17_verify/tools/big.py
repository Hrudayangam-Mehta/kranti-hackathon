#!/usr/bin/env python3
import os
import sys

sys.path.insert(0, "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/rel17_verify/tools")
from vt import V, run_bin, both_ways, rowdiff, fmt


def main():
    data, tag = sys.argv[1], sys.argv[2]
    base_bin, base_n = sys.argv[3], sys.argv[4]
    cand_bin = sys.argv[5]
    ncpus = sys.argv[6].split(",")
    extra = dict(kv.split("=", 1) for kv in sys.argv[7:])
    base = f"{V}/runs/{tag}_base_n{base_n}"
    if not os.path.isfile(f"{base}.done"):
        r = run_bin(base_bin, data, base, base_n)
        print(f"{tag} base {os.path.basename(base_bin)} NCPU={base_n}: {fmt(r)}", flush=True)
        if r["rc"] == 0:
            open(f"{base}.done", "w").close()
    for n in ncpus:
        out = f"{V}/runs/{tag}_cand_n{n}"
        r = run_bin(cand_bin, data, out, n, extra)
        ok, txt = both_ways(out, base)
        ok2, txt2 = rowdiff(out, base)
        ok3, txt3 = rowdiff(base, out)
        print(f"{tag} cand {os.path.basename(cand_bin)} NCPU={n} {' '.join(sys.argv[7:])}: {fmt(r)} "
              f"compare {'MATCH/MATCH' if ok else 'DIFFER'} rowdiff {'IDENTICAL/IDENTICAL' if ok2 and ok3 else 'DIFFERENT'}", flush=True)
        print("   " + txt.replace("\n", "\n   ").strip())
        print("   " + txt2.replace("\n", "\n   ").strip())
        with open(r["stderr_path"]) as fh:
            tail = [l for l in fh.read().splitlines() if l.startswith(("sessions ", "surviving", "event copies"))]
        print("   stderr: " + " | ".join(tail))


if __name__ == "__main__":
    main()
