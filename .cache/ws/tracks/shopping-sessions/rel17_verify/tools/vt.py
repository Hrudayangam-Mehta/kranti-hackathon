#!/usr/bin/env python3
import os
import shutil
import subprocess
import sys
import time

T = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions"
V = f"{T}/rel17_verify"
GEN = f"{T}/kit/build/generator/target/release/generate"
PY = f"{T}/kit/venv/bin/python"
SCRIPTS = f"{T}/kit/unz/starter-duckdb/scripts"
FIX = f"{T}/kit/unz/starter-duckdb/fixtures"
REF = f"{T}/verify/ref.py"
ROWDIFF = f"{T}/panel_s/threads/tools/rowdiff.py"
DEV = f"{T}/kit/data/dev"
DEV_ANSWER = f"{T}/kit/unz/dev-answer"


def run_bin(binary, data, out, ncpu, extra=None, fresh=True, label=None):
    if fresh:
        shutil.rmtree(out, ignore_errors=True)
        os.makedirs(out)
    env = {"DATA_DIR": data, "OUTPUT_DIR": out, "NCPU": str(ncpu), "PATH": "/usr/bin:/bin"}
    if extra:
        env.update(extra)
    so = out.rstrip("/") + ".stdout"
    se = out.rstrip("/") + ".stderr"
    with open(so, "wb") as fo, open(se, "wb") as fe:
        t0 = time.time()
        p = subprocess.Popen(["nice", "-n", "10", "taskset", "-c", "2,3", binary], env=env, stdout=fo, stderr=fe)
        _, status, ru = os.wait4(p.pid, 0)
        wall = time.time() - t0
    rc = os.waitstatus_to_exitcode(status)
    return {
        "rc": rc,
        "stdout": os.path.getsize(so),
        "user": ru.ru_utime,
        "sys": ru.ru_stime,
        "maxrss_gb": ru.ru_maxrss / 1e6,
        "wall": wall,
        "stderr_path": se,
        "files": (count_parquet(f"{out}/user_daily"), count_parquet(f"{out}/campaign_daily")),
    }


def count_parquet(d):
    try:
        return sum(1 for n in os.listdir(d) if n.endswith(".parquet") and not n.startswith((".", "_")))
    except OSError:
        return -1


def compare(a, b):
    p = subprocess.run([PY, "-B", f"{SCRIPTS}/compare.py", a, b], capture_output=True, text=True, cwd=SCRIPTS)
    ok = p.returncode == 0 and p.stdout.strip().endswith("MATCH")
    return ok, p.stdout + p.stderr


def rowdiff(a, b):
    p = subprocess.run([PY, "-B", ROWDIFF, a, b], capture_output=True, text=True)
    ok = p.returncode == 0 and "ROWDIFF IDENTICAL" in p.stdout
    return ok, p.stdout + p.stderr


def both_ways(a, b):
    ok1, t1 = compare(a, b)
    ok2, t2 = compare(b, a)
    return ok1 and ok2, t1 + t2


def fmt(r):
    return (f"exit={r['rc']} stdout_bytes={r['stdout']} files={r['files'][0]}/{r['files'][1]} "
            f"user={r['user']:.2f} sys={r['sys']:.2f} maxrss={r['maxrss_gb']:.2f}GB")
