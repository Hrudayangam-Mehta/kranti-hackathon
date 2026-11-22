#!/usr/bin/env python3
"""Run the unchanged plain reference semantics with a bounded Arrow writer.

Only write_outputs is replaced. Deduplication, identity resolution, sessions,
attribution, and assists are all computed by the pinned independent reference.
Its in-memory algorithm is intended for medium datasets, not a 60M oracle.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import importlib.util
import json
from pathlib import Path
import resource
import sys
import time

import pyarrow as pa
import pyarrow.parquet as pq

from external_compare import TABLES


def main():
    root=Path(__file__).resolve().parent
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("data",type=Path)
    parser.add_argument("output",type=Path)
    parser.add_argument("--reference",type=Path,default=root.parents[1]/"handoff/tracks/shopping-sessions/verify/ref.py")
    parser.add_argument("--batch-rows",type=int,default=8192)
    parser.add_argument("--report",type=Path,required=True)
    args=parser.parse_args()
    if hasattr(sys,"set_int_max_str_digits"):sys.set_int_max_str_digits(0)
    spec=importlib.util.spec_from_file_location("independent_reference",args.reference)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    counts={}
    kinds={"string":pa.string(),"optional_string":pa.string(),"date":pa.date32(),"integer":pa.int64()}
    epoch=dt.date(1970,1,1)
    def write_rows(name,records):
        folder=args.output/name;folder.mkdir(parents=True,exist_ok=True)
        existing=list(folder.glob("*.parquet"))
        if any(p.name!="part-0.parquet" for p in existing):raise ValueError(f"unexpected old output files in {folder}")
        schema=pa.schema([(n,kinds[k]) for n,k in TABLES[name]])
        batch=[];count=0
        with pq.ParquetWriter(folder/"part-0.parquet",schema,compression="zstd") as writer:
            for record in records:
                batch.append(dict(zip(schema.names,record)));count+=1
                if len(batch)==args.batch_rows:
                    writer.write_table(pa.Table.from_pylist(batch,schema=schema));batch.clear()
            if batch:writer.write_table(pa.Table.from_pylist(batch,schema=schema))
        counts[name]=count
    def write_outputs(unused,users,campaigns,channels):
        def user_rows():
            for (person,day),(sessions,events,revenue,categories) in users.items():
                category=module.top_category(categories)
                yield (person.decode(),epoch+dt.timedelta(days=day),sessions,events,revenue,None if category is None else category.decode())
        def campaign_rows():
            for (campaign,day),(sessions,purchasing,revenue,assists) in campaigns.items():
                yield (campaign.decode(),"organic" if campaign==b"organic" else channels[campaign].decode(),epoch+dt.timedelta(days=day),sessions,purchasing,revenue,assists)
        write_rows("user_daily",user_rows());write_rows("campaign_daily",campaign_rows())
    module.write_outputs=write_outputs
    started=time.monotonic();saved=sys.argv
    sys.argv=[str(args.reference),str(args.data),str(args.output)]
    try:module.main()
    finally:sys.argv=saved
    sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
    report={"data":str(args.data.resolve()),"output":str(args.output.resolve()),"reference":str(args.reference.resolve()),
            "reference_sha256":sha(args.reference),"wrapper_sha256":sha(Path(__file__)),"manifest":json.loads((args.data/"manifest.json").read_text()),
            "input_files":[{"path":str(p.relative_to(args.data)),"bytes":p.stat().st_size} for p in sorted(args.data.rglob("*.csv")) if p.is_file()],
            "rows":counts,"diagnostics":module.diag,"pyarrow":pa.__version__,"writer_batch_rows":args.batch_rows,
            "seconds":time.monotonic()-started,"maxrss_kib":resource.getrusage(resource.RUSAGE_SELF).ru_maxrss}
    args.report.parent.mkdir(parents=True,exist_ok=True);args.report.write_text(json.dumps(report,indent=2))
    print(json.dumps({k:report[k] for k in ("rows","seconds","maxrss_kib")}))


if __name__=="__main__":main()
