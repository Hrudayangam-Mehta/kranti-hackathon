#!/bin/sh
# join the 512 MB memory group mechmem (made by hand), then run the command
echo $$ > /sys/fs/cgroup/memory/mechmem/cgroup.procs
exec "$@"
