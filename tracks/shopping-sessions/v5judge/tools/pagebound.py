import os, sys
out = sys.argv[1]
for d in ("events", "clicks", "links"):
    os.makedirs(f"{out}/{d}", exist_ok=True)
open(f"{out}/manifest.json", "w").write('{"window_start": "2026-03-01T00:00:00Z", "window_end": "2026-03-15T00:00:00Z"}\n')
open(f"{out}/products.csv", "w").write("product_id,category\np1,cat_a\np2,cat_b\n")
open(f"{out}/campaigns.csv", "w").write("campaign_id,channel\nc_1,search\nc_2,social\n")
def fill(path, header, line_of, target):
    body = header
    i = 0
    while True:
        line = line_of(i)
        if len(body) + len(line) + 1 > target - 400:
            break
        body += line + "\n"
        i += 1
    last = line_of(i)
    pad = target - len(body) - len(last)
    assert pad >= 0, pad
    last = last[:-1] + ("x" * pad) + last[-1]
    body += last
    assert len(body) == target, (len(body), target)
    open(path, "w", newline="").write(body)
fill(f"{out}/links/part-0.csv", "user_id_a,user_id_b\n", lambda i: f"u{i},v{i}", 4096)
fill(f"{out}/links/part-1.csv", "user_id_a,user_id_b\n", lambda i: f"w{i},w{i}_" + "y" * 30, 8192)
fill(f"{out}/events/part-0.csv", "event_id,user_id,ts,ingest_ts,event_type,product_id,price_cents\n",
     lambda i: f"e{i},u{i % 50},2026-03-0{1 + i % 9}T10:00:00Z,2026-03-0{1 + i % 9}T10:00:00Z,purchase,p1,{100 + i}", 4096 * 3)
fill(f"{out}/events/part-1.csv", "event_id,user_id,ts,ingest_ts,event_type,product_id,price_cents\n",
     lambda i: f"f{i}_" + "h" * 32 + f",w{i % 40},2026-03-0{1 + i % 9}T11:00:00Z,2026-03-0{1 + i % 9}T11:00:00Z,view,p2,", 4096 * 2)
fill(f"{out}/clicks/part-0.csv", "click_id,user_id,campaign_id,ts\n", lambda i: f"k{i},u{i % 50},c_{1 + i % 2},2026-03-0{1 + i % 9}T09:00:00Z", 4096)
fill(f"{out}/clicks/part-1.csv", "click_id,user_id,campaign_id,ts\n", lambda i: f"k{i}_" + "h" * 32 + f",w{i % 40}_" + "y" * 30 + f",c_{1 + i % 2},2026-03-0{1 + i % 9}T09:00:00Z", 4096 * 2)
for p in ("links/part-0.csv", "events/part-1.csv", "clicks/part-1.csv"):
    print(p, os.path.getsize(f"{out}/{p}"), repr(open(f"{out}/{p}", "rb").read()[-40:]))
