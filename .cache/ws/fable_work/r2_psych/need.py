import json,glob
S='/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/'
hb={int(json.load(open(f))['a1']):json.load(open(f))['hash'] for f in glob.glob(S+'r2_hackathon/sim/base/*.meta.json')}
h={int(json.load(open(f))['a1']):json.load(open(f))['hash'] for f in glob.glob(S+'r2_psych/sim/H10/*.meta.json')}
d=[s for s in sorted(h) if s<=24 and hb.get(s)!=h[s]]
print(' '.join(map(str,d+list(range(25,37)))))
