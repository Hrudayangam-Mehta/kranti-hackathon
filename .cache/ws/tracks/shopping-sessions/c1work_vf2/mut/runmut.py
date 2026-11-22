#!/usr/bin/env python3
"""Run the verifier's mutation sets: base generator data per seed, each KIND, ref vs engineer
(default NCPU 2, SESSIONS_LANE=G, NCPU 1, NCPU 8). Usage: runmut.py LABEL:SEED:E:C[,...] [KIND ...]
Appends to runs/mut.log."""
import os
import re
import zlib
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "verify"))
import mutate  # noqa: E402
import vrun  # noqa: E402

EXPECT_OFF = {"rand_str", "rand_canon"}


def main():
    bases = sys.argv[1].split(",")
    kinds = sys.argv[2:] or mutate.KINDS
    log = open(f"{vrun.RUNS}/mut.log", "a")
    for spec in bases:
        label, seed, ev, ck = spec.split(":")
        base = f"{vrun.V}/data/base_{label}"
        if not os.path.isdir(base):
            vrun.gen(seed, ev, ck, base)
        probe = f"{vrun.RUNS}/probe_{label}"
        rc, err, _ = vrun.run_eng(base, probe, 2)
        m = re.search(r"person cap (\d+)", err)
        cap = int(m.group(1)) if m else None
        shutil.rmtree(probe, ignore_errors=True)
        for kind in kinds:
            out = f"{vrun.V}/data/mut_{label}_{kind}"
            d = mutate.build(base, out, kind, int(seed), zlib.crc32((label + ":" + kind).encode()) & 0xFFFF, cap)
            ok, txt = vrun.check(out, f"mut_{label}_{kind}",
                                 configs=((2, None), (2, "G"), (1, None), (8, None)))
            lanes = re.findall(r"lane F (on|off)[^|]*", txt)
            flag = ""
            if kind in EXPECT_OFF and any(l.startswith("on") for l in [x for x in re.findall(r"lane F (on|off)", txt)]):
                flag = " NOTE: lane F turned ON for a random-ID set"
            line = f"[{label} seed={seed} cap={cap}] {kind}: {txt}{flag}"
            print(line, flush=True)
            log.write(line + "\n")
            log.flush()
            if ok and os.environ.get("KEEP") != "1":
                shutil.rmtree(out, ignore_errors=True)


if __name__ == "__main__":
    main()
