#!/bin/bash
# Release gate: re-runs the automatable checks of notes/compliance_check.md against the submission folder
# ($P/dist, or the folder given as $1) and prints one PASS / FAIL line per check, then the verdict.
# Run it as root just before every push (it makes cgroups and mount/network namespaces). About 1-2 minutes.
#   GATE_CPU=3        core for the long runs (the official check runs unpinned under the 1-CPU quota, as in Docker)
#   GATE_WAIVE=a,b    check ids the owner has explicitly accepted: shown as FAIL[waived], not counted
#                     (H9-method-exposure stays checked; the owner approved a plain minified build, so
#                     GATE_WAIVE=H9-method-exposure is the accepted waiver for it)
#   GATE_SRC=$P/bot   readable source the folder must have been built from (byte-identical rebuild)
# Exit status 0 = GO, 1 = NO-GO. Logs: $P/runs/gate_<UTC time>/.
set -uo pipefail
P="$(cd "$(dirname "$0")/.." && pwd)"
G="$P/tools/release_gate"; KIT="$P/kit"; BUN="$P/bun"; WEB="$(cd "$P/../web" 2>/dev/null && pwd || echo "$P/../web")"
SRC="${GATE_SRC:-$P/bot}"; CPU="${GATE_CPU:-3}"; WAIVE=",${GATE_WAIVE:-},"
PY="python3 -I -B"
LOG="$P/runs/gate_$(date -u +%Y%m%dT%H%M%SZ)"; mkdir -p "$LOG"
nfail=0; nwaived=0; npass=0
line() {
  local st=$1 id=$2; shift 2
  if [ "$st" = FAIL ] && [[ "$WAIVE" == *",$id,"* ]]; then st="FAIL[waived]"; nwaived=$((nwaived + 1))
  elif [ "$st" = FAIL ]; then nfail=$((nfail + 1)); else npass=$((npass + 1)); fi
  printf '%-12s %-24s %s\n' "$st" "$id" "$*"
}
feed() { local st id msg; while read -r st id msg; do line "$st" "$id" "$msg"; done; }
ok() { if eval "$1"; then echo PASS; else echo FAIL; fi; }
jget() { $PY -c 'import json,sys
d=json.load(open(sys.argv[1]))
for k in sys.argv[2:]: print(d.get(k))' "$@" 2>/dev/null; }
DIST="$(cd "${1:-$P/dist}" 2>/dev/null && pwd)" || { line FAIL G0-folder "no folder ${1:-$P/dist}"; echo "VERDICT: NO-GO (1 FAIL)"; exit 1; }
echo "release gate $(date -u +%FT%TZ)  folder $DIST  logs $LOG"
(cd "$DIST" && sha256sum -- * 2>/dev/null) | sed 's/^/  /' | tee "$LOG/folder.sha256"

# ---------------------------------------------------------------- static: packaging and hygiene
feed < <($PY "$G/pack.py" "$DIST")
# REPO_HYGIENE.md word check: case-insensitive, word boundaries for the short word (\bosu\b), so identifiers such as
# "exposure" pass; team names are check H3 (hygiene.py)
OWNER_RX='fare.i|royale|mechfight|\bosu\b|ohio|campus|buildathon|builders|joinbuilders'
if [ -z "$(grep -rIinE "$OWNER_RX" "$DIST")" ]; then
  line PASS H2-owner-grep "REPO_HYGIENE.md grep prints nothing"
else
  line FAIL H2-owner-grep "REPO_HYGIENE.md grep prints: $(grep -rIoinE ".{0,18}($OWNER_RX).{0,8}" "$DIST" | sed "s|$DIST/||" | head -3 | tr '\n' ' ')"
fi
feed < <($PY "$G/hygiene.py" "$DIST" "$WEB" --schema "$KIT/mechfight.schema.json" | grep -v ' H2-forbidden-words ')
TAGV=$(grep -oE '^FROM +oven/bun:[0-9.]+' "$DIST/Dockerfile" 2>/dev/null | sed 's/.*://')
BUNV=$("$BUN" --version 2>/dev/null)
line "$(ok '[ -n "$TAGV" ] && [ "$TAGV" = "$BUNV" ]')" P10-bun-version "local bun $BUNV ($("$BUN" --revision 2>/dev/null)) vs image tag ${TAGV:-?}"
if [ -f "$SRC/bot.js" ] && "$BUN" build "$SRC/bot.js" --minify --target=bun --outfile "$LOG/fresh.js" >/dev/null 2>"$LOG/fresh.err" && cmp -s "$LOG/fresh.js" "$DIST/bot.js"; then
  line PASS P11-built-from-source "bot.js is byte-identical to a fresh bundle of $SRC"
else
  line FAIL P11-built-from-source "bot.js differs from a fresh bundle of $SRC (stale build, or the source changed): rerun tools/package.sh"
fi

# ---------------------------------------------------------------- runtime sandbox (approximation of the match container)
setup_ok=1
{ mkdir -p /sys/fs/cgroup/cpu/mechtest && echo 100000 > /sys/fs/cgroup/cpu/mechtest/cpu.cfs_period_us && echo 100000 > /sys/fs/cgroup/cpu/mechtest/cpu.cfs_quota_us \
  && mkdir -p /sys/fs/cgroup/memory/mechgate /sys/fs/cgroup/pids/mechgate \
  && echo 536870912 > /sys/fs/cgroup/memory/mechgate/memory.limit_in_bytes && echo 536870912 > /sys/fs/cgroup/memory/mechgate/memory.memsw.limit_in_bytes \
  && echo 128 > /sys/fs/cgroup/pids/mechgate/pids.max && mkdir -p "$G/root"; } 2>"$LOG/setup.err" || setup_ok=0
if [ $setup_ok = 1 ] && ! echo '' | timeout 30 unshare --mount --net --propagation private true 2>>"$LOG/setup.err"; then setup_ok=0; fi
if [ $setup_ok = 0 ] || [ ! -f "$DIST/bot.js" ]; then
  line FAIL R0-sandbox "cannot build the sandbox (root, cgroup v1 cpu/memory/pids and unshare needed): $(head -c 200 "$LOG/setup.err")"
  echo "VERDICT: NO-GO ($nfail FAIL, $npass PASS, $nwaived waived)"; exit 1
fi
others=$(cat /sys/fs/cgroup/cpu/mechtest/cgroup.procs | wc -l)
[ "$others" -gt 0 ] && echo "  note: $others other process(es) share the 1-CPU group mechtest: timings are pessimistic"
ENVS=$(grep -oE "BUN_JSC_[A-Za-z]+=[0-9]+" "$DIST/Dockerfile" | tr '\n' ' ')
CG="$P/tools/cg1.sh $G/cgjoin.sh"
SBX="$G/sbx.sh $G/root"
LONG="$G/long4800.jsonl.gz"
[ -f "$LONG" ] || $PY "$G/gen_long.py" "$KIT" "$LONG" 4800 7 >"$LOG/gen.out" 2>&1
resetmem() { echo 0 > /sys/fs/cgroup/memory/mechgate/memory.max_usage_in_bytes 2>/dev/null; }

# R1-R3: the official check, unpinned (all host cores visible, as in docker --cpus 1), 1-CPU quota, 512 MB, 128 tasks,
# read-only root, uid 65534, no network, /tmp 64 MB, the map read-only at /arena found through hello.map.dir
resetmem
timeout 600 $PY "$KIT/check/check.py" --map-dir /arena -- $CG $SBX "$DIST" "$KIT/arena" "$BUN" $ENVS >"$LOG/check.out" 2>"$LOG/check.err"
RES=$(tail -1 "$LOG/check.out"); RDY=$(grep -oE 'ready in [0-9]+' "$LOG/check.out" | grep -oE '[0-9]+$'); TM=$(grep -E '^answer time' "$LOG/check.out")
P99=$(echo "$TM" | grep -oE 'p99 [0-9.]+' | cut -d' ' -f2); MX=$(echo "$TM" | grep -oE 'max [0-9.]+' | cut -d' ' -f2)
line "$(ok '[ "$RES" = PASS ]')" R1-official-check "kit check.py in the sandbox: $RES; $(grep -E '^observations' "$LOG/check.out" | cut -c1-90)"
line "$(ok '[ -n "$RDY" ] && [ "$RDY" -lt 5000 ]')" R2-ready-time "ready in ${RDY:-?} ms (rule 20 s incl. container start; gate 5 s)"
line "$(ok '[ -n "$P99" ] && $PY -c "import sys; sys.exit(0 if float(\"$P99\") < 15 and float(\"$MX\") < 40 else 1)"')" R3-answer-time "p99 ${P99:-?} ms, max ${MX:-?} ms under the 1-CPU quota (budget 50; gate p99<15, max<40)"

# R4 threads and R7 exit on end: kit stream, unpinned, sampled every 5 decisions
resetmem
timeout 300 $PY "$G/drive.py" --kit "$KIT" --stream "$KIT/check/stream.jsonl.gz" --map-dir /arena --sample-every 5 \
  --pids-cgroup /sys/fs/cgroup/pids/mechgate --answers "$LOG/kit_bundle_1.answers" --stderr "$LOG/kit_bundle_1.err" -- $CG $SBX "$DIST" "$KIT/arena" "$BUN" $ENVS >"$LOG/kit_bundle_1.json" 2>&1
read -r TH TN PE EC EMS V1 < <(jget "$LOG/kit_bundle_1.json" threads_max thread_names cgroup_pids_events exit_code exit_ms verdict | tr -d ' ' | tr '\n' ' ')
line "$(ok '[ -n "$TH" ] && [ "$TH" != None ] && [ "$TH" -le 128 ] && [ "$PE" = "max0" ]')" R4-threads "max $TH tasks ($TN), pids.max 128 never hit ($PE); limit 128 processes+threads"
line "$(ok '[ "$EC" = 0 ] && $PY -c "import sys; sys.exit(0 if float(\"$EMS\") < 2000 else 1)"')" R7-exit-on-end "exit code $EC, $EMS ms after end (server kills after 2 s)"

# R6 no writes outside /tmp and no network calls: same run under strace
SBX_STRACE="$LOG/strace.log" timeout 300 $PY "$G/drive.py" --kit "$KIT" --stream "$KIT/check/stream.jsonl.gz" --map-dir /arena \
  --stderr "$LOG/strace_run.err" -- taskset -c "$CPU" $SBX "$DIST" "$KIT/arena" "$BUN" $ENVS >"$LOG/strace_run.json" 2>&1
feed < <($PY - "$LOG/strace.log" <<'PYEOF'
import re, sys
try: L = open(sys.argv[1]).read().splitlines()
except OSError: L = []
st = next((i for i, l in enumerate(L) if 'execve("/usr/local/bin/bun"' in l), None)
if st is None: print("FAIL R6-no-writes-no-net strace log has no bun start"); sys.exit()
body = L[st:]
w = [l for l in body if re.search(r"O_WRONLY|O_RDWR|O_CREAT|O_TRUNC", l) and '"/tmp/' not in l and '"/dev/null"' not in l
     or re.search(r"\b(mkdir|mkdirat|unlink|unlinkat|rename|renameat2?|symlink|symlinkat|link|linkat|creat|truncate|chmod|fchmodat|utimensat)\(", l)]
n = [l for l in body if re.search(r"\b(socket|connect|bind|sendto|sendmsg)\(", l)]
ok = not w and not n
print(f"{'PASS' if ok else 'FAIL'} R6-no-writes-no-net {len(body)} file/network syscalls traced as uid 65534 with HOME unset in a read-only cwd: {len(w)} write attempts outside /tmp, {len(n)} network calls" + (f"; first: {(w + n)[0][:120]}" if not ok else ""))
PYEOF
)

# R5, R10, R12: long synthetic run (4800 schema-valid observations, unknown fields, offers, drops, late zone, gaps),
# with 4-observation backlogs every 25 and frozen-bot backlogs every 40; pinned to core $CPU, 1-CPU quota, 512 MB, 128 tasks
resetmem
timeout 900 $PY "$G/drive.py" --kit "$KIT" --stream "$LONG" --map-dir /arena --backlog-every 25 --stall-every 40 --backlog-k 4 --sample-every 20 \
  --mem-cgroup /sys/fs/cgroup/memory/mechgate --pids-cgroup /sys/fs/cgroup/pids/mechgate --answers "$LOG/long.answers" --stderr "$LOG/long.err" \
  -- taskset -c "$CPU" $CG $SBX "$DIST" "$KIT/arena" "$BUN" $ENVS >"$LOG/long.json" 2>&1
read -r LV LA LO LSK LST LSE LLATE LP99 LMAX LDBG LUNS LBAD LML LHWM LCG LFC LPRB < <(jget "$LOG/long.json" verdict answered observations skipped_by_design stale_answers schema_errors late p99_ms max_ms debug_actions unsolicited bad_lines max_line vmhwm_kb_max cgroup_mem_max_usage_mb cgroup_mem_failcnt problems | tr -d ' ' | tr '\n' ' ')
line "$(ok '[ "$LV" = PASS ] && [ "$LSE" = 0 ] && [ "$LST" = 0 ]')" R10-long-protocol "$LA answers to $LO observations ($LSK skipped by design in backlogs): verdict $LV, schema errors $LSE, wrong/stale ticks $LST, problems ${LPRB:0:80}"
line "$(ok '[ "$LLATE" != None ] && [ "$LLATE" -le 24 ] && $PY -c "import sys; sys.exit(0 if float(\"$LP99\") < 15 else 1)"')" R10b-long-timing "late (>50 ms) $LLATE of $LA, p99 $LP99 ms, max $LMAX ms (gate: at most 0.5% late, p99<15)"
line "$(ok '[ "$LDBG" = 0 ] && [ "$LUNS" = 0 ] && [ "$LBAD" = 0 ] && [ "$LML" -lt 65536 ] && grep -q "^PASS" <<<"$RES" && grep -q "bad lines: 0  debug drawings: 0" "$LOG/check.out"')" R12-stdout-discipline "only protocol lines on stdout: debug $LDBG, unsolicited $LUNS, bad lines $LBAD, longest line $LML bytes"
line "$(ok '[ "$LFC" = 0 ] && [ "$LCG" != None ] && $PY -c "import sys; sys.exit(0 if float(\"$LCG\") < 400 and int(\"$LHWM\") < 400*1024 else 1)"')" R5-memory "peak $LCG MB charged to the 512 MB group (failcnt $LFC), peak RSS $((LHWM / 1024)) MB over the long run (gate 400 MB)"

# R8 exit when stdin closes without end
timeout 120 $PY "$G/drive.py" --kit "$KIT" --stream "$KIT/check/stream.jsonl.gz" --map-dir /arena --limit 50 --no-end --stderr "$LOG/noend.err" \
  -- taskset -c "$CPU" $CG $SBX "$DIST" "$KIT/arena" "$BUN" $ENVS >"$LOG/noend.json" 2>&1
read -r NV NEC NEMS < <(jget "$LOG/noend.json" verdict exit_code exit_ms | tr '\n' ' ')
line "$(ok '[ "$NV" = PASS ] && [ "$NEC" = 0 ] && $PY -c "import sys; sys.exit(0 if float(\"$NEMS\") < 2000 else 1)"')" R8-exit-on-stdin-close "exit code $NEC, $NEMS ms after stdin closed without end"

# R9 no map at all (hello.map.dir wrong, nothing at /arena): official check must still pass
timeout 600 $PY "$KIT/check/check.py" --map-dir /nonexistent -- taskset -c "$CPU" $CG $SBX "$DIST" none "$BUN" $ENVS >"$LOG/nomap.out" 2>"$LOG/nomap.err"
line "$(ok '[ "$(tail -1 "$LOG/nomap.out")" = PASS ]')" R9-no-map "check.py without any map: $(tail -1 "$LOG/nomap.out"); $(grep -oE 'init [0-9]+ ms world=[a-z]+' "$LOG/nomap.err" | head -1)"

# R13 a balance change: every rule number in hello.config scaled by 0.7-1.3 (protocol: read numbers from config)
CFGS="$G/long_cfg1200.jsonl.gz"
[ -f "$CFGS" ] || $PY "$G/gen_long.py" "$KIT" "$CFGS" 1200 11 perturb >>"$LOG/gen.out" 2>&1
timeout 600 $PY "$G/drive.py" --kit "$KIT" --stream "$CFGS" --map-dir /arena --backlog-every 30 --backlog-k 3 --stderr "$LOG/cfg.err" \
  -- taskset -c "$CPU" $CG $SBX "$DIST" "$KIT/arena" "$BUN" $ENVS >"$LOG/cfg.json" 2>&1
read -r CV CA CO CSK CSE CPRB < <(jget "$LOG/cfg.json" verdict answered observations skipped_by_design schema_errors problems | tr -d ' ' | tr '\n' ' ')
CERR=$(grep -cE 'failed|uncaught|unhandled' "$LOG/cfg.err" 2>/dev/null)
line "$(ok '[ "$CV" = PASS ] && [ "$CERR" = 0 ]')" R13-balance-change "changed config: $CA answers to $CO observations ($CSK skipped in backlogs), verdict $CV, schema errors $CSE, $CERR error lines on stderr ${CPRB:0:60}"

# R11 determinism (bundle twice) and equivalence with the readable source, lockstep on the kit stream
timeout 300 $PY "$G/drive.py" --kit "$KIT" --stream "$KIT/check/stream.jsonl.gz" --map-dir /arena --answers "$LOG/kit_bundle_2.answers" \
  --stderr "$LOG/kit_bundle_2.err" -- taskset -c "$CPU" $CG $SBX "$DIST" "$KIT/arena" "$BUN" $ENVS >"$LOG/kit_bundle_2.json" 2>&1
H1=$(sha256sum < "$LOG/kit_bundle_1.answers" | cut -c1-16); H2=$(sha256sum < "$LOG/kit_bundle_2.answers" | cut -c1-16); N1=$(wc -l < "$LOG/kit_bundle_1.answers")
line "$(ok '[ "$H1" = "$H2" ] && [ "$N1" = 300 ]')" R11-determinism "two bundle runs: $N1 answers, sha256 $H1 vs $H2"
if [ -f "$SRC/bot.js" ]; then
  timeout 300 $PY "$G/drive.py" --kit "$KIT" --stream "$KIT/check/stream.jsonl.gz" --map-dir /arena --answers "$LOG/kit_source.answers" \
    --stderr "$LOG/kit_source.err" -- taskset -c "$CPU" $CG $SBX "$SRC" "$KIT/arena" "$BUN" $ENVS >"$LOG/kit_source.json" 2>&1
  H3=$(sha256sum < "$LOG/kit_source.answers" | cut -c1-16)
  line "$(ok '[ "$H1" = "$H3" ]')" R11b-same-as-source "readable source $SRC gives the same 300 actions: sha256 $H3 vs bundle $H1"
else
  line FAIL R11b-same-as-source "no readable source at $SRC"
fi

# R14 no exceptions inside the bot in any run above (they are caught, but each one means a fallback decision)
EXC=$(cat "$LOG"/kit_bundle_1.err "$LOG"/long.err "$LOG"/noend.err "$LOG"/cfg.err "$LOG"/kit_bundle_2.err "$LOG"/check.err 2>/dev/null | grep -cE 'act\(\) failed|stage .* failed|uncaught|unhandled|module failed|init failed|handle failed|rehearsal failed')
line "$(ok '[ "$EXC" = 0 ]')" R14-no-exceptions "$EXC exception lines on stderr across the runs (map-less run excluded)"

echo "not automatable here (see notes/compliance_check.md): docker build on linux/amd64 within 10 min, container start time,"
echo "  the scorer's own check under Docker, repository public with every submitted commit, entry choice, team-name rules."
if [ $nfail -eq 0 ]; then echo "VERDICT: GO ($npass PASS, $nwaived waived)"; exit 0; fi
echo "VERDICT: NO-GO ($nfail FAIL, $npass PASS, $nwaived waived)"; exit 1
