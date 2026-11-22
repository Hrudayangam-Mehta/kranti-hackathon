import os, subprocess, sys, time, shutil
S = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions"
IO = S + "/panel_s/io"
PY = S + "/kit/venv/bin/python"
K = S + "/kit/unz/starter-duckdb"
G = IO + "/gate60b"
os.makedirs(G, exist_ok=True)
for b in ["io1", "rel16"]:
    out = f"{G}/{b}"
    shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
    env = dict(DATA_DIR=S + "/m1data/p60m", OUTPUT_DIR=out, NCPU="4")
    t = time.perf_counter()
    with open(f"{G}/{b}.err", "w") as err, open(f"{G}/{b}.stdout", "w") as so:
        p = subprocess.Popen(["taskset", "-c", "0,1", f"{IO}/bin/{b}"], env=env, stdout=so, stderr=err)
        _, status, ru = os.wait4(p.pid, 0)
    dt = time.perf_counter() - t
    print(f"60M {b} exit {status} stdout {os.path.getsize(f'{G}/{b}.stdout')} wall {dt:.2f} user {ru.ru_utime:.2f} sys {ru.ru_stime:.2f} maxrss {ru.ru_maxrss/1e6:.2f} GB minflt {ru.ru_minflt}", flush=True)
for a, c in [("io1", "rel16"), ("rel16", "io1")]:
    r = subprocess.run([PY, "-B", f"{K}/scripts/compare.py", f"{G}/{a}", f"{G}/{c}"], capture_output=True, text=True)
    print(f"60M {a} vs {c}: {r.stdout.strip().splitlines()[-1] if r.stdout.strip() else r.stderr[-300:]}", flush=True)
for line in open(f"{G}/io1.err"):
    if line.startswith(("surviving", "sessions ")):
        print("io1:", line.strip())
shutil.rmtree(f"{G}/io1", ignore_errors=True); shutil.rmtree(f"{G}/rel16", ignore_errors=True)
