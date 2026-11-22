import ctypes
import ctypes.util
import os
import sys

libc = ctypes.CDLL(ctypes.util.find_library("c"), use_errno=True)
libc.mmap.restype = ctypes.c_void_p
libc.mmap.argtypes = [ctypes.c_void_p, ctypes.c_size_t, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_long]
libc.munmap.argtypes = [ctypes.c_void_p, ctypes.c_size_t]
libc.mincore.argtypes = [ctypes.c_void_p, ctypes.c_size_t, ctypes.c_void_p]
PAGE = os.sysconf("SC_PAGE_SIZE")


def files(root):
    out = []
    for d, _, names in os.walk(root):
        for n in sorted(names):
            p = os.path.join(d, n)
            if os.path.isfile(p) and os.path.getsize(p) > 0:
                out.append(p)
    return sorted(out)


def resident(path):
    size = os.path.getsize(path)
    fd = os.open(path, os.O_RDONLY)
    try:
        addr = libc.mmap(None, size, 1, 1, fd, 0)
        if addr in (None, ctypes.c_void_p(-1).value):
            raise OSError(ctypes.get_errno(), "mmap")
        pages = (size + PAGE - 1) // PAGE
        vec = (ctypes.c_ubyte * pages)()
        if libc.mincore(addr, size, vec) != 0:
            raise OSError(ctypes.get_errno(), "mincore")
        libc.munmap(addr, size)
        return sum(b & 1 for b in vec), pages
    finally:
        os.close(fd)


def evict(path):
    fd = os.open(path, os.O_RDONLY)
    try:
        os.fdatasync(fd)
        os.posix_fadvise(fd, 0, 0, os.POSIX_FADV_DONTNEED)
    finally:
        os.close(fd)


def warm(path):
    with open(path, "rb", buffering=0) as f:
        while f.read(8 << 20):
            pass


def main():
    cmd, root = sys.argv[1], sys.argv[2]
    fs = files(root)
    if cmd == "evict":
        for p in fs:
            evict(p)
    elif cmd == "warm":
        for p in fs:
            warm(p)
    if cmd in ("evict", "warm", "resid"):
        r = t = 0
        for p in fs:
            a, b = resident(p)
            r += a
            t += b
        print(f"{cmd}: resident {r}/{t} pages = {100.0 * r / max(t, 1):.2f}%")


main()
