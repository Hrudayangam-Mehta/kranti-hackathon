#!/usr/bin/env python3
"""memprobe.py BIN DATA OUT NCPU [LANE]: run like eng.sh (cores 0,1) and sample /proc/PID/status every 20 ms:
peak RssAnon, peak RssFile, peak VmRSS (MB)."""
import os, shutil, subprocess, sys, time
b, data, out, ncpu = sys.argv[1:5]
lane = sys.argv[5] if len(sys.argv) > 5 else ""
shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
env = {"DATA_DIR": data, "OUTPUT_DIR": out, "NCPU": ncpu, "MEM_GB": "24"}
if lane:
    env["SESSIONS_LANE"] = lane
peak = {"RssAnon": 0, "RssFile": 0, "VmRSS": 0}
t = time.perf_counter()
p = subprocess.Popen(["taskset", "-c", "0,1", b], env=env, stdout=subprocess.DEVNULL, stderr=open(out + ".stderr", "wb"))
while p.poll() is None:
    try:
        for line in open(f"/proc/{p.pid}/status"):
            k = line.split(":")[0]
            if k in peak:
                peak[k] = max(peak[k], int(line.split()[1]))
    except OSError:
        pass
    time.sleep(0.02)
print(f"rc={p.returncode} wall={time.perf_counter()-t:.1f}s peak RssAnon={peak['RssAnon']//1024}MB RssFile={peak['RssFile']//1024}MB VmRSS={peak['VmRSS']//1024}MB")
