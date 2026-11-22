#!/usr/bin/env python3
"""Small fault-injection checks for the exact output comparator itself."""
from __future__ import annotations

import contextlib
import datetime as dt
import io
import json
from pathlib import Path
import tempfile

import pyarrow as pa
import pyarrow.parquet as pq

from external_compare import TABLES, compare

DAY=dt.date(2028,2,25)
USERS=[(" A",DAY,1,2,100,None),("u1",DAY,2,5,900,""),("é",DAY,1,1,40,"beta")]
CAMPAIGNS=[("organic","organic",DAY,4,3,1040,0)]


def write_part(root,table,rows,part=0,integer=pa.int64(),reverse_columns=False,override=None):
    kinds={"string":pa.string(),"optional_string":pa.string(),"date":pa.date32(),"integer":integer}
    schema=pa.schema([(name,(override or {}).get(name,kinds[kind])) for name,kind in TABLES[table]])
    tab=pa.Table.from_pylist([dict(zip(schema.names,row)) for row in rows],schema=schema)
    if reverse_columns:tab=tab.select(list(reversed(tab.column_names)))
    folder=root/table;folder.mkdir(parents=True,exist_ok=True)
    pq.write_table(tab,folder/f"part-{part}.parquet",row_group_size=1)


def baseline(root):
    write_part(root,"user_daily",USERS)
    write_part(root,"campaign_daily",CAMPAIGNS)


def main():
    report=[]
    with tempfile.TemporaryDirectory(prefix="comparator-selftest-") as temporary:
        root=Path(temporary);left=root/"reference";baseline(left)
        def check(name,build,expected_equal=None,expected_error=None,missing=None,extra=None):
            right=root/name;baseline(right);build(right)
            error=None;result=None
            try:
                with contextlib.redirect_stdout(io.StringIO()):
                    result=compare(left,right,root/"work",memory_limit="64MB",batch_rows=1)
            except Exception as exc:error=str(exc)
            passed=(expected_error in error if expected_error is not None and error is not None else False) if expected_error else (error is None and result["equal"]==expected_equal)
            if passed and missing is not None:passed=result["tables"]["user_daily"]["missing_rows"]==missing
            if passed and extra is not None:passed=result["tables"]["user_daily"]["extra_rows"]==extra
            report.append({"case":name,"passed":passed,"error":error,"result":None if result is None else {k:{n:v[n] for n in ("matched_rows","missing_rows","extra_rows","equal")} for k,v in result["tables"].items()}})

        def reordered(right):
            write_part(right,"user_daily",list(reversed(USERS[:2])),integer=pa.int32(),reverse_columns=True)
            write_part(right,"user_daily",USERS[2:],part=1,integer=pa.uint64())
            # Ignored output names and symlinks must not create duplicate rows.
            folder=right/"user_daily"
            (folder/"_ignore.parquet").write_bytes(b"invalid ignored file")
            (folder/".ignore.parquet").write_bytes(b"invalid ignored file")
            (folder/"alias.parquet").symlink_to(folder/"part-0.parquet")
        check("partition_order_integer_width",reordered,True)
        check("duplicate_multiplicity",lambda r:write_part(r,"user_daily",USERS+[USERS[0]]),False,missing=0,extra=1)
        check("missing_row",lambda r:write_part(r,"user_daily",USERS[:-1]),False,missing=1,extra=0)
        changed=list(USERS);changed[1]=(*USERS[1][:4],901,USERS[1][5])
        check("changed_revenue",lambda r:write_part(r,"user_daily",changed),False,missing=1,extra=1)
        changed_null=list(USERS);changed_null[0]=(*USERS[0][:5],"")
        check("null_is_not_empty",lambda r:write_part(r,"user_daily",changed_null),False,missing=1,extra=1)
        wrong_day=[(u,str(day),s,e,v,c) for u,day,s,e,v,c in USERS]
        check("date_schema",lambda r:write_part(r,"user_daily",wrong_day,override={"day":pa.string()}),expected_error="must be date")
        null_user=list(USERS);null_user[0]=(None,*USERS[0][1:])
        check("required_null",lambda r:write_part(r,"user_daily",null_user),expected_error="nulls in required")
        def wrong_names(right):
            folder=right/"user_daily"
            tab=pq.read_table(folder/"part-0.parquet")
            pq.write_table(tab.rename_columns(["wrong"]+tab.column_names[1:]),folder/"part-0.parquet")
        check("wrong_column_name",wrong_names,expected_error="wrong/duplicate column names")
        def dictionary_string(right):
            folder=right/"user_daily"
            tab=pq.read_table(folder/"part-0.parquet")
            at=tab.column_names.index("top_category")
            tab=tab.set_column(at,"top_category",tab.column(at).dictionary_encode())
            pq.write_table(tab,folder/"part-0.parquet")
        check("dictionary_string",dictionary_string,True)
        def symlink_folder(right):
            folder=right/"user_daily"
            folder.rename(right/"backing")
            folder.symlink_to(right/"backing",target_is_directory=True)
        check("symlink_output_directory",symlink_folder,expected_error="expected an output directory")
        large=[*USERS[:2],(*USERS[2][:4],(1<<63)+7,USERS[2][5])]
        write_part(left,"user_daily",large,integer=pa.uint64())
        def unsigned_edge(right):
            write_part(right,"user_daily",large[:2],integer=pa.int32())
            write_part(right,"user_daily",large[2:],part=1,integer=pa.uint64())
        check("mixed_unsigned_above_i64",unsigned_edge,True)
    destination=Path(__file__).resolve().parent/"comparator-selftest.json"
    destination.write_text(json.dumps({"checks":report,"passed":sum(r["passed"] for r in report),"total":len(report)},indent=2))
    print(destination.read_text())
    return int(any(not r["passed"] for r in report))


if __name__=="__main__":raise SystemExit(main())
