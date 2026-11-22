#!/bin/sh
# Review helper: build (or refresh) ./mirror, a frozen copy of bot/lib and sim plus these review scripts, so that
# paired A/B runs are not disturbed while the live files are being edited.
#   ./sync_mirror.sh code   -> copy bot/lib and sim again;   ./sync_mirror.sh -> only refresh the review scripts
# Run the statistics from inside it:  cd mirror && ../../../bun tools/review_tactics/ab.js --matches 100 --arms '[{}, {"readyCd":0.1}]'
cd "$(dirname "$0")"
if [ ! -d mirror ] || [ "$1" = "code" ]; then
  rm -rf mirror
  mkdir -p mirror/bot mirror/tools/review_tactics
  cp -r ../../sim mirror/sim
  cp -r ../../bot/lib mirror/bot/lib
  ln -s ../../../notes mirror/notes
  ln -s ../../../kit mirror/kit
fi
cp *.js mirror/tools/review_tactics/ 2>/dev/null
