#!/usr/bin/env python3
"""Large sets: run a reference configuration (default rel15) and other configurations one at a
time (cores 0,1, env like the scorer: DATA_DIR OUTPUT_DIR SCRATCH_DIR HOME NCPU MEM_GB only,
plus the named switches), with rc, stdout bytes, wall, user, sys and peak RSS; compare each with
the reference both ways with the kit compare.py.
Usage: bigcmp.py LABEL DATA REF_SPEC SPEC ...   SPEC = tag:bin:ncpu[:K=V,K=V]
Appends to runs/bigcmp.log; keeps the reference output in runs/big_LABEL_ref unless DROPREF=1."""
import os
import re
import shutil
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import vrun2  # noqa: E402


def run(binary, data, out, ncpu, extra):
    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(out)
    home = out + ".home"
    os.makedirs(home, exist_ok=True)
    env = {"DATA_DIR": data, "OUTPUT_DIR": out, "NCPU": str(ncpu), "MEM_GB": "24", "HOME": home, "SCRATCH_DIR": home}
    env.update(extra)
    t = time.perf_counter()
    with open(out + ".stdout", "wb") as so, open(out + ".stderr", "wb") as se:
        p = subprocess.Popen(["taskset", "-c", "0,1", vrun2.BINS.get(binary, binary)], env=env, stdout=so, stderr=se)
        _, status, ru = os.wait4(p.pid, 0)
    dt = time.perf_counter() - t
    shutil.rmtree(home, ignore_errors=True)
    err = open(out + ".stderr").read()
    return (os.waitstatus_to_exitcode(status), os.path.getsize(out + ".stdout"), dt, ru.ru_utime, ru.ru_stime,
            ru.ru_maxrss / 1024, err)


def compare_cli(a, b):
    p = subprocess.run([vrun2.PY, "-B", f"{vrun2.SCRIPTS}/compare.py", a, b], capture_output=True, text=True,
                       cwd=vrun2.SCRIPTS)
    return p.returncode == 0 and p.stdout.strip().endswith("MATCH"), p.stdout


def parse_spec(spec):
    parts = spec.split(":")
    tag, binary, ncpu = parts[0], parts[1], int(parts[2])
    extra = {}
    if len(parts) > 3 and parts[3]:
        for kv in parts[3].split(","):
            k, v = kv.split("=")
            extra[k] = v
    return tag, binary, ncpu, extra


def main():
    label, data, ref_spec = sys.argv[1:4]
    specs = sys.argv[4:]
    log = open(f"{vrun2.RUNS}/bigcmp.log", "a")
    rtag, rbin, rn, rextra = parse_spec(ref_spec)
    ref_out = f"{vrun2.RUNS}/big_{label}_ref"
    if os.path.isdir(ref_out) and os.path.exists(ref_out + ".done"):
        line = f"[{label}] reference {ref_spec}: reused {ref_out}"
    else:
        rc, so, dt, u, s, rss, err = run(rbin, data, ref_out, rn, rextra)
        open(ref_out + ".done", "w").write("ok")
        line = f"[{label}] reference {ref_spec}: rc={rc} stdout={so}B wall={dt:.1f}s user={u:.1f}s sys={s:.1f}s maxrss={rss:.0f}MB"
    print(line, flush=True)
    log.write(line + "\n")
    for spec in specs:
        tag, binary, ncpu, extra = parse_spec(spec)
        out = f"{vrun2.RUNS}/big_{label}_{tag}"
        rc, so, dt, u, s, rss, err = run(binary, data, out, ncpu, extra)
        a, ta = compare_cli(out, ref_out)
        b, tb = compare_cli(ref_out, out)
        st = "MATCH" if (a and b and rc == 0 and so == 0) else "DIFFER"
        rows = re.findall(r"user_daily: rows (\d+)", ta)
        line = (f"[{label}] {spec}: {st} rc={rc} stdout={so}B wall={dt:.1f}s user={u:.1f}s sys={s:.1f}s "
                f"maxrss={rss:.0f}MB user_daily_rows={rows[0] if rows else '?'} | {vrun2.info(err)}")
        print(line, flush=True)
        log.write(line + "\n")
        if st != "MATCH":
            log.write(ta + tb + "\n")
            print(ta + tb, flush=True)
        else:
            shutil.rmtree(out, ignore_errors=True)
        log.flush()
    if os.environ.get("DROPREF") == "1":
        shutil.rmtree(ref_out, ignore_errors=True)


if __name__ == "__main__":
    main()
