#!/usr/bin/env python3
# driver: run variants x seeds under a house-param table, 3 parallel, rerun fuse-tripped matches
import json, os, subprocess, sys, shutil, concurrent.futures as cf
S='/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad'
W=S+'/fable_work/simcal'; BUN=S+'/mechbot/bun'
ENV=dict(os.environ, BUN_JSC_useConcurrentGC='0', BUN_JSC_numberOfGCMarkers='1', BUN_JSC_numberOfBaselineCompilerThreads='1', BUN_JSC_numberOfDFGCompilerThreads='1', BUN_JSC_numberOfFTLCompilerThreads='1')
def vdir(path):
    name=path.replace('/','__'); d=f'{W}/v/{name}'
    if not os.path.exists(d):
        os.makedirs(d); os.symlink(f'{S}/{path}/bot', d+'/bot')
        for k in ('kit','notes','replay','tools'): os.symlink(f'{S}/mechbot/{k}', f'{d}/{k}')
        shutil.copytree(W+'/sim', d+'/sim')
    return name, d
def run1(d, ptag, seed, n, out):
    cmd=['nice','-n','19',BUN,'sim/run.js','--bot','ours','--mode','squad','--matches',str(n),'--seed',str(seed),'--jobs','1','--json',out]
    if ptag!='default': cmd+=['--params',f'{W}/params/{ptag}.json']
    subprocess.run(cmd,cwd=d,env=ENV,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    return json.load(open(out))['matches']
def bad(m): return (m.get('fuse') or 0)>0 or m.get('errors',0)>0 or m.get('fallback') or (m.get('fuse') is None and m.get('maxMs',0)>30)
def job(path, ptag, s0, n):
    name,d=vdir(path); od=f'{W}/out/{ptag}'; os.makedirs(od,exist_ok=True); fin=f'{od}/{name}.json'
    have={}
    if os.path.exists(fin): have={m['seed']:m for m in json.load(open(fin))}
    need=[s for s in range(s0,s0+n) if s not in have]
    if need:
        lo,hi=min(need),max(need)
        for m in run1(d,ptag,lo,hi-lo+1,f'{od}/{name}.tmp.json'): have[m['seed']]=m
    nre=0
    for s in sorted(have):
        k=0
        while bad(have[s]) and k<4:
            have[s]=run1(d,ptag,s,1,f'{od}/{name}.tmp.json')[0]; k+=1; nre+=1
    json.dump([have[s] for s in sorted(have)],open(fin,'w'))
    still=sum(bad(m) for m in have.values())
    return name,len(have),nre,still
if __name__=='__main__':
    ptag=sys.argv[1]; s0=int(sys.argv[2]); n=int(sys.argv[3]); paths=sys.argv[4:]
    for p in paths: vdir(p)
    with cf.ThreadPoolExecutor(3) as ex:
        for r in ex.map(lambda p: job(p,ptag,s0,n), paths): print(ptag,*r,flush=True)
