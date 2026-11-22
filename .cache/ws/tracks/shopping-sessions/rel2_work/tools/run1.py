import os, sys, time, shutil, threading
binp, data, out, ncpu, cpus = sys.argv[1:6]
shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
env = {"DATA_DIR": data, "OUTPUT_DIR": out, "SCRATCH_DIR": out + ".s", "HOME": out + ".s", "NCPU": ncpu, "MEM_GB": "24", "PATH": "/usr/bin:/bin"}
os.makedirs(out + ".s", exist_ok=True)
cpuset = set()
for p in cpus.split(","):
    a, _, b = p.partition("-"); cpuset.update(range(int(a), int(b or a) + 1))
err = open(out + ".stderr", "wb")
saved = os.sched_getaffinity(0); os.sched_setaffinity(0, cpuset)
t0 = time.monotonic()
pid = os.posix_spawn(binp, [binp], env, file_actions=[(os.POSIX_SPAWN_DUP2, err.fileno(), 2)])
os.sched_setaffinity(0, saved)
peak = {"hwm": 0, "anon": 0}
def watch():
    while True:
        try:
            for line in open(f"/proc/{pid}/status"):
                if line.startswith("VmHWM:"): peak["hwm"] = max(peak["hwm"], int(line.split()[1]))
                if line.startswith("RssAnon:"): peak["anon"] = max(peak["anon"], int(line.split()[1]))
        except Exception:
            return
        time.sleep(0.05)
th = threading.Thread(target=watch, daemon=True); th.start()
_, status, ru = os.wait4(pid, 0)
wall = time.monotonic() - t0
print(f"exit {status >> 8} wall {wall:.3f} s user {ru.ru_utime:.2f} sys {ru.ru_stime:.2f} maxrss {ru.ru_maxrss/1048576:.2f} GB VmHWM {peak['hwm']/1048576:.2f} GB RssAnon-peak {peak['anon']/1048576:.2f} GB minflt {ru.ru_minflt}")
