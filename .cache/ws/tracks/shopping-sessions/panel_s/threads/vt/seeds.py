#!/usr/bin/env python3
"""Generate seed datasets, run reference + engineer binary, compare exactly.
Usage: seeds.py LABEL:SEED:EVENTS:CLICKS ...   (results appended to runs/seeds.log)
"""
import os
import shutil
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor

V = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/threads/vt"
T = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions"
GEN = f"{T}/kit/build/generator/target/release/generate"
PY = f"{T}/kit/venv/bin/python"
SCRIPTS = f"{T}/kit/unz/starter-duckdb/scripts"


def compare(a, b):
    p = subprocess.run([PY, "-B", f"{SCRIPTS}/compare.py", a, b], capture_output=True, text=True, cwd=SCRIPTS)
    return p.returncode == 0 and p.stdout.strip().endswith("MATCH"), p.stdout + p.stderr


def job(spec, core):
    label, seed, ev, ck = spec.split(":")
    data = f"{V}/data/{label}"
    out_r, out_e = f"{V}/runs/{label}_ref", f"{V}/runs/{label}_eng"
    for d in (data, out_r, out_e):
        shutil.rmtree(d, ignore_errors=True)
    subprocess.run(["taskset", "-c", str(core), GEN, "--seed", seed, "--events", ev, "--clicks", ck,
                    "--output", data, "--threads", "1"], check=True, capture_output=True)
    os.makedirs(out_e)
    t0 = time.time()
    pe = subprocess.run([f"{V}/eng.sh", data, out_e], capture_output=True, text=True)
    te = time.time() - t0
    t0 = time.time()
    pr = subprocess.run(["taskset", "-c", str(core), PY, "-B", f"/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/verify/ref.py", data, out_r],
                        capture_output=True, text=True)
    tr = time.time() - t0
    window = open(f"{data}/manifest.json").read().replace("\n", "").replace(" ", "")
    if pe.returncode != 0 or pr.returncode != 0:
        return f"{label} seed={seed} E={ev} C={ck} CRASH eng={pe.returncode} ref={pr.returncode}\n{pe.stderr[-800:]}\n{pr.stderr[-800:]}"
    ok, txt = compare(out_e, out_r)
    ok2, txt2 = compare(out_r, out_e)
    status = "MATCH" if ok and ok2 else "DIFFER"
    line = f"{label} seed={seed} E={ev} C={ck} {window} eng={te:.2f}s ref={tr:.1f}s {status}"
    if status != "MATCH":
        line += "\n" + txt
    else:
        for d in (out_r, out_e):
            shutil.rmtree(d, ignore_errors=True)
        if os.environ.get("KEEP") != "1":
            shutil.rmtree(data, ignore_errors=True)
    return line


def main():
    specs = sys.argv[1:]
    os.makedirs(f"{V}/runs", exist_ok=True)
    with ThreadPoolExecutor(max_workers=2) as ex:
        futs = [ex.submit(job, s, 2 + i % 2) for i, s in enumerate(specs)]
        with open(f"{V}/runs/seeds.log", "a") as log:
            for f in futs:
                r = f.result()
                print(r, flush=True)
                log.write(r + "\n")


if __name__ == "__main__":
    main()
