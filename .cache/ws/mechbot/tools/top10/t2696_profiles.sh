#!/bin/bash
# For every proj1 commit since a time: UTC commit time, sha, branches, and the compiled-in squad profile name.
# Reads git objects as text only (nothing from the repository is executed).
# usage: t2696_profiles.sh <meta.git> <blobs.git> <since-iso>
M="$1"; B="$2"; S="$3"
export GIT_NO_LAZY_FETCH=1
TZ=UTC git --git-dir="$M" log --all --since="$S" --date=format-local:'%H:%M:%S' --format='%cd %H' | sort | while read t h; do
  br=$(git --git-dir="$M" branch --contains "$h" --format='%(refname:short)' | tr '\n' ',' )
  prof=$(git --git-dir="$B" show "$h:bot/profile.go" 2>/dev/null | grep -m1 -E '^const Profile' | sed -E 's/.*"([^"]*)".*/\1/')
  echo "$t ${h:0:7} $h ${br%,} profile=${prof:-?}"
done
