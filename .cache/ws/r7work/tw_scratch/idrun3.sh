#!/bin/bash
# checkpoint 08 identity, fuse disabled on both sides (fuseMs 1e9 = logic identity; machine load ~30 trips the 30 ms fuse).
# ck08 under DEF KS KB KSF vs r7work/id/ck07 (DEF KS KB, recorded 22:32 with 0 fuse trips) and vs a fresh ck07f (KSF);
# the 5.38 SELECT: variants6/FNV_s1 tree (copy) vs ckpt_08 + mkvar + patch_lc with the same SELECT, salt 1
T=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work/tw_scratch; W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work
TOP='"fuseMs":1e9' TAG=ck08 LIB=$W/ckpt_08_TW/lib SELS="DEF KS KB KSF" $T/idbatch8.sh
TOP='"fuseMs":1e9' TAG=n538_07 LIB=$T/v538_07/bot/lib SELS="FILE" $T/idbatch8.sh
TOP='"fuseMs":1e9' TAG=n538_08 LIB=$T/v538_08/bot/lib SELS="FILE" $T/idbatch8.sh
TOP='"fuseMs":1e9' TAG=ck07f LIB=$W/ckpt_07_LG/lib SELS="KSF" $T/idbatch8.sh
echo IDRUN3_DONE
