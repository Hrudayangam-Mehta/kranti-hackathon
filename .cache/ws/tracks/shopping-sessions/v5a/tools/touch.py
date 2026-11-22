import ctypes, mmap, time, sys
libc = ctypes.CDLL("libc.so.6", use_errno=True)
libc.mmap.restype = ctypes.c_void_p
libc.mmap.argtypes = [ctypes.c_void_p, ctypes.c_size_t, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_long]
libc.madvise.argtypes = [ctypes.c_void_p, ctypes.c_size_t, ctypes.c_int]
def probe(mb, huge, populate):
    n = mb << 20
    p = libc.mmap(None, n + (2 << 20), 3, 0x22 | 0x4000, -1, 0)
    p = (p + (2 << 20) - 1) & ~((2 << 20) - 1)
    if huge: libc.madvise(p, n, 14)
    t = time.perf_counter()
    if populate:
        r = libc.madvise(p, n, 23)
    else:
        ctypes.memset(p, 1, n)
    return (time.perf_counter() - t) * 1e3 / mb
for rep in range(3):
    print("huge+populate %.2f ms/MB | huge+memset %.2f | 4k+populate %.2f | 4k+memset %.2f" % (probe(64, True, True), probe(64, True, False), probe(64, False, True), probe(64, False, False)))
