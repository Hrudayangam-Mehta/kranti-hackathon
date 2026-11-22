#!/bin/bash
# Fetch commit metadata only (no blobs, no checkout) for a list of PUBLIC repos, anonymously over https.
# usage: fetch_meta.sh <list-file with owner/repo in column 1> <meta-dir> [refresh]
# Sequential, 60 s timeout each, failures are logged and skipped (never retried through another route).
LIST="$1"; META="$2"; REFRESH="$3"
mkdir -p "$META"
LOG="$META/_fetch.log"
while IFS=$'\t' read -r name rest; do
  [ -z "$name" ] && continue
  owner="${name%%/*}"; repo="${name#*/}"
  d="$META/${owner}__${repo}.git"
  if [ -d "$d" ] && [ -z "$REFRESH" ] && [ -f "$d/.fetched" ]; then continue; fi
  [ -d "$d" ] || git init -q --bare "$d"
  out=$(cd "$d" && timeout 60 git -c protocol.version=2 -c gc.auto=0 fetch -q --no-tags --prune --filter=blob:none --depth 200 \
        "https://github.com/${owner}/${repo}" '+refs/heads/*:refs/heads/*' 2>&1)
  rc=$?
  ts=$(date -u +%H:%M:%S)
  if [ $rc -eq 0 ]; then
    date -u +%s > "$d/.fetched"
    n=$(cd "$d" && git rev-list --all --count 2>/dev/null)
    echo "$ts OK $name commits=$n" >> "$LOG"
  else
    echo "$ts FAIL($rc) $name :: $(echo "$out" | tr '\n' ' ' | cut -c1-200)" >> "$LOG"
  fi
done < "$LIST"
echo "$(date -u +%H:%M:%S) DONE $LIST" >> "$LOG"
