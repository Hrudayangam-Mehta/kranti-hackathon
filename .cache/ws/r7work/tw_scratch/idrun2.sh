#!/bin/bash
# checkpoint 08 identity batch 2, fuse disabled on both sides (fuseMs 1e9: logic identity; the machine load is ~30)
T=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work/tw_scratch; W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work
TOP='"fuseMs":1e9' TAG=ck08 LIB=$W/ckpt_08_TW/lib SELS="DEF KS KB KSF" $T/idbatch8.sh
TOP='"fuseMs":1e9' TAG=ck07f LIB=$W/ckpt_07_LG/lib SELS="DEF KS KB KSF" $T/idbatch8.sh
TOP='"fuseMs":1e9' TAG=n538_07 LIB=$T/v538_07/bot/lib SELS="FILE" $T/idbatch8.sh
TOP='"fuseMs":1e9' TAG=n538_08 LIB=$T/v538_08/bot/lib SELS="FILE" $T/idbatch8.sh
echo IDRUN2_DONE
