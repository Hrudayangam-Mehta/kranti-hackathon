import os, random, shutil, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
T = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions'
sys.path.insert(0, f"{T}/verify")
import fuzz
V = os.path.dirname(os.path.abspath(__file__))
GEN = f"{T}/kit/build/generator/target/release/generate"
PY = f"{T}/kit/venv/bin/python"
SCRIPTS = f"{T}/kit/unz/starter-duckdb/scripts"
def compare(a, b):
    p = subprocess.run([PY, "-B", f"{SCRIPTS}/compare.py", a, b], capture_output=True, text=True, cwd=SCRIPTS)
    return p.returncode == 0 and p.stdout.strip().endswith("MATCH")
def write_split(folder, header, lines, rnd):
    shutil.rmtree(folder, ignore_errors=True)
    os.makedirs(folder)
    rnd.shuffle(lines)
    k = rnd.randrange(24, 65)
    cuts = sorted(rnd.sample(range(len(lines) + 1), min(k - 1, len(lines) + 1))) if lines else []
    parts, prev = [], 0
    for c in cuts + [len(lines)]:
        parts.append(lines[prev:c]); prev = c
    for i, part in enumerate(parts):
        body = header + b"\n" + b"\n".join(part)
        if part and rnd.random() < 0.7:
            body += b"\n"
        with open(f"{folder}/part-{i:03d}.csv", "wb") as fh:
            fh.write(body)
    with open(f"{folder}/empty-{rnd.randrange(99)}.csv", "wb") as fh:
        fh.write(rnd.choice([b"", header, header + b"\n"]))
def one(rnd_seed):
    rnd = random.Random(rnd_seed)
    seed = 5000 + rnd_seed
    ev = rnd.choice([20000, 60000, 150000])
    ck = rnd.choice([ev // 4, ev, ev * 2])
    data = f"{V}/data/fz{rnd_seed}"
    shutil.rmtree(data, ignore_errors=True)
    subprocess.run(["taskset", "-c", "0,1", GEN, "--seed", str(seed), "--events", str(ev), "--clicks", str(ck), "--output", data, "--threads", "1"], check=True, capture_output=True)
    E, C, L = fuzz.mutate(data, rnd)
    write_split(f"{data}/events", b"event_id,user_id,ts,ingest_ts,event_type,product_id,price_cents", E, rnd)
    write_split(f"{data}/clicks", b"click_id,user_id,campaign_id,ts", C, rnd)
    write_split(f"{data}/links", b"user_id_a,user_id_b", L, rnd)
    out_r = f"{V}/runs/fz{rnd_seed}_ref"
    shutil.rmtree(out_r, ignore_errors=True)
    pr = subprocess.run(["taskset", "-c", "0,1", PY, "-B", f"{T}/verify/ref.py", data, out_r], capture_output=True, text=True)
    ncpu = str(rnd.choice([1, 2, 3, 4, 5, 6, 7, 8]))
    res = []
    allok = pr.returncode == 0
    for name, extra in (("d", {"NCPU": ncpu}), ("bb7", {"NCPU": "2", "SESSIONS_TEST_BUCKET_BITS": "7"}), ("g", {"NCPU": "2", "SESSIONS_LANE": "G"})):
        out_e = f"{V}/runs/fz{rnd_seed}_{name}"
        shutil.rmtree(out_e, ignore_errors=True); os.makedirs(out_e)
        env = dict(os.environ); env.update(extra)
        pe = subprocess.run([f"{V}/eng2.sh", data, out_e], capture_output=True, text=True, env=env)
        err = open(out_e + ".err").read()
        f2 = "F2 on" if "buckets on" in err else ("F1 only" if "lane F on" in err else "G only")
        ok = allok and pe.returncode == 0 and pe.stdout == "" and compare(out_e, out_r) and compare(out_r, out_e)
        allok &= ok
        res.append(f"{name}:{'MATCH' if ok else 'DIFFER'}({f2})")
        if ok:
            shutil.rmtree(out_e, ignore_errors=True)
    if allok:
        shutil.rmtree(out_r, ignore_errors=True); shutil.rmtree(data, ignore_errors=True)
    return f"fz{rnd_seed} gen_seed={seed} E={ev} C={ck} NCPU={ncpu} {'MATCH' if allok else 'DIFFER'} " + " ".join(res)
if __name__ == "__main__":
    a, b = int(sys.argv[1]), int(sys.argv[2])
    with ThreadPoolExecutor(max_workers=2) as ex, open(f"{V}/runs/fuzzf2.log", "a") as log:
        for r in ex.map(one, range(a, b)):
            print(r, flush=True); log.write(r + "\n")
