#!/bin/bash
# check2b timing on core ${CORE:-0}; engine settings = bot/Dockerfile (useConcurrentJIT ${CJIT:-1})
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=${CJIT:-1} BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/tools/check2a/streams
cd /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/tools/check2b
for rep in 1 2; do
for spec in "kit squad" "kit auto" "$S/ffa_s1.jsonl.gz squad" "$S/ffa_s1.jsonl.gz auto" "$S/ffa_s2.jsonl.gz auto" "$S/ffa_s3.jsonl.gz auto" "$S/ffa_s3.jsonl.gz squad" "$S/ffa_s4.jsonl.gz ffa" "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/tools/release_gate/long4800.jsonl.gz squad"; do
  env $JSC taskset -c ${CORE:-0} /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/bun timing.js $spec
done
done
