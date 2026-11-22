#!/usr/bin/env python3
"""Drives verify/fuzz.py's mutate/write_split (same data per round as fuzz.one), then checks
default at the round's NCPU (1-8), SESSIONS_LANE=G, and NCPU=2 against ref.py.
Usage: vfuzz.py FROM TO [WORKERS]  -> appends to runs/vfuzz.log"""
import os
import random
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fuzz  # noqa: E402  (verifier copy; T patched to the track dir)
import vrun  # noqa: E402


def one(rnd_seed):
    rnd = random.Random(rnd_seed)
    seed = 1000 + rnd_seed
    ev = rnd.choice([5000, 20000, 60000])
    ck = rnd.choice([ev // 4, ev, ev * 2])
    data = f"{vrun.V}/data/vfz{rnd_seed}"
    shutil.rmtree(data, ignore_errors=True)
    subprocess.run(["taskset", "-c", "0,1", vrun.GEN, "--seed", str(seed), "--events", str(ev), "--clicks", str(ck),
                    "--output", data, "--threads", "1"], check=True, capture_output=True)
    E, C, L = fuzz.mutate(data, rnd)
    fuzz.write_split(f"{data}/events", b"event_id,user_id,ts,ingest_ts,event_type,product_id,price_cents", E, rnd)
    fuzz.write_split(f"{data}/clicks", b"click_id,user_id,campaign_id,ts", C, rnd)
    fuzz.write_split(f"{data}/links", b"user_id_a,user_id_b", L, rnd)
    ncpu = rnd.choice([1, 2, 3, 4, 5, 6, 7, 8])
    ok, txt = vrun.check(data, f"vfz{rnd_seed}", configs=((ncpu, None), (2, "G"), (2, None)))
    if ok:
        shutil.rmtree(data, ignore_errors=True)
    return f"vfz{rnd_seed} gen_seed={seed} E={ev} C={ck} lines_ev={len(E)} NCPU={ncpu} " + txt


def main():
    a, b = int(sys.argv[1]), int(sys.argv[2])
    workers = int(sys.argv[3]) if len(sys.argv) > 3 else 2
    with ThreadPoolExecutor(max_workers=workers) as ex, open(f"{vrun.RUNS}/vfuzz.log", "a") as log:
        for r in ex.map(one, range(a, b)):
            print(r, flush=True)
            log.write(r + "\n")


if __name__ == "__main__":
    main()
