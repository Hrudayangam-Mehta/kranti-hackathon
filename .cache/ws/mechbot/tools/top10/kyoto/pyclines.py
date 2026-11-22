# Static reader: condensed per-source-line view of a CPython 3.13 .pyc (no execution).
import sys, marshal, dis, types

SKIP = {"CACHE", "RESUME", "NOP", "PUSH_NULL", "COPY", "SWAP", "POP_TOP", "EXTENDED_ARG",
        "NOT_TAKEN", "TO_BOOL", "END_FOR", "RETURN_GENERATOR", "MAKE_CELL", "COPY_FREE_VARS"}
SHORT = {"LOAD_FAST": "", "LOAD_FAST_LOAD_FAST": "", "LOAD_FAST_CHECK": "", "LOAD_CONST": "#",
         "LOAD_GLOBAL": "g:", "LOAD_ATTR": ".", "STORE_FAST": "=>", "STORE_ATTR": "=>.",
         "STORE_FAST_STORE_FAST": "=>", "STORE_FAST_LOAD_FAST": "=>", "LOAD_DEREF": "d:",
         "STORE_DEREF": "=>d:", "COMPARE_OP": "", "BINARY_OP": "", "CALL": "call",
         "BINARY_SUBSCR": "[]", "STORE_SUBSCR": "[]=", "CONTAINS_OP": "in",
         "POP_JUMP_IF_FALSE": "?F", "POP_JUMP_IF_TRUE": "?T", "POP_JUMP_IF_NONE": "?None",
         "POP_JUMP_IF_NOT_NONE": "?!None", "JUMP_FORWARD": "jmp", "JUMP_BACKWARD": "loop",
         "RETURN_VALUE": "return", "RETURN_CONST": "return#", "UNARY_NEGATIVE": "neg",
         "UNARY_NOT": "not", "BUILD_TUPLE": "tuple", "BUILD_LIST": "list", "BUILD_MAP": "map",
         "FOR_ITER": "for", "GET_ITER": "", "IS_OP": "is", "CALL_KW": "callkw",
         "LOAD_SMALL_INT": "#", "CALL_INTRINSIC_1": "intr", "BUILD_CONST_KEY_MAP": "cmap",
         "LIST_APPEND": "lappend", "LOAD_METHOD": "."}

def render(co, out):
    q = getattr(co, "co_qualname", co.co_name)
    out.write("\n### %s (line %s)\n" % (q, co.co_firstlineno))
    cur, toks = None, []
    for ins in dis.get_instructions(co):
        ln = ins.positions.lineno if ins.positions else None
        if ins.opname in SKIP:
            continue
        if ln is not None and ln != cur:
            if toks:
                out.write("%5s: %s\n" % (cur, " ".join(toks)))
            cur, toks = ln, []
        if ins.is_jump_target:
            toks.append("L%d:" % ins.offset)
        tag = SHORT.get(ins.opname, ins.opname.lower())
        arg = ins.argrepr
        if ins.opname in ("COMPARE_OP", "BINARY_OP"):
            toks.append(arg.replace("bool(", "").replace(")", ""))
            continue
        if ins.opname.startswith("POP_JUMP") or ins.opname.startswith("JUMP") or ins.opname == "FOR_ITER":
            toks.append(tag + "@" + str(ins.argval))
            continue
        if ins.opname in ("CONTAINS_OP", "IS_OP"):
            toks.append(("not" if ins.arg else "") + ("in" if ins.opname == "CONTAINS_OP" else "is"))
            continue
        if isinstance(ins.argval, types.CodeType):
            toks.append("<code %s>" % ins.argval.co_name)
            continue
        toks.append((tag + arg) if arg else tag)
    if toks:
        out.write("%5s: %s\n" % (cur, " ".join(toks)))
    for c in co.co_consts:
        if isinstance(c, types.CodeType):
            render(c, out)

data = open(sys.argv[1], "rb").read()
co = marshal.loads(data[16:])
with open(sys.argv[2], "w") as f:
    render(co, f)
print("ok")
