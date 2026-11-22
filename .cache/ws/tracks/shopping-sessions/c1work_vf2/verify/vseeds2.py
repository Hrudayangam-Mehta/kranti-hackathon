#!/usr/bin/env python3
"""Generator seeds vs verify/ref.py, both ways. Configurations per seed: F2 default (NCPU 2),
SESSIONS_LANE=G, another NCPU, a random test bucket width, SESSIONS_F2=0, and the F1 binary.
Usage: vseeds2.py WORKERS LABEL:SEED:EVENTS:CLICKS ...  -> appends to runs/vseeds2.log"""
import os
import random
import shutil
import sys
import zlib
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import vrun2  # noqa: E402


def job(spec, i):
    label, seed, ev, ck = spec.split(":")
    data = f"{vrun2.V}/data/{label}"
    vrun2.gen(seed, ev, ck, data)
    rnd = random.Random(zlib.crc32(spec.encode()))
    other = rnd.choice([1, 3, 4, 5, 6, 7, 8])
    bits = rnd.randrange(6, 15)
    cfgs = [("f2n2", "f2", 2, {}),
            ("f2G", "f2", 2, {"SESSIONS_LANE": "G"}),
            (f"f2n{other}", "f2", other, {}),
            (f"f2b{bits}", "f2", rnd.choice([1, 2, 4, 8]), {"SESSIONS_TEST_BUCKET_BITS": str(bits)}),
            ("f2off", "f2", 2, {"SESSIONS_F2": "0"}),
            ("f1n2", "f1", 2, {})]
    ok, txt, infos = vrun2.check(data, label, cfgs)
    head = f"{label} seed={seed} E={ev} C={ck} window={vrun2.window_of(data)} buckets_auto={'on' if vrun2.buckets_on(infos.get('f2n2', '')) else 'OFF'}"
    if ok and os.environ.get("KEEP") != "1":
        shutil.rmtree(data, ignore_errors=True)
    return head + " " + txt


def main():
    workers = int(sys.argv[1])
    specs = sys.argv[2:]
    os.makedirs(vrun2.RUNS, exist_ok=True)
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs = [ex.submit(job, s, i) for i, s in enumerate(specs)]
        with open(f"{vrun2.RUNS}/vseeds2.log", "a") as log:
            for f in futs:
                r = f.result()
                print(r, flush=True)
                log.write(r + "\n")
                log.flush()


if __name__ == "__main__":
    main()
