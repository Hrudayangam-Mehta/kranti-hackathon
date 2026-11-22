import json, glob
W='/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/req_work'
head=open(W+'/doc_head.md').read()
tests=[l.rstrip() for l in open(W+'/test_requests.txt') if l.startswith(('PASS','FAIL'))]
t='\n'.join('- '+l.replace('  ::  ',': ',1) for l in tests)
squad=open(W+'/summ_squad.txt').read().rstrip(); ffa=open(W+'/summ_ffa.txt').read().rstrip()
patch=open(W+'/requests_hooks.patch').read().rstrip()
recs=[json.loads(l) for f in glob.glob(W+'/sim2/*.jsonl') for l in open(f)]
nm=len(recs); mx=max(r['maxMs'] for r in recs); lates=sum(r['lates'] for r in recs); errs=sum(r['errors'] for r in recs)
ffaR=[r for r in recs if r['mode']=='ffa']; lat=sum(1 for r in ffaR if r['env']=='FFA')
body=open(W+'/doc_body.md').read()
for k,v in {'@TESTS@':t,'@SQUAD@':squad,'@FFA@':ffa,'@PATCH@':patch,'@NM@':str(nm),'@MX@':str(mx),'@LATES@':str(lates),'@ERRS@':str(errs),'@LATCH@':f'{lat}/{len(ffaR)}'}.items():
    body=body.replace(k,v)
open('/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/notes/owner_requests_patch.md','w').write(head+body)
print(nm, mx, lates, errs, lat, len(ffaR))
