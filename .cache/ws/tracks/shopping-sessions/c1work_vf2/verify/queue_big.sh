#!/bin/sh
while pgrep -f vseeds2.py > /dev/null; do sleep 15; done
cd /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/c1work_vf2/verify
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/kit/venv/bin/python -B bigcmp.py p20 /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/m1data/p20m rel15:rel15:2 f2n2:f2:2 f2n8:f2:8 f2G:f2:2:SESSIONS_LANE=G f2off:f2:2:SESSIONS_F2=0 f2b6:f2:2:SESSIONS_TEST_BUCKET_BITS=6 f2b9:f2:3:SESSIONS_TEST_BUCKET_BITS=9 f2scalar:f2:2:SESSIONS_SCALAR=1 f1n2:f1:2 > /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/c1work_vf2/runs/big_p20.out 2>&1
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/kit/venv/bin/python -B bigcmp.py p60 /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/m1data/p60m rel15:rel15:2 f2n2:f2:2 f2n8:f2:8 f1n2:f1:2 > /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/c1work_vf2/runs/big_p60.out 2>&1
rm -rf /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/c1work_vf2/runs/big_p60_ref
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/kit/venv/bin/python -B -c "
import vrun2
vrun2.gen(4545, 3000000, 600000, vrun2.V + '/data/whale45', gen_bin=vrun2.V + '/genvar_whale45/target/release/generate')
ok, txt, _ = vrun2.check(vrun2.V + '/data/whale45', 'whale45', [('f2n2','f2',2,{}), ('f2n8','f2',8,{}), ('f2G','f2',2,{'SESSIONS_LANE':'G'}), ('f2off','f2',2,{'SESSIONS_F2':'0'}), ('f2b9','f2',3,{'SESSIONS_TEST_BUCKET_BITS':'9'}), ('f1n2','f1',2,{}), ('rel15','rel15',2,{})])
print(txt)
" > /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/c1work_vf2/runs/whale45.out 2>&1
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/kit/venv/bin/python -B -c "
import vrun2
vrun2.gen(1515, 12000000, 2000000, vrun2.V + '/data/whales15', gen_bin=vrun2.V + '/genvar_whales15/target/release/generate')
" > /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/c1work_vf2/runs/whales15_gen.out 2>&1
DROPREF=1 /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/kit/venv/bin/python -B bigcmp.py whales15 /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/c1work_vf2/data/whales15 rel15:rel15:2 f2n2:f2:2 f2n8:f2:8 f2G:f2:2:SESSIONS_LANE=G f2off:f2:2:SESSIONS_F2=0 f1n2:f1:2 > /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/c1work_vf2/runs/big_whales15.out 2>&1
echo done > /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/c1work_vf2/runs/big.done
