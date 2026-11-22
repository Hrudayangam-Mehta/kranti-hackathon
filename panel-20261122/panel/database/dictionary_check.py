#!/usr/bin/env python3
"""Exercise production dictionary writer using two independent Parquet readers.

The Rust driver includes the production write/parquet modules unchanged. Its
deterministic identity-decoder fixture stub allows otherwise unrepresentative
dictionary cardinalities. Normal pipeline gates separately exercise real IDs.
"""
import argparse
from collections import Counter
import datetime as dt
import functools
import hashlib
import json
import os
from pathlib import Path
import resource
import subprocess
import time

import duckdb
import pyarrow as pa
import pyarrow.parquet as pq

HERE = Path(__file__).resolve().parent
COLUMNS = ("user_id", "day", "sessions", "events", "revenue_cents", "top_category")


@functools.lru_cache(maxsize=None)
def name(index):
    if index == 31:
        return "long-" + "é" * 4500
    return (f"u{index}", f"{index:032x}", f" 用户 {index}", f" leading {index} ", f"U_{index}-é")[index % 5]


def expected_rows(count, rows, run, prefix):
    epoch = dt.date(1970, 1, 1)
    for i in range(prefix, prefix + rows):
        yield (name((i // run) % count), epoch + dt.timedelta(days=21000 + i % 14), 1 + i % 3, 8 + i % 3, (i % 17) * 101, None)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--root", type=Path, default=HERE / "dictionary-codec-data")
    parser.add_argument("--report", type=Path, default=HERE / "dictionary-codec.json")
    parser.add_argument("--rustc", default="/home/agent/.cargo/bin/rustc")
    args = parser.parse_args()
    args.source = args.source.resolve()
    args.root.mkdir(parents=True, exist_ok=True)
    sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
    sources = {str(p.relative_to(args.source)): sha(p) for p in (args.source / "src/fast/write.rs", args.source / "src/fast/parquet.rs")}
    driver = HERE / "dictionary_driver.rs"
    binary = args.root / "dictionary-driver"
    env = os.environ.copy()
    env["DICT_SOURCE"] = str(args.source)
    build = subprocess.run([args.rustc, "+1.97.0", "--edition=2021", "-O", str(driver), "-o", str(binary)], env=env, capture_output=True, text=True)
    if build.returncode:
        raise RuntimeError(build.stderr)
    cases = [(f"dictionary_{n}", n, 65537 if n <= 2 else n * 3 + 31, 3, 5, True) for n in (1, 2, 255, 256, 257, 65535, 65536, 65537)]
    cases += [("empty", 1, 0, 3, 5, False), ("tiny_plain", 2, 16, 3, 5, False), ("high_run_plain", 65537, 65537, 1, 5, False)]
    results = []
    started = time.monotonic()
    for label, count, rows, run, prefix, dictionary in cases:
        output = args.root / label
        began = time.monotonic()
        entry = {"case": label, "distinct": count, "rows": rows, "run": run, "range_start": prefix, "dictionary_expected": dictionary}
        try:
            execute = subprocess.run([str(binary), str(output), str(count), str(rows), str(run), str(prefix)], capture_output=True, timeout=60)
            assert execute.returncode == 0, execute.stderr.decode(errors="replace")
            assert not execute.stdout, "driver must not write stdout"
            path = output / "part-00000.parquet"
            parquet = pq.ParquetFile(path)
            schema = parquet.schema_arrow
            assert tuple(schema.names) == COLUMNS, str(schema)
            assert pa.types.is_date32(schema.field("day").type)
            assert pa.types.is_int32(schema.field("sessions").type)
            assert pa.types.is_int32(schema.field("events").type)
            assert pa.types.is_int64(schema.field("revenue_cents").type)
            assert pa.types.is_string(schema.field("user_id").type)
            assert pa.types.is_string(schema.field("top_category").type)
            assert schema.field("top_category").nullable
            assert all(not schema.field(c).nullable for c in COLUMNS[:-1])
            assert parquet.metadata.num_rows == rows
            if rows:
                chunk = parquet.metadata.row_group(0).column(0)
                entry.update(encodings=chunk.encodings, dictionary_page_offset=chunk.dictionary_page_offset, data_page_offset=chunk.data_page_offset)
                assert ("RLE_DICTIONARY" in chunk.encodings) == dictionary, entry
                if dictionary:
                    assert 4 <= chunk.dictionary_page_offset < chunk.data_page_offset
                else:
                    assert chunk.dictionary_page_offset is None
            expected = Counter(expected_rows(count, rows, run, prefix))
            arrow = Counter()
            for batch in parquet.iter_batches(batch_size=4096):
                arrow.update(tuple(row[c] for c in COLUMNS) for row in batch.to_pylist())
            assert arrow == expected, {"reader": "pyarrow", "missing": len(expected - arrow), "extra": len(arrow - expected)}
            connection = duckdb.connect()
            try:
                connection.execute("SET threads=1")
                connection.execute("SET memory_limit='128MB'")
                sql = "SELECT " + ",".join(COLUMNS) + " FROM read_parquet(?)"
                cursor = connection.execute(sql, [str(path)])
                second = Counter()
                while batch := cursor.fetchmany(4096):
                    second.update(batch)
                assert second == expected, {"reader": "duckdb", "missing": len(expected - second), "extra": len(second - expected)}
            finally:
                connection.close()
            entry.update(passed=True, readers=["pyarrow", "duckdb"], bytes=path.stat().st_size, file_sha256=sha(path))
        except Exception as error:
            entry.update(passed=False, error=str(error))
        entry["seconds"] = time.monotonic() - began
        results.append(entry)
        print(json.dumps(entry), flush=True)
    for relative, digest in sources.items():
        assert sha(args.source / relative) == digest, "production source changed during gate"
    report = {"source": str(args.source), "sources": sources, "driver_sha256": sha(driver), "check_sha256": sha(Path(__file__)), "binary_sha256": sha(binary), "rustc": subprocess.check_output([args.rustc, "+1.97.0", "--version"], text=True).strip(), "pyarrow": pa.__version__, "duckdb": duckdb.__version__, "results": results, "passed": sum(r["passed"] for r in results), "total": len(results), "seconds": time.monotonic() - started, "max_rss_kib": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss, "scope": "Production writer modules included unchanged, deterministic identity-decoder fixture; real Domain covered by separate pipeline tests."}
    args.report.write_text(json.dumps(report, indent=2))
    print(json.dumps({"passed": report["passed"], "total": report["total"], "report": str(args.report)}), flush=True)
    return int(report["passed"] != report["total"])


if __name__ == "__main__":
    raise SystemExit(main())
