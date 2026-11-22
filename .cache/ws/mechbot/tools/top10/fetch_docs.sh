#!/bin/bash
# Fetch only documentation-like text files (README, changelogs, score logs) at each branch head of the
# metadata repos, one blob at a time, anonymously.  Files are stored as inert text; nothing is executed.
# usage: fetch_docs.sh <meta-dir> <docs-dir> [max-bytes-per-file=60000]
META="$1"; OUT="$2"; MAX="${3:-60000}"
mkdir -p "$OUT"
for d in "$META"/*.git; do
  name=$(basename "$d" .git); owner="${name%%__*}"; repo="${name#*__}"
  head=$(git --git-dir "$d" for-each-ref --sort=-committerdate --format='%(refname)' refs/heads | head -1)
  [ -z "$head" ] && continue
  git --git-dir "$d" ls-tree -r -l "$head" 2>/dev/null | awk -v max="$MAX" '
     { size=$4; sha=$3; path=$5; for(i=6;i<=NF;i++) path=path" "$i;
       n=tolower(path);
       if (size+0>0 && size+0<=max && n ~ /(readme|changelog|notes|results|score|journal|status|history|experiment|strategy|report|log|ledger|submission|handoff|claude|agents|todo|plan)[^\/]*\.(md|txt|json|tsv|csv)$/ && n !~ /node_modules|mechfight-kit\/|kit\/|protocol|arena\//)
          print sha "\t" path }' | head -25 | while IFS=$'\t' read -r sha path; do
    dest="$OUT/$name/$(echo "$path" | tr '/ ' '__')"
    [ -f "$dest.$sha" ] && continue
    mkdir -p "$OUT/$name"
    if ! git --git-dir "$d" cat-file -e "$sha" 2>/dev/null; then
      timeout 40 git --git-dir "$d" -c protocol.version=2 -c gc.auto=0 fetch -q --no-tags --filter=blob:none --depth 1 "https://github.com/$owner/$repo" "$sha" 2>/dev/null || continue
    fi
    rm -f "$dest".*
    git --git-dir "$d" cat-file blob "$sha" 2>/dev/null | head -c "$MAX" > "$dest.$sha"
  done
done
echo done
