import ctypes
import ctypes.util
import os
import resource
import sys
import time

libc = ctypes.CDLL(ctypes.util.find_library("c"), use_errno=True)
libc.mmap.restype = ctypes.c_void_p
libc.mmap.argtypes = [ctypes.c_void_p, ctypes.c_size_t, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_long]
libc.munmap.argtypes = [ctypes.c_void_p, ctypes.c_size_t]
libc.madvise.argtypes = [ctypes.c_void_p, ctypes.c_size_t, ctypes.c_int]
libc.read.argtypes = [ctypes.c_int, ctypes.c_void_p, ctypes.c_size_t]
libc.read.restype = ctypes.c_ssize_t
libc.pread.argtypes = [ctypes.c_int, ctypes.c_void_p, ctypes.c_size_t, ctypes.c_long]
libc.pread.restype = ctypes.c_ssize_t


def files(root):
    out = []
    for d, _, names in os.walk(root):
        for n in names:
            p = os.path.join(d, n)
            if os.path.getsize(p) > 0:
                out.append(p)
    return sorted(out)


def usage():
    r = resource.getrusage(resource.RUSAGE_SELF)
    return time.perf_counter(), r.ru_utime, r.ru_stime, r.ru_minflt


def mapped(fs):
    pop = unmap = 0.0
    total = 0
    for p in fs:
        size = os.path.getsize(p)
        fd = os.open(p, os.O_RDONLY)
        addr = libc.mmap(None, size, 1, 2, fd, 0)
        os.close(fd)
        t0 = time.perf_counter()
        libc.madvise(addr, size, 22)
        t1 = time.perf_counter()
        libc.munmap(addr, size)
        t2 = time.perf_counter()
        pop += t1 - t0
        unmap += t2 - t1
        total += size
    return total, pop, unmap


def preads(fs, chunk=4 << 20):
    buf = ctypes.create_string_buffer(chunk)
    total = 0
    for p in fs:
        fd = os.open(p, os.O_RDONLY)
        off = 0
        while True:
            n = libc.pread(fd, buf, chunk, off)
            if n <= 0:
                break
            off += n
            total += n
        os.close(fd)
    return total


def main():
    root = sys.argv[1]
    fs = files(root)
    for rnd in range(int(sys.argv[2]) if len(sys.argv) > 2 else 3):
        a = usage()
        total, pop, unmap = mapped(fs)
        b = usage()
        n = preads(fs)
        c = usage()
        print(
            f"round {rnd}: mmap+POPULATE_READ+munmap {total / 1e9:.2f} GB wall {b[0] - a[0]:.3f} s (populate {pop:.3f}, munmap {unmap:.3f}) "
            f"user {b[1] - a[1]:.3f} sys {b[2] - a[2]:.3f} minflt {b[3] - a[3]} | pread 4MB into one buffer {n / 1e9:.2f} GB wall {c[0] - b[0]:.3f} s user {c[1] - b[1]:.3f} sys {c[2] - b[2]:.3f}",
            flush=True,
        )


main()
