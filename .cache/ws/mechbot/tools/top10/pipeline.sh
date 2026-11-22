#!/bin/bash
# Refresh everything: new public leaderboard snapshot, commit metadata, tables and scores.
# usage: pipeline.sh [nosnap] [nofetch]
P=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot
W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/web
T=$P/tools/top10
cd "$T" || exit 1
if [[ " $* " != *" nosnap "* ]]; then
  ts=$(date -u +%H%M)
  curl -sS -m 40 -A 'Mozilla/5.0' -o "snaps/lb_$ts.html.tmp" https://www.joinbuilders.org/buildathon/leaderboard \
    && grep -q 'standings' "snaps/lb_$ts.html.tmp" && mv "snaps/lb_$ts.html.tmp" "snaps/lb_$ts.html"
  rm -f snaps/*.tmp
fi
if [[ " $* " != *" nofetch "* ]]; then
  bash fetch_meta.sh candidates.tsv "$P/intel/_meta" refresh
  bash fetch_meta.sh others.tsv "$P/intel/_meta_other" refresh
  [ -f extra.tsv ] && bash fetch_meta.sh extra.tsv "$P/intel/_meta" refresh
fi
python3 -I subtimes.py "$W,$T/snaps" subtimes.json > subtimes.log
python3 -I extract_commits.py "$P/intel/_meta" commits_mech.tsv
python3 -I extract_commits.py "$P/intel/_meta_other" commits_other.tsv
python3 -I score_pairs.py subtimes.json commits_mech.tsv commits_other.tsv pairs.json
