#!/bin/bash
# re-roll controls for reading the sim kill deltas: the 5.38 tree at salt 2 and salt 3 (plain overrides), 24 seeds each
T=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work/tw_scratch; LIB=$T/v538_08/bot/lib
until grep -q SIMRUN12_DONE $T/logs/simrun12.log && grep -q SIMRUN12R_DONE $T/logs/simrun12r.log; do sleep 10; done
TAG=salt2 LIB=$LIB TOP='"fuseMs":1e9,"salt":2' $T/simtw.sh
TAG=salt3 LIB=$LIB TOP='"fuseMs":1e9,"salt":3' $T/simtw.sh
echo SIMCTL_DONE
