import os, sys, subprocess, time, resource, shutil
T = sys.argv[1]; binp = sys.argv[2]; out = sys.argv[3]; ncpu = sys.argv[4]; data = sys.argv[5]
shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
env = {"DATA_DIR": data, "OUTPUT_DIR": out, "SCRATCH_DIR": os.path.dirname(out) + "/scr", "HOME": os.path.dirname(out) + "/scr", "NCPU": ncpu, "MEM_GB": "24"}
r0 = resource.getrusage(resource.RUSAGE_CHILDREN); t0 = time.time()
p = subprocess.run([binp], env=env, stdout=subprocess.PIPE, stderr=open(out + ".err", "w"))
t1 = time.time(); r1 = resource.getrusage(resource.RUSAGE_CHILDREN)
st = [l.strip() for l in open(out + ".err") if l.split()[:1] and l.split()[0] in ("parse", "pass", "people", "dedup", "write", "links")]
print(f"rc={p.returncode} out={len(p.stdout)} wall={t1-t0:.2f} user={r1.ru_utime-r0.ru_utime:.2f} sys={r1.ru_stime-r0.ru_stime:.2f} | " + " ; ".join(" ".join(s.split()[:4]) for s in st), flush=True)
shutil.rmtree(out, ignore_errors=True)
