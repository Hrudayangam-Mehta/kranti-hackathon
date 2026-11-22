import json
import os
import re
import shutil
import subprocess
import sys
import time

V = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LAP = re.compile(r"^(setup|parse|dedup|people|write)\s+([0-9.]+) ms\s*$")
VMKEYS = ("pgmajfault", "pgpgin", "pgfault")


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


def resident(data):
    r = subprocess.run([sys.executable, "-B", os.path.join(V, "tools", "cache.py"), "resid", data], capture_output=True, text=True, check=True)
    return r.stdout.strip()


def evict(data):
    r = subprocess.run([sys.executable, "-B", os.path.join(V, "tools", "cache.py"), "evict", data], capture_output=True, text=True, check=True)
    return r.stdout.strip()


def warm(data):
    r = subprocess.run([sys.executable, "-B", os.path.join(V, "tools", "cache.py"), "warm", data], capture_output=True, text=True, check=True)
    return r.stdout.strip()


def main():
    spec = json.loads(open(sys.argv[1]).read())
    res = os.path.join(V, spec["results"])
    cores = spec.get("cores", "0,1")
    outroot = os.path.join(V, "run", "ab_" + spec.get("tag", "x"))
    os.makedirs(outroot, exist_ok=True)
    items = spec["items"]
    for rnd in range(spec.get("rounds", 1)):
        order = items if rnd % 2 == 0 else list(reversed(items))
        for it in order:
            out = os.path.join(outroot, "out")
            shutil.rmtree(out, ignore_errors=True)
            os.makedirs(out)
            mode = it.get("mode", "warm")
            data = it["data"]
            if mode == "cold":
                state = evict(data)
            elif mode == "warm":
                state = warm(data)
            else:
                state = resident(data)
            env = dict(PATH="/usr/bin:/bin", DATA_DIR=data, OUTPUT_DIR=out, SCRATCH_DIR=outroot, NCPU=str(it.get("ncpu", 2)), MEM_GB="24")
            env.update(it.get("env", {}))
            pres = psi()
            v0 = vmstat()
            t0 = time.perf_counter()
            p = subprocess.Popen(["taskset", "-c", cores, it["bin"]], env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            errb = p.stderr.read()
            outb = p.stdout.read()
            _, status, ru = os.wait4(p.pid, 0)
            wall = time.perf_counter() - t0
            v1 = vmstat()
            laps = {}
            text = errb.decode(errors="replace")
            for line in text.splitlines():
                m = LAP.match(line)
                if m and m.group(1) not in laps:
                    laps[m.group(1)] = float(m.group(2))
            rec = dict(label=it["label"], data=os.path.basename(data), mode=mode, ncpu=it.get("ncpu", 2), round=rnd, tag=spec.get("tag", ""),
                       cache=state, psi=pres, status=status, stdout=len(outb), wall=round(wall, 4), user=round(ru.ru_utime, 4), sys=round(ru.ru_stime, 4),
                       cpu=round(ru.ru_utime + ru.ru_stime, 4), maxrss_mb=round(ru.ru_maxrss / 1024, 1), minflt=ru.ru_minflt, majflt=ru.ru_majflt,
                       inblock_mb=round(ru.ru_inblock * 512 / 1e6, 1), vm={k: v1.get(k, 0) - v0.get(k, 0) for k in VMKEYS}, laps=laps,
                       lane=[l for l in text.splitlines() if "lane" in l or "buckets" in l or "exotic" in l])
            with open(res, "a") as f:
                f.write(json.dumps(rec) + "\n")
            print(f"r{rnd} {rec['label']:7s} {rec['data']:8s} {mode:4s} n{rec['ncpu']} wall {rec['wall']:7.3f} cpu {rec['cpu']:7.3f} (u {rec['user']:.2f} s {rec['sys']:.2f}) "
                  f"rss {rec['maxrss_mb']:.0f}M majflt {rec['majflt']} in {rec['inblock_mb']:.0f}MB laps {' '.join(f'{k}={v:.0f}' for k, v in laps.items())} psi {pres:.0f} st {status} [{state}]", flush=True)
            if status != 0 or outb:
                print("FAIL", it["label"], status, len(outb), text[-2000:], flush=True)


main()
