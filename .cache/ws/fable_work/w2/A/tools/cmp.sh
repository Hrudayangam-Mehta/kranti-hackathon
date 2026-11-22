#!/bin/bash
# cmp.sh <tagA> <tagB> : per source byte-identical or count of differing lines
A=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/w2/A/id
for f in $A/$1/*.jsonl; do s=$(basename $f .jsonl); g=$A/$2/$s.jsonl; [ -f $g ] || { echo "$s: missing in $2"; continue; }
  if cmp -s $f $g; then echo "$s: identical ($(wc -l < $f) lines)"; else d=$(diff <(cat $f) <(cat $g) | grep -c '^<'); echo "$s: DIFFERENT ($d of $(wc -l < $f) lines)"; fi; done
