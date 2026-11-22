import os, sys, shutil, subprocess, time, json
S = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions"
W = S + "/v5c"
GEN = S + "/v5model/kit5/gen_target/release/generate"
PY = S + "/kit/venv/bin/python"
SCRIPTS = S + "/kit/unz/starter-duckdb/scripts"
BIN = sys.argv[1]
specs = sys.argv[2:]

def compare(a, b):
    p = subprocess.run([PY, "-B", SCRIPTS + "/compare.py", a, b], capture_output=True, text=True, cwd=SCRIPTS)
    return p.returncode == 0 and p.stdout.strip().endswith("MATCH"), p.stdout + p.stderr

for spec in specs:
    label, seed, ev, ck, ncpu = (spec.split(":") + ["2"])[:5]
    data = f"{W}/vdata/{label}"
    out_r, out_e = f"{W}/vruns/{label}_ref", f"{W}/vruns/{label}_eng"
    for d in (data, out_r, out_e):
        shutil.rmtree(d, ignore_errors=True)
    subprocess.run(["nice", "-n", "10", "taskset", "-c", "2,3", GEN, "--seed", seed, "--events", ev, "--clicks", ck, "--output", data, "--threads", "1"], check=True, capture_output=True)
    os.makedirs(out_e)
    t0 = time.time()
    pe = subprocess.run(["env", "-i", f"DATA_DIR={data}", f"OUTPUT_DIR={out_e}", f"NCPU={ncpu}", "nice", "-n", "10", "taskset", "-c", "2,3", BIN], capture_output=True, text=True)
    te = time.time() - t0
    t0 = time.time()
    pr = subprocess.run(["nice", "-n", "10", "taskset", "-c", "2,3", PY, "-B", S + "/verify/ref.py", data, out_r], capture_output=True, text=True)
    tr = time.time() - t0
    window = open(f"{data}/manifest.json").read().replace("\n", "").replace(" ", "")
    nfiles = {k: len(os.listdir(f"{data}/{k}")) for k in ("events", "clicks", "links")}
    if pe.returncode != 0 or pr.returncode != 0 or pe.stdout != "":
        print(f"{label} seed={seed} E={ev} C={ck} CRASH eng={pe.returncode} ref={pr.returncode} stdout={len(pe.stdout)}\n{pe.stderr[-800:]}\n{pr.stderr[-800:]}", flush=True)
        continue
    ok, txt = compare(out_e, out_r)
    ok2, txt2 = compare(out_r, out_e)
    status = "MATCH" if ok and ok2 else "DIFFER"
    tail = [l for l in pe.stderr.splitlines() if l.startswith(("event copies", "id prefixes"))]
    print(f"{label} seed={seed} E={ev} C={ck} NCPU={ncpu} files={nfiles} {window} eng={te:.2f}s ref={tr:.1f}s {status} | {' | '.join(tail)}", flush=True)
    if status != "MATCH":
        print(txt + txt2, flush=True)
    else:
        for d in (out_r, out_e, data):
            shutil.rmtree(d, ignore_errors=True)
