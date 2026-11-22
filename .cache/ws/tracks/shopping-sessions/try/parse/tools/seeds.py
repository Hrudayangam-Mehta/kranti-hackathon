#!/usr/bin/env python3
"""seeds.py BIN SEED[:EVENTS:CLICKS] ...: generate (cached), reference (cached), run BIN, compare both ways."""
import os, shutil, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
P = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = os.path.dirname(os.path.dirname(P))
GEN = f"{T}/kit/build/generator/target/release/generate"
PY = f"{T}/kit/venv/bin/python"
SCRIPTS = f"{T}/kit/unz/starter-duckdb/scripts"
REF = f"{T}/verify/ref.py"
W = f"{P}/seeds"

def compare(a, b):
    p = subprocess.run([PY, "-B", f"{SCRIPTS}/compare.py", a, b], capture_output=True, text=True, cwd=SCRIPTS)
    return p.returncode == 0 and p.stdout.strip().endswith("MATCH"), p.stdout[-600:] + p.stderr[-600:]

def job(binary, spec, core):
    parts = spec.split(":")
    seed = parts[0]; ev = parts[1] if len(parts) > 1 else "300000"; ck = parts[2] if len(parts) > 2 else "75000"
    label = f"s{seed}_{ev}_{ck}"
    data, ref = f"{W}/{label}/data", f"{W}/{label}/ref"
    if not os.path.exists(f"{W}/{label}/ref.done"):
        shutil.rmtree(f"{W}/{label}", ignore_errors=True)
        os.makedirs(ref)
        subprocess.run(["taskset", "-c", str(core), GEN, "--seed", seed, "--events", ev, "--clicks", ck,
                        "--output", data, "--threads", "1"], check=True, capture_output=True)
        subprocess.run(["taskset", "-c", str(core), PY, "-B", REF, data, ref], check=True, capture_output=True)
        open(f"{W}/{label}/ref.done", "w").close()
    out = f"{W}/{label}/eng"
    shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
    pe = subprocess.run(["env", "-i", f"DATA_DIR={data}", f"OUTPUT_DIR={out}", "NCPU=2", "taskset", "-c", "2,3", binary],
                        capture_output=True, text=True)
    if pe.returncode != 0:
        return f"{label} CRASH {pe.returncode} {pe.stderr[-500:]}"
    ok1, t1 = compare(out, ref)
    ok2, t2 = compare(ref, out)
    win = open(f"{data}/manifest.json").read().replace("\n", "").replace(" ", "")
    return f"{label} {win} {'MATCH' if ok1 and ok2 else 'DIFFER'}" + ("" if ok1 and ok2 else "\n" + t1 + t2)

binary = os.path.abspath(sys.argv[1])
with ThreadPoolExecutor(max_workers=2) as ex:
    futs = [ex.submit(job, binary, s, 2 + i % 2) for i, s in enumerate(sys.argv[2:])]
    for f in futs:
        print(f.result(), flush=True)
