import sys, glob
import pyarrow.parquet as pq, pyarrow as pa, pyarrow.compute
out = sys.argv[1]
for t in ("user_daily", "campaign_daily"):
    files = sorted(glob.glob(f"{out}/{t}/*.parquet"))
    tot = 0; s = 0; r = 0
    for f in files:
        pf = pq.ParquetFile(f)
        md = pf.metadata
        tab = pf.read()
        tot += tab.num_rows
        if tab.num_rows:
            s += pa.compute.sum(tab["sessions"]).as_py(); r += pa.compute.sum(tab["revenue_cents"]).as_py()
    print(t, len(files), "files", tot, "rows", s, r, tab.schema.to_string().replace("\n", "; "))
ds = pq.read_table(f"{out}/user_daily")
print("dataset read", ds.num_rows, ds.column("top_category").null_count)
