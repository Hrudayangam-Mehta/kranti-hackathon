#!/usr/bin/env python3
import os
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

T = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions"
W = f"{T}/rel19_work"
GEN = f"{T}/kit/build/generator/target/release/generate"
PY = f"{T}/kit/venv/bin/python"
SCRIPTS = f"{T}/kit/unz/starter-duckdb/scripts"
MODE = sys.argv[1]
SPECS = sys.argv[2:]
BIN = os.environ.get("BIN", "")
CONFIGS = [c for c in os.environ.get("CONFIGS", "NCPU=1;NCPU=3;NCPU=8").split(";") if c]


def compare(a, b):
    p = subprocess.run([PY, "-B", f"{SCRIPTS}/compare.py", a, b], capture_output=True, text=True, cwd=SCRIPTS)
    return p.returncode == 0 and p.stdout.strip().endswith("MATCH"), p.stdout + p.stderr


def prepare(spec, core):
    label, seed, ev, ck = spec.split(":")
    data = f"{W}/vdata/{label}"
    ref = f"{W}/vref/{label}"
    if os.path.exists(f"{ref}/.done"):
        return f"{label} cached"
    for d in (data, ref):
        shutil.rmtree(d, ignore_errors=True)
    subprocess.run(["nice", "-n", "10", "taskset", "-c", str(core), GEN, "--seed", seed, "--events", ev, "--clicks", ck,
                    "--output", data, "--threads", "1"], check=True, capture_output=True)
    pr = subprocess.run(["nice", "-n", "10", "taskset", "-c", str(core), PY, "-B", f"{T}/verify/ref.py", data, ref],
                        capture_output=True, text=True)
    if pr.returncode != 0:
        return f"{label} seed={seed} REF CRASH {pr.stderr[-500:]}"
    open(f"{ref}/.done", "w").close()
    window = open(f"{data}/manifest.json").read().replace("\n", "").replace(" ", "")
    nfiles = {k: len(os.listdir(f"{data}/{k}")) for k in ("events", "clicks", "links")}
    return f"{label} seed={seed} E={ev} C={ck} {window} files={nfiles} prepared"


def check(spec, core):
    label, seed, ev, ck = spec.split(":")
    data = f"{W}/vdata/{label}"
    ref = f"{W}/vref/{label}"
    window = open(f"{data}/manifest.json").read().replace("\n", "").replace(" ", "")
    parts = []
    all_ok = True
    for i, cfg in enumerate(CONFIGS):
        env = dict(kv.split("=") for kv in cfg.split(",") if kv)
        out_e = f"{W}/vruns/{label}_{os.path.basename(BIN)}_{i}"
        shutil.rmtree(out_e, ignore_errors=True)
        os.makedirs(out_e)
        env.update({"DATA_DIR": data, "OUTPUT_DIR": out_e})
        pe = subprocess.run(["nice", "-n", "10", "taskset", "-c", "2,3", BIN], env=env, capture_output=True, text=True)
        ok1, t1 = compare(out_e, ref)
        ok2, t2 = compare(ref, out_e)
        ok = pe.returncode == 0 and pe.stdout == "" and ok1 and ok2
        all_ok &= ok
        lane = [l for l in pe.stderr.splitlines() if l.startswith(("buckets o", "lane F o"))]
        parts.append(f"[{cfg}]:exit={pe.returncode},stdout={len(pe.stdout)},{'MATCH' if ok1 and ok2 else 'DIFFER'},{'F2on' if any(l.startswith('buckets on') for l in lane) else 'F2off'}")
        if ok:
            shutil.rmtree(out_e, ignore_errors=True)
        else:
            parts.append(t1[-600:] + pe.stderr[-600:])
    return f"{label} seed={seed} E={ev} C={ck} {window} " + " ".join(parts) + (" ALL-MATCH" if all_ok else " FAIL")


def main():
    os.makedirs(f"{W}/vruns", exist_ok=True)
    os.makedirs(f"{W}/vref", exist_ok=True)
    fn = prepare if MODE == "prepare" else check
    with ThreadPoolExecutor(max_workers=2 if MODE == "prepare" else 1) as ex:
        futs = [ex.submit(fn, s, 2 + i % 2) for i, s in enumerate(SPECS)]
        for f in futs:
            print(f.result(), flush=True)


if __name__ == "__main__":
    main()
