#!/usr/bin/env python3
"""runrss.py BIN DATA OUT NCPU [LANE]: run BIN like eng.sh (env -i, cores 0,1), report rc, stdout bytes, wall/user/sys/maxrss."""
import os, shutil, subprocess, sys, time
b, data, out, ncpu = sys.argv[1:5]
lane = sys.argv[5] if len(sys.argv) > 5 else ""
shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
env = {"DATA_DIR": data, "OUTPUT_DIR": out, "NCPU": ncpu, "MEM_GB": "24", "HOME": out + ".home", "SCRATCH_DIR": out + ".home"}
os.makedirs(out + ".home", exist_ok=True)
if lane:
    env["SESSIONS_LANE"] = lane
t = time.perf_counter()
with open(out + ".stdout", "wb") as so, open(out + ".stderr", "wb") as se:
    p = subprocess.Popen(["taskset", "-c", "0,1", b], env=env, stdout=so, stderr=se)
    _, status, ru = os.wait4(p.pid, 0)
dt = time.perf_counter() - t
shutil.rmtree(out + ".home", ignore_errors=True)
print(f"rc={os.waitstatus_to_exitcode(status)} stdout={os.path.getsize(out + '.stdout')}B wall={dt:.2f}s user={ru.ru_utime:.2f}s sys={ru.ru_stime:.2f}s maxrss={ru.ru_maxrss/1024:.0f}MB")
