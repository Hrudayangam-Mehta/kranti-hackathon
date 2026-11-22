import os, shutil, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor
V = os.path.dirname(os.path.abspath(__file__))
T = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions'
R = f'{T}/verify'
GEN = f"{T}/kit/build/generator/target/release/generate"
PY = f"{T}/kit/venv/bin/python"
SCRIPTS = f"{T}/kit/unz/starter-duckdb/scripts"
CONFIGS = [("n1", {"NCPU": "1"}), ("n4", {"NCPU": "4"}), ("n8", {"NCPU": "8"})]
def compare(a, b):
    p = subprocess.run([PY, "-B", f"{SCRIPTS}/compare.py", a, b], capture_output=True, text=True, cwd=SCRIPTS)
    return p.returncode == 0 and p.stdout.strip().endswith("MATCH"), p.stdout + p.stderr
def job(spec, core):
    label, seed, ev, ck = spec.split(":")
    data = f"{V}/data/{label}"
    out_r = f"{V}/runs/{label}_ref"
    for d in (data, out_r):
        shutil.rmtree(d, ignore_errors=True)
    subprocess.run(["nice", "-n", "10", "taskset", "-c", str(core), GEN, "--seed", seed, "--events", ev, "--clicks", ck, "--output", data, "--threads", "1"], check=True, capture_output=True)
    pr = subprocess.run(["nice", "-n", "10", "taskset", "-c", str(core), PY, "-B", f"{R}/ref.py", data, out_r], capture_output=True, text=True)
    window = open(f"{data}/manifest.json").read().replace("\n", "").replace(" ", "")
    lines = []
    allok = pr.returncode == 0
    if not allok:
        lines.append(f"  ref.py exit {pr.returncode}: {pr.stderr[-500:]}")
    for name, extra in CONFIGS:
        out_e = f"{V}/runs/{label}_{name}"
        shutil.rmtree(out_e, ignore_errors=True); os.makedirs(out_e)
        env = dict(os.environ)
        for k in ("NCPU", "SESSIONS_F2", "SESSIONS_PATH", "ENG_BIN"):
            env.pop(k, None)
        env.update(extra)
        pe = subprocess.run([f"{V}/eng.sh", data, out_e], capture_output=True, text=True, env=env)
        err = open(out_e + ".err").read()
        sb = os.path.getsize(out_e + ".stdout")
        lane = "; ".join(l for l in err.splitlines() if l.startswith(("lane F o", "buckets o", "buckets  w", "general path")))
        c1 = compare(out_e, out_r)
        c2 = compare(out_r, out_e)
        ok = pe.returncode == 0 and sb == 0 and allok and c1[0] and c2[0]
        allok &= ok
        lines.append(f"  {name}: rc={pe.returncode} stdout={sb}B {'MATCH both ways' if ok else 'DIFFER'} | {lane}")
        if not ok:
            lines.append(c1[1]); lines.append(c2[1])
        if ok:
            shutil.rmtree(out_e, ignore_errors=True)
    if allok:
        shutil.rmtree(out_r, ignore_errors=True); shutil.rmtree(data, ignore_errors=True)
    return f"{label} seed={seed} E={ev} C={ck} {window} {'MATCH' if allok else 'DIFFER'}\n" + "\n".join(lines)
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
