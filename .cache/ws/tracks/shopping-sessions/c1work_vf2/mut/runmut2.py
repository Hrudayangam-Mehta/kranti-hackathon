#!/usr/bin/env python3
"""Run the verifier's F2 mutation sets: base generator data per seed, each KIND, verify/ref.py
against F2 in automatic mode (NCPU 2, 1, 8), F2 with a random test bucket width, F2 with the
true event key forced and a random bucket width, SESSIONS_F2=0, and the F1 binary.
Records whether buckets were on in automatic mode and whether the recovered event key is the
expected one. Usage: runmut2.py LABEL:SEED:E:C[,...] [KIND[@MODE] ...]  -> appends runs/mut2.log"""
import os
import re
import shutil
import sys
import zlib
import random

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "verify"))
import mutate2  # noqa: E402
import vrun2  # noqa: E402


def main():
    bases = sys.argv[1].split(",")
    kinds = sys.argv[2:] or mutate2.KINDS
    log = open(f"{vrun2.RUNS}/mut2.log", "a")
    for spec in bases:
        label, seed, ev, ck = spec.split(":")
        base = f"{vrun2.V}/data/base_{label}"
        if not os.path.isdir(base):
            vrun2.gen(seed, ev, ck, base)
        for kind in kinds:
            name, _, mode = kind.partition("@")
            tag = f"m2_{label}_{name}{('_' + mode) if mode else ''}"
            out = f"{vrun2.V}/data/{tag}"
            rng = zlib.crc32(f"{label}:{kind}".encode()) & 0xFFFF
            try:
                d = mutate2.build(base, out, name, int(seed), rng,
                                  window_mode=mode or None if name == "window" else None,
                                  cats=int(mode) if name in ("cats", "all") and mode else None)
            except Exception as e:  # noqa: BLE001
                import traceback
                line = f"[{label} seed={seed}] {kind}: BUILD ERROR {e!r}\n{traceback.format_exc()[-1500:]}"
                print(line, flush=True)
                log.write(line + "\n")
                log.flush()
                continue
            key = getattr(d, "ek_expected", d.ek)
            r = random.Random(rng)
            bits = r.randrange(6, 15)
            bits2 = r.randrange(6, 15)
            cfgs = [("f2n2", "f2", 2, {}),
                    ("f2n1", "f2", 1, {}),
                    ("f2n8", "f2", 8, {}),
                    (f"f2b{bits}", "f2", r.choice([2, 3, 5]), {"SESSIONS_TEST_BUCKET_BITS": str(bits)}),
                    (f"f2key_b{bits2}", "f2", r.choice([2, 4, 7]),
                     {"SESSIONS_TEST_EVENT_KEY": hex(key), "SESSIONS_TEST_BUCKET_BITS": str(bits2)}),
                    ("f2off", "f2", 2, {"SESSIONS_F2": "0"}),
                    ("f1n2", "f1", 2, {})]
            ok, txt, infos = vrun2.check(out, tag, cfgs)
            err = infos.get("f2n2", "")
            m = re.search(r"buckets on: event key (0x[0-9a-f]+)", err)
            if m:
                kstat = "key=expected" if int(m.group(1), 16) == key else f"key={m.group(1)} UNEXPECTED (expected {key:#x})"
                auto = f"auto buckets ON {kstat}"
            else:
                m2 = re.search(r"^(buckets off[^\n]*|lane F off[^\n]*)", err, re.M)
                auto = f"auto {m2.group(1) if m2 else 'buckets ?'}"
            notes = "; ".join(d.notes)
            line = f"[{label} seed={seed}] {kind}: {auto}\n  notes: {notes}\n{txt}"
            print(line, flush=True)
            log.write(line + "\n")
            log.flush()
            if ok and os.environ.get("KEEP") != "1":
                shutil.rmtree(out, ignore_errors=True)
                try:
                    os.remove(out + ".notes.txt")
                except OSError:
                    pass


if __name__ == "__main__":
    main()
