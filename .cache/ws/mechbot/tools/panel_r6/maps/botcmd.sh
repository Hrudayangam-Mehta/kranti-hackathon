#!/bin/sh
# usage: botcmd.sh <bot.js> [v3dir]   engine limits of the Dockerfile; with a second argument the hello is rewritten to v3/
P=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot
export BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 \
  BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 \
  BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1
if [ -n "$2" ]; then python3 -I -u $P/tools/panel_r6/maps/hello_v3.py "$2" | exec $P/bun "$1"; else exec $P/bun "$1"; fi
