#!/bin/bash
V=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work/tw_scratch/vfy
L8=$V/v538_08/bot/lib; LI=$V/v538_ideal/lib
sq() { echo '{"fuseMs":1e9,"sqOverrides":'"$1"'}'; }
cd $V
TAG=lt0  LIB=$L8 OVR="$(sq '{"ffaLatchT":0}')" ./idb.sh
TAG=ld1  LIB=$L8 OVR="$(sq '{"ffaLatchDeaths":1}')" ./idb.sh
TAG=bh08 LIB=$L8 OVR="$(sq '{"bandHi":115}')" ./idb.sh
TAG=bhid LIB=$LI OVR="$(sq '{"bandHi":115}')" ./idb.sh
TAG=zl08 LIB=$L8 OVR="$(sq '{"zoneLateFrac":0.9}')" ./idb.sh
TAG=zlid LIB=$LI OVR="$(sq '{"zoneLateFrac":0.9}')" ./idb.sh
TAG=ffak LIB=$L8 OVR="$(sq "$(cat $V/ffak.json)")" ./idb.sh
TAG=eqb  LIB=$L8 OVR="$(sq "$(cat $V/eqb.json)")" ./idb.sh
TAG=wb08 LIB=$L8 OVR="$(sq "$(cat $V/broad.json)")" ./idb.sh
TAG=wbid LIB=$LI OVR="$(sq "$(cat $V/broad.json)")" ./idb.sh
TAG=gc   LIB=$L8 OVR="$(sq '{"gunlessClue":true}')" ./idb.sh
TAG=bc   LIB=$L8 OVR="$(sq '{"beamClue":true}')" ./idb.sh
TAG=id0  LIB=$LI OVR='{"fuseMs":1e9}' ./idb.sh
echo CHAIN1_DONE
