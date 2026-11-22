#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad; F=$S/fable_work
core=$1; shift
for n in "$@"; do
  T=$F/builds/$n/troot; rm -rf $T; mkdir -p $T/out; cp -r $F/tools $T/tools
  grep -rl "scratchpad/fable_work'" $T/tools | xargs sed -i "s#scratchpad/fable_work'#scratchpad/fable_work/builds/$n/troot'#"
  ln -s $F/builds/$n/bot $T/bot; ln -s $F/kit $T/kit; ln -s $F/replay $T/replay; ln -s $F/notes $T/notes; ln -s $F/sim $T/sim; ln -s $F/ref_bot $T/ref_bot
  for t in test_world.js test_brain.js test_counters.js test_requests.js "anchors7.mjs $F/builds/$n/bot" test_rb7.mjs test_io7.mjs test_aggr7.mjs test_lx7.mjs test_fin7.mjs test_iso7.mjs test_lg7.mjs test_tf2.mjs; do
    f=${t%% *}; (cd $T && taskset -c $core $S/mechbot/bun tools/$t > out/$f.txt 2>&1); rc=$?
    echo "$n $f exit $rc :: $(tail -1 $T/out/$f.txt | cut -c1-80)"
  done
done
