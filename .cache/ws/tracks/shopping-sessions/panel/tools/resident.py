import ctypes, mmap, os, sys, glob
libc = ctypes.CDLL("libc.so.6", use_errno=True)
libc.mmap.restype = ctypes.c_void_p
libc.mmap.argtypes = [ctypes.c_void_p, ctypes.c_size_t, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_long]
libc.mincore.argtypes = [ctypes.c_void_p, ctypes.c_size_t, ctypes.c_char_p]
libc.munmap.argtypes = [ctypes.c_void_p, ctypes.c_size_t]
mode = sys.argv[1]; files = [f for d in sys.argv[2:] for f in glob.glob(d + "/**/*.csv", recursive=True)]
tot = res = 0
for f in files:
    n = os.path.getsize(f)
    if n == 0: continue
    fd = os.open(f, os.O_RDONLY)
    if mode == "evict":
        os.posix_fadvise(fd, 0, 0, os.POSIX_FADV_DONTNEED)
    addr = libc.mmap(None, n, 1, 1, fd, 0)
    pages = (n + 4095) // 4096
    vec = ctypes.create_string_buffer(pages)
    libc.mincore(addr, n, vec)
    res += sum(b & 1 for b in vec.raw); tot += pages
    libc.munmap(addr, n); os.close(fd)
print(f"{mode}: {res}/{tot} pages resident ({100*res/max(tot,1):.1f}%)")
