#!/bin/bash
# cmp.sh <tagA> <tagB>: per recording, byte-identical or the number of differing lines (w2/B/id)
D=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/w2/B/id
for f in $D/$1/*.jsonl; do n=$(basename $f .jsonl); g=$D/$2/$n.jsonl; [ -f $g ] || { echo "$n: missing in $2"; continue; }
  if cmp -s $f $g; then echo "$n: identical ($(wc -l < $f) lines)"; else echo "$n: DIFFERENT $(diff <(cat $f) <(cat $g) | grep -c '^>') of $(wc -l < $f) lines"; fi; done
for t in $1 $2; do python3 -c "
import json,glob,sys
e=f=0
for m in glob.glob('$D/$t/*.meta.json'):
  j=json.load(open(m)); e+=j.get('errors',0); f+=j.get('fuse',0)
print('$t health: errors',e,'fuse',f)"; done
