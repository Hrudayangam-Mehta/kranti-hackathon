#!/usr/bin/env python3
import os, shutil, subprocess, sys
from concurrent.futures import ThreadPoolExecutor

T = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions"
J = f"{T}/v5judge"
GEN = f"{T}/v5model/kit5/gen_target/release/generate"
PY = f"{T}/kit/venv/bin/python"
SCRIPTS = f"{T}/kit/unz/starter-duckdb/scripts"
BINS = [kv.split("=", 1) for kv in os.environ["BINS"].split(",")]
NCPUS = os.environ.get("NCPUS", "1,3,8").split(",")
CORES = os.environ.get("CORES", "0-3")


def compare(a, b):
    p = subprocess.run([PY, "-B", f"{SCRIPTS}/compare.py", a, b], capture_output=True, text=True, cwd=SCRIPTS)
    return p.returncode == 0 and p.stdout.strip().endswith("MATCH"), p.stdout + p.stderr


def job(spec):
    label, seed, ev, ck = spec.split(":")
    data = f"{J}/data/{label}"
    out_r = f"{J}/vruns/{label}_ref"
    for d in (data, out_r):
        shutil.rmtree(d, ignore_errors=True)
    g = subprocess.run(["taskset", "-c", CORES, GEN, "--seed", seed, "--events", ev, "--clicks", ck, "--output", data, "--threads", "1"], capture_output=True, text=True)
    if g.returncode != 0:
        return f"{label} seed={seed} GEN FAILED rc={g.returncode} {g.stderr[-300:]}"
    window = open(f"{data}/manifest.json").read().replace("\n", "").replace(" ", "")
    nfiles = {k: len(os.listdir(f"{data}/{k}")) for k in ("events", "clicks", "links")}
    pr = subprocess.run(["taskset", "-c", CORES, PY, "-B", f"{T}/verify/ref.py", data, out_r], capture_output=True, text=True)
    if pr.returncode != 0:
        return f"{label} seed={seed} REF CRASH {pr.stderr[-500:]}"
    parts = []
    all_ok = True
    for bl, bp in BINS:
        for n in NCPUS:
            out_e = f"{J}/vruns/{label}_{bl}_n{n}"
            shutil.rmtree(out_e, ignore_errors=True)
            os.makedirs(out_e)
            env = {"DATA_DIR": data, "OUTPUT_DIR": out_e, "NCPU": n, "PATH": "/usr/bin:/bin"}
            pe = subprocess.run(["taskset", "-c", CORES, bp], env=env, capture_output=True, text=True)
            ok1, t1 = compare(out_e, out_r)
            ok2, t2 = compare(out_r, out_e)
            ok = pe.returncode == 0 and pe.stdout == "" and ok1 and ok2
            all_ok &= ok
            parts.append(f"{bl}/n{n}:exit={pe.returncode},stdout={len(pe.stdout)},{'MATCH' if ok1 and ok2 else 'DIFFER'}")
            if ok:
                shutil.rmtree(out_e, ignore_errors=True)
            else:
                parts.append("[" + t1[-600:].replace("\n", " | ") + "]")
    line = f"{label} seed={seed} E={ev} C={ck} {window} files={nfiles} " + " ".join(parts) + (" ALL-MATCH" if all_ok else " FAIL")
    if all_ok and os.environ.get("KEEP") != "1":
        shutil.rmtree(out_r, ignore_errors=True)
        shutil.rmtree(data, ignore_errors=True)
    return line


specs = sys.argv[1:]
with ThreadPoolExecutor(max_workers=int(os.environ.get("PAR", "2"))) as ex:
    for line in ex.map(job, specs):
        print(line, flush=True)
