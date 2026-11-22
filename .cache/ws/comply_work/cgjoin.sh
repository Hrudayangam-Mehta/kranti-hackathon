#!/bin/sh
# join the 512 MB (no swap) memory group and the 128-task pids group, then run the command
echo $$ > /sys/fs/cgroup/memory/comply/cgroup.procs
echo $$ > /sys/fs/cgroup/pids/comply/cgroup.procs
exec "$@"
