#!/usr/bin/env python3
import os
import shutil
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/rel17_verify/tools")
from vt import V, GEN, PY, REF, run_bin, both_ways, fmt

BIN = os.environ["BIN"]
NCPUS = os.environ.get("NCPUS", "1,3,8").split(",")
EXTRA = dict(kv.split("=", 1) for kv in os.environ.get("EXTRA", "").split(",") if kv)
TAG = os.environ.get("TAG", "s")


def job(spec, core):
    label, seed, ev, ck = spec.split(":")
    data = f"{V}/data/{label}"
    out_r = f"{V}/runs/{TAG}_{label}_ref"
    if not os.path.isfile(f"{data}/manifest.json"):
        shutil.rmtree(data, ignore_errors=True)
        subprocess.run(["nice", "-n", "10", "taskset", "-c", str(core), GEN, "--seed", seed, "--events", ev,
                        "--clicks", ck, "--output", data, "--threads", "1"], check=True, capture_output=True)
    window = open(f"{data}/manifest.json").read().replace("\n", "").replace(" ", "")
    nfiles = {k: len(os.listdir(f"{data}/{k}")) for k in ("events", "clicks", "links")}
    if not os.path.isdir(f"{out_r}/user_daily"):
        shutil.rmtree(out_r, ignore_errors=True)
        t0 = time.time()
        pr = subprocess.run(["nice", "-n", "10", "taskset", "-c", str(core), PY, "-B", REF, data, out_r],
                            capture_output=True, text=True)
        if pr.returncode != 0:
            return f"{label} seed={seed} REF CRASH {pr.stderr[-800:]}"
    parts = []
    all_ok = True
    for n in NCPUS:
        out_e = f"{V}/runs/{TAG}_{label}_eng{n}"
        r = run_bin(BIN, data, out_e, n, EXTRA)
        ok, txt = both_ways(out_e, out_r)
        good = ok and r["rc"] == 0 and r["stdout"] == 0
        all_ok &= good
        parts.append(f"n{n}:exit={r['rc']},stdout={r['stdout']},files={r['files'][0]}/{r['files'][1]},"
                     f"{'MATCH/MATCH' if ok else 'DIFFER'}")
        if not good:
            parts.append(txt[-1500:])
        else:
            shutil.rmtree(out_e, ignore_errors=True)
    extra = " ".join(f"{k}={v}" for k, v in EXTRA.items())
    return (f"{label} seed={seed} E={ev} C={ck} {window} files={nfiles} {extra} " + " ".join(parts)
            + (" ALL-MATCH" if all_ok else " FAIL"))


def main():
    specs = sys.argv[1:]
    workers = int(os.environ.get("WORKERS", "2"))
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs = [ex.submit(job, s, 2 + i % 2) for i, s in enumerate(specs)]
        with open(f"{V}/logs/seeds_{TAG}.log", "a") as log:
            for f in futs:
                r = f.result()
                print(r, flush=True)
                log.write(r + "\n")
                log.flush()


if __name__ == "__main__":
    main()
