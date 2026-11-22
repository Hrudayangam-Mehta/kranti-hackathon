#!/usr/bin/env python3
import os, shutil, statistics, subprocess, sys, time, json

S = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions"
IO = S + "/panel_s/io"
runs = int(sys.argv[1])
specs = sys.argv[2:]
data = os.environ.get("DATA", S + "/m1data/p20m")
ncpu = os.environ.get("NCPU", "4")
cores = os.environ.get("CORES", "0,1")
cold = os.environ.get("COLD", "")
out = os.environ.get("OUT", IO + "/run/ab_out")
keys = ["thp_fault_alloc", "thp_fault_fallback", "pgfault", "pgmajfault", "pgalloc_normal", "pgfree", "pgpgin", "thp_split_pmd", "compact_stall"]


def vmstat():
    d = {}
    for line in open("/proc/vmstat"):
        k, v = line.split()
        if k in keys:
            d[k] = int(v)
    return d


def evict(path):
    for root, _, files in os.walk(path):
        for f in files:
            fd = os.open(os.path.join(root, f), os.O_RDONLY)
            try:
                os.posix_fadvise(fd, 0, 0, os.POSIX_FADV_DONTNEED)
            finally:
                os.close(fd)


def quiet(limit=float(os.environ.get("QUIET", "1000")), patience=float(os.environ.get("PATIENCE", "60"))):
    t0 = time.time()
    while time.time() - t0 < patience:
        some = open("/proc/pressure/cpu").readline().split()
        avg10 = float(some[1].split("=")[1])
        if avg10 < limit:
            return avg10
        time.sleep(1)
    return -1


res = {s: [] for s in specs}
for r in range(runs):
    order = specs if r % 2 == 0 else list(reversed(specs))
    for spec in order:
        psi = quiet()
        b, _, extra = spec.partition(":")
        env = dict(DATA_DIR=data, OUTPUT_DIR=out, NCPU=ncpu)
        for kv in filter(None, extra.split(",")):
            k, v = kv.split("=")
            env[k] = v
        shutil.rmtree(out, ignore_errors=True)
        os.makedirs(out)
        if cold:
            evict(data)
        v0 = vmstat()
        t = time.perf_counter()
        p = subprocess.Popen(["taskset", "-c", cores, b if "/" in b else IO + "/bin/" + b], env=env, stderr=subprocess.PIPE, stdout=subprocess.PIPE)
        errb = p.stderr.read()
        outb = p.stdout.read()
        _, status, ru = os.wait4(p.pid, 0)
        dt = time.perf_counter() - t
        v1 = vmstat()
        if status or outb:
            print("FAIL", spec, status, len(outb))
            sys.stdout.write(errb.decode(errors="replace"))
            sys.exit(1)
        last = 0.0
        for line in errb.decode(errors="replace").splitlines():
            parts = line.split()
            if len(parts) == 3 and parts[2] == "ms" and parts[0] in ("write", "people"):
                last = max(last, float(parts[1]) / 1e3)
        res[spec].append(dict(wall=dt, user=ru.ru_utime, sys=ru.ru_stime, cpu=ru.ru_utime + ru.ru_stime, minflt=ru.ru_minflt, majflt=ru.ru_majflt, rss=ru.ru_maxrss / 1e6, nvcsw=ru.ru_nvcsw, nivcsw=ru.ru_nivcsw, tail=dt - last, psi=psi, **{k: v1.get(k, 0) - v0.get(k, 0) for k in keys}))
        if os.environ.get("SHOWERR"):
            sys.stdout.write(errb.decode(errors="replace"))

med = lambda xs: statistics.median(xs)
for spec in specs:
    rs = res[spec]
    f = lambda k: med([x[k] for x in rs])
    print(f"{spec[-40:]:40s} wall {f('wall'):.3f} (min {min(x['wall'] for x in rs):.3f}) cpu {f('cpu'):.3f} (min {min(x['cpu'] for x in rs):.3f}) user {f('user'):.3f} sys {f('sys'):.3f} minflt {f('minflt'):.0f} rss {f('rss'):.2f}G thp {f('thp_fault_alloc'):.0f} pgalloc {f('pgalloc_normal'):.0f} tail {f('tail')*1e3:.0f}ms csw {f('nvcsw'):.0f}/{f('nivcsw'):.0f} psi {f('psi'):.0f}")
    print("   walls " + " ".join(f"{x['wall']:.2f}" for x in rs) + " | cpus " + " ".join(f"{x['cpu']:.2f}" for x in rs) + " | sys " + " ".join(f"{x['sys']:.2f}" for x in rs))
if os.environ.get("JSON"):
    json.dump(res, open(os.environ["JSON"], "w"))
