import os, sys, shutil, subprocess, time
S = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions"
V = S + "/v5c_verify"
GEN = S + "/v5model/kit5/gen_target/release/generate"
PY = S + "/kit/venv/bin/python"
SCRIPTS = S + "/kit/unz/starter-duckdb/scripts"
ROWDIFF = S + "/panel_s/threads/tools"
BIN = sys.argv[1]
specs = sys.argv[2:]


def compare(a, b):
    p = subprocess.run([PY, "-B", SCRIPTS + "/compare.py", a, b], capture_output=True, text=True, cwd=SCRIPTS)
    return p.returncode == 0 and p.stdout.strip().endswith("MATCH"), p.stdout + p.stderr


def rowdiff(a, b):
    p = subprocess.run([PY, "-B", ROWDIFF + "/rowdiff.py", a, b], capture_output=True, text=True, cwd=ROWDIFF)
    return p.returncode == 0 and p.stdout.strip().endswith("IDENTICAL"), p.stdout + p.stderr


for spec in specs:
    label, seed, ev, ck, ncpus = (spec.split(":") + ["2"])[:5]
    data = f"{V}/vdata/{label}"
    out_r = f"{V}/vruns/{label}_ref"
    shutil.rmtree(data, ignore_errors=True)
    shutil.rmtree(out_r, ignore_errors=True)
    subprocess.run(["nice", "-n", "10", "taskset", "-c", "2,3", GEN, "--seed", seed, "--events", ev, "--clicks", ck, "--output", data, "--threads", "1"], check=True, capture_output=True)
    t0 = time.time()
    pr = subprocess.run(["nice", "-n", "10", "taskset", "-c", "2,3", PY, "-B", S + "/verify/ref.py", data, out_r], capture_output=True, text=True)
    tr = time.time() - t0
    window = open(f"{data}/manifest.json").read().replace("\n", "").replace(" ", "")
    nfiles = {k: len(os.listdir(f"{data}/{k}")) for k in ("events", "clicks", "links")}
    if pr.returncode != 0:
        print(f"{label} seed={seed} REF CRASH rc={pr.returncode}\n{pr.stderr[-800:]}", flush=True)
        continue
    results = []
    tail = []
    for ncpu in ncpus.split("/"):
        out_e = f"{V}/vruns/{label}_eng_n{ncpu}"
        shutil.rmtree(out_e, ignore_errors=True)
        os.makedirs(out_e)
        t0 = time.time()
        pe = subprocess.run(["env", "-i", f"DATA_DIR={data}", f"OUTPUT_DIR={out_e}", f"NCPU={ncpu}", "nice", "-n", "10", "taskset", "-c", "2,3", BIN], capture_output=True, text=True)
        te = time.time() - t0
        if pe.returncode != 0 or pe.stdout != "":
            results.append(f"NCPU={ncpu} CRASH rc={pe.returncode} stdout={len(pe.stdout)} {pe.stderr[-600:]}")
            continue
        ok, txt = compare(out_e, out_r)
        ok2, txt2 = compare(out_r, out_e)
        ok3, txt3 = rowdiff(out_e, out_r)
        status = "MATCH" if ok and ok2 and ok3 else "DIFFER"
        results.append(f"NCPU={ncpu} eng={te:.2f}s {status}")
        if status != "MATCH":
            results.append(txt + txt2 + txt3)
        tail = [l for l in pe.stderr.splitlines() if l.startswith(("event copies", "id prefixes"))]
        shutil.rmtree(out_e, ignore_errors=True)
    print(f"{label} seed={seed} E={ev} C={ck} files={nfiles} {window} ref={tr:.1f}s | {' | '.join(results)} | {' | '.join(tail)}", flush=True)
    shutil.rmtree(out_r, ignore_errors=True)
    shutil.rmtree(data, ignore_errors=True)
