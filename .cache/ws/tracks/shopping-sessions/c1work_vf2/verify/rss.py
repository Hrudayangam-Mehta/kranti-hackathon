import os, subprocess, sys, time
t = time.perf_counter()
p = subprocess.Popen(sys.argv[1:])
_, status, ru = os.wait4(p.pid, 0)
print(f"rc={os.waitstatus_to_exitcode(status)} wall={time.perf_counter()-t:.1f}s user={ru.ru_utime:.1f}s maxrss={ru.ru_maxrss/1024:.0f}MB", file=sys.stderr)
