import json
import os
import re
import shutil
import subprocess
import sys
import threading
import time

M = os.path.dirname(os.path.abspath(__file__))
PY = os.path.join(M, "..", "..", "kit", "venv", "bin", "python")
VMKEYS = ("pgfault", "pgmajfault", "thp_fault_alloc", "thp_fault_fallback", "pgpgin", "pgpgout", "pgfree", "pgalloc_normal", "pswpin")
LAP = re.compile(r"^(setup|parse|dedup|people|write|read|links|events|clicks|sessions|total)\s+([0-9.]+) ms\s*$")


def vmstat():
    out = {}
    with open("/proc/vmstat") as f:
        for line in f:
            k, v = line.split()
            if k in VMKEYS:
                out[k] = int(v)
    return out


def psi():
    with open("/proc/pressure/cpu") as f:
        return float(f.readline().split()[1].split("=")[1])


def cache(cmd, data):
    r = subprocess.run([PY, "-B", os.path.join(M, "cache.py"), cmd, data], capture_output=True, text=True, check=True)
    return r.stdout.strip()


def one(label, binary, ncpu, mode, data, cores, extra_env):
    out = os.path.join(M, "out", label.replace("/", "_") + f"_n{ncpu}_{mode}")
    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(out)
    if mode == "cold":
        state = cache("evict", data)
    else:
        state = cache("warm", data)
    pres = psi()
    env = dict(DATA_DIR=data, OUTPUT_DIR=out, NCPU=str(ncpu), PATH="/usr/bin:/bin")
    env.update(extra_env)
    v0 = vmstat()
    lines = []
    t0 = time.perf_counter()
    p = subprocess.Popen(["taskset", "-c", cores, binary], env=env, stderr=subprocess.PIPE, stdout=subprocess.PIPE)

    def reader():
        for raw in p.stderr:
            lines.append((time.perf_counter() - t0, raw.decode(errors="replace").rstrip("\n")))

    th = threading.Thread(target=reader)
    th.start()
    _, status, ru = os.wait4(p.pid, 0)
    wall = time.perf_counter() - t0
    th.join()
    stdout = p.stdout.read()
    v1 = vmstat()
    laps = {}
    for _, text in lines:
        m = LAP.match(text)
        if m and m.group(1) not in laps:
            laps[m.group(1)] = float(m.group(2))
    links = None
    busy = None
    for _, text in lines:
        m = re.match(r"^links\s+([0-9.]+) ms on one thread", text)
        if m:
            links = float(m.group(1))
        m = re.match(r"^thread 0 parse busy\s+([0-9.]+) ms", text)
        if m:
            busy = float(m.group(1))
    outbytes = 0
    for d, _, names in os.walk(out):
        for n in names:
            outbytes += os.path.getsize(os.path.join(d, n))
    rec = dict(
        label=label,
        ncpu=ncpu,
        mode=mode,
        cache_state=state,
        psi=pres,
        status=status,
        wall=round(wall, 4),
        user=round(ru.ru_utime, 4),
        sys=round(ru.ru_stime, 4),
        maxrss_mb=round(ru.ru_maxrss / 1024, 1),
        minflt=ru.ru_minflt,
        majflt=ru.ru_majflt,
        inblock=ru.ru_inblock,
        oublock=ru.ru_oublock,
        nvcsw=ru.ru_nvcsw,
        nivcsw=ru.ru_nivcsw,
        vm={k: v1.get(k, 0) - v0.get(k, 0) for k in VMKEYS},
        laps=laps,
        links_ms=links,
        t0busy_ms=busy,
        first_line_s=round(lines[0][0], 4) if lines else None,
        last_line_s=round(lines[-1][0], 4) if lines else None,
        stdout_bytes=len(stdout),
        out_bytes=outbytes,
        stderr=[t for _, t in lines],
    )
    return rec


def main():
    spec = json.loads(sys.argv[1])
    res_path = os.path.join(M, spec.get("results", "results.jsonl"))
    rounds = spec.get("rounds", 1)
    for r in range(rounds):
        for item in spec["items"]:
            rec = one(item["label"], item["bin"], item["ncpu"], item["mode"], spec["data"], spec.get("cores", "0,1"), item.get("env", {}))
            rec["round"] = r
            rec["tag"] = spec.get("tag", "")
            with open(res_path, "a") as f:
                f.write(json.dumps(rec) + "\n")
            lp = rec["laps"]
            print(
                f"{rec['label']:10s} n{rec['ncpu']} {rec['mode']:4s} wall {rec['wall']:.3f} user {rec['user']:.3f} sys {rec['sys']:.3f} "
                f"rss {rec['maxrss_mb']:.0f}M minflt {rec['minflt']} majflt {rec['majflt']} inblk {rec['inblock']} "
                f"laps {' '.join(f'{k}={v:.0f}' for k, v in lp.items())} last {rec['last_line_s']} psi {rec['psi']:.0f} st {rec['status']}",
                flush=True,
            )


main()
