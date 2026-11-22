#!/usr/bin/env python3
import os
import resource
import shutil
import subprocess
import sys
import time

sys.path.insert(0, "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/rel17_verify/tools")
from vt import V, DEV, DEV_ANSWER, run_bin, both_ways, fmt, count_parquet


def run_limited(binary, data, out, ncpu, as_bytes, extra=None):
    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(out)
    env = {"DATA_DIR": data, "OUTPUT_DIR": out, "NCPU": str(ncpu), "PATH": "/usr/bin:/bin"}
    if extra:
        env.update(extra)

    def limit():
        resource.setrlimit(resource.RLIMIT_AS, (as_bytes, as_bytes))

    so, se = out + ".stdout", out + ".stderr"
    with open(so, "wb") as fo, open(se, "wb") as fe:
        p = subprocess.Popen(["nice", "-n", "10", "taskset", "-c", "2,3", binary], env=env, stdout=fo, stderr=fe,
                             preexec_fn=limit)
        _, status, ru = os.wait4(p.pid, 0)
    return {"rc": os.waitstatus_to_exitcode(status), "stdout": os.path.getsize(so), "user": ru.ru_utime,
            "sys": ru.ru_stime, "maxrss_gb": ru.ru_maxrss / 1e6, "wall": 0, "stderr_path": se,
            "files": (count_parquet(f"{out}/user_daily"), count_parquet(f"{out}/campaign_daily"))}


def main():
    binary = sys.argv[1]
    mode = sys.argv[2]
    ok_all = True
    if mode == "ncpu":
        for n in (2, 5, 7, 16, 64):
            for rep in range(3):
                out = f"{V}/runs/stress_dev_n{n}_r{rep}"
                r = run_bin(binary, DEV, out, n)
                ok, _ = both_ways(out, DEV_ANSWER)
                good = ok and r["rc"] == 0 and r["stdout"] == 0
                ok_all &= good
                print(f"stress dev NCPU={n} rep={rep}: {fmt(r)} {'MATCH/MATCH' if ok else 'DIFFER'}", flush=True)
                shutil.rmtree(out, ignore_errors=True)
    elif mode == "rlimit":
        for n, gb in ((8, 1.6), (8, 1.2), (3, 0.9), (1, 0.6)):
            out = f"{V}/runs/rlimit_dev_n{n}_{gb}"
            r = run_limited(binary, DEV, out, n, int(gb * 2**30))
            ok, _ = both_ways(out, DEV_ANSWER) if r["rc"] == 0 else (False, "")
            good = ok and r["rc"] == 0 and r["stdout"] == 0
            ok_all &= good
            with open(r["stderr_path"]) as fh:
                err = [l for l in fh.read().splitlines() if "error" in l or "memory" in l][:2]
            print(f"rlimit dev NCPU={n} RLIMIT_AS={gb}GB: {fmt(r)} {'MATCH/MATCH' if ok else 'DIFFER'} {err}", flush=True)
    print("STRESS-ALL-OK" if ok_all else "STRESS-FAIL")


if __name__ == "__main__":
    main()
