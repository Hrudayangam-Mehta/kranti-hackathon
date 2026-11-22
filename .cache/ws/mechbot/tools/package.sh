#!/bin/bash
# Build the submission folder $P/dist from the readable source in $P/bot (which never goes to the repo).
set -euo pipefail
P="$(cd "$(dirname "$0")/.." && pwd)"
REPO=/home/user/kranti-hackathon
rm -rf "$P/dist"; mkdir -p "$P/dist"
"$P/bun" build "$P/bot/bot.js" --minify --target=bun --outfile "$P/dist/bot.js" >/dev/null
cp "$P/bot/Dockerfile" "$P/dist/Dockerfile"
cp "$REPO/LICENSE" "$REPO/README.md" "$P/dist/"
# hygiene: none of the forbidden words may appear anywhere in the shipped files
if grep -rInE "fare.i|[Rr]oyale|mechfight|\bOSU\b|[Oo]hio|[Cc]ampus|[Bb]uildathon|joinbuilders|Builders" "$P/dist"; then
  echo "HYGIENE FAIL: forbidden words above"; exit 2
fi
if grep -In "^\s*//" "$P/dist/bot.js" | grep -v "// @bun" | head -3 | grep -q .; then echo "HYGIENE FAIL: comment lines in bundle"; exit 2; fi
echo "files:"; (cd "$P/dist" && wc -c * | sed 's/^/  /')
ENVS=$(grep -oE "BUN_JSC_[A-Za-z]+=[0-9]+" "$P/dist/Dockerfile" | tr '\n' ' ')
mkdir -p /sys/fs/cgroup/cpu/mechtest && echo 100000 > /sys/fs/cgroup/cpu/mechtest/cpu.cfs_period_us && echo 100000 > /sys/fs/cgroup/cpu/mechtest/cpu.cfs_quota_us
echo "conformance (bundle, real map, 1-CPU quota, Dockerfile engine settings):"
python3 "$P/kit/check/check.py" --map-dir "$P/kit/arena" -- "$P/tools/cg1.sh" env $ENVS "$P/bun" "$P/dist/bot.js" 2>&1 | grep -E "init|answer time|missed|PASS|FAIL|errors=" | sed 's/^/  /'
echo "conformance (bundle, no map available):"
python3 "$P/kit/check/check.py" --map-dir /nonexistent -- "$P/tools/cg1.sh" env $ENVS "$P/bun" "$P/dist/bot.js" 2>&1 | grep -E "init|answer time|PASS|FAIL|errors=" | sed 's/^/  /'
