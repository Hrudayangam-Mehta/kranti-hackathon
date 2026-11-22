import re, sys
p = sys.argv[1]
s = open(p).read()
s = s.replace("pub mod trace;\n", "")
s = s.replace("""fn release_chunk(ctx: &Ctx, f: usize, tr: &mut trace::Trace) {
    if ctx.remaining[f].fetch_sub(1, Ordering::AcqRel) == 1 {
        let t = tr.now();
        let file = ctx.files[f];
        unsafe { libc::munmap(file.as_ptr() as *mut libc::c_void, file.len()) };
        tr.add(trace::UNMAP, t);
    }
}""", """fn release_chunk(ctx: &Ctx, f: usize) {
    if ctx.remaining[f].fetch_sub(1, Ordering::AcqRel) == 1 {
        let file = ctx.files[f];
        unsafe { libc::munmap(file.as_ptr() as *mut libc::c_void, file.len()) };
    }
}""")
s = s.replace("""    let tracing = trace::enabled();
    let epoch_start = std::time::SystemTime::now();
""", "")
s = re.sub(r"    let mark = \|name: &str\| \{\n        if tracing \{\n.*?\n        \}\n    \};\n", "", s, flags=re.S)
s = re.sub(r"\n *mark\(\"[a-z]+\"\);", "", s)
s = s.replace("    let traces: Mutex<Vec<(usize, trace::Trace)>> = Mutex::new(Vec::new());\n", "")
s = s.replace("            let traces = &traces;\n", "")
s = s.replace("                let mut tr = trace::Trace::new(tracing, started);\n", "")
s = re.sub(r"\n *let (t|w|tw) = tr\.now\(\);", "", s)
s = re.sub(r"\n *tr\.add\(trace::[A-Z_]+, (t|w|tw)\);", "", s)
s = s.replace("release_chunk(ctx, f, &mut tr);", "release_chunk(ctx, f);")
s = s.replace("                trace::collect(traces, id, tr);\n", "")
s = re.sub(r"    if tracing \{\n        for \(id, t\) in traces.*?\n    \}\n(    unsafe \{ libc::_exit\(0\) \})", r"\1", s, flags=re.S)
s = s.replace("""                                if !links_done.load(Ordering::Acquire) {
                                    while !links_done.load(Ordering::Acquire) {
                                        std::thread::yield_now();
                                    }
                                }""", """                                while !links_done.load(Ordering::Acquire) {
                                    std::thread::yield_now();
                                }""")
assert "trace" not in s and "tr." not in s.replace("str.", "").replace("ctr.", ""), [l for l in s.splitlines() if "trace" in l or " tr." in l]
open(p, "w").write(s)
print("stripped")
