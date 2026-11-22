import sys, glob, hashlib
import polars as pl
def load(folder, table):
    files = sorted(f for f in glob.glob(f"{folder}/{table}/*.parquet") if not f.split("/")[-1].startswith((".", "_")))
    df = pl.concat([pl.read_parquet(f) for f in files], how="vertical_relaxed")
    cols = sorted(df.columns)
    df = df.select(cols)
    casts = {c: pl.Int64 for c, t in zip(df.columns, df.dtypes) if t.is_integer()}
    df = df.with_columns([pl.col(c).cast(pl.Int64) for c in casts])
    return df.sort(cols, nulls_last=True), len(files)
ok = True
for table in ("user_daily", "campaign_daily"):
    a, fa = load(sys.argv[1], table); b, fb = load(sys.argv[2], table)
    same = a.shape == b.shape and a.equals(b, null_equal=True)
    ha = hashlib.sha256(a.write_csv().encode()).hexdigest()[:16]; hb = hashlib.sha256(b.write_csv().encode()).hexdigest()[:16]
    print(f"{table}: rows {a.height} vs {b.height}, files {fa} vs {fb}, sorted-row sha256 {ha} vs {hb}: {'IDENTICAL' if same and ha == hb else 'DIFFERENT'}")
    ok &= same and ha == hb
print("ROWDIFF", "IDENTICAL" if ok else "DIFFERENT")
