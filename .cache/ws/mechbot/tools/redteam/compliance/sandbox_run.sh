#!/bin/bash
# Match-sandbox emulation without a Docker daemon (red-team compliance check).
#   1 CPU as a CFS quota (cpu cgroup mechtest), 512 MB memory cgroup, 128 pids cgroup, no network (new net ns),
#   read-only root, writable 64 MB tmpfs at /tmp, map read-only at /arena, uid:gid 65534:65534 without capabilities,
#   environment = only what the image and our Dockerfile set.
# Variables: SBX_ARENA (map folder to mount at /arena, "none" = leave /arena empty), SBX_HOME ("unset" or a path),
#   SBX_TCACHE (value of BUN_RUNTIME_TRANSPILER_CACHE_PATH, "unset" to leave it out), SBX_JSC ("dockerfile" or "none"),
#   SBX_BOT (path inside the root, default /bot/bot.js), SBX_STRACE (file: trace file-system and network syscalls),
#   SBX_MEM (bytes, default 536870912), SBX_PIDS (default 128), SBX_CPU (cpu cgroup dir, default mechtest),
#   SBX_CGFS (1 = cgroup files visible inside, as in Docker; 0 = hidden)
#   SBX_TAG (name of the memory / pids child groups, default mechsbx)
set -eu
C="$(cd "$(dirname "$0")" && pwd)"; P="$(cd "$C/../../.." && pwd)"; R="$C/rootfs"
ARENA="${SBX_ARENA:-$P/kit/arena}"; TAG="${SBX_TAG:-mechsbx}"
CPU="/sys/fs/cgroup/cpu/${SBX_CPU:-mechtest}"
MEM="/sys/fs/cgroup/memory$(grep ':memory:' /proc/self/cgroup | cut -d: -f3 | sed "s#/$TAG\$##")/$TAG"
PID="/sys/fs/cgroup/pids$(grep ':pids:' /proc/self/cgroup | cut -d: -f3 | sed "s#/$TAG\$##")/$TAG"
mkdir -p "$MEM" "$PID"
echo "${SBX_MEM:-536870912}" > "$MEM/memory.limit_in_bytes"
echo "${SBX_MEM:-536870912}" > "$MEM/memory.memsw.limit_in_bytes" 2>/dev/null || true
echo "${SBX_PIDS:-128}" > "$PID/pids.max"
echo $$ > "$CPU/cgroup.procs"; echo $$ > "$MEM/cgroup.procs"; echo $$ > "$PID/cgroup.procs"
JSC=""
if [ "${SBX_JSC:-dockerfile}" = dockerfile ]; then JSC=$(grep -oE "BUN_JSC_[A-Za-z]+=[0-9]+" "$R/bot/Dockerfile" | tr '\n' ' '); fi
ENVV="PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin HOSTNAME=sbx BUN_INSTALL_BIN=/usr/local/bin $JSC"
[ "${SBX_HOME:-/nonexistent}" = unset ] || ENVV="$ENVV HOME=${SBX_HOME:-/nonexistent}"
[ "${SBX_TCACHE:-0}" = unset ] || ENVV="$ENVV BUN_RUNTIME_TRANSPILER_CACHE_PATH=${SBX_TCACHE:-0}"
export SBX_CGFS="${SBX_CGFS:-1}"
export R ARENA ENVV SBX_BOT="${SBX_BOT:-/bot/bot.js}" SBX_STRACE="${SBX_STRACE:-}"
exec unshare -n -m -- bash -c '
  set -e
  mount --make-rprivate /
  mount --bind "$R" "$R"
  mount -t tmpfs -o rw,noexec,nosuid,nodev,size=64m,mode=1777 tmpfs "$R/tmp"
  if [ "$ARENA" != none ]; then mount --bind "$ARENA" "$R/arena"; mount -o remount,ro,bind "$R/arena"; fi
  mount -t proc proc "$R/proc"
  if [ "${SBX_CGFS:-1}" = 1 ]; then mount --rbind /sys/fs/cgroup "$R/sys/fs/cgroup"; mount -o remount,ro,bind "$R/sys/fs/cgroup" 2>/dev/null || true; fi
  for d in null zero urandom random; do mount --bind /dev/$d "$R/dev/$d"; done
  mount -o remount,ro,bind "$R"
  if [ -n "$SBX_STRACE" ]; then
    exec env -i $ENVV strace -f -qq -o "$SBX_STRACE" -e trace=openat,open,creat,mkdir,mkdirat,unlink,unlinkat,rename,renameat,renameat2,socket,connect,bind,symlink,symlinkat,link,linkat,chmod,fchmodat,truncate,ftruncate,memfd_create,clone,clone3 \
      unshare -R "$R" -w /bot -S 65534 -G 65534 /usr/local/bin/bun "$SBX_BOT" "$@"
  fi
  exec env -i $ENVV unshare -R "$R" -w /bot -S 65534 -G 65534 /usr/local/bin/bun "$SBX_BOT" "$@"
' sbx "$@"
