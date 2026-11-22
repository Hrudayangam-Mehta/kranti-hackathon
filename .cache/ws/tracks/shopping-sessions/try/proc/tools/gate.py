#!/usr/bin/env python3
"""Correctness gate for one binary: gate.py BIN [--skip-fixtures] [--skip-dev] [--skip-seeds]

1. kit fixtures (36) with NCPU unset and NCPU=1 and NCPU=8
2. dev set vs dev-answer at NCPU=4 and NCPU=8
3. six fixed random generator seeds at 300k events vs verify/ref.py, compared both ways
Prints one summary line per step; exit 0 only if everything passes.
"""
import os
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

T = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions"
P = f"{T}/try/proc"
K = f"{T}/kit"
PY = f"{K}/venv/bin/python"
SCRIPTS = f"{K}/unz/starter-duckdb/scripts"
FIXTURES = f"{K}/unz/starter-duckdb/fixtures"
GEN = f"{K}/build/generator/target/release/generate"
REF = f"{T}/verify/ref.py"
SEEDS = [26790, 476077, 624029, 600321, 363463, 980821]
EVENTS = 300_000
CLICKS = 75_000


def run_bin(binary, data, out, ncpu, cpus="0-3"):
    if os.path.exists(out):
        shutil.rmtree(out)
    os.makedirs(out)
    env = {"DATA_DIR": data, "OUTPUT_DIR": out, "SCRATCH_DIR": out + ".s", "HOME": out + ".s",
           "NCPU": str(ncpu), "MEM_GB": "24", "PATH": "/usr/bin:/bin"}
    os.makedirs(out + ".s", exist_ok=True)
    p = subprocess.run(["taskset", "-c", cpus, binary], env=env, capture_output=True, text=True)
    return p.returncode, p.stderr


def compare(a, b):
    p = subprocess.run([PY, "-B", f"{SCRIPTS}/compare.py", a, b], capture_output=True, text=True, cwd=SCRIPTS)
    ok = p.returncode == 0 and p.stdout.strip().endswith("MATCH")
    return ok, p.stdout + p.stderr


def fixtures(binary, ncpu):
    env = dict(os.environ)
    env.pop("NCPU", None)
    if ncpu is not None:
        env["NCPU"] = str(ncpu)
    p = subprocess.run([PY, "-B", f"{SCRIPTS}/run_fixtures.py", FIXTURES, "--", binary], capture_output=True,
                       text=True, cwd=SCRIPTS, env=env)
    last = [l for l in p.stdout.splitlines() if "fixtures passed" in l]
    fails = [l for l in p.stdout.splitlines() if l.startswith("FAIL")]
    return p.returncode == 0, (last[0] if last else p.stdout[-500:]) + ("" if not fails else " " + "; ".join(fails[:3]))


def seed_job(binary, seed):
    data = f"{P}/data/gate_{seed}"
    ref_out = f"{P}/data/gate_{seed}_ref"
    if not os.path.exists(f"{data}/manifest.json"):
        shutil.rmtree(data, ignore_errors=True)
        subprocess.run([GEN, "--seed", str(seed), "--events", str(EVENTS), "--clicks", str(CLICKS), "--output", data,
                        "--threads", "1"], check=True, capture_output=True)
    if not os.path.exists(f"{ref_out}/campaign_daily"):
        shutil.rmtree(ref_out, ignore_errors=True)
        p = subprocess.run([PY, "-B", REF, data, ref_out], capture_output=True, text=True)
        if p.returncode != 0:
            return False, f"seed {seed}: ref failed {p.stderr[-400:]}"
    out = f"{P}/runs/gate_{seed}_bin"
    ncpu = 1 + seed % 8
    rc, err = run_bin(binary, data, out, ncpu)
    if rc != 0:
        return False, f"seed {seed}: binary exit {rc} {err[-400:]}"
    ok1, t1 = compare(out, ref_out)
    ok2, t2 = compare(ref_out, out)
    rows = [l for l in t1.splitlines() if l.startswith(("user_daily", "campaign_daily"))]
    status = "MATCH" if ok1 and ok2 else "DIFFER"
    msg = f"seed {seed} NCPU={ncpu}: {status} " + " | ".join(rows)
    if status != "MATCH":
        msg += "\n" + t1 + t2
    else:
        shutil.rmtree(out, ignore_errors=True)
    return ok1 and ok2, msg


def main():
    binary = os.path.abspath(sys.argv[1])
    flags = set(sys.argv[2:])
    all_ok = True
    if "--skip-fixtures" not in flags:
        for ncpu in (None, 1, 8):
            ok, msg = fixtures(binary, ncpu)
            all_ok &= ok
            print(f"fixtures NCPU={ncpu}: {'PASS' if ok else 'FAIL'} {msg}", flush=True)
    if "--skip-dev" not in flags:
        for ncpu in (4, 8):
            out = f"{P}/runs/gate_dev_{ncpu}"
            rc, err = run_bin(binary, f"{K}/data/dev", out, ncpu)
            ok, txt = compare(out, f"{K}/unz/dev-answer") if rc == 0 else (False, err[-400:])
            all_ok &= ok
            rows = [l for l in txt.splitlines() if l.startswith(("user_daily", "campaign_daily"))]
            print(f"dev NCPU={ncpu}: {'MATCH' if ok else 'DIFFER'} " + " | ".join(rows), flush=True)
            if ok:
                shutil.rmtree(out, ignore_errors=True)
    if "--skip-seeds" not in flags:
        with ThreadPoolExecutor(max_workers=2) as ex:
            for ok, msg in ex.map(lambda s: seed_job(binary, s), SEEDS):
                all_ok &= ok
                print(msg, flush=True)
    print("GATE " + ("PASS" if all_ok else "FAIL"))
    sys.exit(0 if all_ok else 1)


if __name__ == "__main__":
    main()
