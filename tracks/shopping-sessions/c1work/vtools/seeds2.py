import os, shutil, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor
V = os.path.dirname(os.path.abspath(__file__))
T = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions'
R = f'{T}/verify'
GEN = f"{T}/kit/build/generator/target/release/generate"
PY = f"{T}/kit/venv/bin/python"
SCRIPTS = f"{T}/kit/unz/starter-duckdb/scripts"
CONFIGS = [("d", {"NCPU": "2"}), ("bb8", {"NCPU": "3", "SESSIONS_TEST_BUCKET_BITS": "8"}), ("g", {"NCPU": "2", "SESSIONS_LANE": "G"})]
def compare(a, b):
    p = subprocess.run([PY, "-B", f"{SCRIPTS}/compare.py", a, b], capture_output=True, text=True, cwd=SCRIPTS)
    return p.returncode == 0 and p.stdout.strip().endswith("MATCH"), p.stdout + p.stderr
def job(spec, core):
    label, seed, ev, ck = spec.split(":")
    data = f"{V}/data/{label}"
    out_r = f"{V}/runs/{label}_ref"
    for d in (data, out_r):
        shutil.rmtree(d, ignore_errors=True)
    subprocess.run(["taskset", "-c", str(core), GEN, "--seed", seed, "--events", ev, "--clicks", ck, "--output", data, "--threads", "1"], check=True, capture_output=True)
    t0 = time.time()
    pr = subprocess.run(["taskset", "-c", str(core), PY, "-B", f"{R}/ref.py", data, out_r], capture_output=True, text=True)
    tr = time.time() - t0
    window = open(f"{data}/manifest.json").read().replace("\n", "").replace(" ", "")
    lines = []
    allok = pr.returncode == 0
    for name, extra in CONFIGS:
        out_e = f"{V}/runs/{label}_{name}"
        shutil.rmtree(out_e, ignore_errors=True); os.makedirs(out_e)
        env = dict(os.environ); env.update(extra)
        pe = subprocess.run([f"{V}/eng2.sh", data, out_e], capture_output=True, text=True, env=env)
        err = open(out_e + ".err").read()
        lane = "; ".join(l for l in err.splitlines() if l.startswith(("lane F o", "buckets o", "buckets  w")))
        ok = pe.returncode == 0 and pe.stdout == "" and allok and compare(out_e, out_r)[0] and compare(out_r, out_e)[0]
        allok &= ok
        lines.append(f"  {name}: {'MATCH' if ok else 'DIFFER'} | {lane}")
        if ok:
            shutil.rmtree(out_e, ignore_errors=True)
    if allok:
        shutil.rmtree(out_r, ignore_errors=True); shutil.rmtree(data, ignore_errors=True)
    return f"{label} seed={seed} E={ev} C={ck} {window} ref={tr:.1f}s {'MATCH' if allok else 'DIFFER'}\n" + "\n".join(lines)
def main():
    specs = sys.argv[1:]
    os.makedirs(f"{V}/runs", exist_ok=True)
    with ThreadPoolExecutor(max_workers=2) as ex:
        futs = [ex.submit(job, s, i % 2) for i, s in enumerate(specs)]
        with open(f"{V}/runs/seeds2.log", "a") as log:
            for f in futs:
                r = f.result()
                print(r, flush=True)
                log.write(r + "\n")
if __name__ == "__main__":
    main()
