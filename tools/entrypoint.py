#!/usr/bin/env python3
"""Parse Python safely once per batch, then replace this process with Rust."""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import sys
import tempfile

from analyze_changes import Analyzer


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", default="/data", type=Path)
    parser.add_argument("--map", default="/opt/impact-map.json", type=Path)
    parser.add_argument("--selector", default="/app/blast-radius-selector", type=Path)
    parser.add_argument("--policy", choices=("function", "line"), default="function",
                        help="line is an experimental, less conservative policy")
    parser.add_argument("--mode", choices=("impact", "baseline-all"), default="impact")
    parser.add_argument("--precision", choices=("statement", "function"), default="statement")
    parser.add_argument("--observations", type=Path, help="Optional cold baseline operand observations")
    parser.add_argument("--no-observations", action="store_true", help="Disable optional observed-equivalence inference")
    parser.add_argument("--metadata", type=Path, help="Optional cold baseline metadata-reader observations")
    parser.add_argument("--no-metadata", action="store_true", help="Disable optional metadata-reader refinement")
    args = parser.parse_args()
    command = [str(args.selector.resolve()), "--data", str(args.data.resolve()),
               "--map", str(args.map.resolve()), "--policy", args.policy,
               "--mode", args.mode, "--precision", args.precision]
    if args.mode != "baseline-all":
        try:
            document = json.loads(args.map.read_text(encoding="utf-8"))
            if type(document) is not dict or type(document.get("files")) is not dict:
                raise ValueError("impact map requires a files object")
            analyzer = Analyzer(document["files"])
            commits = {}
            for path in sorted((args.data / "commits").glob("*.patch")):
                try:
                    with path.open("rb") as stream:
                        patch = stream.read(8 * 1024 * 1024 + 1)
                    commits[path.stem] = analyzer.analyze(patch)
                except (OSError, MemoryError):
                    commits[path.stem] = {"files": {}, "force_all": True}
            analysis_document = {"commits": commits}
            catalog = None
            observation_path = args.observations or args.map.with_name("comparison-observations.json")
            if not args.no_observations and observation_path.is_file():
                try:
                    from observed_equivalence import ObservationProfile, enrich_analysis
                    observations = json.loads(observation_path.read_text(encoding="utf-8"))
                    catalog = json.loads((args.data / "tests.json").read_text(encoding="utf-8"))
                    # Observations depend on ordered identities, not JSON whitespace
                    # or scheduling weights. The original byte hash stays in provenance.
                    profile = ObservationProfile(observations, document, catalog)
                    analysis_document = enrich_analysis(analysis_document, profile)
                except (OSError, ValueError, KeyError, TypeError, ImportError,
                        MemoryError, RecursionError, OverflowError) as error:
                    print(f"optional comparison observations unavailable: {error}", file=sys.stderr)
            metadata_path = args.metadata or args.map.with_name("metadata-observations.json")
            if not args.no_metadata and metadata_path.is_file():
                try:
                    from metadata_equivalence import MetadataProfile, enrich_metadata
                    observations = json.loads(metadata_path.read_text(encoding="utf-8"))
                    if catalog is None:
                        catalog = json.loads((args.data / "tests.json").read_text(encoding="utf-8"))
                    profile = MetadataProfile(observations, document, catalog)
                    analysis_document = enrich_metadata(analysis_document, profile)
                except (OSError, ValueError, KeyError, TypeError, ImportError,
                        MemoryError, RecursionError, OverflowError) as error:
                    print(f"optional metadata observations unavailable: {error}", file=sys.stderr)
            with tempfile.NamedTemporaryFile(
                mode="w", prefix="blast-analysis-", suffix=".json",
                encoding="utf-8", delete=False,
            ) as target:
                json.dump(analysis_document, target, separators=(",", ":"))
                analysis_path = target.name
            command += ["--analysis", analysis_path]
        except (OSError, ValueError, KeyError, TypeError,
                MemoryError, RecursionError, OverflowError) as error:
            print(f"semantic analysis unavailable; using all tests: {error}", file=sys.stderr)
            command[command.index("--mode") + 1] = "baseline-all"
    # No application logs or JSON diagnostics may appear on stdout.
    sys.stdout.flush()
    sys.stderr.flush()
    os.execv(command[0], command)


if __name__ == "__main__":
    main()
