#!/bin/sh
# uid1000.sh DATA OUT [NCPU] [PROC=1|0] [SCRATCH=1|0] [LANE]: run the built binary in an empty
# chroot like the scratch image: /data a read-only bind of DATA, /output a bind of OUT (owned
# by 1000), /tmp 1777, user 1000:1000, env -i with DATA_DIR/OUTPUT_DIR/NCPU only.
set -e
V=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/c1work_vf1
DATA=$1; OUT=$2; N=${3:-2}; PROC=${4:-1}; SCR=${5:-0}; LANE=${6:-}
R=$(mktemp -d -p $V/tmp rootfs.XXXX)
mkdir -p $R/tmp $R/data $R/output $R/scratch $R/proc
chmod 1777 $R/tmp; chmod 755 $R
cp $V/bin/sessions $R/sessions
rm -rf "$OUT"; mkdir -p "$OUT"; chown 1000:1000 "$OUT"
EXTRA=""
[ "$SCR" = 1 ] && EXTRA="SCRATCH_DIR=/tmp"
[ -n "$LANE" ] && EXTRA="$EXTRA SESSIONS_LANE=$LANE"
unshare -m sh -c "
  mount --make-rprivate /
  mount --bind '$DATA' '$R/data'
  mount -o remount,bind,ro '$R/data'
  mount --bind '$OUT' '$R/output'
  [ '$PROC' = 1 ] && mount -t proc proc '$R/proc'
  env -i DATA_DIR=/data OUTPUT_DIR=/output NCPU=$N $EXTRA /usr/bin/taskset -c 0,1 /usr/sbin/chroot --userspec=1000:1000 '$R' /sessions > '$OUT.stdout' 2> '$OUT.stderr'
  echo \$? > '$OUT.rc'
  touch '$R/data/probe_write' 2>/dev/null && echo DATA_WRITABLE >> '$OUT.rc' || true
"
rm -rf "$R"
echo "rc=$(cat $OUT.rc | tr '\n' ' ') stdout_bytes=$(wc -c < $OUT.stdout) owner=$(stat -c %u:%g $OUT/user_daily 2>/dev/null)"
