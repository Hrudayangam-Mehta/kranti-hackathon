import os, sys, shutil, subprocess, glob
sys.argv = [sys.argv[0], sys.argv[1]] + sys.argv[2:]
S = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions"
V = S + "/v5c_verify"
sys.path.insert(0, V + "/tools")
import craft
PY = craft.PY
BIN = sys.argv[1]
mode = sys.argv[2] if len(sys.argv) > 2 else "big_old"
d, nu, nev, nck, ties = craft.build("vc_big_repro", 18, b"u", b"e", b"k", mode)
print("built", d, nu, nev, nck, ties, flush=True)
out_r = V + "/vruns/vc_big_repro_ref"
shutil.rmtree(out_r, ignore_errors=True)
pr = subprocess.run([PY, "-B", S + "/verify/ref.py", d, out_r], capture_output=True, text=True)
print("ref rc", pr.returncode, pr.stderr.strip()[-600:], flush=True)
import polars as pl
def load(folder, table):
    files = sorted(f for f in glob.glob(f"{folder}/{table}/*.parquet") if not os.path.basename(f).startswith((".", "_")))
    df = pl.concat([pl.read_parquet(f) for f in files], how="vertical_relaxed")
    return df.sort(sorted(df.columns))
ref = {t: load(out_r, t) for t in ("user_daily", "campaign_daily")}
trials = [("1", {}), ("2", {}), ("3", {}), ("3", {}), ("3", {}), ("4", {}), ("8", {}), ("3", {"SESSIONS_SCALAR": "1"}), ("3", {"SESSIONS_PATH": "slow"}), ("6", {}), ("5", {})]
for ncpu, extra in trials:
    out_e = V + "/vruns/vc_big_repro_eng"
    shutil.rmtree(out_e, ignore_errors=True); os.makedirs(out_e)
    env = {"DATA_DIR": d, "OUTPUT_DIR": out_e, "NCPU": ncpu, **extra}
    pe = subprocess.run(["nice", "-n", "10", "taskset", "-c", "2,3", BIN], env=env, capture_output=True, text=True)
    status = []
    for t in ("user_daily", "campaign_daily"):
        e = load(out_e, t)
        r = ref[t]
        if e.shape == r.shape and e.equals(r, null_equal=True):
            status.append(f"{t}=same")
        else:
            cols = list(r.columns)
            only_e = e.join(r, on=cols, how="anti", nulls_equal=True)
            only_r = r.join(e, on=cols, how="anti", nulls_equal=True)
            status.append(f"{t}=DIFF only_eng={only_e.rows()} only_ref={only_r.rows()}")
    print(f"NCPU={ncpu} {extra} rc={pe.returncode} {' '.join(status)}", flush=True)
