#!/bin/bash
# checkpoint 08 identity batch 1: ck08 / fresh ck07 under DEF KS KB KSF, 5.38 trees (FILE select), fuse re-records
T=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work/tw_scratch; W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work
TAG=ck08 LIB=$W/ckpt_08_TW/lib SELS="DEF KS KB KSF" $T/idbatch8.sh
TAG=ck07f LIB=$W/ckpt_07_LG/lib SELS="DEF KS KB KSF" $T/idbatch8.sh
TAG=n538_07 LIB=$T/v538_07/bot/lib SELS="FILE" $T/idbatch8.sh
TAG=n538_08 LIB=$T/v538_08/bot/lib SELS="FILE" $T/idbatch8.sh
for t in ck08:$W/ckpt_08_TW/lib ck07f:$W/ckpt_07_LG/lib n538_07:$T/v538_07/bot/lib n538_08:$T/v538_08/bot/lib; do TAG=${t%%:*} LIB=${t#*:} $T/refuse8.sh; done
echo IDRUN1_DONE
