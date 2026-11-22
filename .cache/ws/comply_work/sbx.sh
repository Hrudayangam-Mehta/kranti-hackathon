#!/bin/bash
# Run the bundle the way the match container runs it, without Docker:
#   new mount + network namespace (no network), a fresh read-only root built from the host's /usr,
#   bun at /usr/local/bin/bun (as in oven/bun), the bundle read-only at /bot (WORKDIR, cwd),
#   the map read-only at /arena (or no /arena at all), a 64 MB tmpfs at /tmp, uid/gid 65534 with no
#   capabilities, no supplementary groups, HOME unset, the image's PATH and env plus the given VAR=value.
# usage: sbx.sh <rootdir (empty dir)> <dist dir> <arena dir|none> <bun binary> [VAR=value ...]
# env SBX_STRACE=<log file>: run under strace -f (file, write and network syscalls).
set -euo pipefail
INNER=$(cat <<'INNER'
set -euo pipefail
R=$1; DIST=$2; ARENA=$3; BUN=$4; shift 4
mount -t tmpfs -o size=2m,mode=755 sbxroot "$R"
cd "$R"
mkdir -p usr etc proc sys dev tmp arena bot
ln -s usr/bin bin; ln -s usr/sbin sbin; ln -s usr/lib lib; ln -s usr/lib64 lib64
mount --rbind /usr usr; mount -o remount,bind,ro usr
mount --rbind /etc etc; mount -o remount,bind,ro etc
mount --rbind /dev dev
mount --rbind /proc proc
mount --rbind /sys sys; mount -o remount,bind,ro sys
mount -t tmpfs -o size=64m,mode=1777 sbxtmp tmp
if [ "$ARENA" != none ]; then mount --bind "$ARENA" arena; mount -o remount,bind,ro arena; else rmdir arena; fi
mount --bind "$DIST" bot; mount -o remount,bind,ro bot
mount -t tmpfs -o size=1m,mode=755 sbxbin usr/local/bin
touch usr/local/bin/bun; mount --bind "$BUN" usr/local/bin/bun; mount -o remount,bind,ro usr/local/bin/bun
mount -o remount,ro usr/local/bin
mount -o remount,ro "$R"
ENVS=(PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/bun-node-fallback-bin
      BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 BUN_INSTALL_BIN=/usr/local/bin "$@")
RUN=(chroot "$R" /usr/bin/setpriv --reuid=65534 --regid=65534 --clear-groups --inh-caps=-all --bounding-set=-all
     /usr/bin/env -i -C /bot "${ENVS[@]}" bun /bot/bot.js)
if [ -n "${SBX_STRACE:-}" ]; then
  exec strace -f -qq -o "$SBX_STRACE" -e trace=%file,%network,memfd_create,ftruncate -e signal=none "${RUN[@]}"
fi
exec "${RUN[@]}"
INNER
)
exec unshare --mount --net --propagation private /bin/bash -c "$INNER" sbx "$@"
