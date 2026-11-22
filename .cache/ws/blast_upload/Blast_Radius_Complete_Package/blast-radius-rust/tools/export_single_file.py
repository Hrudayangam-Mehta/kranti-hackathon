#!/usr/bin/env python3
"""Export the authored Rust modules as one standalone, dependency-free source file.

Run: python3 tools/export_single_file.py
Then: rustc --edition=2021 -O submission.rs -o blast-radius-selector
The output is mechanically assembled from src/, never from sample answers or
other teams' code. src/ remains the canonical editable implementation.
"""
from pathlib import Path


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    source = (root / "src" / "main.rs").read_text(encoding="utf-8")
    for name in ("diff", "json", "schedule"):
        marker = f"mod {name};"
        if source.count(marker) != 1:
            raise SystemExit(f"Expected exactly one module declaration: {marker}")
        body = (root / "src" / f"{name}.rs").read_text(encoding="utf-8")
        source = source.replace(marker, f"mod {name} {{\n{body}\n}}", 1)
    output = root / "submission.rs"
    output.write_text(source, encoding="utf-8")
    print(f"Exported {output.name} ({output.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
