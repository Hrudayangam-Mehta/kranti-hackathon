import os, random, re, shutil, subprocess, sys
T = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions'
V = os.path.dirname(os.path.abspath(__file__))
GEN = f"{T}/kit/build/generator/target/release/generate"
PY = f"{T}/kit/venv/bin/python"
SCRIPTS = f"{T}/kit/unz/starter-duckdb/scripts"
MASK = (1 << 40) - 1
M1, M2 = 0x9E3779B97F4B, 0xD6E8FEB86659
IM1, IM2 = pow(M1, -1, 1 << 40), pow(M2, -1, 1 << 40)
DIG = "0123456789abcdefghijklmnopqrstuvwxyz"
def mix(v):
    M = (1 << 64) - 1
    v = ((v ^ (v >> 30)) * 0xBF58476D1CE4E5B9) & M
    v = ((v ^ (v >> 27)) * 0x94D049BB133111EB) & M
    return v ^ (v >> 31)
def keys(seed):
    M = (1 << 64) - 1
    state = mix(mix(seed ^ 0x5D588B656C078965) ^ mix(1) ^ 0)
    d = []
    for _ in range(8):
        state = (state + 0x9E3779B97F4A7C15) & M
        d.append(mix(state))
    return d[5] & MASK, d[6] & MASK
def scramble(v, key):
    m = ((v & MASK) * M1 ^ key) & MASK
    m ^= m >> 17
    return (m * M2) & MASK
def unscramble(x, key):
    z = (x * IM2) & MASK
    y = z ^ (z >> 17) ^ (z >> 34)
    return ((y ^ key) * IM1) & MASK
def b36(x):
    s = ""
    while True:
        s = DIG[x % 36] + s
        x //= 36
        if x == 0:
            return s
CANON = re.compile(r"^e[1-9a-z][0-9a-z]{0,7}$|^e0$")
def compare(a, b):
    p = subprocess.run([PY, "-B", f"{SCRIPTS}/compare.py", a, b], capture_output=True, text=True, cwd=SCRIPTS)
    return p.returncode == 0 and p.stdout.strip().endswith("MATCH")
def build(seed, ev, ck, data):
    shutil.rmtree(data, ignore_errors=True)
    subprocess.run(["taskset", "-c", "0,1", GEN, "--seed", str(seed), "--events", str(ev), "--clicks", str(ck), "--output", data, "--threads", "1"], check=True, capture_output=True)
    ukey, ekey = keys(seed)
    rnd = random.Random(seed)
    lines = open(f"{data}/products.csv").read().splitlines()
    out = [lines[0]] + [l.split(",")[0] + f",cat{rnd.randrange(40):02d}" for l in lines[1:]]
    open(f"{data}/products.csv", "w").write("\n".join(out) + "\n")
    changed = 0
    for name in os.listdir(f"{data}/events"):
        path = f"{data}/events/{name}"
        body = open(path, "rb").read().decode()
        rows = body.split("\n")
        for i in range(1, len(rows)):
            row = rows[i]
            if not row:
                continue
            first, sep, rest = row.partition(",")
            q = first.startswith('"') and first.endswith('"') and len(first) >= 2
            v = first[1:-1] if q else first
            if not CANON.match(v):
                continue
            x = int(v[1:], 36)
            if x > MASK:
                continue
            n = unscramble(x, ekey)
            n2 = (n & ~63) | (63 - (n & 63))
            nv = "e" + b36(scramble(n2, ekey))
            rows[i] = (f'"{nv}"' if q else nv) + sep + rest
            changed += 1
        open(path, "wb").write("\n".join(rows).encode())
    return ukey, ekey, changed
if __name__ == "__main__":
    seed, ev, ck = int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3])
    data = f"{V}/data/var{seed}"
    ukey, ekey, changed = build(seed, ev, ck, data)
    out_r = f"{V}/runs/var{seed}_ref"
    os.makedirs(f"{V}/runs", exist_ok=True)
    shutil.rmtree(out_r, ignore_errors=True)
    pr = subprocess.run(["taskset", "-c", "0,1", PY, "-B", f"{T}/verify/ref.py", data, out_r], capture_output=True, text=True)
    print(f"var{seed} E={ev} C={ck} keys u={ukey:#x} e={ekey:#x} event IDs renumbered {changed} ref rc={pr.returncode}", flush=True)
    configs = [("auto", {}), ("forced", {"SESSIONS_TEST_EVENT_KEY": hex(ekey)}), ("forced_bb7", {"SESSIONS_TEST_EVENT_KEY": hex(ekey), "SESSIONS_TEST_BUCKET_BITS": "7", "NCPU": "3"}), ("forced_n8", {"SESSIONS_TEST_EVENT_KEY": hex(ekey), "NCPU": "8"}), ("laneG", {"SESSIONS_LANE": "G"})]
    for name, extra in configs:
        out_e = f"{V}/runs/var{seed}_{name}"
        shutil.rmtree(out_e, ignore_errors=True); os.makedirs(out_e)
        env = dict(os.environ); env.update(extra)
        pe = subprocess.run([f"{T}/c1work/vtools/eng2.sh", data, out_e], capture_output=True, text=True, env=env)
        err = open(out_e + ".err").read()
        lane = " | ".join(l for l in err.splitlines() if l.startswith(("lane F o", "buckets o", "multi", "buckets  w")))
        ok = pr.returncode == 0 and pe.returncode == 0 and pe.stdout == "" and compare(out_e, out_r) and compare(out_r, out_e)
        print(f"  {name}: {'MATCH' if ok else 'DIFFER'} | {lane}", flush=True)
