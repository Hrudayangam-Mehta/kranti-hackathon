#!/usr/bin/env python3
import sys
import time

sys.path.insert(0, "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/rel17_verify/tools")
from vt import V, T, run_bin, both_ways, rowdiff, fmt

DATA = f"{T}/m1data/p60m"


def avail_gb():
    for line in open("/proc/meminfo"):
        if line.startswith("MemAvailable:"):
            return int(line.split()[1]) / 1e6
    return 0.0


def tail(path):
    with open(path) as fh:
        return " | ".join(l for l in fh.read().splitlines() if l.startswith(("sessions ", "surviving", "event copies")))


def main():
    out17 = f"{V}/runs/p60_rel17_n8"
    r = run_bin(f"{V}/bin/rel17v", DATA, out17, 8)
    print(f"p60 rel17 NCPU=8: {fmt(r)} wall={r['wall']:.1f}s", flush=True)
    print("   stderr: " + tail(r["stderr_path"]), flush=True)
    for _ in range(60):
        if avail_gb() >= 10.0:
            break
        time.sleep(20)
    print(f"MemAvailable before rel16: {avail_gb():.1f} GB", flush=True)
    if avail_gb() < 10.0:
        print("SKIP rel16 at 60M: not enough free memory on the shared machine", flush=True)
        return
    out16 = f"{V}/runs/p60_rel16_n8"
    r16 = run_bin(f"{V}/bin/rel16", DATA, out16, 8)
    print(f"p60 rel16 NCPU=8: {fmt(r16)} wall={r16['wall']:.1f}s", flush=True)
    print("   stderr: " + tail(r16["stderr_path"]), flush=True)
    ok, txt = both_ways(out17, out16)
    print(f"compare rel17 vs rel16 both ways: {'MATCH/MATCH' if ok else 'DIFFER'}\n{txt}", flush=True)
    ok2, txt2 = rowdiff(out17, out16)
    print(txt2, flush=True)


if __name__ == "__main__":
    main()
