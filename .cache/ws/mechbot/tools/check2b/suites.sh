#!/bin/bash
# check2b: the suites on core 0, Dockerfile engine settings irrelevant here (plain bun)
P=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot
O=$P/tools/check2b/out
cd $P/tools
for t in test_brain test_world test_counters; do
  s=$(date +%s); taskset -c 0 $P/bun $P/tools/$t.js > $O/$t.txt 2>&1; echo "$t rc=$? $(( $(date +%s)-s ))s $(tail -1 $O/$t.txt)"
done
s=$(date +%s); TB_SELECT='{}' taskset -c 0 $P/bun $P/tools/test_brain.js > $O/test_brain_plain.txt 2>&1; echo "test_brain_plain rc=$? $(( $(date +%s)-s ))s $(tail -1 $O/test_brain_plain.txt)"
s=$(date +%s); taskset -c 0 $P/bun $P/tools/test_requests.js > $O/test_requests_live.txt 2>&1; echo "test_requests(live copy) rc=$? $(( $(date +%s)-s ))s $(tail -1 $O/test_requests_live.txt)"
