import os, shutil, subprocess, sys, json
from concurrent.futures import ThreadPoolExecutor
T = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions"
W = f"{T}/v5b"
GEN = f"{T}/v5model/kit5/gen_target/release/generate"
PY = f"{T}/kit/venv/bin/python"
SCRIPTS = f"{T}/kit/unz/starter-duckdb/scripts"
BIN = os.path.realpath(os.environ["BIN"])
NCPUS = os.environ.get("NCPUS", "1,3,8").split(",")
EXTRA = dict(kv.split("=") for kv in os.environ.get("EXTRA", "").split(",") if kv)
def compare(a, b):
    p = subprocess.run([PY, "-B", f"{SCRIPTS}/compare.py", a, b], capture_output=True, text=True, cwd=SCRIPTS)
    return p.returncode == 0 and p.stdout.strip().endswith("MATCH"), p.stdout + p.stderr
def job(spec, core):
    label, seed, ev, ck = spec.split(":")
    data = f"{W}/vdata/{label}"
    out_r = f"{W}/vruns/{label}_ref"
    if not os.path.exists(f"{data}/manifest.json"):
        shutil.rmtree(data, ignore_errors=True)
        subprocess.run(["taskset", "-c", str(core), GEN, "--seed", seed, "--events", ev, "--clicks", ck, "--output", data, "--threads", "1"], check=True, capture_output=True)
    window = open(f"{data}/manifest.json").read().replace("\n", "").replace(" ", "")
    nfiles = {k: len(os.listdir(f"{data}/{k}")) for k in ("events", "clicks", "links")}
    if not os.path.exists(f"{out_r}/DONE"):
        shutil.rmtree(out_r, ignore_errors=True)
        pr = subprocess.run(["taskset", "-c", str(core), PY, "-B", f"{T}/verify/ref.py", data, out_r], capture_output=True, text=True)
        if pr.returncode != 0:
            return f"{label} seed={seed} REF CRASH {pr.stderr[-500:]}"
        open(f"{out_r}/DONE", "w").write("ok")
    parts = []
    all_ok = True
    for n in NCPUS:
        out_e = f"{W}/vruns/{label}_eng{n}"
        shutil.rmtree(out_e, ignore_errors=True)
        os.makedirs(out_e)
        env = {"DATA_DIR": data, "OUTPUT_DIR": out_e, "NCPU": n, **EXTRA}
        pe = subprocess.run(["taskset", "-c", "0,1", BIN], env=env, capture_output=True, text=True)
        ok1, t1 = compare(out_e, out_r)
        ok2, t2 = compare(out_r, out_e)
        ok = pe.returncode == 0 and pe.stdout == "" and ok1 and ok2
        all_ok &= ok
        parts.append(f"n{n}:exit={pe.returncode},stdout={len(pe.stdout)},{'MATCH' if ok1 and ok2 else 'DIFFER'}")
        if ok:
            shutil.rmtree(out_e, ignore_errors=True)
        else:
            parts.append(t1[-600:] + pe.stderr[-400:])
    return f"{label} seed={seed} E={ev} C={ck} {window} files={nfiles} " + " ".join(parts) + (" ALL-MATCH" if all_ok else " FAIL")
def main():
    specs = sys.argv[1:]
    os.makedirs(f"{W}/vruns", exist_ok=True)
    with ThreadPoolExecutor(max_workers=2) as ex:
        futs = [ex.submit(job, s, i % 2) for i, s in enumerate(specs)]
        for f in futs:
            print(f.result(), flush=True)
if __name__ == "__main__":
    main()
