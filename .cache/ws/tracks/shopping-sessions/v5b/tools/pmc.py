import ctypes, os, sys, struct, time
libc = ctypes.CDLL(None, use_errno=True)
NR = 298
class Attr(ctypes.Structure):
    _fields_ = [("type", ctypes.c_uint32), ("size", ctypes.c_uint32), ("config", ctypes.c_uint64),
                ("sample", ctypes.c_uint64), ("sample_type", ctypes.c_uint64), ("read_format", ctypes.c_uint64),
                ("flags", ctypes.c_uint64), ("wakeup", ctypes.c_uint32), ("bp_type", ctypes.c_uint32),
                ("config1", ctypes.c_uint64), ("config2", ctypes.c_uint64), ("pad", ctypes.c_uint64 * 8)]
EVENTS = {"cycles": (0, 0), "instructions": (0, 1), "cache_misses": (0, 3), "branch_misses": (0, 5)}
def open_counter(pid, typ, cfg):
    a = Attr(); a.type = typ; a.size = 120; a.config = cfg
    a.flags = (1 << 0) | (1 << 1) | (1 << 5) | (1 << 6) | (1 << 12)  # disabled, inherit, exclude_kernel, exclude_hv, enable_on_exec
    fd = libc.syscall(NR, ctypes.byref(a), pid, -1, -1, 0)
    if fd < 0:
        raise OSError(ctypes.get_errno(), "perf_event_open")
    return fd
def run(argv, env):
    r, w = os.pipe()
    pid = os.fork()
    if pid == 0:
        os.close(w); os.read(r, 1); os.execvpe(argv[0], argv, env)
    os.close(r)
    fds = {k: open_counter(pid, *v) for k, v in EVENTS.items()}
    t0 = time.perf_counter(); os.write(w, b"x"); os.close(w)
    _, st, ru = os.wait4(pid, 0)
    wall = time.perf_counter() - t0
    vals = {k: struct.unpack("q", os.read(fd, 8))[0] for k, fd in fds.items()}
    return st, wall, ru, vals
if __name__ == "__main__":
    st, wall, ru, v = run(sys.argv[1:], dict(os.environ))
    print(f"status {st} wall {wall:.3f} user {ru.ru_utime:.3f} sys {ru.ru_stime:.3f} " + " ".join(f"{k} {x/1e9:.3f}G" for k, x in v.items()))
