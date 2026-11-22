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
from collections import Counter
from copy import copy
from dataclasses import dataclass
import io
import json
from pathlib import Path
import re
import sys
import tokenize
from types import CodeType


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


def same_ast(left, right) -> bool:
    """Compare semantic AST fields, retaining scalar types but ignoring positions."""
    if type(left) is not type(right):
        return False
    if isinstance(left, ast.AST):
        return all(same_ast(getattr(left, name, None), getattr(right, name, None))
                   for name in left._fields)
    if isinstance(left, (list, tuple)):
        return len(left) == len(right) and all(same_ast(a, b) for a, b in zip(left, right))
    return left == right


def function_start(node: ast.FunctionDef | ast.AsyncFunctionDef) -> int:
    return min([node.lineno, *(d.lineno for d in node.decorator_list)])


def code_index(code: CodeType) -> dict[tuple[str, int], CodeType]:
    result = {}
    pending = [code]
    while pending:
        current = pending.pop()
        result[current.co_name, current.co_firstlineno] = current
        pending.extend(value for value in current.co_consts if isinstance(value, CodeType))
    return result


def docstring(node: ast.FunctionDef | ast.AsyncFunctionDef):
    first = node.body[0] if node.body else None
    if isinstance(first, ast.Expr) and isinstance(first.value, ast.Constant) and isinstance(first.value.value, str):
        return first.value.value
    return None


_FUNCTIONS = (ast.FunctionDef, ast.AsyncFunctionDef)
_EXPRESSION_FIELDS = {
    ast.Expr: {"value"}, ast.Return: {"value"}, ast.Assign: {"value"},
    ast.AnnAssign: {"value"}, ast.AugAssign: {"value", "op"},
    ast.Assert: {"test", "msg"}, ast.Raise: {"exc", "cause"},
    ast.If: {"test"}, ast.While: {"test"}, ast.For: {"iter"},
}
_DEFERRED_OR_BINDING = (
    ast.Lambda, ast.ListComp, ast.SetComp, ast.DictComp, ast.GeneratorExp,
    ast.NamedExpr, ast.Yield, ast.YieldFrom, ast.Await,
)


def expression_is_local(node) -> bool:
    if node is None or isinstance(node, ast.operator):
        return True
    return isinstance(node, ast.expr) and not any(
        isinstance(part, _DEFERRED_OR_BINDING) for part in ast.walk(node))


def statement_regions(old: ast.FunctionDef, new: ast.FunctionDef):
    """Prove that every change lies in an expression of an existing statement.

    A region covers the WHOLE old statement, not just the edited line or first
    line: a multiline return expression can raise before a return-line event.
    Unchanged statement lists/targets keep binding and control scaffolding fixed.
    The caller separately validates compiled locals, free variables, and flags.
    """
    regions: set[tuple[int, int]] = set()

    def visit(left, right):
        if same_ast(left, right):
            return True
        if type(left) is not type(right):
            return False
        if isinstance(left, list):
            return len(left) == len(right) and all(visit(a, b) for a, b in zip(left, right))
        if isinstance(left, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef,
                             ast.Import, ast.ImportFrom, ast.Global, ast.Nonlocal)):
            return False
        if isinstance(left, ast.ExceptHandler):
            return same_ast(left.type, right.type) and left.name == right.name and visit(left.body, right.body)
        if not isinstance(left, ast.stmt):
            return False
        expressions = _EXPRESSION_FIELDS.get(type(left), set())
        for field in left._fields:
            before, after = getattr(left, field, None), getattr(right, field, None)
            if same_ast(before, after):
                continue
            if field in expressions:
                if not expression_is_local(before) or not expression_is_local(after):
                    return False
                regions.add((left.lineno, left.end_lineno))
            elif field in {"body", "orelse", "finalbody", "handlers"}:
                if not visit(before, after):
                    return False
            else:
                # Includes assignment/loop targets, exception names, import
                # definitions, match patterns, and with-statement bindings.
                return False
        return True

    if not visit(old.body, new.body) or not regions:
        return None
    return sorted(regions)


def locality(old: ast.Module, new: ast.Module, old_code: CodeType, new_code: CodeType) -> dict:
    """Return optional proof hints; an incomplete proof emits no narrowing hint."""
    old_codes, new_codes = code_index(old_code), code_index(new_code)
    changed = []

    def visit(left, right):
        if same_ast(left, right):
            return True
        if type(left) is not type(right):
            return False
        if isinstance(left, _FUNCTIONS):
            if any(not same_ast(getattr(left, name, None), getattr(right, name, None))
                   for name in left._fields if name != "body"):
                return False
            if docstring(left) != docstring(right):
                return False
            before = old_codes.get((left.name, function_start(left)))
            after = new_codes.get((right.name, function_start(right)))
            if before is None or after is None:
                return False
            if (before.co_flags, before.co_freevars, before.co_cellvars) != (
                    after.co_flags, after.co_freevars, after.co_cellvars):
                return False
            # Import edits and changed nested declaration metadata can affect
            # initialization/collection outside ordinary statement dependencies.
            def sensitive_nodes(node):
                result = []
                for part in ast.walk(node):
                    if isinstance(part, (ast.Import, ast.ImportFrom, ast.Global, ast.Nonlocal, ast.ClassDef)):
                        result.append(part)
                    elif isinstance(part, _FUNCTIONS):
                        result.append([type(part).__name__,
                                       [(name, getattr(part, name, None)) for name in part._fields if name != "body"],
                                       docstring(part)])
                return result
            if not same_ast(sensitive_nodes(left), sensitive_nodes(right)):
                return False
            changed.append((left, right, before, after))
            return True
        if isinstance(left, ast.AST):
            return all(visit(getattr(left, name, None), getattr(right, name, None))
                       for name in left._fields)
        if isinstance(left, list):
            return len(left) == len(right) and all(visit(a, b) for a, b in zip(left, right))
        return left == right

    if not visit(old, new) or not changed:
        return {}
    result = {"changed_functions": sorted({function_start(before) for before, _, _, _ in changed})}
    regions = []
    for before, after, code_before, code_after in changed:
        if (not isinstance(before, ast.FunctionDef) or before.decorator_list
                or code_before.co_varnames != code_after.co_varnames):
            return result
        spans = statement_regions(before, after)
        if spans is None:
            return result
        regions.extend(spans)
    unique = sorted(set(regions))
    # Avoid pathological JSON expansion for generated source. Function fallback
    # is still available and makes no statement-level precision claim.
    if sum(end - start + 1 for start, end in unique) > 100_000:
        return result
    result["precise_regions"] = [{"start": start, "end": end} for start, end in unique]
    result["precise_lines"] = sorted({line for start, end in unique for line in range(start, end + 1)})
    return result


def comparison_deltas(old: ast.Module, new: ast.Module):
    """Recognize a complete file change consisting only of paired comparisons.

    This records source edit locations, never test outcomes. Whether a specific
    test can be removed requires separate neutral baseline operand observations
    and runtime reasoning. Comparison chains and definition-time changes are
    deliberately unsupported.
    """
    allowed = {(ast.Is, ast.Eq), (ast.Eq, ast.Is),
               (ast.IsNot, ast.NotEq), (ast.NotEq, ast.IsNot)}
    changes = []

    def visit(left, right, in_function=False):
        if same_ast(left, right):
            return True
        if type(left) is not type(right):
            return False
        if isinstance(left, _FUNCTIONS):
            if any(not same_ast(getattr(left, field, None), getattr(right, field, None))
                   for field in left._fields if field != "body"):
                return False
            return visit(left.body, right.body, True)
        if isinstance(left, ast.ClassDef):
            if any(not same_ast(getattr(left, field, None), getattr(right, field, None))
                   for field in left._fields if field != "body"):
                return False
            # A nested class body is executed during class creation; it is not
            # an ordinary per-test comparison site even inside a function.
            return visit(left.body, right.body, False)
        if isinstance(left, _DEFERRED_OR_BINDING):
            return False
        if isinstance(left, ast.Compare):
            if (not in_function or len(left.ops) != 1 or len(right.ops) != 1
                    or len(left.comparators) != 1 or len(right.comparators) != 1):
                return False
            if not same_ast(left.ops, right.ops):
                pair = type(left.ops[0]), type(right.ops[0])
                if (pair not in allowed or not same_ast(left.left, right.left)
                        or not same_ast(left.comparators, right.comparators)):
                    return False
                changes.append({
                    "site": f"{left.lineno}:{left.col_offset}:{left.end_lineno}:{left.end_col_offset}",
                    "old_operator": pair[0].__name__, "new_operator": pair[1].__name__,
                })
                return True
            # A comparison may itself contain a changed comparison operand;
            # only the inner single site changes in this case.
        if isinstance(left, ast.AST):
            return all(visit(getattr(left, field, None), getattr(right, field, None), in_function)
                       for field in left._fields)
        if isinstance(left, list):
            return len(left) == len(right) and all(visit(a, b, in_function) for a, b in zip(left, right))
        return left == right

    if not visit(old, new) or not changes:
        return None
    return sorted(changes, key=lambda item: tuple(int(n) for n in item["site"].split(":")))


_MUTATORS = {
    "add", "append", "clear", "discard", "extend", "insert", "pop", "popitem",
    "remove", "reverse", "setdefault", "sort", "update", "difference_update",
    "intersection_update", "symmetric_difference_update", "__setitem__", "__delitem__",
    "__setattr__", "__delattr__",
}
_DYNAMIC_EFFECTS = {"setattr", "delattr", "exec", "eval", "__import__"}
_NAMESPACES = {"globals", "locals", "vars", "type"}


def cross_scope_effects(tree: ast.Module) -> Counter:
    """Fingerprint explicit shared-state effects, without claiming purity.

    A changed function with a known external write/import can affect later tests
    that never execute it. Ordinary receiver/local writes retain coverage-based
    handling. Calls through arbitrary helpers and complex alias escapes are not
    a whole-program effect analysis and remain outside this bounded guard.
    """
    fingerprints = Counter()

    def scoped_nodes(body):
        pending = list(reversed(body))
        while pending:
            node = pending.pop()
            yield node
            if isinstance(node, (*_FUNCTIONS, ast.ClassDef, ast.Lambda)):
                continue
            pending.extend(reversed(list(ast.iter_child_nodes(node))))

    def visit(scope, key):
        nodes = list(scoped_nodes(scope.body))
        function = isinstance(scope, _FUNCTIONS)
        locals_ = {node.id for node in nodes if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Store)}
        locals_.update(node.name for node in nodes if isinstance(node, (*_FUNCTIONS, ast.ClassDef)))
        if function:
            arguments = scope.args
            locals_.update(arg.arg for arg in (*arguments.posonlyargs, *arguments.args, *arguments.kwonlyargs))
            locals_.update(arg.arg for arg in (arguments.vararg, arguments.kwarg) if arg is not None)
        imported = set()
        declared = set()
        imports = []
        for node in nodes:
            if isinstance(node, (ast.Global, ast.Nonlocal)):
                declared.update(node.names)
            elif isinstance(node, (ast.Import, ast.ImportFrom)):
                imported.update(alias.asname or (alias.name.split(".")[0] if isinstance(node, ast.Import) else alias.name)
                                for alias in node.names)
                imports.append(ast.dump(node, include_attributes=False))
        if imports:
            # Retain the control/header and preceding statements that can
            # affect import execution, while an unrelated edit after a final
            # unconditional import does not invent a new import effect.
            last_import = max(index for index, statement in enumerate(scope.body)
                              if any(isinstance(part, (ast.Import, ast.ImportFrom))
                                     for part in scoped_nodes([statement])))
            prefix = copy(scope)
            prefix.body = scope.body[:last_import + 1]
            if isinstance(prefix, ast.Module):
                # TypeIgnore.lineno is a semantic AST field rather than a
                # location attribute. Its shifted line number is metadata,
                # not evidence that an unchanged import gained side effects.
                prefix.type_ignores = []
            fingerprints[(key, "import_prefix", ast.dump(prefix, include_attributes=False))] += 1
        locals_.difference_update(declared)
        aliases = set(imported)

        def external(value):
            if isinstance(value, ast.Name):
                return not function or value.id in aliases or value.id not in locals_
            if isinstance(value, (ast.Attribute, ast.Subscript)):
                if isinstance(value, ast.Attribute) and value.attr in {"__class__", "__globals__", "__dict__"}:
                    return True
                return external(value.value)
            if isinstance(value, ast.Call):
                # The ownership of the object returned by an arbitrary call is
                # unknown. A write directly through such a result must broaden.
                return True
            return False

        # Simple aliases of imported/module objects remain external even after
        # being assigned a local name. Fresh values from ordinary factory calls
        # are not assumed to alias their global callable's namespace.
        for _ in range(len(nodes) + 1):
            previous = len(aliases)
            for node in nodes:
                if isinstance(node, (ast.Assign, ast.AnnAssign, ast.NamedExpr)):
                    value = node.value
                    if value is not None and not isinstance(value, ast.Call) and external(value):
                        targets = node.targets if isinstance(node, ast.Assign) else [node.target]
                        for target in targets:
                            aliases.update(part.id for part in ast.walk(target)
                                           if isinstance(part, ast.Name) and isinstance(part.ctx, ast.Store))
                    elif isinstance(value, ast.Call) and isinstance(value.func, ast.Name) and value.func.id in _NAMESPACES:
                        targets = node.targets if isinstance(node, ast.Assign) else [node.target]
                        aliases.update(target.id for target in targets if isinstance(target, ast.Name))
            if len(aliases) == previous:
                break

        def external_target(target):
            if isinstance(target, ast.Name):
                return function and target.id in declared
            if isinstance(target, (ast.Tuple, ast.List)):
                return any(external_target(element) for element in target.elts)
            if isinstance(target, ast.Starred):
                return external_target(target.value)
            if isinstance(target, (ast.Attribute, ast.Subscript)):
                return external(target.value)
            return False

        effects = []
        for node in nodes:
            targets = []
            if isinstance(node, (ast.Assign, ast.Delete)):
                targets = node.targets
            elif isinstance(node, (ast.AnnAssign, ast.AugAssign, ast.NamedExpr)):
                targets = [node.target]
            if any(external_target(target) for target in targets):
                effects.append(node)
            elif isinstance(node, ast.Call):
                callee = node.func
                if (isinstance(callee, ast.Name) and callee.id in _DYNAMIC_EFFECTS
                        or isinstance(callee, ast.Attribute) and callee.attr in _MUTATORS and external(callee.value)
                        or isinstance(callee, ast.Attribute) and callee.attr in {"import_module", "reload"} and external(callee.value)):
                    effects.append(node)
        if function and (effects or declared):
            # This includes changed control flow around an unchanged write, or
            # an early return that changes whether that write occurs.
            fingerprints[(key, "effectful_function", ast.dump(scope, include_attributes=False))] += 1
        elif not function:
            for node in effects:
                fingerprints[(key, "external_write", ast.dump(node, include_attributes=False))] += 1
        occurrences = Counter()
        for node in nodes:
            if isinstance(node, (*_FUNCTIONS, ast.ClassDef)):
                label = (type(node).__name__, node.name)
                ordinal = occurrences[label]
                occurrences[label] += 1
                visit(node, key + ((label, ordinal),))

    visit(tree, ())
    return fingerprints


class Analyzer:
    def __init__(self, files: dict):
        self.files = files
        self.baseline_cache: dict[str, tuple[ast.Module, CodeType, str, tuple[tuple[int, str], ...]]] = {}
        self.effect_cache: dict[str, Counter] = {}

    def baseline(self, path: str, source: str):
        if path not in self.baseline_cache:
            pragmas = source_pragmas(source)
            code = compile(source, path, "exec", dont_inherit=True, optimize=0)
            tree = ast.parse(source, filename=path, type_comments=True)
            self.baseline_cache[path] = (tree, code, ast.dump(tree, include_attributes=False), pragmas)
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
                baseline_tree, baseline_code, baseline_dump, baseline_pragmas = self.baseline(change.path, source)
                changed_pragmas = source_pragmas(updated)
                if changed_pragmas != baseline_pragmas:
                    raise UnsupportedPatch("source encoding or shebang pragma changed")
                try:
                    tree = ast.parse(updated, filename=change.path, type_comments=True)
                    updated_code = compile(updated, change.path, "exec", dont_inherit=True, optimize=0)
                except (SyntaxError, ValueError):
                    flags["syntax_error"] = True
                    continue
                flags["ast_equal"] = ast.dump(tree, include_attributes=False) == baseline_dump
                if not flags["ast_equal"]:
                    if change.path not in self.effect_cache:
                        self.effect_cache[change.path] = cross_scope_effects(baseline_tree)
                    if self.effect_cache[change.path] != cross_scope_effects(tree):
                        raise UnsupportedPatch("changed explicit import or cross-scope state effect")
                    flags.update(locality(baseline_tree, tree, baseline_code, updated_code))
                    comparisons = comparison_deltas(baseline_tree, tree)
                    if comparisons is not None:
                        flags["comparison_changes"] = comparisons
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
