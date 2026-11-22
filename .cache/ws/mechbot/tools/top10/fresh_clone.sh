#!/bin/bash
# usage: fresh_clone.sh <list (owner/repo in column 1)> <dest-dir>   depth-1 anonymous https clones, no checkout hooks, sequential
LIST="$1"; DEST="$2"; mkdir -p "$DEST"; LOG="$DEST/_clone.log"
while IFS=$'\t' read -r name rest; do
  [ -z "$name" ] && continue
  d="$DEST/${name%%/*}__${name#*/}"
  [ -d "$d" ] && continue
  out=$(GIT_TERMINAL_PROMPT=0 timeout 60 git -c core.hooksPath=/dev/null -c advice.detachedHead=false clone -q --depth 1 --no-tags "https://github.com/$name" "$d" 2>&1)
  echo "$(date -u +%H:%M:%S) rc=$? $name $(echo "$out" | tr '\n' ' ' | cut -c1-120)" >> "$LOG"
done < "$LIST"
echo "$(date -u +%H:%M:%S) DONE" >> "$LOG"
