#!/bin/bash
# edge inputs: header-only files, no files, missing folders, only links, only clicks, output dir pre-filled, stdout must be empty, exit 0
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
V=$S/v5c_verify
PY="$S/kit/venv/bin/python -B"
K=$S/kit/unz/starter-duckdb
BIN=$1
E=$V/vdata/edge
rm -rf $E; mkdir -p $E
mk() {
  local name=$1; local d=$E/$name; mkdir -p $d/events $d/clicks $d/links
  echo '{"window_start": "2028-02-16T00:00:00Z", "window_end": "2028-03-01T00:00:00Z"}' > $d/manifest.json
  printf 'product_id,category\np1,shoes\n' > $d/products.csv
  printf 'campaign_id,channel\nc_1,search\n' > $d/campaigns.csv
}
mk headers_only
printf 'event_id,user_id,ts,ingest_ts,event_type,product_id,price_cents\n' > $E/headers_only/events/a.csv
printf 'click_id,user_id,campaign_id,ts\n' > $E/headers_only/clicks/a.csv
printf 'user_id_a,user_id_b\n' > $E/headers_only/links/a.csv
mk no_files
mk no_newline_headers
printf 'event_id,user_id,ts,ingest_ts,event_type,product_id,price_cents' > $E/no_newline_headers/events/a.csv
printf 'click_id,user_id,campaign_id,ts' > $E/no_newline_headers/clicks/a.csv
printf 'user_id_a,user_id_b' > $E/no_newline_headers/links/a.csv
mk zero_byte_files
: > $E/zero_byte_files/events/a.csv; : > $E/zero_byte_files/clicks/a.csv; : > $E/zero_byte_files/links/a.csv
mk only_links
printf 'event_id,user_id,ts,ingest_ts,event_type,product_id,price_cents\n' > $E/only_links/events/a.csv
printf 'click_id,user_id,campaign_id,ts\n' > $E/only_links/clicks/a.csv
printf 'user_id_a,user_id_b\nu1,u2\nu0123456789abcdef0123456789abcdef,u2\nU1,u1\n' > $E/only_links/links/a.csv
mk only_clicks
printf 'event_id,user_id,ts,ingest_ts,event_type,product_id,price_cents\n' > $E/only_clicks/events/a.csv
printf 'click_id,user_id,campaign_id,ts\nk1,u1,c_1,2028-02-20T00:00:00Z\nk0123456789abcdef0123456789abcdef,u1,c_1,2028-02-20T00:00:00Z\n' > $E/only_clicks/clicks/a.csv
printf 'user_id_a,user_id_b\n' > $E/only_clicks/links/a.csv
mk events_no_clicks_no_links
printf 'event_id,user_id,ts,ingest_ts,event_type,product_id,price_cents\ne1,u1,2028-02-29T12:00:00Z,2028-02-29T12:00:01Z,view,p1,\ne0123456789abcdef0123456789abcdef,u0123456789abcdef0123456789abcdef,2028-02-29T23:59:59Z,2028-03-01T00:00:00Z,purchase,p1,250\ne2,U1,1835481599999,2028-03-01T00:00:00Z,cart,p1,\n' > $E/events_no_clicks_no_links/events/a.csv
mk one_long_line
python3 - <<EOF
d = "$E/one_long_line"
big = "e" + "f" * 5000
with open(d + "/events/a.csv", "w") as fh:
    fh.write("event_id,user_id,ts,ingest_ts,event_type,product_id,price_cents\n")
    fh.write(f"{big},u{'1'*4000},2028-02-20T00:00:00Z,2028-02-20T00:00:01Z,view,p1,\n")
    fh.write(f"e1,u{'1'*4000},2028-02-20T00:10:00Z,2028-02-20T00:10:01Z,view,p1,\n")
    fh.write(f"e2,u1,2028-02-20T00:10:00Z,2028-02-20T00:10:01Z,view,p1,\n")
with open(d + "/clicks/a.csv", "w") as fh:
    fh.write("click_id,user_id,campaign_id,ts\n")
    fh.write(f"k{'f'*3000},u{'1'*4000},c_1,2028-02-19T00:00:00Z\n")
    fh.write(f"k1,u1,c_1,2028-02-19T00:00:00Z\n")
with open(d + "/links/a.csv", "w") as fh:
    fh.write("user_id_a,user_id_b\n")
    fh.write(f"u{'1'*4000},u1\n")
EOF
for case in headers_only no_files no_newline_headers zero_byte_files only_links only_clicks events_no_clicks_no_links one_long_line; do
  d=$E/$case
  for n in 1 4; do
    O=$V/vruns/edge_${case}_n$n; rm -rf $O; mkdir -p $O
    env -i DATA_DIR=$d OUTPUT_DIR=$O NCPU=$n nice -n 10 taskset -c 2,3 $BIN > $O.stdout 2> $O.err; rc=$?
    R=$V/vruns/edge_${case}_ref; rm -rf $R
    $PY $S/verify/ref.py $d $R > $R.log 2>&1; rr=$?
    c=$(cd $K/scripts && $PY compare.py $O $R 2>&1 | tail -1); c2=$(cd $K/scripts && $PY compare.py $R $O 2>&1 | tail -1)
    echo "$case NCPU=$n: exit=$rc stdout_bytes=$(wc -c < $O.stdout) files=$(ls $O/user_daily 2>/dev/null | wc -l)/$(ls $O/campaign_daily 2>/dev/null | wc -l) ref_rc=$rr compare=$c/$c2 | $(grep -E 'surviving|error|panic' $O.err | head -2 | tr '\n' ' ')"
    rm -rf $O $R
  done
done
echo "--- missing data dir"
O=$V/vruns/edge_missing; rm -rf $O; mkdir -p $O
env -i DATA_DIR=$E/does_not_exist OUTPUT_DIR=$O NCPU=2 $BIN > $O.stdout 2> $O.err; echo "missing DATA_DIR: exit=$? stdout_bytes=$(wc -c < $O.stdout) err=$(head -c 200 $O.err)"
echo "--- output dir missing (must be created?)"
O=$V/vruns/edge_noout; rm -rf $O
env -i DATA_DIR=$E/headers_only OUTPUT_DIR=$O NCPU=2 $BIN > $V/vruns/edge_noout.stdout 2> $V/vruns/edge_noout.err; echo "absent OUTPUT_DIR: exit=$? stdout_bytes=$(wc -c < $V/vruns/edge_noout.stdout) files=$(ls $O/user_daily 2>/dev/null | wc -l)/$(ls $O/campaign_daily 2>/dev/null | wc -l) err=$(head -c 200 $V/vruns/edge_noout.err)"
rm -rf $O $E
