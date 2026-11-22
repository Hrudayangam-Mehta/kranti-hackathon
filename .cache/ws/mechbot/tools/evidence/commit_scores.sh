#!/bin/sh
# Dump commit subjects+bodies of the metadata clones (our own blobless clones) that mention a practice score.
# Reads git objects only; runs nothing from the foreign repos.
META="$1"; OUT="$2"
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1
: > "$OUT"
for r in "$META"/*.git; do
  n=$(basename "$r" .git)
  git --no-pager --git-dir="$r" -c core.hooksPath=/dev/null log --all --date=format:'%m-%d %H:%M' \
     --format="@@@ $n %h %ad%n%s%n%b" 2>/dev/null >> "$OUT"
done
