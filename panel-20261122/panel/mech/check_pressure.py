from pathlib import Path
import subprocess, os, re, json, hashlib, datetime, time
root=Path(__file__).resolve().parents[2]
results=[]
for name in ['mech-pressure','mech-burst-hunter']:
    tree=root/'experiments'/name/'dist'
    env=os.environ.copy()
    env.update(dict(re.findall(r'(BUN_JSC_\w+)=(\d+)',(tree/'Dockerfile').read_text())))
    cmd=['python3',str(root/'handoff/.cache/ws/mechbot/kit/check/check.py'),'--map-dir',str(root/'handoff/.cache/ws/mechbot/kit/arena'),'--',str(root/'tools/bun/bun-linux-x64/bun'),str(tree/'bot.js')]
    start=time.monotonic()
    r=subprocess.run(cmd,env=env,capture_output=True,text=True,timeout=60,preexec_fn=lambda:os.sched_setaffinity(0,{0}))
    (root/'panel/mech'/f'{name}-initial-protocol.log').write_text(r.stdout+r.stderr)
    item={'candidate':name,'bundle_sha256':hashlib.sha256((tree/'bot.js').read_bytes()).hexdigest(),'exit':r.returncode,'wall_s':time.monotonic()-start,'output':r.stdout,'stderr':r.stderr}
    results.append(item)
    print(json.dumps({'candidate':name,'exit':r.returncode,'output':r.stdout}),flush=True)
    if r.returncode:break
(root/'panel/mech/pressure-initial-protocol-results.json').write_text(json.dumps({'finished_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'context':'Official checker, real kit map, Bun1.4.4 Dockerfile engine flags, CPU affinity0. Concurrent Shopping build/QA: timings are contaminated and establish conformance only. No Docker/cgroup enforcement or match ranking claim.','results':results},indent=2)+'\n')
