#!/bin/sh
# usage: sbx.sh MODE  (MODE: full | nomap). Joins private cgroups (cpu quota 1 CPU, 512M mem+swap, 128 pids),
# then: new mount+net namespace, everything read-only, 64M tmpfs on /tmp, uid/gid 65534, no caps, env cleared.
C=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/compl
for c in cpu memory pids; do echo $$ > /sys/fs/cgroup/$c/compl1/cgroup.procs; done
export RT=$C/rt ENVS="$(cat $C/envs.txt)" HOMEVAL="${HOMEVAL:-}" TRACE="${TRACE:-}" EXTRA="${EXTRA:-}"
exec unshare -m -n --propagation private sh -c '
  mount --bind "$RT" /media || exit 90
  mount -o remount,bind,ro /media || exit 91
  mount -t tmpfs -o size=64m,mode=1777 tmpfs /tmp || exit 92
  for m in $(awk "{print \$2}" /proc/self/mounts | sort -u); do
    case "$m" in /proc*|/sys*|/dev*|/tmp) ;; *) mount -o remount,bind,ro "$m" 2>/dev/null ;; esac
  done
  cd /media/bot || exit 93
  H=""; [ -n "$HOMEVAL" ] && H="HOME=$HOMEVAL"
  if [ -n "$TRACE" ]; then
    exec strace -f -qq -o "$TRACE" -e trace=%file,%desc,%process,%network -e signal=none setpriv --reuid 65534 --regid 65534 --clear-groups --inh-caps=-all --bounding-set=-all env -i PATH=/usr/local/bin:/usr/bin:/bin $H $ENVS $EXTRA /media/bin/bun /media/bot/bot.js
  fi
  exec setpriv --reuid 65534 --regid 65534 --clear-groups --inh-caps=-all --bounding-set=-all env -i PATH=/usr/local/bin:/usr/bin:/bin $H $ENVS $EXTRA /media/bin/bun /media/bot/bot.js
'
