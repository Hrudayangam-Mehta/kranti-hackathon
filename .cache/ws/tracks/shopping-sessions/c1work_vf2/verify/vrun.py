#!/usr/bin/env python3
"""Compatibility shim: the F1 verifier's vrun API (used by the F1 suites: runmut, capedge,
edgemerge, twokeys, stress, vfuzz) on top of vrun2, aimed at the F2 binary. Each old
configuration (NCPU, lane) becomes an F2 run; check() also adds F2 with a test bucket width,
SESSIONS_F2=0, and the F1 binary, unless VF2_PLAIN=1."""
import os
import random
import zlib

import vrun2

V = vrun2.V
T = vrun2.T
GEN = vrun2.GEN
PY = vrun2.PY
SCRIPTS = vrun2.SCRIPTS
ENG = vrun2.ENG
REF = vrun2.REF
RUNS = vrun2.RUNS
run_ref = vrun2.run_ref
gen = vrun2.gen


def compare(a, b):
    return vrun2.cmpdirs(a, b)


def run_eng(data, out, ncpu=2, lane=None, extra=None):
    env = dict(extra or {})
    if lane:
        env["SESSIONS_LANE"] = lane
    return vrun2.run_eng(data, out, "f2", ncpu, env)


def lane_line(stderr):
    for l in stderr.splitlines():
        if l.startswith("lane F"):
            return l.strip()
    return "lane F ?"


def share_line(stderr):
    out = []
    for l in stderr.splitlines():
        if l.startswith("buckets on") or l.startswith("buckets off") or l.startswith("multi "):
            out.append(l.strip()[:90])
        if "lane G share" in l:
            out.append(l.strip()[:120])
    return " ; ".join(out)


def check(data, label, configs=((2, None), (2, "G")), keep=False, ref_out=None):
    cfgs = []
    for ncpu, lane in configs:
        tag = f"n{ncpu}_{lane or 'auto'}"
        cfgs.append((tag, "f2", ncpu, {"SESSIONS_LANE": lane} if lane else {}))
    if os.environ.get("VF2_PLAIN") != "1":
        r = random.Random(zlib.crc32(label.encode()))
        bits = r.randrange(6, 15)
        cfgs.append((f"b{bits}", "f2", r.choice([1, 2, 3, 4, 6, 8]), {"SESSIONS_TEST_BUCKET_BITS": str(bits)}))
        cfgs.append(("f2off", "f2", 2, {"SESSIONS_F2": "0"}))
        cfgs.append(("f1", "f1", 2, {}))
    ok, txt, _ = vrun2.check(data, label, cfgs, ref_out=ref_out, keep=keep)
    return ok, txt
