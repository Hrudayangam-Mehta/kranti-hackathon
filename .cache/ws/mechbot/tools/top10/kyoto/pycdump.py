# Static reader for CPython 3.13 .pyc files: loads the marshalled code object
# (no execution) and writes a structural summary plus a full disassembly.
import sys, marshal, dis, types, io

def walk(co, depth=0, out=None, path=""):
    q = getattr(co, "co_qualname", co.co_name)
    consts = [c for c in co.co_consts if not isinstance(c, types.CodeType)]
    out.write("%s[%s] args=%d lines=%s-%s\n" % ("  " * depth, q, co.co_argcount,
              co.co_firstlineno, max([l for _, _, l in co.co_lines() if l] or [0])))
    out.write("%s  names=%s\n" % ("  " * depth, list(co.co_names)))
    out.write("%s  vars=%s\n" % ("  " * depth, list(co.co_varnames)))
    out.write("%s  consts=%r\n" % ("  " * depth, consts))
    for c in co.co_consts:
        if isinstance(c, types.CodeType):
            walk(c, depth + 1, out)

def main():
    src, outprefix = sys.argv[1], sys.argv[2]
    data = open(src, "rb").read()
    if data[:4] != b"\xf3\x0d\x0d\x0a":
        raise SystemExit("unexpected magic %r" % data[:4])
    co = marshal.loads(data[16:])
    with open(outprefix + ".tree.txt", "w") as f:
        walk(co, 0, f)
    with open(outprefix + ".dis.txt", "w") as f:
        dis.dis(co, file=f, depth=None)
    print("ok", src)

main()
