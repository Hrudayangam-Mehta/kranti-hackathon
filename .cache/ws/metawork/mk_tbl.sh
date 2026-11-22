#!/bin/bash
# mk_tbl.sh SRC DEST TABLE16 : copy a bot dir and set saltTable (TABLE '' allowed)
set -e
SRC=$1; DEST=$2; TB=$3
[ -z "$TB" ] || [ ${#TB} -eq 16 ] || { echo "table must be 16 chars"; exit 2; }
rm -rf "$DEST"; cp -a "$SRC" "$DEST"
sed -i "s/^  saltTable: '',$/  saltTable: '$TB',/" "$DEST/lib/params.js"
grep -q "^  saltTable: '$TB',$" "$DEST/lib/params.js" || { echo "table not set"; exit 3; }
