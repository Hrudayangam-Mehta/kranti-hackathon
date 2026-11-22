#!/usr/bin/env python3
"""F2 decoder- and layout-independence stress, using the binary's test-only switches (the scorer
never sets them): wrong and random event keys, every bucket width, tiny number caps, the twist
user decoder with the true event key, tiny person caps, the scalar kernel, the slow path.
Each must still MATCH verify/ref.py. Datasets: a base, or a base mutated by an F1 kind
(mutate.py) or an F2 kind (mutate2.py, prefixed 'm2:').
Usage: stress2.py LABEL:SEED:E:C KIND ...  -> appends runs/stress2.log"""
import os
import random
import re
import shutil
import sys
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "verify"))
import genmodel as gm  # noqa: E402
import mutate  # noqa: E402
import mutate2  # noqa: E402
import vrun2  # noqa: E402


def main():
    label, seed, ev, ck = sys.argv[1].split(":")
    kinds = sys.argv[2:]
    base = f"{vrun2.V}/data/base_{label}"
    if not os.path.isdir(base):
        vrun2.gen(seed, ev, ck, base)
    _, uk, ek, _ = gm.plan_keys(int(seed))
    ukey, ekey = uk & gm.MASK40, ek & gm.MASK40
    log = open(f"{vrun2.RUNS}/stress2.log", "a")
    for kind in kinds:
        rng = zlib.crc32((label + ":" + kind + ":s2").encode()) & 0xFFFF
        if kind == "plain":
            data = base
        elif kind.startswith("m2:"):
            data = f"{vrun2.V}/data/s2_{label}_{kind[3:]}"
            d = mutate2.build(base, data, kind[3:], int(seed), rng)
            ekey = getattr(d, "ek_expected", ekey)
        else:
            data = f"{vrun2.V}/data/s2_{label}_{kind}"
            mutate.build(base, data, kind, int(seed), rng, None)
        r = random.Random(rng)
        cfgs = [("default", "f2", 2, {})]
        for b in (6, 7, 8, 10, 12, 14, 15):
            cfgs.append((f"key_b{b}", "f2", r.choice([1, 2, 3, 5, 8]),
                         {"SESSIONS_TEST_EVENT_KEY": hex(ekey), "SESSIONS_TEST_BUCKET_BITS": str(b)}))
        cfgs += [
            ("ekey_xor1", "f2", 2, {"SESSIONS_TEST_EVENT_KEY": hex(ekey ^ 1)}),
            ("ekey_rand", "f2", 3, {"SESSIONS_TEST_EVENT_KEY": hex(r.getrandbits(40))}),
            ("ekey_ncap_small", "f2", 2, {"SESSIONS_TEST_EVENT_KEY": hex(ekey), "SESSIONS_TEST_NCAP": str(int(ev) // 3)}),
            ("ekey_ncap1_b6", "f2", 4, {"SESSIONS_TEST_EVENT_KEY": hex(ekey), "SESSIONS_TEST_NCAP": "1",
                                        "SESSIONS_TEST_BUCKET_BITS": "6"}),
            ("twist_ekey_b8", "f2", 2, {"SESSIONS_TEST_TWIST": "1", "SESSIONS_TEST_EVENT_KEY": hex(ekey),
                                        "SESSIONS_TEST_BUCKET_BITS": "8"}),
            ("ukey_gcap300_ekey", "f2", 2, {"SESSIONS_TEST_USER_KEY": hex(ukey), "SESSIONS_TEST_GCAP": "300",
                                            "SESSIONS_TEST_EVENT_KEY": hex(ekey)}),
            ("ukey_wrong_ekey", "f2", 3, {"SESSIONS_TEST_USER_KEY": hex(ukey ^ 1), "SESSIONS_TEST_EVENT_KEY": hex(ekey)}),
            ("scalar", "f2", 2, {"SESSIONS_SCALAR": "1"}),
            ("scalar_ekey_b6", "f2", 1, {"SESSIONS_SCALAR": "1", "SESSIONS_TEST_EVENT_KEY": hex(ekey),
                                         "SESSIONS_TEST_BUCKET_BITS": "6"}),
            ("slow", "f2", 2, {"SESSIONS_PATH": "slow"}),
        ]
        tag = f"s2_{label}_{kind.replace(':', '_')}"
        ok, txt, infos = vrun2.check(data, tag, cfgs)
        m = re.search(r"buckets on: event key (0x[0-9a-f]+)", infos.get("default", ""))
        auto = f"auto buckets ON key {'=' if m and int(m.group(1), 16) == ekey else '!='} expected" if m else "auto buckets off"
        line = f"[{label} seed={seed}] {kind}: {auto}\n{txt}"
        print(line, flush=True)
        log.write(line + "\n")
        log.flush()
        if ok and data != base:
            shutil.rmtree(data, ignore_errors=True)


if __name__ == "__main__":
    main()
