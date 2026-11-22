#![allow(dead_code)]
#[path = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/try/parse/src_tree/src/csv.rs"]
mod csv;
#[path = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/try/parse/src_tree/src/hash.rs"]
mod hash;
#[path = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/try/parse/src_tree/src/time.rs"]
mod time;
mod fast {
    #[path = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/try/parse/src_tree/src/fast/keys.rs"]
    pub mod keys;
    #[path = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/try/parse/src_tree/src/fast/scan.rs"]
    pub mod scan;
    #[path = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/try/parse/src_tree/src/fast/ts.rs"]
    pub mod ts;
    #[path = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/try/parse/src_tree/src/fast/sink.rs"]
    pub mod sink;
}
mod scan2;
mod h;
pub fn parse_price(text: &[u8]) -> Option<u32> {
    if text.is_empty() { return None; }
    let mut value: u32 = 0;
    for &byte in text {
        if !byte.is_ascii_digit() { return None; }
        value = value * 10 + u32::from(byte - b'0');
        if value > 10_000_000 { return None; }
    }
    (value >= 1).then_some(value)
}

use fast::scan::{self, Lines, Scratch};
use std::time::Instant;

fn map_file(path: &std::path::Path) -> &'static [u8] {
    use std::os::unix::io::AsRawFd;
    let file = std::fs::File::open(path).unwrap();
    let len = file.metadata().unwrap().len() as usize;
    if len == 0 { return &[]; }
    unsafe {
        let p = libc::mmap(std::ptr::null_mut(), len, libc::PROT_READ, libc::MAP_PRIVATE, file.as_raw_fd(), 0);
        std::slice::from_raw_parts(p as *const u8, len)
    }
}

struct Sum { n: usize, acc: usize }
impl Lines<7> for Sum {
    #[inline(always)]
    fn line(&mut self, f: &[&[u8]; 7]) {
        self.n += 1;
        self.acc = self.acc.wrapping_add(f[0].len() ^ f[2].len() ^ f[3].len() ^ (f[4].len() << 1) ^ f[6].len() ^ f[1].len() ^ f[5].len()).wrapping_add(f[2].as_ptr() as usize);
    }
}

impl scan2::Lines<7> for Sum {
    #[inline(always)]
    fn line(&mut self, f: &[&[u8]; 7]) { <Sum as Lines<7>>::line(self, f) }
}

#[target_feature(enable = "avx2,bmi1,bmi2,popcnt")]
unsafe fn run_v0(chunks: &[&[u8]], scratch: &mut Scratch) -> (usize, usize) {
    let mut s = Sum { n: 0, acc: 0 };
    for c in chunks { scan::scan::<7, scan::Avx2, _>(c, scratch, &mut s); }
    (s.n, s.acc)
}

#[target_feature(enable = "avx2,bmi1,bmi2,popcnt,avx512f,avx512bw,avx512vbmi2")]
unsafe fn run_v2(chunks: &[&[u8]], scratch: &mut scan2::Scratch) -> (usize, usize) {
    let mut s = Sum { n: 0, acc: 0 };
    for c in chunks { scan2::scan::<7, scan2::Avx512, _>(c, scratch, &mut s); }
    (s.n, s.acc)
}

#[target_feature(enable = "avx2,bmi1,bmi2,popcnt")]
unsafe fn run_v1(chunks: &[&[u8]], scratch: &mut scan2::Scratch) -> (usize, usize) {
    let mut s = Sum { n: 0, acc: 0 };
    for c in chunks { scan2::scan::<7, scan2::Avx2, _>(c, scratch, &mut s); }
    (s.n, s.acc)
}

unsafe fn run_h<K: fast::scan::Kernel>(chunks: &[&[u8]], scratch: &mut Scratch, ctx: &h::Ctx) -> (usize, usize) {
    let mut arena = fast::sink::Arena::new();
    let mut sink: fast::sink::Sink<h::EventRec> = fast::sink::Sink::new(1 << ctx.p1_bits, 512);
    let mut l = h::EventLines::<K> { ctx, arena: &mut arena, sink: &mut sink, copies: 0, acc: 0, kernel: std::marker::PhantomData };
    for c in chunks { scan::scan::<7, K, _>(c, scratch, &mut l); }
    let (n, a) = (l.copies, l.acc as usize);
    sink.finish(&mut arena);
    std::mem::forget(sink);
    (n, a)
}
#[target_feature(enable = "avx2,bmi1,bmi2,popcnt")]
unsafe fn run_h2(chunks: &[&[u8]], scratch: &mut Scratch, ctx: &h::Ctx) -> (usize, usize) { run_h::<scan::Avx2>(chunks, scratch, ctx) }
#[target_feature(enable = "avx2,bmi1,bmi2,popcnt,avx512f,avx512bw,avx512vbmi2")]
unsafe fn run_h5(chunks: &[&[u8]], scratch: &mut Scratch, ctx: &h::Ctx) -> (usize, usize) { run_h::<scan::Avx512>(chunks, scratch, ctx) }
#[target_feature(enable = "avx2,bmi1,bmi2,popcnt,avx512f,avx512bw,avx512vbmi2")]
unsafe fn run_v5(chunks: &[&[u8]], scratch: &mut Scratch) -> (usize, usize) {
    let mut s = Sum { n: 0, acc: 0 };
    for c in chunks { scan::scan::<7, scan::Avx512, _>(c, scratch, &mut s); }
    (s.n, s.acc)
}

fn ru() -> (f64, f64) {
    let mut r: libc::rusage = unsafe { std::mem::zeroed() };
    unsafe { libc::getrusage(libc::RUSAGE_THREAD, &mut r) };
    (r.ru_utime.tv_sec as f64 + r.ru_utime.tv_usec as f64 * 1e-6, r.ru_stime.tv_sec as f64 + r.ru_stime.tv_usec as f64 * 1e-6)
}

fn cpu() -> f64 {
    let mut t = libc::timespec { tv_sec: 0, tv_nsec: 0 };
    unsafe { libc::clock_gettime(libc::CLOCK_THREAD_CPUTIME_ID, &mut t) };
    t.tv_sec as f64 + t.tv_nsec as f64 * 1e-9
}

fn main() {
    let dir = std::env::args().nth(1).unwrap();
    let which: Vec<String> = std::env::args().skip(2).collect();
    let mut paths: Vec<_> = std::fs::read_dir(&dir).unwrap().map(|e| e.unwrap().path()).collect();
    paths.sort();
    let files: Vec<&[u8]> = paths.iter().map(|p| map_file(p)).collect();
    let mut chunks = Vec::new();
    for f in &files { for (a, b) in csv::data_chunks(f, 4 << 20) { chunks.push(&f[a..b]); } }
    let bytes: usize = chunks.iter().map(|c| c.len()).sum();
    // warm
    for c in &chunks { let mut x = 0u64; for i in (0..c.len()).step_by(4096) { x += c[i] as u64; } std::hint::black_box(x); }
    let root = std::path::Path::new(&dir).parent().unwrap().to_path_buf();
    let manifest = std::fs::read_to_string(root.join("manifest.json")).unwrap();
    let grab = |k: &str| { let i = manifest.find(k).unwrap() + k.len(); let a = manifest[i..].find('"').unwrap() + i + 1; let b = manifest[a..].find('"').unwrap() + a; time::parse_timestamp(manifest[a..b].as_bytes()).unwrap() };
    let ws = grab("\"window_start\""); let we = grab("\"window_end\"");
    let prod = Box::leak(std::fs::read(root.join("products.csv")).unwrap().into_boxed_slice());
    let rows: Vec<[&[u8]; 2]> = csv::rows(prod).filter_map(csv::fields::<2>).collect();
    let mut cats: Vec<&[u8]> = rows.iter().map(|r| r[1]).collect(); cats.push(b"unknown"); cats.sort(); cats.dedup();
    let entries: Vec<(u64, u32)> = rows.iter().map(|r| (fast::keys::intern(r[0]), cats.binary_search(&r[1]).unwrap() as u32)).collect();
    let mode = std::env::var("MODE").ok().and_then(|v| v.parse().ok()).unwrap_or(0);
    let ctx = h::Ctx { calendar: fast::ts::Calendar::around(ws), ws, we, cws: ws - 7 * 86_400_000, products: fast::keys::SmallMap::new(&entries), unknown: cats.binary_search(&&b"unknown"[..]).unwrap() as u32, p1_bits: 12, mode };
    let mut s0 = Scratch::new();
    let mut s1 = scan2::Scratch::new();
    for w in &which {
        let t = Instant::now();
        let c0 = cpu();
        let r0 = ru();
        let r = unsafe { match w.as_str() { "v0" => run_v0(&chunks, &mut s0), "v2" => run_v2(&chunks, &mut s1), "v5" => run_v5(&chunks, &mut s0), "h2" => run_h2(&chunks, &mut s0, &ctx), "h5" => run_h5(&chunks, &mut s0, &ctx), _ => run_v1(&chunks, &mut s1) } };
        let wall = t.elapsed().as_secs_f64();
        let dt = cpu() - c0;
        let r1 = ru();
        print!("[user {:.3} sys {:.3}] ", r1.0 - r0.0, r1.1 - r0.1);
        println!("{w}: lines {} acc {:x} wall {:.3}s cpu {:.3}s {:.2} GB/s {:.1} ns/line(cpu)", r.0, r.1, wall, dt, bytes as f64 / dt / 1e9, dt * 1e9 / r.0 as f64);
    }
}
