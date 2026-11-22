#!/bin/bash
# Refresh commit metadata (no blobs) of every bare metadata repo in a directory, anonymously over https.
# usage: refresh_meta.sh <meta-dir> [extra owner/repo ...]   (sequential, 60 s timeout each, failures skipped)
META="$1"; shift
LOG="$META/_refresh.log"
for name in "$@"; do
  d="$META/${name%%/*}__${name#*/}.git"
  if [ ! -d "$d" ]; then git init -q --bare "$d"; git --git-dir="$d" remote add origin "https://github.com/$name"; fi
done
for d in "$META"/*.git; do
  r=$(git --git-dir="$d" remote 2>/dev/null | head -1)
  case "$r" in
    https://*) url="$r" ;;
    *) url=$(git --git-dir="$d" remote get-url "$r" 2>/dev/null) ;;
  esac
  case "$url" in
    https://github.com/*) ;;
    *) echo "$(date -u +%H:%M:%S) SKIP $d no-url" >> "$LOG"; continue ;;
  esac
  out=$(timeout 60 git --git-dir="$d" -c protocol.version=2 -c gc.auto=0 -c core.hooksPath=/dev/null fetch -q --no-tags --filter=blob:none --depth 300 "$url" '+refs/heads/*:refs/heads/*' 2>&1)
  rc=$?
  ts=$(date -u +%H:%M:%S)
  if [ $rc -eq 0 ]; then
    date -u +%s > "$d/.fetched"
    echo "$ts OK ${url#https://github.com/} commits=$(git --git-dir="$d" rev-list --all --count 2>/dev/null)" >> "$LOG"
  else
    echo "$ts FAIL($rc) ${url#https://github.com/} :: $(echo "$out" | tr '\n' ' ' | cut -c1-160)" >> "$LOG"
  fi
done
echo "$(date -u +%H:%M:%S) DONE" >> "$LOG"
