#!/usr/bin/env python3
"""Verifier F1 harness: run verify/ref.py and the engineer binary on one data dir,
compare exactly both ways (kit compare.py), for several NCPU / lane configs.
Everything pinned to cores 0,1."""
import json
import os
import shutil
import subprocess
import sys
import time

V = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = os.path.dirname(V)
GEN = f"{V}/gen_src/target/release/generate"
PY = f"{T}/kit/venv/bin/python"
SCRIPTS = f"{T}/kit/unz/starter-duckdb/scripts"
ENG = f"{V}/verify/eng.sh"
REF = f"{V}/verify/ref.py"
RUNS = f"{V}/runs"


def compare(a, b):
    p = subprocess.run([PY, "-B", f"{SCRIPTS}/compare.py", a, b], capture_output=True, text=True, cwd=SCRIPTS)
    ok = p.returncode == 0 and p.stdout.strip().endswith("MATCH")
    return ok, p.stdout + p.stderr


def run_ref(data, out):
    shutil.rmtree(out, ignore_errors=True)
    t = time.time()
    p = subprocess.run(["taskset", "-c", "0,1", PY, "-B", REF, data, out], capture_output=True, text=True)
    return p.returncode, p.stderr, time.time() - t


def run_eng(data, out, ncpu=2, lane=None, extra=None):
    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(out)
    env = dict(os.environ, NCPU=str(ncpu))
    env.pop("SESSIONS_LANE", None)
    env.pop("SESSIONS_PATH", None)
    if lane:
        env["SESSIONS_LANE"] = lane
    if extra:
        env.update(extra)
    t = time.time()
    p = subprocess.run([ENG, data, out], capture_output=True, text=True, env=env)
    return p.returncode, p.stderr, time.time() - t


def lane_line(stderr):
    for l in stderr.splitlines():
        if l.startswith("lane F"):
            return l.strip()
    return "lane F ?"


def share_line(stderr):
    for l in stderr.splitlines():
        if "lane G share" in l:
            return l.strip()
    return ""


def check(data, label, configs=((2, None), (2, "G")), keep=False, ref_out=None):
    """Returns (ok, text)."""
    os.makedirs(RUNS, exist_ok=True)
    lines = []
    ok_all = True
    own_ref = ref_out is None
    if own_ref:
        ref_out = f"{RUNS}/{label}_ref"
        rc, err, tr = run_ref(data, ref_out)
        if rc != 0:
            return False, f"{label} REF CRASH rc={rc}\n{err[-1500:]}"
    outs = {}
    for ncpu, lane in configs:
        tag = f"n{ncpu}_{lane or 'auto'}"
        out = f"{RUNS}/{label}_{tag}"
        rc, err, te = run_eng(data, out, ncpu, lane)
        if rc != 0:
            ok_all = False
            lines.append(f"  {tag}: ENG CRASH rc={rc} {err[-1500:]}")
            continue
        a, ta = compare(out, ref_out)
        b, tb = compare(ref_out, out)
        st = "MATCH" if a and b else "DIFFER"
        if st != "MATCH":
            ok_all = False
        lines.append(f"  {tag}: {st} {te:.2f}s | {lane_line(err)} | {share_line(err)}")
        if st != "MATCH":
            lines.append(ta[-3000:])
        outs[tag] = out
    tags = list(outs)
    for t2 in tags[1:]:
        a, ta = compare(outs[tags[0]], outs[t2])
        b, tb = compare(outs[t2], outs[tags[0]])
        if not (a and b):
            ok_all = False
            lines.append(f"  {tags[0]} vs {t2}: DIFFER\n{ta[-2000:]}")
    if ok_all and not keep:
        for o in outs.values():
            shutil.rmtree(o, ignore_errors=True)
            for suf in (".stdout", ".stderr"):
                try:
                    os.remove(o + suf)
                except OSError:
                    pass
        if own_ref:
            shutil.rmtree(ref_out, ignore_errors=True)
    head = f"{label}: {'MATCH' if ok_all else 'FAIL'}"
    return ok_all, head + "\n" + "\n".join(lines)


def gen(seed, events, clicks, out):
    shutil.rmtree(out, ignore_errors=True)
    subprocess.run(["taskset", "-c", "0,1", GEN, "--seed", str(seed), "--events", str(events), "--clicks",
                    str(clicks), "--output", out, "--threads", "2"], check=True, capture_output=True)


if __name__ == "__main__":
    data, label = sys.argv[1], sys.argv[2]
    ok, txt = check(data, label, keep=True)
    print(txt)
    sys.exit(0 if ok else 1)
