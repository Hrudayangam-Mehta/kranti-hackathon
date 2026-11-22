#!/bin/bash
# tools/package.sh with the source folder and an existing empty output folder as arguments:
#   package_variant_r6.sh <variant source bot dir> <output dist dir>
set -euo pipefail
P=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot
V=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/variants6
SRC="$(cd "$1" && pwd)"; OUT="$2"
case "$OUT" in "$V"/*/dist) ;; *) echo "refusing output $OUT"; exit 3;; esac
[ -d "$OUT" ] && [ -z "$(ls -A "$OUT")" ] || { echo "output must exist and be empty: $OUT"; exit 3; }
REPO=/home/user/kranti-hackathon
"$P/bun" build "$SRC/bot.js" --minify --target=bun --outfile "$OUT/bot.js" >/dev/null
cp "$SRC/Dockerfile" "$OUT/Dockerfile"
cp "$REPO/LICENSE" "$REPO/README.md" "$OUT/"
if grep -rInE "fare.i|[Rr]oyale|mechfight|\bOSU\b|[Oo]hio|[Cc]ampus|[Bb]uildathon|joinbuilders|Builders" "$OUT"; then
  echo "HYGIENE FAIL: forbidden words above"; exit 2
fi
if grep -In "^\s*//" "$OUT/bot.js" | grep -v "// @bun" | head -3 | grep -q .; then echo "HYGIENE FAIL: comment lines in bundle"; exit 2; fi
echo "files:"; (cd "$OUT" && wc -c * | sed 's/^/  /')
