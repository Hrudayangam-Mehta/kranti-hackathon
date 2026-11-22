#!/bin/bash
# Refresh commit metadata (no blobs) of the named repos (owner/repo per arg, or file via -f), anonymously.
# Sequential, 60 s timeout each. usage: refresh_list.sh <meta-dir> <log> owner/repo ...
META="$1"; LOG="$2"; shift 2
for name in "$@"; do
  d="$META/${name%%/*}__${name#*/}.git"
  url="https://github.com/$name"
  if [ ! -d "$d" ]; then git init -q --bare "$d"; git --git-dir="$d" remote add origin "$url"; fi
  out=$(GIT_TERMINAL_PROMPT=0 timeout 60 git --git-dir="$d" -c protocol.version=2 -c gc.auto=0 -c core.hooksPath=/dev/null fetch -q --no-tags --filter=blob:none --depth 400 "$url" '+refs/heads/*:refs/heads/*' 2>&1)
  rc=$?
  ts=$(date -u +%H:%M:%S)
  if [ $rc -eq 0 ]; then
    date -u +%s > "$d/.fetched"
    echo "$ts OK $name commits=$(git --git-dir="$d" rev-list --all --count 2>/dev/null)" >> "$LOG"
  else
    echo "$ts FAIL($rc) $name :: $(echo "$out" | tr '\n' ' ' | cut -c1-160)" >> "$LOG"
  fi
done
echo "$(date -u +%H:%M:%S) DONE" >> "$LOG"
