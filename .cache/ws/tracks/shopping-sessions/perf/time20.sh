#!/bin/sh
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
B=${BIN:-$S/perf/bin/sessions}
D=${DATA:-$S/m1data/p20m}
R=$S/perf/root20; rm -rf $R/output
RUN_NCPU=${NCPU:-2} python3 $S/m1tools/timed_run.py $B $D $R ${RUNS:-3}
