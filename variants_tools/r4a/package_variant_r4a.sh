#!/bin/bash
# tools/package.sh with the source folder and the output folder as arguments (every step unchanged):
#   package_variant.sh <variant source bot dir> <output dist dir>
set -euo pipefail
P=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot
SRC="$(cd "$1" && pwd)"; OUT="$2"
case "$OUT" in /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/variants/H/dist|/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/variants/HL/dist) ;; *) echo "refusing output $OUT"; exit 3;; esac
REPO=/home/user/kranti-hackathon
rm -rf "$OUT"; mkdir -p "$OUT"
"$P/bun" build "$SRC/bot.js" --minify --target=bun --outfile "$OUT/bot.js" >/dev/null
cp "$SRC/Dockerfile" "$OUT/Dockerfile"
cp "$REPO/LICENSE" "$REPO/README.md" "$OUT/"
if grep -rInE "fare.i|[Rr]oyale|mechfight|\bOSU\b|[Oo]hio|[Cc]ampus|[Bb]uildathon|joinbuilders|Builders" "$OUT"; then
  echo "HYGIENE FAIL: forbidden words above"; exit 2
fi
if grep -In "^\s*//" "$OUT/bot.js" | grep -v "// @bun" | head -3 | grep -q .; then echo "HYGIENE FAIL: comment lines in bundle"; exit 2; fi
echo "files:"; (cd "$OUT" && wc -c * | sed 's/^/  /')
ENVS=$(grep -oE "BUN_JSC_[A-Za-z]+=[0-9]+" "$OUT/Dockerfile" | tr '\n' ' ')
mkdir -p /sys/fs/cgroup/cpu/mechtest && echo 100000 > /sys/fs/cgroup/cpu/mechtest/cpu.cfs_period_us && echo 100000 > /sys/fs/cgroup/cpu/mechtest/cpu.cfs_quota_us
echo "conformance (bundle, real map, 1-CPU quota, Dockerfile engine settings):"
python3 "$P/kit/check/check.py" --map-dir "$P/kit/arena" -- "$P/tools/cg1.sh" env $ENVS "$P/bun" "$OUT/bot.js" 2>&1 | grep -E "init|answer time|missed|PASS|FAIL|errors=" | sed 's/^/  /'
echo "conformance (bundle, no map available):"
python3 "$P/kit/check/check.py" --map-dir /nonexistent -- "$P/tools/cg1.sh" env $ENVS "$P/bun" "$OUT/bot.js" 2>&1 | grep -E "init|answer time|PASS|FAIL|errors=" | sed 's/^/  /'
