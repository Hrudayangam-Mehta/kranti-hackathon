import os, shutil, subprocess, sys
T = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions'
PY = f"{T}/kit/venv/bin/python"
SCRIPTS = f"{T}/kit/unz/starter-duckdb/scripts"
data = os.environ.get("MDATA", f"{T}/kit/data/dev")
ans = os.environ.get("MANS", f"{T}/kit/unz/dev-answer")
outroot = f"{T}/c1work/run/f2m"
os.makedirs(outroot, exist_ok=True)
def cmp(a, b):
    p = subprocess.run([PY, "-B", f"{SCRIPTS}/compare.py", a, b], capture_output=True, text=True, cwd=SCRIPTS)
    return p.returncode == 0 and p.stdout.strip().endswith("MATCH")
ok_all = True
for spec in sys.argv[1:]:
    label, _, envs = spec.partition(":")
    env = dict(os.environ)
    for kv in filter(None, envs.split(",")):
        k, v = kv.split("=", 1); env[k] = v
    out = f"{outroot}/{label}"
    shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
    p = subprocess.run([f"{T}/c1work/vtools/eng2.sh", data, out], env=env, capture_output=True, text=True)
    err = open(out + ".err").read()
    lane = [l for l in err.splitlines() if l.startswith(("lane F", "buckets", "multi"))]
    good = p.returncode == 0 and p.stdout == "" and cmp(out, ans) and cmp(ans, out)
    ok_all &= good
    print(f"{label:16s} {'MATCH' if good else 'FAIL'} rc={p.returncode} | {' | '.join(lane)}", flush=True)
print("ALL MATCH" if ok_all else "SOME FAILED")
