#!/bin/sh
# join the 1-CPU quota group (same CFS quota as "docker run --cpus 1"), then run the command
echo $$ > /sys/fs/cgroup/cpu/mechtest/cgroup.procs
exec "$@"
