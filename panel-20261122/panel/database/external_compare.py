#!/usr/bin/env python3
"""Exact, bounded-memory comparison of the two output-table multisets.

Validate original per-file schemas, normalize accepted integer widths, externally
sort one side at a time with DuckDB, then compare streamed rows. No hash digest
is used to decide equality and row multiplicity is preserved. Canonical copies
and spills are disposable; source outputs are read-only.
"""
from __future__ import annotations

import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import resource
import tempfile
import time

import duckdb
import pyarrow as pa
import pyarrow.parquet as pq

TABLES = {
    "user_daily": [
        ("user_id", "string"), ("day", "date"), ("sessions", "integer"),
        ("events", "integer"), ("revenue_cents", "integer"), ("top_category", "optional_string"),
    ],
    "campaign_daily": [
        ("campaign_id", "string"), ("channel", "string"), ("day", "date"),
        ("sessions", "integer"), ("purchasing_sessions", "integer"),
        ("revenue_cents", "integer"), ("assisted_sessions", "integer"),
    ],
}


def quote(value):
    return "'" + str(value).replace("'", "''") + "'"


def files_and_schema(root, name):
    folder = root / name
    if folder.is_symlink() or not folder.is_dir():
        raise ValueError(f"expected an output directory: {folder}")
    files = sorted(p for p in folder.glob("*.parquet") if p.is_file() and not p.is_symlink() and not p.name.startswith((".", "_")))
    if not files:
        raise ValueError(f"{root}: {name} has no visible regular Parquet file")
    expected = dict(TABLES[name])
    inventory = []
    for path in files:
        metadata = pq.read_metadata(path)
        schema = metadata.schema.to_arrow_schema()
        if len(schema.names) != len(expected) or set(schema.names) != set(expected):
            raise ValueError(f"{path}: wrong/duplicate column names: {schema.names}")
        for field in schema:
            kind = expected[field.name]
            logical_type = field.type.value_type if pa.types.is_dictionary(field.type) else field.type
            string_type = pa.types.is_string(logical_type) or pa.types.is_large_string(logical_type)
            valid = ((kind in ("string", "optional_string") and string_type)
                     or (kind == "date" and pa.types.is_date32(field.type))
                     or (kind == "integer" and pa.types.is_integer(field.type)))
            if not valid:
                raise ValueError(f"{path}: {field.name} must be {kind}, got {field.type}")
        inventory.append({"path": str(path), "bytes": path.stat().st_size, "rows": metadata.num_rows,
                          "schema": [(f.name, str(f.type)) for f in schema]})
    return files, inventory


def canonicalize(connection, source_files, destination, table):
    projections = []
    required = []
    for name, kind in TABLES[table]:
        column = '"' + name + '"'
        cast = "HUGEINT" if kind == "integer" else "DATE" if kind == "date" else "VARCHAR"
        projections.append(f"CAST({column} AS {cast}) AS {column}")
        if kind != "optional_string":
            required.append(f"{column} IS NULL")
    input_list = "[" + ",".join(quote(p) for p in source_files) + "]"
    # Bind all file schemas before scanning so a first narrow integer file
    # cannot force lossy conversion of a later wider/unsigned value.
    scan = f"read_parquet({input_list}, union_by_name=true, hive_partitioning=false)"
    invalid = connection.execute(f"SELECT count(*) FROM {scan} WHERE " + " OR ".join(required)).fetchone()[0]
    if invalid:
        raise ValueError(f"{table}: {invalid} rows contain nulls in required columns")
    select = "SELECT " + ",".join(projections) + " FROM " + scan
    order = ",".join('"' + name + '" ASC NULLS FIRST' for name, _ in TABLES[table])
    # ORDER BY is an external operator. Copy only this side, then release its
    # engine state before comparing batches from both canonical files.
    connection.execute(f"COPY ({select} ORDER BY {order}) TO {quote(destination)} (FORMAT PARQUET, COMPRESSION ZSTD, ROW_GROUP_SIZE 8192)")


def rows(path, batch_rows):
    parquet = pq.ParquetFile(path)
    for batch in parquet.iter_batches(batch_size=batch_rows, use_threads=False):
        columns = [array.to_pylist() for array in batch.columns]
        yield from zip(*columns)


def compare_rows(left, right, batch_rows, sample_limit):
    # Canonical rows are identically sorted. A streaming merge retains exact
    # multiplicity, reports both directions, and stores only small samples.
    end = object()
    a = iter(rows(left, batch_rows)); b = iter(rows(right, batch_rows))
    x = next(a, end); y = next(b, end)
    missing = extra = matched = 0
    examples_missing = []; examples_extra = []
    key = lambda row: tuple((v is not None, v) for v in row)
    while x is not end or y is not end:
        if x is not end and y is not end and x == y:
            matched += 1; x = next(a, end); y = next(b, end)
        elif y is end or (x is not end and key(x) < key(y)):
            missing += 1
            if len(examples_missing) < sample_limit: examples_missing.append(x)
            x = next(a, end)
        else:
            extra += 1
            if len(examples_extra) < sample_limit: examples_extra.append(y)
            y = next(b, end)
    return {"matched_rows": matched, "missing_rows": missing, "extra_rows": extra,
            "missing_examples": examples_missing, "extra_examples": examples_extra,
            "equal": missing == 0 and extra == 0}


def compare(left, right, work, memory_limit="512MB", threads=1, batch_rows=2048, sample_limit=5):
    started = time.monotonic()
    work.mkdir(parents=True, exist_ok=True)
    report = {"reference": str(left), "candidate": str(right), "duckdb": duckdb.__version__,
              "pyarrow": pa.__version__, "memory_limit": memory_limit, "threads": threads,
              "batch_rows": batch_rows, "method": "validated schemas, external total sort, exact streamed multiset merge",
              "started_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(), "tables": {}}
    with tempfile.TemporaryDirectory(prefix="exact-compare-", dir=work) as temporary:
        scratch = Path(temporary)
        connection = duckdb.connect(config={"threads": threads, "memory_limit": memory_limit,
                                             "preserve_insertion_order": False,
                                             "temp_directory": str(scratch / "spill"),
                                             "max_temp_directory_size": "24GB"})
        try:
            for table in TABLES:
                tick = time.monotonic()
                lhs, inventory_l = files_and_schema(left, table)
                rhs, inventory_r = files_and_schema(right, table)
                c_left = scratch / f"{table}-left.parquet"
                c_right = scratch / f"{table}-right.parquet"
                canonicalize(connection, lhs, c_left, table)
                canonicalize(connection, rhs, c_right, table)
                result = compare_rows(c_left, c_right, batch_rows, sample_limit)
                result.update(reference_files=inventory_l, candidate_files=inventory_r,
                              canonical_bytes=c_left.stat().st_size+c_right.stat().st_size,
                              seconds=time.monotonic()-tick)
                report["tables"][table] = result
                print(json.dumps({"table": table, **{k: result[k] for k in ("matched_rows", "missing_rows", "extra_rows", "equal", "seconds")}}), flush=True)
                c_left.unlink(); c_right.unlink()
        finally:
            connection.close()
    report["equal"] = all(t["equal"] for t in report["tables"].values())
    report["seconds"] = time.monotonic()-started
    report["maxrss_kib"] = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    report["script_sha256"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("reference", type=Path)
    parser.add_argument("candidate", type=Path)
    parser.add_argument("--work", type=Path, default=Path(__file__).resolve().parent / "comparison-work")
    parser.add_argument("--memory-limit", default="512MB")
    parser.add_argument("--threads", type=int, default=1)
    parser.add_argument("--batch-rows", type=int, default=2048)
    parser.add_argument("--report", type=Path, required=True)
    args=parser.parse_args()
    try:
        result=compare(args.reference.resolve(),args.candidate.resolve(),args.work.resolve(),args.memory_limit,args.threads,args.batch_rows)
    except Exception as exc:
        result={"equal": False,"error": str(exc),"reference": str(args.reference),"candidate": str(args.candidate),
                "maxrss_kib": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss}
    args.report.parent.mkdir(parents=True,exist_ok=True)
    args.report.write_text(json.dumps(result,default=str,indent=2))
    print(json.dumps({k:v for k,v in result.items() if k!="tables"},default=str))
    return int(not result["equal"])


if __name__=="__main__":
    raise SystemExit(main())
