#!/usr/bin/env python3
"""idc.py A_DIR B_DIR [prefixA prefixB]: compare recording hashes by source name; with --lines count differing lines."""
import json,glob,os,sys
a,b=sys.argv[1],sys.argv[2]; lines='--lines' in sys.argv
same=diff=miss=0; dl=tl=0; names=[]
for f in sorted(glob.glob(a+'/*.meta.json')):
    n=os.path.basename(f)
    g=os.path.join(b,n)
    if not os.path.exists(g): miss+=1; continue
    x=json.load(open(f)); y=json.load(open(g))
    if x['hash']==y['hash'] and x['n']==y['n']: same+=1
    else:
        diff+=1; names.append(n[:-10])
    if lines:
        fa=f[:-10]+'.jsonl'; fb=g[:-10]+'.jsonl'
        if os.path.exists(fa) and os.path.exists(fb):
            la=open(fa).read().split('\n'); lb=open(fb).read().split('\n')
            tl+=max(len(la),len(lb))-1; dl+=sum(1 for i in range(min(len(la),len(lb))) if la[i]!=lb[i])+abs(len(la)-len(lb))
print('same %d diff %d missing %d'%(same,diff,miss), ('changed lines %d of %d'%(dl,tl)) if lines else '', ' '.join(names))
