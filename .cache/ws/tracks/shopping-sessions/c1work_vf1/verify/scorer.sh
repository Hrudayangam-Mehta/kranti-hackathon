#!/bin/sh
# scorer.sh DATA OUT [NCPU] [LANE]: emulate the scoring container (starter README "Container limits"):
# empty static rootfs remounted read-only, /tmp a 64 MB tmpfs, /data read-only bind, /output and
# /scratch writable by uid 1000, /proc mounted, uid:gid 1000:1000, env exactly
# DATA_DIR=/data OUTPUT_DIR=/output SCRATCH_DIR=/scratch HOME=/scratch NCPU MEM_GB=24.
set -e
V=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/c1work_vf1
DATA=$1; OUT=$2; N=${3:-8}; LANE=${4:-}
BIN=${ENG_BIN:-$V/bin/sessions}
R=$(mktemp -d -p $V/tmp rootfs.XXXX); S=$(mktemp -d -p $V/tmp scratch.XXXX)
mkdir -p $R/tmp $R/data $R/output $R/scratch $R/proc
chmod 755 $R; cp $BIN $R/sessions; chown 1000:1000 $S
rm -rf "$OUT"; mkdir -p "$OUT"; chown 1000:1000 "$OUT"
EXTRA=""; [ -n "$LANE" ] && EXTRA="SESSIONS_LANE=$LANE"
unshare -m sh -c "
  mount --make-rprivate /
  mount --bind '$R' '$R'
  mount --bind '$DATA' '$R/data'
  mount -o remount,bind,ro '$R/data'
  mount --bind '$OUT' '$R/output'
  mount --bind '$S' '$R/scratch'
  mount -t tmpfs -o size=64m,mode=1777 tmpfs '$R/tmp'
  mount -t proc proc '$R/proc'
  mount -o remount,bind,ro '$R'
  touch '$R/probe' 2>/dev/null && echo ROOT_WRITABLE > '$OUT.notes' || echo root_ro > '$OUT.notes'
  touch '$R/data/probe' 2>/dev/null && echo DATA_WRITABLE >> '$OUT.notes' || echo data_ro >> '$OUT.notes'
  /usr/bin/env -i DATA_DIR=/data OUTPUT_DIR=/output SCRATCH_DIR=/scratch HOME=/scratch NCPU=$N MEM_GB=24 $EXTRA /usr/bin/taskset -c 0,1 /usr/sbin/chroot --userspec=1000:1000 '$R' /sessions > '$OUT.stdout' 2> '$OUT.stderr'
  echo \$? > '$OUT.rc'
  ls -A '$R/tmp' | wc -l > '$OUT.tmpcount'
"
rm -rf "$R" "$S"
echo "rc=$(cat $OUT.rc) stdout_bytes=$(wc -c < $OUT.stdout) $(cat $OUT.notes | tr '\n' ' ') tmp_files_left=$(cat $OUT.tmpcount) out_owner=$(stat -c %u:%g $OUT/user_daily 2>/dev/null)"
