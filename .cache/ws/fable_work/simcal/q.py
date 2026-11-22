import sys, concurrent.futures as cf, drv
# args: items "ptag:path" ; seeds via env
import os
s0=int(os.environ.get('S0','1')); n=int(os.environ.get('N','48'))
items=[a.split(':') for a in sys.argv[1:]]
for pt,p in items: drv.vdir(p)
with cf.ThreadPoolExecutor(3) as ex:
    for r in ex.map(lambda it: drv.job(it[1],it[0],s0,n), items): print(*r,flush=True)
