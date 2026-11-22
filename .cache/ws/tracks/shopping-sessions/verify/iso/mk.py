import json, os, sys, shutil
root = sys.argv[1]; manifest = sys.argv[2].encode().decode('unicode_escape').encode()
shutil.rmtree(root, ignore_errors=True)
for d in ("events","clicks","links"): os.makedirs(f"{root}/{d}")
open(f"{root}/manifest.json","wb").write(manifest)
open(f"{root}/products.csv","wb").write(b"product_id,category\np1,shoes\n")
open(f"{root}/campaigns.csv","wb").write(b"campaign_id,channel\nc_1,search\n")
open(f"{root}/clicks/a.csv","wb").write(b"click_id,user_id,campaign_id,ts\n")
open(f"{root}/links/a.csv","wb").write(b"user_id_a,user_id_b\n")
# events at 12:29:59.999 (ws-1 for 12:30 start), 12:30:00.000, Oct 3 10:00, and Oct 14 05:59:59.999 / 06:00
ev = [("a","out_1229", "1790857799999"), ("b","in_1230","1790857800000"), ("c","mid","2026-10-03T10:00:00Z"),
      ("d","in_0559","1791957599999"), ("e","out_0600","1791957600000"), ("f","day1_0000","2026-10-01T00:00:00Z"),
      ("g","day15","2026-10-15T00:00:00Z")]
with open(f"{root}/events/a.csv","wb") as fh:
    fh.write(b"event_id,user_id,ts,ingest_ts,event_type,product_id,price_cents\n")
    for e,u,t in ev:
        ing = "2026-10-01T13:00:00Z" if u in ("out_1229","in_1230","day1_0000") else ("2026-10-14T06:00:00Z" if u in ("in_0559","out_0600") else ("2026-10-15T00:00:00Z" if u=="day15" else "2026-10-03T12:00:00Z"))
        fh.write(f"{e},{u},{t},{ing},view,p1,\n".encode())
