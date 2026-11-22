#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad; Q=$S/qa_meta2; V=$S/variants7
while [ ! -f $Q/lockstep_done.txt ]; do sleep 10; done
# wait until the shared 1-CPU group is empty (another session's gate contended the earlier runs)
for i in $(seq 1 60); do [ "$(cat /sys/fs/cgroup/cpu/mechtest/cgroup.procs 2>/dev/null | wc -l)" = 0 ] && break; sleep 10; done
uptime > $Q/gate/third_load.txt
GATE_WAIVE=H9-method-exposure GATE_SRC=$V/MT_A/bot $S/mechbot/tools/release_gate.sh $V/MT_A/dist > $Q/gate/MT_A_rerun2.txt 2>&1
uptime >> $Q/gate/third_load.txt; echo done > $Q/gate/third_done.txt
