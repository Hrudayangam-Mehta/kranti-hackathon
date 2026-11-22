#!/usr/bin/env python3
"""Decoder-independence stress (uses the binary's test-only switches, which the scorer never sets):
twist remap, small person caps, wrong forced keys, scalar kernel, slow path - each must still
MATCH verify/ref.py. Usage: stress.py LABEL:SEED:E:C KIND ...  -> appends runs/stress.log"""
import os
import re
import shutil
import sys
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "verify"))
import mutate  # noqa: E402
import vrun  # noqa: E402


def main():
    label, seed, ev, ck = sys.argv[1].split(":")
    kinds = sys.argv[2:]
    base = f"{vrun.V}/data/base_{label}"
    if not os.path.isdir(base):
        vrun.gen(seed, ev, ck, base)
    log = open(f"{vrun.RUNS}/stress.log", "a")
    for kind in kinds:
        if kind == "plain":
            data = base
        else:
            data = f"{vrun.V}/data/stress_{label}_{kind}"
            mutate.build(base, data, kind, int(seed), zlib.crc32((label + ":" + kind + ":s").encode()) & 0xFFFF, None)
        tag = f"stress_{label}_{kind}"
        ref_out = f"{vrun.RUNS}/{tag}_ref"
        rc, err, _ = vrun.run_ref(data, ref_out)
        lines = [f"[{label} seed={seed}] {kind}:"]
        ok_all = rc == 0
        out0 = f"{vrun.RUNS}/{tag}_probe"
        rc0, err0, _ = vrun.run_eng(data, out0, 2)
        m = re.search(r"user key (0x[0-9a-f]+)", err0)
        key = int(m.group(1), 16) if m else 0x123456789
        shutil.rmtree(out0, ignore_errors=True)
        configs = [
            ("default", {}),
            ("twist", {"SESSIONS_TEST_TWIST": "1"}),
            ("twist_cap1000", {"SESSIONS_TEST_TWIST": "1", "SESSIONS_TEST_GCAP": "1000"}),
            ("key_xor1", {"SESSIONS_TEST_USER_KEY": hex(key ^ 1)}),
            ("key_true_cap64", {"SESSIONS_TEST_USER_KEY": hex(key), "SESSIONS_TEST_GCAP": "64"}),
            ("key_true_cap1", {"SESSIONS_TEST_USER_KEY": hex(key), "SESSIONS_TEST_GCAP": "1"}),
            ("key_true_twist_cap300", {"SESSIONS_TEST_USER_KEY": hex(key), "SESSIONS_TEST_TWIST": "1",
                                       "SESSIONS_TEST_GCAP": "300"}),
            ("scalar", {"SESSIONS_SCALAR": "1"}),
            ("slow", {"SESSIONS_PATH": "slow"}),
        ]
        for name, extra in configs:
            out = f"{vrun.RUNS}/{tag}_{name}"
            ncpu = 1 + zlib.crc32(name.encode()) % 8
            rc, err, te = vrun.run_eng(data, out, ncpu, None, extra)
            if rc != 0:
                ok_all = False
                lines.append(f"  {name}: CRASH rc={rc} {err[-800:]}")
                continue
            a, ta = vrun.compare(out, ref_out)
            b, tb = vrun.compare(ref_out, out)
            st = "MATCH" if a and b else "DIFFER"
            ok_all &= st == "MATCH"
            lines.append(f"  {name} (NCPU {ncpu}): {st} | {vrun.lane_line(err)} | {vrun.share_line(err)}")
            if st != "MATCH":
                lines.append(ta[-2500:])
            else:
                shutil.rmtree(out, ignore_errors=True)
        lines[0] += " MATCH" if ok_all else " FAIL"
        txt = "\n".join(lines)
        print(txt, flush=True)
        log.write(txt + "\n")
        log.flush()
        if ok_all:
            shutil.rmtree(ref_out, ignore_errors=True)
            if data != base:
                shutil.rmtree(data, ignore_errors=True)


if __name__ == "__main__":
    main()
