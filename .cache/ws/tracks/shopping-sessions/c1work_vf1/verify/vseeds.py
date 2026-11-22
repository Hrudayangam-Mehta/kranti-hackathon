#!/usr/bin/env python3
"""Generator seeds vs verify/ref.py, both ways, default + SESSIONS_LANE=G + another NCPU.
Usage: vseeds.py WORKERS LABEL:SEED:EVENTS:CLICKS ...  -> appends to runs/vseeds.log"""
import json
import os
import shutil
import sys
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import vrun  # noqa: E402

DATA = f"{vrun.V}/data"


def job(spec, i):
    label, seed, ev, ck = spec.split(":")
    data = f"{DATA}/{label}"
    vrun.gen(seed, ev, ck, data)
    with open(f"{data}/manifest.json") as fh:
        man = json.load(fh)
    other = [1, 3, 4, 5, 6, 7, 8][i % 7]
    ok, txt = vrun.check(data, label, configs=((2, None), (2, "G"), (other, None)))
    head = f"{label} seed={seed} E={ev} C={ck} window={man['window_start']}..{man['window_end']}"
    if ok and os.environ.get("KEEP") != "1":
        shutil.rmtree(data, ignore_errors=True)
    return head + " " + txt


def main():
    workers = int(sys.argv[1])
    specs = sys.argv[2:]
    os.makedirs(vrun.RUNS, exist_ok=True)
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs = [ex.submit(job, s, i) for i, s in enumerate(specs)]
        with open(f"{vrun.RUNS}/vseeds.log", "a") as log:
            for f in futs:
                r = f.result()
                print(r, flush=True)
                log.write(r + "\n")


if __name__ == "__main__":
    main()
