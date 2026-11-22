#!/bin/bash
# Sequential metadata-only fetch of named public repos (no checkout, no blobs).
# usage: fetch.sh <list file> <out dir>
LIST="$1"; OUT="$2"; mkdir -p "$OUT"
export GIT_TERMINAL_PROMPT=0 GIT_ASKPASS=/bin/false
while read -r R; do
  [ -z "$R" ] && continue
  D="$OUT/${R/\//__}.git"
  [ -d "$D" ] || git init -q --bare "$D"
  if timeout 60 git -C "$D" fetch -q --filter=blob:none --depth 300 "https://github.com/$R" '+refs/heads/*:refs/heads/*' 2>>"$OUT/_err.log"; then
    n=$(git -C "$D" rev-list --all 2>/dev/null | wc -l)
    echo "$(date -u +%H:%M:%S) OK $R commits=$n" >> "$OUT/_fetch.log"
  else
    echo "$(date -u +%H:%M:%S) FAIL $R" >> "$OUT/_fetch.log"
  fi
done < "$LIST"
echo "$(date -u +%H:%M:%S) DONE $LIST" >> "$OUT/_fetch.log"
