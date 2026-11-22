#!/usr/bin/env python3
import ctypes, mmap, os, sys

libc = ctypes.CDLL(None, use_errno=True)
libc.mmap.restype = ctypes.c_void_p
libc.mmap.argtypes = [ctypes.c_void_p, ctypes.c_size_t, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_long]
libc.mincore.argtypes = [ctypes.c_void_p, ctypes.c_size_t, ctypes.c_char_p]
libc.munmap.argtypes = [ctypes.c_void_p, ctypes.c_size_t]
PAGE = 4096


def resident(path):
    size = os.path.getsize(path)
    if size == 0:
        return 0, 0
    fd = os.open(path, os.O_RDONLY)
    try:
        p = libc.mmap(None, size, mmap.PROT_READ, mmap.MAP_SHARED, fd, 0)
        pages = (size + PAGE - 1) // PAGE
        vec = ctypes.create_string_buffer(pages)
        if libc.mincore(p, size, vec) != 0:
            raise OSError(ctypes.get_errno())
        n = sum(1 for b in vec.raw[:pages] if b & 1)
        libc.munmap(p, size)
        return n, pages
    finally:
        os.close(fd)


tot_r = tot_p = 0
for root in sys.argv[1:]:
    for d, _, files in os.walk(root):
        for f in files:
            r, p = resident(os.path.join(d, f))
            tot_r += r
            tot_p += p
print(f"resident {tot_r}/{tot_p} pages = {100.0 * tot_r / max(tot_p, 1):.1f}%")
