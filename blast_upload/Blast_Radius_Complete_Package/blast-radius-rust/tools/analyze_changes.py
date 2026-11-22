#!/usr/bin/env python3
"""Strict, baseline-only Python syntax/AST analysis for a batch of patches.

The output is an optional aid to the Rust selector, never a failing-test oracle.
Each patch is applied independently to source stored in the baseline map. Unknown
formats, encodings, paths, or mismatched hunk contents request a run-all fallback.
Known non-Python fixtures without stored source receive no equivalence claim;
their baseline consumers remain the Rust selector's responsibility.
"""
from __future__ import annotations

import argparse
import ast
from dataclasses import dataclass
import io
import json
from pathlib import Path
import re
import sys
import tokenize


MAX_PATCH_BYTES = 8 * 1024 * 1024
HUNK = re.compile(r"@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(?:[ \t].*)?$")
INDEX = re.compile(r"index [0-9a-fA-F]+\.\.[0-9a-fA-F]+(?: [0-7]{6})?$")
COOKIE = re.compile(r"^[ \t\f]*#.*?coding[:=][ \t]*([-\w.]+)")
NO_NEWLINE = "\\ No newline at end of file"


class UnsupportedPatch(ValueError):
    """A patch cannot be proven to apply exactly to the pinned baseline."""


@dataclass
class Hunk:
    old_start: int
    old_count: int
    new_start: int
    new_count: int
    rows: list[tuple[str, str]]


@dataclass
class FilePatch:
    path: str
    hunks: list[Hunk]


def physical_lines(text: str) -> list[str]:
    """Split LF physical lines, preserving a missing final LF and Unicode data."""
    pieces = text.split("\n")
    return [part + "\n" for part in pieces[:-1]] + ([pieces[-1]] if pieces[-1] else [])


def without_lf(line: str) -> str:
    return line[:-1] if line.endswith("\n") else line


def git_path(raw: str, prefix: str) -> str:
    if not raw.startswith(prefix):
        raise UnsupportedPatch("unsupported path prefix, addition, or deletion")
    path = raw[len(prefix):]
    if (not path or path.startswith("/") or "\\" in path or '"' in path
            or any(c.isspace() or ord(c) < 32 for c in path)
            or any(part in ("", ".", "..") for part in path.split("/"))):
        raise UnsupportedPatch("unsupported or unsafe path")
    return path


def parse_patch(text: str) -> list[FilePatch]:
    if not text or "\r" in text or "\x00" in text or text.startswith("\ufeff"):
        raise UnsupportedPatch("empty, non-LF, NUL, or BOM patch")
    lines = physical_lines(text)
    result: list[FilePatch] = []
    seen: set[str] = set()
    i = 0
    while i < len(lines):
        expected = None
        header = without_lf(lines[i])
        if header.startswith("diff --git "):
            pair = header[len("diff --git "):].split(" ")
            if len(pair) != 2:
                raise UnsupportedPatch("quoted or ambiguous git header")
            old = git_path(pair[0], "a/")
            new = git_path(pair[1], "b/")
            if old != new:
                raise UnsupportedPatch("renamed or copied file")
            expected = old
            i += 1
            if i < len(lines) and INDEX.fullmatch(without_lf(lines[i])):
                i += 1
        if i + 1 >= len(lines) or not lines[i].startswith("--- ") or not lines[i + 1].startswith("+++ "):
            raise UnsupportedPatch("missing file header or unsupported extended metadata")
        old = git_path(without_lf(lines[i])[4:], "a/")
        new = git_path(without_lf(lines[i + 1])[4:], "b/")
        if old != new or (expected is not None and old != expected) or old in seen:
            raise UnsupportedPatch("mismatched, renamed, or duplicate file header")
        seen.add(old)
        i += 2
        hunks: list[Hunk] = []
        old_cursor = new_cursor = 0
        while i < len(lines) and lines[i].startswith("@@"):
            match = HUNK.fullmatch(without_lf(lines[i]))
            if not match:
                raise UnsupportedPatch("malformed hunk header")
            os_, oc, ns, nc = match.groups()
            old_start, old_count = int(os_), int(oc) if oc is not None else 1
            new_start, new_count = int(ns), int(nc) if nc is not None else 1
            if (old_count and old_start == 0) or (new_count and new_start == 0):
                raise UnsupportedPatch("positive hunk ranges are one-based")
            if not old_count and not new_count:
                raise UnsupportedPatch("empty hunk")
            old_index = old_start - 1 if old_count else old_start
            new_index = new_start - 1 if new_count else new_start
            if old_index < old_cursor or new_index < new_cursor:
                raise UnsupportedPatch("overlapping or reversed hunks")
            if old_index - old_cursor != new_index - new_cursor:
                raise UnsupportedPatch("inconsistent old/new hunk coordinates")
            rows: list[tuple[str, str]] = []
            old_seen = new_seen = 0
            i += 1
            while i < len(lines):
                line = lines[i]
                if without_lf(line) == NO_NEWLINE:
                    if not rows or not rows[-1][1].endswith("\n"):
                        raise UnsupportedPatch("invalid no-newline marker")
                    tag, payload = rows[-1]
                    rows[-1] = (tag, payload[:-1])
                    i += 1
                    continue
                if old_seen == old_count and new_seen == new_count:
                    break
                if not line or line[0] not in " +-":
                    raise UnsupportedPatch("incomplete hunk or unsupported hunk row")
                tag, payload = line[0], line[1:]
                # A physically unterminated patch row must still explicitly mark
                # that the corresponding source line lacks its terminating LF.
                if not payload.endswith("\n"):
                    raise UnsupportedPatch("unterminated hunk row without marker")
                old_seen += tag != "+"
                new_seen += tag != "-"
                if old_seen > old_count or new_seen > new_count:
                    raise UnsupportedPatch("hunk line counts do not match")
                rows.append((tag, payload))
                i += 1
            if old_seen != old_count or new_seen != new_count:
                raise UnsupportedPatch("truncated hunk")
            # A no-LF row can only be the final line on that side of the patch.
            for side in ("old", "new"):
                relevant = [payload for tag, payload in rows if tag != ("+" if side == "old" else "-")]
                if any(not line.endswith("\n") for line in relevant[:-1]):
                    raise UnsupportedPatch("no-newline marker before later source lines")
            hunks.append(Hunk(old_start, old_count, new_start, new_count, rows))
            old_cursor = old_index + old_count
            new_cursor = new_index + new_count
        if not hunks:
            raise UnsupportedPatch("no textual hunks; structural or binary change")
        result.append(FilePatch(old, hunks))
        if i < len(lines) and not (lines[i].startswith("diff --git ") or lines[i].startswith("--- ")):
            raise UnsupportedPatch("trailing data or unsupported patch format")
    return result


def apply_exact(source: str, patch: FilePatch) -> str:
    original = physical_lines(source)
    output: list[str] = []
    cursor = 0
    for hunk in patch.hunks:
        start = hunk.old_start - 1 if hunk.old_count else hunk.old_start
        new_start = hunk.new_start - 1 if hunk.new_count else hunk.new_start
        if start < cursor or start > len(original) or start + hunk.old_count > len(original):
            raise UnsupportedPatch("hunk outside baseline source")
        output.extend(original[cursor:start])
        if len(output) != new_start:
            raise UnsupportedPatch("new hunk range does not match exact application")
        cursor = start
        for tag, payload in hunk.rows:
            if tag != "+":
                if cursor >= len(original) or original[cursor] != payload:
                    raise UnsupportedPatch("old hunk content differs from pinned source")
                cursor += 1
            if tag != "-":
                output.append(payload)
    output.extend(original[cursor:])
    if any(not line.endswith("\n") for line in output[:-1]):
        raise UnsupportedPatch("new source has content after an unterminated line")
    return "".join(output)


def source_pragmas(source: str) -> tuple[tuple[int, str], ...]:
    if "\r" in source or source.startswith("\ufeff"):
        raise UnsupportedPatch("non-LF or BOM source")
    try:
        encoded = source.encode("utf-8", errors="strict")
        encoding, _ = tokenize.detect_encoding(io.BytesIO(encoded).readline)
    except (SyntaxError, UnicodeError) as error:
        raise UnsupportedPatch("unknown source encoding") from error
    if encoding != "utf-8":
        raise UnsupportedPatch("source encoding is not plain UTF-8")
    pragmas = []
    for number, line in enumerate(physical_lines(source)[:2], 1):
        if COOKIE.match(line) or (number == 1 and line.startswith("#!")):
            pragmas.append((number, line))
    return tuple(pragmas)


class Analyzer:
    def __init__(self, files: dict):
        self.files = files
        self.baseline_cache: dict[str, tuple[str, tuple[tuple[int, str], ...]]] = {}

    def baseline(self, path: str, source: str):
        if path not in self.baseline_cache:
            pragmas = source_pragmas(source)
            compile(source, path, "exec", dont_inherit=True, optimize=0)
            tree = ast.parse(source, filename=path, type_comments=True)
            self.baseline_cache[path] = (ast.dump(tree, include_attributes=False), pragmas)
        return self.baseline_cache[path]

    def analyze(self, patch_bytes: bytes) -> dict:
        result = {"files": {}, "force_all": False}
        try:
            if len(patch_bytes) > MAX_PATCH_BYTES:
                raise UnsupportedPatch("patch exceeds analysis budget")
            changes = parse_patch(patch_bytes.decode("utf-8", errors="strict"))
            for change in changes:
                flags = {"syntax_error": False, "ast_equal": False}
                result["files"][change.path] = flags
                record = self.files.get(change.path)
                if not isinstance(record, dict):
                    raise UnsupportedPatch("changed file absent from baseline map")
                source = record.get("source")
                if not isinstance(source, str):
                    if change.path.endswith(".py") or not change.path.startswith("tests/fixtures/"):
                        raise UnsupportedPatch("missing baseline source")
                    # The Rust selector will include all mapped fixture consumers.
                    # No content equality or semantic no-op conclusion is asserted.
                    continue
                updated = apply_exact(source, change)
                if not change.path.endswith(".py"):
                    continue
                baseline_dump, baseline_pragmas = self.baseline(change.path, source)
                changed_pragmas = source_pragmas(updated)
                if changed_pragmas != baseline_pragmas:
                    raise UnsupportedPatch("source encoding or shebang pragma changed")
                try:
                    tree = ast.parse(updated, filename=change.path, type_comments=True)
                    compile(updated, change.path, "exec", dont_inherit=True, optimize=0)
                except (SyntaxError, ValueError):
                    flags["syntax_error"] = True
                    continue
                flags["ast_equal"] = ast.dump(tree, include_attributes=False) == baseline_dump
        except (UnsupportedPatch, UnicodeError, SyntaxError, ValueError, RecursionError, OverflowError) as error:
            result["force_all"] = True
            # The schema deliberately excludes messages: diagnostics never affect
            # runtime behavior and contain no sample-answer knowledge.
            print(f"analysis fallback: {type(error).__name__}: {error}", file=sys.stderr)
        return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--map", required=True, type=Path)
    parser.add_argument("--data", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    try:
        document = json.loads(args.map.read_text(encoding="utf-8"))
        files = document["files"]
        if not isinstance(files, dict):
            raise ValueError("map.files must be an object")
    except (OSError, ValueError, KeyError, TypeError) as error:
        print(f"unusable baseline map; all patches will use fallback: {error}", file=sys.stderr)
        files = {}
    analyzer = Analyzer(files)
    commits = {}
    for path in sorted((args.data / "commits").glob("*.patch")):
        try:
            commits[path.stem] = analyzer.analyze(path.read_bytes())
        except OSError as error:
            print(f"cannot read patch {path.name}: {error}", file=sys.stderr)
            commits[path.stem] = {"files": {}, "force_all": True}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({"commits": commits}, separators=(",", ":")), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
