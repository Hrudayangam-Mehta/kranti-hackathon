#!/bin/sh
# join the 512 MB (no swap) memory group and the 128-task pids group made by release_gate.sh, then run the command
echo $$ > /sys/fs/cgroup/memory/mechgate/cgroup.procs
echo $$ > /sys/fs/cgroup/pids/mechgate/cgroup.procs
exec "$@"
