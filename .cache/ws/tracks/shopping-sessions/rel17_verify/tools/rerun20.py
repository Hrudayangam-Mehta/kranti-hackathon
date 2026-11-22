#!/usr/bin/env python3
import os
import shutil
import sys

sys.path.insert(0, "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/rel17_verify/tools")
from vt import V, T, run_bin, both_ways, rowdiff, fmt

DATA = f"{T}/m1data/p20m"
BASE = f"{V}/runs/p20_base_n8"


def main():
    out = f"{V}/runs/rerun20"
    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(out)
    r1 = run_bin(f"{V}/bin/rel17v", DATA, out, 16, fresh=False)
    print(f"rerun20 first NCPU=16: {fmt(r1)}", flush=True)
    donor = sorted(os.listdir(f"{out}/user_daily"))[0]
    shutil.copy(f"{out}/user_daily/{donor}", f"{out}/user_daily/part-77777.parquet")
    cd = sorted(os.listdir(f"{out}/campaign_daily"))[0]
    shutil.copy(f"{out}/campaign_daily/{cd}", f"{out}/campaign_daily/part-00009.parquet")
    before = (len(os.listdir(f"{out}/user_daily")), len(os.listdir(f"{out}/campaign_daily")))
    r2 = run_bin(f"{V}/bin/rel17v", DATA, out, 1, fresh=False)
    print(f"rerun20 entries before second run {before}; second NCPU=1: {fmt(r2)}", flush=True)
    ok, txt = both_ways(out, BASE)
    ok2, txt2 = rowdiff(out, BASE)
    print(f"rerun20 vs rel16 20M output: compare {'MATCH/MATCH' if ok else 'DIFFER'}; {txt2.strip().splitlines()[-1]}", flush=True)
    if not ok:
        print(txt)


if __name__ == "__main__":
    main()
