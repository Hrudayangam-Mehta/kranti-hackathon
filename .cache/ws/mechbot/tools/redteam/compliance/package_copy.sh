#!/bin/bash
# Build the submission folder $OUT from the readable source in $P/bot (which never goes to the repo).
set -euo pipefail
P="$(cd "$(dirname "$0")/../../.." && pwd)"
SRC="${SRC:-$P/bot}"; OUT="${OUT:-$P/dist}"
REPO=/home/user/kranti-hackathon
rm -rf "$OUT"; mkdir -p "$OUT"
"$P/bun" build "$SRC/bot.js" --minify --target=bun --outfile "$OUT/bot.js" >/dev/null
cp "$SRC/Dockerfile" "$OUT/Dockerfile"
cp "$REPO/LICENSE" "$REPO/README.md" "$OUT/"
# hygiene: none of the forbidden words may appear anywhere in the shipped files
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
