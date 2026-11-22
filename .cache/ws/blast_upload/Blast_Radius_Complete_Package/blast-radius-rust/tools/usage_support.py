"""Observe dialect/class consumers in the unchanged baseline test suite only.

This supplements line coverage where class dictionaries are read without running
code in the defining dialect module. It never receives patches or failure labels.
"""
from __future__ import annotations

import atexit
import concurrent.futures
import functools
import json
import os
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(os.environ["BLAST_USAGE_ROOT"]).resolve()
OUT = Path(os.environ["BLAST_USAGE_DIR"]).resolve()
CONTEXT = "@collection"
USAGE = defaultdict(set)
_SEEN = set()
_MODULE_CACHE = {}
_INSTALLED = False
_SAVED = False
_RECORDING = False
_DIALECT_META = None
_DIALECT_BASE = None


def set_context(context):
    global CONTEXT
    CONTEXT = context


def _effective_context():
    if CONTEXT != "@collection":
        return CONTEXT
    # Class constants evaluated at test-module import time belong to every
    # catalog test in that module; generic framework imports are not consumers.
    frame = sys._getframe(2)
    prefix = str(ROOT) + os.sep
    while frame is not None:
        filename = frame.f_code.co_filename
        if filename.startswith(prefix):
            relative = filename[len(prefix):].replace(os.sep, "/")
            if relative.startswith("tests/") and relative.endswith(".py"):
                return "@file:" + relative
        frame = frame.f_back
    return None


def _module_path(module_name):
    if module_name in _MODULE_CACHE:
        return _MODULE_CACHE[module_name]
    module = sys.modules.get(module_name)
    filename = getattr(module, "__file__", None)
    path = None
    if filename:
        try:
            candidate = Path(filename).resolve().relative_to(ROOT).as_posix()
            if candidate.startswith(("sqlglot/", "tests/")) and candidate.endswith(".py"):
                path = candidate
        except ValueError:
            pass
    _MODULE_CACHE[module_name] = path
    return path


def record(value):
    global _RECORDING
    if _RECORDING or _DIALECT_META is None:
        return
    if isinstance(value, _DIALECT_META):
        klass = value
    elif isinstance(value, _DIALECT_BASE):
        klass = type(value)
    else:
        return
    _RECORDING = True
    try:
        context = _effective_context()
        if context is None:
            return
        # Component classes can be monkeypatched by baseline tests. Their
        # identities form part of the cache key, so such changes remain visible.
        classes = [klass]
        for attribute in ("tokenizer_class", "jsonpath_tokenizer_class", "parser_class", "generator_class"):
            try:
                component = type.__getattribute__(klass, attribute)
            except AttributeError:
                continue
            if isinstance(component, type):
                classes.append(component)
        key = (context, *(id(cls) for cls in classes))
        if key in _SEEN:
            return
        _SEEN.add(key)
        for component in classes:
            for base in type.__getattribute__(component, "__mro__"):
                module = type.__getattribute__(base, "__module__")
                path = _module_path(module)
                if path:
                    USAGE[path].add(context)
    finally:
        _RECORDING = False


def install():
    global _INSTALLED, _DIALECT_META, _DIALECT_BASE
    if _INSTALLED:
        return
    from sqlglot.dialects.dialect import Dialect, _Dialect
    _DIALECT_META, _DIALECT_BASE = _Dialect, Dialect

    original_get = vars(_Dialect)["get"].__func__
    original_item = vars(_Dialect)["__getitem__"].__func__
    original_raise = vars(Dialect)["get_or_raise"].__func__
    original_classes = vars(_Dialect)["classes"]
    original_call = _Dialect.__call__
    original_attribute = _Dialect.__getattribute__

    @functools.wraps(original_get)
    def get(cls, *args, **kwargs):
        value = original_get(cls, *args, **kwargs)
        record(value)
        return value

    @functools.wraps(original_item)
    def item(cls, *args, **kwargs):
        value = original_item(cls, *args, **kwargs)
        record(value)
        return value

    @functools.wraps(original_raise)
    def get_or_raise(cls, *args, **kwargs):
        value = original_raise(cls, *args, **kwargs)
        record(value)
        return value

    def call(cls, *args, **kwargs):
        record(cls)
        value = original_call(cls, *args, **kwargs)
        record(value)
        return value

    def classes(cls):
        values = original_classes.fget(cls)
        for value in values.values():
            record(value)
        return values

    def getattribute(cls, name):
        value = original_attribute(cls, name)
        # Direct references such as Snowflake.NORMALIZATION_STRATEGY bypass
        # registry lookup and construction, but still depend on class data.
        if name.isupper() or name in {"tokenizer_class", "jsonpath_tokenizer_class", "parser_class", "generator_class"}:
            record(cls)
        return value

    _Dialect.get = classmethod(get)
    _Dialect.__getitem__ = classmethod(item)
    Dialect.get_or_raise = classmethod(get_or_raise)
    _Dialect.__call__ = call
    _Dialect.classes = property(classes, original_classes.fset, original_classes.fdel, original_classes.__doc__)
    _Dialect.__getattribute__ = getattribute
    _INSTALLED = True
    OUT.mkdir(parents=True, exist_ok=True)
    atexit.register(save)


def save():
    global _SAVED
    if _SAVED:
        return
    _SAVED = True
    OUT.mkdir(parents=True, exist_ok=True)
    target = OUT / f"usage-{os.getpid()}.json"
    temporary = target.with_suffix(".tmp")
    temporary.write_text(json.dumps({path: sorted(contexts) for path, contexts in USAGE.items()}))
    temporary.replace(target)


def worker_start(initializer, initargs):
    install()
    from multiprocessing.util import Finalize
    Finalize(None, save, exitpriority=20)
    if initializer:
        initializer(*initargs)


def contextual_call(context, function, args, kwargs):
    set_context(context)
    return function(*args, **kwargs)


_OriginalPool = concurrent.futures.ProcessPoolExecutor


class UsagePool(_OriginalPool):
    def __init__(self, max_workers=None, *args, initializer=None, initargs=(), **kwargs):
        super().__init__(max_workers=min(max_workers or 2, 2), *args,
                         initializer=worker_start, initargs=(initializer, initargs), **kwargs)

    def submit(self, fn, /, *args, **kwargs):
        return super().submit(contextual_call, CONTEXT, fn, args, kwargs)


def install_pool_instrumentation():
    concurrent.futures.ProcessPoolExecutor = UsagePool
