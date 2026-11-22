import os, sys, subprocess, time
out = sys.argv[1]; cmd = sys.argv[2:]
t = time.perf_counter()
with open(out + ".stdout", "w") as so, open(out + ".err", "w") as er:
    p = subprocess.Popen(cmd, stdout=so, stderr=er)
    _, st, ru = os.wait4(p.pid, 0)
dt = time.perf_counter() - t
open(out + ".time", "w").write(f"wall {dt:.3f} user {ru.ru_utime:.3f} sys {ru.ru_stime:.3f} maxrss {ru.ru_maxrss/1e6:.2f}GB")
sys.exit(os.waitstatus_to_exitcode(st))
