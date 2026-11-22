import os, resource, shutil, subprocess, sys, time
binary, data, root, runs = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
ncpu = os.environ.get("RUN_NCPU", "2")
for d in ("data",):
    link = os.path.join(root, d)
    if os.path.islink(link): os.unlink(link)
os.makedirs(root, exist_ok=True)
os.symlink(data, os.path.join(root, "data"))
times = []
for i in range(runs):
    out = os.path.join(root, "output"); scratch = os.path.join(root, "scratch")
    shutil.rmtree(out, ignore_errors=True); os.makedirs(out); os.makedirs(scratch, exist_ok=True)
    env = {"DATA_DIR": os.path.join(root, "data"), "OUTPUT_DIR": out, "SCRATCH_DIR": scratch, "HOME": scratch, "NCPU": ncpu, "MEM_GB": "24"}
    t = time.perf_counter()
    p = subprocess.run(["taskset", "-c", "2,3", binary], env=env, stderr=subprocess.PIPE, text=True)
    dt = time.perf_counter() - t
    times.append(dt)
    if i == runs - 1 or p.returncode != 0:
        sys.stderr.write(p.stderr)
    print(f"run {i+1}: exit {p.returncode}, wall {dt:.3f} s")
rss = resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss
times.sort()
print(f"median {times[len(times)//2]:.3f} s, min {times[0]:.3f} s, max child RSS {rss/1024:.0f} MB (NCPU={ncpu}, taskset 2,3)")
