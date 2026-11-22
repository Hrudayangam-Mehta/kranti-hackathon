#!/bin/bash
# Print one file from a metadata-only bare repo, fetching just that blob anonymously over https.
# Nothing from the repo is ever executed; the content is only written to stdout.
# usage: readblob.sh <meta-dir> <owner/repo> <ref> <path> [max-bytes]
META="$1"; NAME="$2"; REF="$3"; FPATH="$4"; MAX="${5:-6000}"
d="$META/${NAME%%/*}__${NAME#*/}.git"
[ -d "$d" ] || { echo "no meta repo for $NAME" >&2; exit 2; }
sha=$(git --git-dir "$d" rev-parse --verify -q "$REF:$FPATH") || { echo "no such path $REF:$FPATH" >&2; exit 3; }
if ! git --git-dir "$d" -c fetch.negotiationAlgorithm=noop cat-file -e "$sha" 2>/dev/null; then
  timeout 60 git --git-dir "$d" -c protocol.version=2 fetch -q --no-tags --filter=blob:none --depth 1 \
     "https://github.com/$NAME" "$sha" 2>/dev/null || { echo "blob fetch refused/failed for $NAME $sha" >&2; exit 4; }
fi
git --git-dir "$d" cat-file blob "$sha" | head -c "$MAX"
