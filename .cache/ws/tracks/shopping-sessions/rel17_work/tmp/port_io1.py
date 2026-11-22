import sys
p = sys.argv[1]
s = open(p).read()
def rep(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old)
    s = s.replace(old, new)
rep("const FINAL_ROWS: usize = 1 << 14;\n", "const FINAL_ROWS: usize = 1 << 14;\nconst HEAP_PIECE: usize = 7 << 19;\nconst HEAP_WARM: usize = 6;\n")
rep("""    unsafe { libc::madvise(from as *mut libc::c_void, to - from, 22) };
}

fn line_range(""", """    unsafe { libc::madvise(from as *mut libc::c_void, to - from, 22) };
}

fn warm_heap() {
    let warm: Vec<Vec<u8>> = (0..HEAP_WARM).map(|_| Vec::with_capacity(HEAP_PIECE)).collect();
    std::hint::black_box(warm.as_ptr());
    drop(warm);
}

fn line_range(""")
rep("""            eprintln!("trace m setup:{name} {:.3}", started.elapsed().as_secs_f64() * 1e3);
        }
    };
    let data = config.data_dir;
""", """            eprintln!("trace m setup:{name} {:.3}", started.elapsed().as_secs_f64() * 1e3);
        }
    };
    unsafe {
        libc::mallopt(libc::M_MMAP_THRESHOLD, 4 << 20);
        libc::mallopt(libc::M_TRIM_THRESHOLD, i32::MAX);
    }
    let data = config.data_dir;
""")
rep("""    let threads = config.threads.max(1);
""", """    let threads = config.threads.max(1);
    sink::reserve(event_bytes + click_bytes + threads * (160 << 20) + (512 << 20));
""")
rep("""            scope.spawn(move || {
                let mut tr = trace::Trace::new(tracing, started);
""", """            scope.spawn(move || {
                warm_heap();
                let mut tr = trace::Trace::new(tracing, started);
""")
open(p, "w").write(s)
print("ported")
