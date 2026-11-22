#!/bin/bash
# Finder 2: shallow-clone (depth 1, read-only use) every candidate repo not yet present. Anonymous https only.
# usage: f2_clone_all.sh <list with owner/repo in column 1> <intel-dir>
LIST="$1"; INTEL="$2"; LOG="$INTEL/_triage/f2_clone.log"
while IFS=$'\t' read -r name rest; do
  [ -z "$name" ] && continue
  owner="${name%%/*}"; repo="${name#*/}"
  d="$INTEL/${owner}__${repo}"
  [ -d "$d" ] && continue
  out=$(timeout 90 git -c core.hooksPath=/dev/null clone -q --depth 1 --no-tags "https://github.com/${owner}/${repo}" "$d" 2>&1)
  rc=$?
  if [ $rc -eq 0 ]; then echo "$(date -u +%H:%M:%S) OK $name" >> "$LOG"; else rm -rf "$d"; echo "$(date -u +%H:%M:%S) FAIL($rc) $name :: $(echo "$out" | tr '\n' ' ' | cut -c1-160)" >> "$LOG"; fi
done < "$LIST"
echo "$(date -u +%H:%M:%S) DONE" >> "$LOG"
