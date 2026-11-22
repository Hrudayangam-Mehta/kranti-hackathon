#!/usr/bin/env python3
import os
import shutil
import sys

sys.path.insert(0, "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/rel17_verify/tools")
from vt import V, DEV, DEV_ANSWER, FIX, run_bin, both_ways, fmt


def seed_junk(out, donor):
    planted = {}
    for table in ("user_daily", "campaign_daily"):
        d = f"{out}/{table}"
        os.makedirs(d, exist_ok=True)
        src = sorted(f for f in os.listdir(f"{donor}/{table}") if f.endswith(".parquet"))[0]
        src = f"{donor}/{table}/{src}"
        names = ["part-00000.parquet", "part-00003.parquet", "part-99999.parquet", "zz-stale.parquet",
                 "_hidden.parquet", ".dot.parquet"]
        for n in names:
            shutil.copy(src, f"{d}/{n}")
        os.symlink(src, f"{d}/link.parquet")
        os.makedirs(f"{d}/sub.parquet", exist_ok=True)
        shutil.copy(src, f"{d}/sub.parquet/inner.parquet")
        with open(f"{d}/notes.txt", "w") as fh:
            fh.write("x")
        shutil.copy(src, f"{d}/keep.parquet.bak")
        planted[table] = sorted(os.listdir(d))
    return planted


def listing(out):
    return {t: sorted(os.listdir(f"{out}/{t}")) for t in ("user_daily", "campaign_daily")}


def main():
    binary = sys.argv[1]
    donor = f"{V}/runs/rerun_donor"
    r = run_bin(binary, f"{FIX}/E8/input", donor, 1)
    assert r["rc"] == 0
    results = []
    for mode, extra in (("fast", {}), ("slow", {"SESSIONS_PATH": "slow"})):
        for first, second in ((None, 8), (8, 1), (8, 3), (3, 8)):
            out = f"{V}/runs/rerun_{mode}_{first}_{second}"
            shutil.rmtree(out, ignore_errors=True)
            os.makedirs(out)
            if first is None:
                planted = seed_junk(out, donor)
                pre = f"planted {sum(len(v) for v in planted.values())} entries"
            else:
                r1 = run_bin(binary, DEV, out, first, extra, fresh=False)
                pre = f"first NCPU={first} {fmt(r1)}; then planted junk"
                seed_junk(out, donor)
            r2 = run_bin(binary, DEV, out, second, extra, fresh=False)
            ok, txt = both_ways(out, DEV_ANSWER)
            after = listing(out)
            stale_left = [n for t in after.values() for n in t if n in ("part-99999.parquet", "zz-stale.parquet",
                                                                          "_hidden.parquet", ".dot.parquet", "link.parquet")]
            good = ok and r2["rc"] == 0 and r2["stdout"] == 0 and not stale_left
            line = (f"rerun {mode} {pre} -> run NCPU={second} {fmt(r2)} {'MATCH/MATCH' if ok else 'DIFFER'} "
                    f"stale_parquet_left={stale_left} kept_non_parquet={[n for n in after['user_daily'] if not n.endswith('.parquet') or n == 'sub.parquet']}"
                    f" {'OK' if good else 'FAIL'}")
            print(line, flush=True)
            if not ok:
                print(txt)
            results.append(good)
    print("RERUN-ALL-OK" if all(results) else "RERUN-FAIL")


if __name__ == "__main__":
    main()
