#!/bin/bash
# after batch 3: ckpt_08 KSF with a SQUAD-only override (keepTargetHpf 0.35) on all 28 sources, to show on real streams that
# forced-FFA streams stay byte-identical to no override while SQUAD streams change
T=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work/tw_scratch; W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work
until grep -q IDRUN3_DONE $T/logs/idrun3.log; do sleep 5; done
TOP='"fuseMs":1e9,"sqOverrides":{"keepTargetHpf":0.35}' TAG=ck08ov LIB=$W/ckpt_08_TW/lib SELS="KSF" $T/idbatch8.sh
echo IDRUN4_DONE
