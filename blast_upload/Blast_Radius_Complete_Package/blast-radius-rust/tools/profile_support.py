"""Baseline-only instrumentation. No patches or answer labels are read here."""
from __future__ import annotations
import atexit
import concurrent.futures
import json
import os
import sys
from collections import defaultdict
from pathlib import Path
import coverage

ROOT = Path(os.environ["BLAST_PROFILE_ROOT"]).resolve()
OUT = Path(os.environ["BLAST_PROFILE_DIR"]).resolve()
CONTEXT = "@collection"
COV = None
READS = defaultdict(set)
SOURCE_READS = defaultdict(set)
_IN_AUDIT = False
_SAVED = False


def set_context(value):
    global CONTEXT
    CONTEXT = value
    if COV is not None:
        COV.switch_context(value)


def audit(event, args):
    global _IN_AUDIT
    if event != "open" or _IN_AUDIT or not args or not isinstance(args[0], str):
        return
    _IN_AUDIT = True
    try:
        path = os.path.abspath(args[0])
        prefix = str(ROOT) + os.sep
        if not path.startswith(prefix):
            return
        relative = path[len(prefix):].replace(os.sep, "/")
        mode = args[1] if len(args) > 1 else None
        if isinstance(mode, str) and any(c in mode for c in "wax+"):
            return
        if relative.startswith("tests/fixtures/"):
            READS[relative].add(CONTEXT)
        elif relative.endswith(".py"):
            # Import reads are not tests inspecting raw source text.
            frame = sys._getframe(1)
            imported = False
            for _ in range(9):
                if frame is None:
                    break
                name = frame.f_code.co_filename
                if "importlib" in name or "_pytest/assertion/rewrite" in name:
                    imported = True
                    break
                frame = frame.f_back
            if not imported and CONTEXT != "@collection":
                SOURCE_READS[relative].add(CONTEXT)
    finally:
        _IN_AUDIT = False


def start():
    global COV
    OUT.mkdir(parents=True, exist_ok=True)
    if COV is not None:
        return
    COV = coverage.Coverage(
        data_file=str(OUT / ".coverage"), data_suffix=True,
        config_file=False, branch=False,
        include=[str(ROOT / "sqlglot" / "*"), str(ROOT / "tests" / "*")],
    )
    COV.start()
    COV.switch_context(CONTEXT)
    sys.addaudithook(audit)
    atexit.register(save)


def save():
    global _SAVED
    if _SAVED or COV is None:
        return
    _SAVED = True
    COV.stop()
    COV.save()
    payload = {
        "reads": {p: sorted(cs) for p, cs in READS.items()},
        "source_reads": {p: sorted(cs) for p, cs in SOURCE_READS.items()},
    }
    (OUT / f"reads-{os.getpid()}.json").write_text(json.dumps(payload))


def worker_start(initializer, initargs):
    start()
    from multiprocessing.util import Finalize
    Finalize(None, save, exitpriority=20)
    if initializer:
        initializer(*initargs)


def contextual_call(context, function, args, kwargs):
    set_context(context)
    return function(*args, **kwargs)


_OriginalPool = concurrent.futures.ProcessPoolExecutor


class ProfilePool(_OriginalPool):
    def __init__(self, max_workers=None, *args, initializer=None, initargs=(), **kwargs):
        # Same task arguments and functions, two processes; scheduling only.
        super().__init__(max_workers=min(max_workers or 2, 2), *args,
                         initializer=worker_start, initargs=(initializer, initargs), **kwargs)

    def submit(self, fn, /, *args, **kwargs):
        return super().submit(contextual_call, CONTEXT, fn, args, kwargs)


def install_pool_instrumentation():
    concurrent.futures.ProcessPoolExecutor = ProfilePool
