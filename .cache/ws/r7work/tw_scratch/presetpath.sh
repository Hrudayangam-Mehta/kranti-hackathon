#!/bin/bash
# the preset path (tw value k35 selected in the file) vs the plain sqOverrides path (c01) on seeds 1-4
T=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work/tw_scratch
until [ -f $T/id/c01/sq4.meta.json ] && [ -f $T/id/c01/sq3.meta.json ]; do sleep 5; done
TAG=k35preset LIB=$T/v538_k35/bot/lib TOP='"fuseMs":1e9' SEEDS="1 2 3 4" $T/simtw.sh
echo PRESETPATH_DONE
