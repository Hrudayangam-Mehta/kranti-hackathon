#!/bin/bash
# usage: lscommits.sh <commits.tsv> <owner/repo> [since HH:MM]   prints sha, UTC commit time, author time, author, branches, subject
awk -F'\t' -v R="$2" '$1==R' "$1" | sort -t$'\t' -k3,3n | while IFS=$'\t' read -r repo sha ct at an cn br subj; do
  printf '%s %s (a %s) %-14.14s %-28.28s %s\n' "$sha" "$(date -u -d @$ct +%H:%M:%S)" "$(date -u -d @$at +%H:%M:%S)" "$an" "$br" "${subj:0:120}"
done
