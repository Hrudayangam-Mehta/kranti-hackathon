pub mod ids;
pub mod parquet;
pub mod people;
pub mod scan;
pub mod sink;
pub mod trace;
pub mod ts;
pub mod write;

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU32, AtomicUsize, Ordering};
use std::sync::{Barrier, Condvar, Mutex, OnceLock};
use std::time::Instant;

use crate::csv;
use crate::events::parse_price;
use crate::input::{self, Result, ORGANIC, UNKNOWN_CATEGORY};
use crate::time::DAY_MS;
use ids::{prefetch, Bytes, Interner, Key, KeyMap};
use people::LinkSpace;
#[cfg(target_arch = "x86_64")]
use scan::Avx2;
use scan::{Kernel, Lines, Scalar};
use sink::{Arena, Sink};
use ts::Calendar;

const WEEK_MS: i64 = 7 * DAY_MS;
const FLUSH_ROWS: usize = 1 << 16;
const FINAL_ROWS: usize = 1 << 14;
const HEAP_PIECE: usize = 7 << 19;
const HEAP_WARM: usize = 6;
const GAP_MS: u32 = 30 * 60 * 1000;
const INVALID: u32 = u32::MAX;
const H2: u64 = 0xc2b2_ae3d_27d4_eb4f;
const VIEW: u32 = u32::from_le_bytes(*b"view");
const CART: u32 = u32::from_le_bytes(*b"cart");
const PURCHASE: u64 = u64::from_le_bytes(*b"purchase");
const RING: usize = 16;

#[derive(Clone, Copy)]
#[repr(C)]
pub struct EventRec {
    key: Key,
    user: u32,
    ts: u32,
    payload: u32,
    ingest: u32,
}

#[derive(Clone, Copy)]
#[repr(C)]
pub struct PersonRec {
    person: u32,
    ts: u32,
    payload: u32,
    spare: u32,
}

#[derive(Clone, Copy)]
#[repr(C)]
pub struct ClickRec {
    click: Key,
    person: u32,
    ts: u32,
    campaign: u32,
    spare: u32,
}

#[derive(Clone, Copy)]
struct LocalClick {
    ts: u32,
    campaign: u32,
    click: Key,
}

pub struct Config<'a> {
    pub data_dir: &'a Path,
    pub output_dir: &'a Path,
    pub threads: usize,
}

pub enum Outcome {
    Fallback(String),
}

struct Ctx<'a> {
    calendar: Calendar,
    ws: i64,
    we: i64,
    cws: i64,
    ingest_base: i64,
    products: KeyMap,
    unknown: u32,
    campaigns: KeyMap,
    organic: u32,
    p1_bits: u32,
    p2_bits: u32,
    qbits: u32,
    ib: u32,
    user_slots: usize,
    export_block: usize,
    p1_block: usize,
    click_block: usize,
    p2_block: usize,
    first_day: i64,
    days: usize,
    day_shift: i64,
    link_files: Vec<&'static [u8]>,
    units: Vec<Unit>,
    files: Vec<&'static [u8]>,
    event_files: usize,
    marker: std::marker::PhantomData<&'a ()>,
}

#[derive(Clone, Copy)]
enum Unit {
    Links,
    Events(usize, usize, usize),
    Clicks(usize, usize, usize),
}

struct Finals {
    results: Vec<(Vec<[u64; 4]>, [u64; 4])>,
    jobs: Vec<Job>,
    pushed: usize,
}

enum Job {
    User(std::sync::Arc<write::Part>, usize, usize),
    Campaign(usize),
}

struct Space {
    export: Sink<Key>,
    l2g: Vec<AtomicU32>,
}

struct Merged {
    keys: Vec<Key>,
    names: Vec<u32>,
}

trait HasUser: Copy {
    fn set_user(&mut self, user: u32);
}

impl HasUser for EventRec {
    #[inline(always)]
    fn set_user(&mut self, user: u32) {
        self.user = user;
    }
}

impl HasUser for ClickRec {
    #[inline(always)]
    fn set_user(&mut self, user: u32) {
        self.person = user;
    }
}

struct Ring<T: HasUser> {
    recs: [T; RING],
    keys: [Key; RING],
    hashes: [u64; RING],
    parts: [u32; RING],
    lens: [u32; RING],
    n: usize,
}

impl<T: HasUser> Ring<T> {
    fn new(fill: T) -> Ring<T> {
        Ring {
            recs: [fill; RING],
            keys: [[0, 0]; RING],
            hashes: [0; RING],
            parts: [0; RING],
            lens: [0; RING],
            n: 0,
        }
    }

    #[inline(always)]
    unsafe fn add(&mut self, rec: T, user: &[u8], part: usize, users: &mut Interner, arena: &mut Arena, bytes: &mut Bytes, sink: &mut Sink<T>) {
        let (key, h, len) = if user.len() <= ids::SHORT_MAX {
            let k = ids::short_key(user.as_ptr(), user.len());
            let h = ids::short_hash(&k);
            users.prefetch(h);
            (k, h, 0)
        } else {
            let h = ids::field_hash(user.as_ptr(), user.len());
            users.prefetch_long(h);
            ([user.as_ptr() as u64, 0], h, user.len() as u32)
        };
        let i = self.n & (RING - 1);
        if self.n >= RING {
            self.resolve(i, users, arena, bytes, sink);
        }
        *self.recs.get_unchecked_mut(i) = rec;
        *self.keys.get_unchecked_mut(i) = key;
        *self.hashes.get_unchecked_mut(i) = h;
        *self.parts.get_unchecked_mut(i) = part as u32;
        *self.lens.get_unchecked_mut(i) = len;
        self.n += 1;
    }

    #[inline(always)]
    unsafe fn resolve(&mut self, i: usize, users: &mut Interner, arena: &mut Arena, bytes: &mut Bytes, sink: &mut Sink<T>) {
        let key = *self.keys.get_unchecked(i);
        let h = *self.hashes.get_unchecked(i);
        let len = *self.lens.get_unchecked(i) as usize;
        let user = if len == 0 {
            users.short(key, h, arena)
        } else {
            users.long(key[0] as *const u8, len, h, arena, bytes)
        };
        let rec = self.recs.get_unchecked_mut(i);
        rec.set_user(user);
        sink.push(arena, *self.parts.get_unchecked(i) as usize, *rec);
    }

    fn drain(&mut self, users: &mut Interner, arena: &mut Arena, bytes: &mut Bytes, sink: &mut Sink<T>) {
        for j in self.n.saturating_sub(RING)..self.n {
            unsafe { self.resolve(j & (RING - 1), users, arena, bytes, sink) };
        }
        self.n = 0;
    }
}

fn unmap_files(ctx: &Ctx, range: std::ops::Range<usize>, id: usize, threads: usize) {
    for f in range.filter(|f| f % threads == id) {
        let file = ctx.files[f];
        if !file.is_empty() {
            unsafe { libc::munmap(file.as_ptr() as *mut libc::c_void, file.len()) };
        }
    }
}

fn person_order(ctx: &Ctx, all_p2: &[&Sink<PersonRec>], all_clicks: &[&Sink<ClickRec>]) -> Vec<usize> {
    let mut sizes: Vec<(usize, usize)> = (0..1usize << ctx.p2_bits)
        .map(|p| {
            let n: usize = all_p2.iter().map(|s| s.len(p)).sum::<usize>()
                + all_clicks.iter().map(|s| s.len(p)).sum::<usize>() / 4;
            (n, p)
        })
        .collect();
    sizes.sort_unstable_by(|a, b| b.cmp(a));
    sizes.into_iter().map(|(_, p)| p).collect()
}

fn map_file(path: &Path) -> Result<&'static [u8]> {
    use std::os::unix::io::AsRawFd;
    let file = fs::File::open(path).map_err(|e| format!("{}: {e}", path.display()))?;
    let len = file.metadata()?.len() as usize;
    if len == 0 {
        return Ok(&[]);
    }
    unsafe {
        let p = libc::mmap(std::ptr::null_mut(), len, libc::PROT_READ, libc::MAP_PRIVATE, file.as_raw_fd(), 0);
        if p == libc::MAP_FAILED {
            return Err(format!("{}: mmap failed", path.display()).into());
        }
        Ok(std::slice::from_raw_parts(p as *const u8, len))
    }
}

fn map_folder(dir: &Path) -> Result<Vec<&'static [u8]>> {
    let paths: Vec<PathBuf> = input::csv_files(dir)?;
    paths.iter().map(|p| map_file(p)).collect()
}

fn chunks(files: &[&'static [u8]], base: usize, target: usize, out: &mut Vec<(usize, usize, usize)>) {
    for (k, &file) in files.iter().enumerate() {
        let mut start = 0;
        while start < file.len() {
            let end = start.saturating_add(target).min(file.len());
            out.push((base + k, start, end));
            start = end;
        }
    }
}

fn split_tail(units: &mut Vec<(usize, usize, usize)>, count: usize, pieces: usize) {
    let from = units.len().saturating_sub(count);
    let tail: Vec<_> = units.drain(from..).collect();
    for (file, s, e) in tail {
        let step = (e - s).div_ceil(pieces).max(1);
        let mut at = s;
        while at < e {
            let next = (at + step).min(e);
            units.push((file, at, next));
            at = next;
        }
    }
}

#[inline]
fn next_line(file: &[u8], at: usize) -> usize {
    match file[at..].iter().position(|&b| b == b'\n') {
        Some(offset) => at + offset + 1,
        None => file.len(),
    }
}

fn populate(file: &'static [u8], s: usize, e: usize) {
    let page = 4096usize;
    let base = file.as_ptr() as usize;
    let from = (base + s) & !(page - 1);
    let to = (base + e.min(file.len())).div_ceil(page) * page;
    unsafe { libc::madvise(from as *mut libc::c_void, to - from, 22) };
}

fn warm_heap() {
    let warm: Vec<Vec<u8>> = (0..HEAP_WARM).map(|_| Vec::with_capacity(HEAP_PIECE)).collect();
    std::hint::black_box(warm.as_ptr());
    drop(warm);
}

fn line_range(file: &'static [u8], s: usize, e: usize) -> &'static [u8] {
    populate(file, s, e);
    let begin = next_line(file, s.saturating_sub(1));
    let end = if e >= file.len() { file.len() } else { next_line(file, e - 1) };
    if begin >= end {
        &file[..0]
    } else {
        &file[begin..end]
    }
}

fn block_for(records: usize, parts: usize, threads: usize, low: usize) -> usize {
    (records / (parts * threads * 4)).clamp(low, 512) & !3
}

fn bits_for(records: usize, per_part: usize) -> u32 {
    let parts = (records / per_part).max(1).next_power_of_two();
    parts.trailing_zeros().clamp(4, 14)
}

struct Stats {
    event_copies: AtomicUsize,
    winners: AtomicUsize,
    clicks: AtomicUsize,
    distinct: AtomicUsize,
    locals: AtomicUsize,
}

fn spin_until(flag: &AtomicUsize, target: usize) {
    while flag.load(Ordering::Acquire) < target {
        for _ in 0..64 {
            std::hint::spin_loop();
        }
        std::thread::yield_now();
    }
}

pub fn run(config: &Config) -> Result<Outcome> {
    let started = Instant::now();
    let tracing = trace::enabled();
    let epoch_start = std::time::SystemTime::now();
    let lap = |name: &str| eprintln!("{name:<8} {:>8.1} ms", started.elapsed().as_secs_f64() * 1e3);
    let mark = |name: &str| {
        if tracing {
            eprintln!("trace m setup:{name} {:.3}", started.elapsed().as_secs_f64() * 1e3);
        }
    };
    unsafe {
        libc::mallopt(libc::M_MMAP_THRESHOLD, 4 << 20);
        libc::mallopt(libc::M_TRIM_THRESHOLD, i32::MAX);
    }
    let data = config.data_dir;
    let manifest = fs::read(data.join("manifest.json")).map_err(|e| format!("manifest.json: {e}"))?;
    let window = input::Window::from_manifest(&manifest)?;
    let (ws, we) = (window.start, window.end);
    let cws = ws.checked_sub(WEEK_MS).ok_or("window start out of range")?;
    if we <= ws || we - cws >= i64::from(u32::MAX) - 1 {
        return Ok(Outcome::Fallback("window shape".into()));
    }
    let products_file: &'static [u8] = Box::leak(
        fs::read(data.join("products.csv"))
            .map_err(|e| format!("products.csv: {e}"))?
            .into_boxed_slice(),
    );
    let campaigns_file: &'static [u8] = Box::leak(
        fs::read(data.join("campaigns.csv"))
            .map_err(|e| format!("campaigns.csv: {e}"))?
            .into_boxed_slice(),
    );
    let mut seen_categories: Vec<&'static [u8]> = vec![UNKNOWN_CATEGORY];
    let mut category_ids: crate::hash::FastMap<&'static [u8], u32> = crate::hash::new_map(64);
    category_ids.insert(UNKNOWN_CATEGORY, 0);
    let mut product_entries: Vec<(&'static [u8], u32)> = Vec::with_capacity(products_file.len() / 16 + 1);
    let mut last: (&[u8], u32) = (UNKNOWN_CATEGORY, 0);
    for [p, c] in csv::rows(products_file).filter_map(csv::fields::<2>) {
        let id = if c == last.0 {
            last.1
        } else {
            let next = seen_categories.len() as u32;
            let id = *category_ids.entry(c).or_insert(next);
            if id == next {
                seen_categories.push(c);
                if seen_categories.len() > 255 {
                    return Ok(Outcome::Fallback("category count".into()));
                }
            }
            last = (c, id);
            id
        };
        product_entries.push((p, id));
    }
    let mut by_name: Vec<u32> = (0..seen_categories.len() as u32).collect();
    by_name.sort_unstable_by(|&a, &b| seen_categories[a as usize].cmp(seen_categories[b as usize]));
    let categories: Vec<&'static [u8]> = by_name.iter().map(|&i| seen_categories[i as usize]).collect();
    let mut rank = vec![0u32; by_name.len()];
    for (sorted, &old) in by_name.iter().enumerate() {
        rank[old as usize] = sorted as u32;
    }
    for entry in product_entries.iter_mut() {
        entry.1 = rank[entry.1 as usize];
    }
    let unknown = rank[0];
    let mut campaign_ids: Vec<&'static [u8]> = Vec::new();
    let mut campaign_channels: Vec<&'static [u8]> = Vec::new();
    let mut campaign_entries: Vec<(&'static [u8], u32)> = Vec::new();
    {
        let mut seen = std::collections::HashSet::new();
        for [id, channel] in csv::rows(campaigns_file).filter_map(csv::fields::<2>) {
            if seen.insert(id) {
                campaign_entries.push((id, campaign_ids.len() as u32));
                campaign_ids.push(id);
                campaign_channels.push(channel);
            }
        }
    }
    let organic = campaign_ids.len() as u32;
    mark("reference");

    let event_files = map_folder(&data.join("events"))?;
    let click_files = map_folder(&data.join("clicks"))?;
    let link_files = map_folder(&data.join("links"))?;
    mark("map");
    let event_bytes: usize = event_files.iter().map(|f| f.len()).sum();
    let click_bytes: usize = click_files.iter().map(|f| f.len()).sum();
    let link_bytes: usize = link_files.iter().map(|f| f.len()).sum();
    let threads = config.threads.max(1);
    sink::reserve(event_bytes * 2 + click_bytes * 2 + link_bytes * 2 + threads * (320 << 20) + (512 << 20));
    let target = ((event_bytes + click_bytes) / (threads * 24)).clamp(64 << 10, 4 << 20);
    let mut event_chunks = Vec::new();
    chunks(&event_files, 0, target, &mut event_chunks);
    let mut click_chunks = Vec::new();
    chunks(&click_files, event_files.len(), target, &mut click_chunks);
    if click_chunks.is_empty() {
        split_tail(&mut event_chunks, 2 * threads, 4);
    } else {
        split_tail(&mut click_chunks, 2 * threads, 4);
    }
    let mut units = vec![Unit::Links];
    units.extend(event_chunks.iter().map(|&(f, s, e)| Unit::Events(f, s, e)));
    units.extend(click_chunks.iter().map(|&(f, s, e)| Unit::Clicks(f, s, e)));
    let files: Vec<&'static [u8]> = event_files.iter().chain(&click_files).copied().collect();

    mark("chunks");
    let est_events = event_bytes / 60 + 1;
    let est_users = event_bytes / 80 / 12 + 4096;
    let qbits = (est_users / 4096).next_power_of_two().trailing_zeros().clamp(4, 12);
    let first_day = ws.div_euclid(DAY_MS);
    let last_day = (we - 1).div_euclid(DAY_MS);
    let ctx = Ctx {
        calendar: Calendar::around(ws),
        ws,
        we,
        cws,
        ingest_base: (cws.div_euclid(1000) - (1i64 << 31)) * 1000,
        products: KeyMap::new(&product_entries),
        unknown,
        campaigns: KeyMap::new(&campaign_entries),
        organic,
        p1_bits: bits_for(est_events, 12 << 10),
        p2_bits: bits_for(est_events, 12 << 10),
        qbits,
        ib: 32 - qbits,
        user_slots: (est_users * 2 / threads.max(2)).next_power_of_two().clamp(1 << 12, 1 << 26),
        export_block: block_for(est_users, 1 << qbits, 1, 32),
        p1_block: block_for(event_bytes / 77, 1 << bits_for(est_events, 12 << 10), threads, 64),
        click_block: block_for(click_bytes / 47, 1 << bits_for(est_events, 12 << 10), threads, 32),
        p2_block: block_for(event_bytes / 77, 1 << bits_for(est_events, 12 << 10), threads, 64),
        first_day,
        days: (last_day - first_day + 1) as usize,
        day_shift: cws - first_day * DAY_MS,
        link_files,
        units,
        files,
        event_files: event_files.len(),
        marker: std::marker::PhantomData,
    };
    lap("setup");

    let link_space: OnceLock<LinkSpace> = OnceLock::new();
    let queue = AtomicUsize::new(0);
    let merge_queue = AtomicUsize::new(0);
    let dedup_queue = AtomicUsize::new(0);
    let ready = AtomicUsize::new(0);
    let person_queue = AtomicUsize::new(0);
    let file_counter = AtomicUsize::new(0);
    let bail = AtomicBool::new(false);
    let barrier = Barrier::new(threads);
    let spaces: Vec<OnceLock<Space>> = (0..threads).map(|_| OnceLock::new()).collect();
    let merged: Vec<OnceLock<Merged>> = (0..1usize << qbits).map(|_| OnceLock::new()).collect();
    let p1_sinks: Vec<OnceLock<Sink<EventRec>>> = (0..threads).map(|_| OnceLock::new()).collect();
    let click_sinks: Vec<OnceLock<Sink<ClickRec>>> = (0..threads).map(|_| OnceLock::new()).collect();
    let p2_sinks: Vec<OnceLock<Sink<PersonRec>>> = (0..threads).map(|_| OnceLock::new()).collect();
    let finals: Mutex<Finals> = Mutex::new(Finals {
        results: Vec::new(),
        jobs: Vec::new(),
        pushed: 0,
    });
    let finals_cv = Condvar::new();
    let cells_all: OnceLock<Vec<(Vec<[u64; 4]>, [u64; 4])>> = OnceLock::new();
    let campaign_sums: Mutex<[u64; 4]> = Mutex::new([0; 4]);
    let stats = Stats {
        event_copies: AtomicUsize::new(0),
        winners: AtomicUsize::new(0),
        clicks: AtomicUsize::new(0),
        distinct: AtomicUsize::new(0),
        locals: AtomicUsize::new(0),
    };
    let user_dir = config.output_dir.join("user_daily");
    let campaign_dir = config.output_dir.join("campaign_daily");
    crate::output::create_table_dir(config.output_dir, "user_daily")?;
    crate::output::create_table_dir(config.output_dir, "campaign_daily")?;
    let failure: Mutex<Option<String>> = Mutex::new(None);
    let traces: Mutex<Vec<(usize, trace::Trace)>> = Mutex::new(Vec::new());
    let dedup_units = 1usize << ctx.p1_bits;
    let merge_units = 1usize << ctx.qbits;
    let pieces = threads.clamp(1, 4);
    mark("dirs");

    std::thread::scope(|scope| {
        for id in 0..threads {
            let ctx = &ctx;
            let link_space = &link_space;
            let queue = &queue;
            let merge_queue = &merge_queue;
            let dedup_queue = &dedup_queue;
            let ready = &ready;
            let person_queue = &person_queue;
            let file_counter = &file_counter;
            let bail = &bail;
            let barrier = &barrier;
            let spaces = &spaces;
            let merged = &merged;
            let p1_sinks = &p1_sinks;
            let click_sinks = &click_sinks;
            let p2_sinks = &p2_sinks;
            let finals = &finals;
            let finals_cv = &finals_cv;
            let cells_all = &cells_all;
            let campaign_sums = &campaign_sums;
            let stats = &stats;
            let lap = &lap;
            let user_dir = &user_dir;
            let campaign_dir = &campaign_dir;
            let campaign_ids = &campaign_ids;
            let campaign_channels = &campaign_channels;
            let failure = &failure;
            let categories = &categories;
            let traces = &traces;
            scope.spawn(move || {
                warm_heap();
                let mut tr = trace::Trace::new(tracing, started);
                let mut arena = Arena::new();
                let mut bytes = Bytes::new();
                let mut users = Interner::new(ctx.user_slots, ctx.qbits, ctx.export_block, false);
                let mut p1: Sink<EventRec> = Sink::new(1 << ctx.p1_bits, ctx.p1_block);
                let mut raw_clicks: Sink<ClickRec> = Sink::new(1, ctx.click_block);
                let mut copies = 0usize;
                let mut click_count = 0usize;
                let mut odd = false;
                loop {
                    let i = queue.fetch_add(1, Ordering::Relaxed);
                    let t = tr.now();
                    let Some(&unit) = ctx.units.get(i) else { break };
                    match unit {
                        Unit::Links => {
                            let t0 = Instant::now();
                            let space = build_links(ctx, &mut arena, &mut bytes);
                            eprintln!(
                                "links    {:>8.1} ms on one thread, {} lines, {} ids",
                                t0.elapsed().as_secs_f64() * 1e3,
                                space.lines,
                                space.names.len()
                            );
                            let _ = link_space.set(space);
                            for file in ctx.link_files.iter().filter(|f| !f.is_empty()) {
                                unsafe { libc::munmap(file.as_ptr() as *mut libc::c_void, file.len()) };
                            }
                            tr.add(trace::LINKS, t);
                        }
                        Unit::Events(f, s, e) => {
                            let file = ctx.files[f];
                            let chunk = line_range(file, s, e);
                            if !chunk.is_empty() {
                                let (n, bad) = parse_events(ctx, chunk, &mut arena, &mut bytes, &mut users, &mut p1);
                                copies += n;
                                odd |= bad;
                            }
                            tr.add(trace::EVENTS, t);
                        }
                        Unit::Clicks(f, s, e) => {
                            let file = ctx.files[f];
                            let chunk = line_range(file, s, e);
                            if !chunk.is_empty() {
                                click_count += parse_clicks(ctx, chunk, &mut arena, &mut bytes, &mut users, &mut raw_clicks);
                            }
                            tr.add(trace::CLICKS, t);
                        }
                    }
                }
                let t = tr.now();
                p1.finish(&mut arena);
                raw_clicks.finish(&mut arena);
                users.export.finish(&mut arena);
                users.release();
                let count = users.count() as usize;
                stats.locals.fetch_add(count, Ordering::Relaxed);
                let _ = spaces[id].set(Space {
                    export: users.export,
                    l2g: (0..count).map(|_| AtomicU32::new(0)).collect(),
                });
                let _ = p1_sinks[id].set(p1);
                if odd {
                    bail.store(true, Ordering::Relaxed);
                }
                tr.add(trace::EVENTS, t);
                let t = tr.now();
                if barrier.wait().is_leader() {
                    lap("parse");
                }
                tr.add(trace::BAR_ALL, t);
                if bail.load(Ordering::Relaxed) {
                    arena.release();
                    return;
                }
                let t = tr.now();
                let all_spaces: Vec<&Space> = spaces.iter().map(|s| s.get().unwrap()).collect();
                let links = link_space.get().unwrap();
                let mut table = ids::Table::new();
                let mut distinct = 0usize;
                loop {
                    let q = merge_queue.fetch_add(1, Ordering::Relaxed);
                    if q >= merge_units {
                        break;
                    }
                    let part = merge(ctx, q, links, &all_spaces, &mut table);
                    if part.keys.len() >= 1 << ctx.ib {
                        bail.store(true, Ordering::Relaxed);
                    }
                    distinct += part.keys.len();
                    let _ = merged[q].set(part);
                }
                drop(table);
                stats.distinct.fetch_add(distinct, Ordering::Relaxed);
                tr.add(trace::MERGE, t);
                let t = tr.now();
                if barrier.wait().is_leader() {
                    lap("merge");
                }
                tr.add(trace::BAR_MERGE, t);
                if bail.load(Ordering::Relaxed) {
                    arena.release();
                    return;
                }
                let t = tr.now();
                let names: Vec<&[u32]> = merged.iter().map(|m| m.get().unwrap().names.as_slice()).collect();
                persons(ctx, &all_spaces[id].l2g, &names, &links.l2g);
                ready.fetch_add(1, Ordering::Release);
                tr.add(trace::PERSONS, t);
                let t = tr.now();
                let mut clicks: Sink<ClickRec> = Sink::new(1 << ctx.p2_bits, ctx.click_block);
                route_clicks(ctx, &raw_clicks, &all_spaces[id].l2g, &mut arena, &mut clicks);
                clicks.finish(&mut arena);
                let _ = click_sinks[id].set(clicks);
                drop(raw_clicks);
                tr.add(trace::RECLICK, t);
                let w = tr.now();
                spin_until(ready, threads);
                tr.add(trace::BAR_PARSE, w);
                let all_p1: Vec<&Sink<EventRec>> = p1_sinks.iter().map(|s| s.get().unwrap()).collect();
                let l2p: Vec<&[AtomicU32]> = all_spaces.iter().map(|s| s.l2g.as_slice()).collect();
                let mut p2: Sink<PersonRec> = Sink::new(1 << ctx.p2_bits, ctx.p2_block);
                let mut buf: Vec<EventRec> = Vec::new();
                let mut starts: Vec<usize> = Vec::new();
                let mut table: Vec<(u64, u32)> = Vec::new();
                let mut winners = 0usize;
                loop {
                    let q = dedup_queue.fetch_add(1, Ordering::Relaxed);
                    if q >= dedup_units {
                        break;
                    }
                    let t = tr.now();
                    winners += dedup(ctx, &l2p, &all_p1, q, &mut buf, &mut starts, &mut table, &mut arena, &mut p2);
                    tr.add(trace::DEDUP, t);
                }
                drop(all_p1);
                drop(buf);
                drop(table);
                stats.event_copies.fetch_add(copies, Ordering::Relaxed);
                stats.clicks.fetch_add(click_count, Ordering::Relaxed);
                stats.winners.fetch_add(winners, Ordering::Relaxed);
                p2.finish(&mut arena);
                let _ = p2_sinks[id].set(p2);
                let t = tr.now();
                if barrier.wait().is_leader() {
                    lap("dedup");
                }
                tr.add(trace::BAR_DEDUP, t);
                let t = tr.now();
                unmap_files(ctx, 0..ctx.event_files, id, threads);
                tr.add(trace::UNMAP, t);
                let t = tr.now();
                let keys_by_q: Vec<&[Key]> = merged.iter().map(|m| m.get().unwrap().keys.as_slice()).collect();
                let low_mask = (1u64 << ctx.ib) - 1;
                let ib = ctx.ib;
                let name_of = move |person: u64, out: &mut Vec<u8>| {
                    ids::write_bytes(&keys_by_q[(person >> ib) as usize][(person & low_mask) as usize], out);
                };
                let all_p2: Vec<&Sink<PersonRec>> = p2_sinks.iter().map(|s| s.get().unwrap()).collect();
                let all_clicks: Vec<&Sink<ClickRec>> = click_sinks.iter().map(|s| s.get().unwrap()).collect();
                let order = person_order(ctx, &all_p2, &all_clicks);
                tr.add(trace::ORDER, t);
                let mut worker = Worker::new(ctx);
                let mut flushed = [0u64; 4];
                loop {
                    let i = person_queue.fetch_add(1, Ordering::Relaxed);
                    let Some(&p) = order.get(i) else { break };
                    let t = tr.now();
                    worker.partition(ctx, &all_p2, &all_clicks, p);
                    tr.add(trace::PEOPLE, t);
                    if worker.rows.len() >= FLUSH_ROWS {
                        let tw = tr.now();
                        let file = file_counter.fetch_add(1, Ordering::Relaxed);
                        if let Err(e) = write::user_part(
                            user_dir,
                            file,
                            &worker.rows,
                            0..worker.rows.len(),
                            categories,
                            ctx.first_day,
                            &name_of,
                        ) {
                            *failure.lock().unwrap() = Some(e.to_string());
                        }
                        let t = worker.rows.totals();
                        for k in 0..4 {
                            flushed[k] += t[k];
                        }
                        worker.rows.clear();
                        tr.add(trace::USER_WRITE, tw);
                    }
                }
                let t = tr.now();
                let mut part = worker.finish();
                let cells = std::mem::take(&mut part.cells);
                let mut totals = part.totals();
                for k in 0..4 {
                    totals[k] += flushed[k];
                }
                let part = std::sync::Arc::new(part);
                {
                    let mut state = finals.lock().unwrap();
                    let rows = part.len();
                    if rows > 0 || id == 0 {
                        let step = FINAL_ROWS.max(rows.div_ceil(threads));
                        let mut at = 0;
                        loop {
                            let end = (at + step).min(rows);
                            state.jobs.push(Job::User(part.clone(), at, end));
                            at = end;
                            if at >= rows {
                                break;
                            }
                        }
                    }
                    state.results.push((cells, totals));
                    state.pushed += 1;
                    if state.pushed == threads {
                        let _ = cells_all.set(std::mem::take(&mut state.results));
                        for k in 0..pieces {
                            state.jobs.push(Job::Campaign(k));
                        }
                    }
                }
                finals_cv.notify_all();
                drop(part);
                tr.add(trace::PEOPLE, t);
                loop {
                    let job = {
                        let mut state = finals.lock().unwrap();
                        loop {
                            if let Some(job) = state.jobs.pop() {
                                break Some(job);
                            }
                            if state.pushed == threads {
                                break None;
                            }
                            let w = tr.now();
                            state = finals_cv.wait(state).unwrap();
                            tr.add(trace::BAR_END, w);
                        }
                    };
                    let Some(job) = job else { break };
                    match job {
                        Job::User(part, a, b) => {
                            let t = tr.now();
                            let file = file_counter.fetch_add(1, Ordering::Relaxed);
                            if let Err(e) =
                                write::user_part(user_dir, file, &part, a..b, categories, ctx.first_day, &name_of)
                            {
                                *failure.lock().unwrap() = Some(e.to_string());
                            }
                            tr.add(trace::LAST_WRITE, t);
                        }
                        Job::Campaign(k) => {
                            let t = tr.now();
                            let all = cells_all.get().unwrap();
                            let cells: Vec<&[[u64; 4]]> = all.iter().map(|(c, _)| c.as_slice()).collect();
                            let campaigns = campaign_ids.len() + 1;
                            let per = campaigns.div_ceil(pieces);
                            let range = (k * per).min(campaigns)..((k + 1) * per).min(campaigns);
                            match write::campaign_table(
                                campaign_dir,
                                k,
                                &cells,
                                range,
                                campaign_ids,
                                campaign_channels,
                                ORGANIC,
                                ctx.first_day,
                                ctx.days,
                            ) {
                                Ok(sums) => {
                                    let mut total = campaign_sums.lock().unwrap();
                                    for j in 0..4 {
                                        total[j] += sums[j];
                                    }
                                }
                                Err(e) => *failure.lock().unwrap() = Some(e.to_string()),
                            }
                            tr.add(trace::CAMPAIGN, t);
                        }
                    }
                }
                let t = tr.now();
                arena.release();
                unmap_files(ctx, ctx.event_files..ctx.files.len(), id, threads);
                tr.add(trace::RELEASE, t);
                trace::collect(traces, id, tr);
            });
        }
    });
    if bail.load(Ordering::Relaxed) {
        return Ok(Outcome::Fallback("record outside the compact range".into()));
    }
    lap("people");
    if let Some(e) = failure.into_inner().unwrap() {
        return Err(e.into());
    }
    if let Some(all) = cells_all.get() {
        let mut users = [0u64; 4];
        for (_, t) in all.iter() {
            for k in 0..4 {
                users[k] += t[k];
            }
        }
        write::report(users, *campaign_sums.lock().unwrap());
    }
    eprintln!(
        "event copies {}, winners {}, clicks {}, linked {}, local ids {}, distinct ids {}",
        stats.event_copies.load(Ordering::Relaxed),
        stats.winners.load(Ordering::Relaxed),
        stats.clicks.load(Ordering::Relaxed),
        link_space.get().map_or(0, |p| p.names.len()),
        stats.locals.load(Ordering::Relaxed),
        stats.distinct.load(Ordering::Relaxed)
    );
    lap("write");
    if tracing {
        for (id, t) in traces.into_inner().unwrap().iter() {
            t.print(&format!("t{id}"));
        }
        let at = started.elapsed().as_secs_f64() * 1e3;
        let since = |t: std::time::SystemTime| t.duration_since(std::time::UNIX_EPOCH).map_or(0.0, |d| d.as_secs_f64());
        eprintln!(
            "trace m clock start {:.6} exit {:.6} at {at:.3}",
            since(epoch_start),
            since(std::time::SystemTime::now())
        );
    }
    unsafe { libc::_exit(0) }
}

fn build_links(ctx: &Ctx, arena: &mut Arena, bytes: &mut Bytes) -> LinkSpace {
    let link_bytes: usize = ctx.link_files.iter().map(|f| f.len()).sum();
    let mut interner = Interner::new((link_bytes / 20).max(1024), ctx.qbits, ctx.export_block, true);
    let mut pairs: Vec<(u32, u32)> = Vec::with_capacity(link_bytes / 20 + 16);
    for &file in &ctx.link_files {
        for (start, end) in csv::data_chunks(file, usize::MAX) {
            let body = &file[start..end];
            #[cfg(target_arch = "x86_64")]
            if scan::has_avx2() {
                unsafe { link_pairs_avx2(body, &mut interner, arena, bytes, &mut pairs) };
                continue;
            }
            unsafe { link_pairs::<Scalar>(body, &mut interner, arena, bytes, &mut pairs) };
        }
    }
    people::finish(interner, &pairs, arena)
}

#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "avx2,bmi1,bmi2,popcnt")]
unsafe fn link_pairs_avx2(body: &[u8], interner: &mut Interner, arena: &mut Arena, bytes: &mut Bytes, pairs: &mut Vec<(u32, u32)>) {
    link_pairs::<Avx2>(body, interner, arena, bytes, pairs)
}

#[inline(always)]
unsafe fn link_pairs<K: Kernel>(body: &[u8], interner: &mut Interner, arena: &mut Arena, bytes: &mut Bytes, pairs: &mut Vec<(u32, u32)>) {
    scan::fused::<2, 2, K, _>(body, &mut |f: &[&[u8]; 2]| {
        if !f[0].is_empty() && !f[1].is_empty() {
            pairs.push(people::intern_pair(interner, f[0], f[1], arena, bytes));
        }
    });
}

fn merge(ctx: &Ctx, q: usize, links: &LinkSpace, spaces: &[&Space], table: &mut ids::Table) -> Merged {
    let n = links.export.len(q) + spaces.iter().map(|s| s.export.len(q)).sum::<usize>();
    table.reset(n);
    let mut keys: Vec<Key> = Vec::with_capacity(n / spaces.len().max(1) + 16);
    let mut names: Vec<u32> = Vec::with_capacity(links.export.len(q));
    let base = (q as u32) << ctx.ib;
    for slice in links.export.slices(q) {
        for e in slice {
            let x = ids::exported(e);
            let (idx, new) = table.find_or_insert(&x.key, x.hash, keys.len() as u32);
            if new {
                keys.push(x.key);
                names.push(links.names[x.local as usize]);
            }
            links.l2g[x.local as usize].store(base | idx, Ordering::Relaxed);
        }
    }
    for space in spaces {
        for slice in space.export.slices(q) {
            for e in slice {
                let x = ids::exported(e);
                let (idx, new) = table.find_or_insert(&x.key, x.hash, keys.len() as u32);
                if new {
                    keys.push(x.key);
                }
                space.l2g[x.local as usize].store(base | idx, Ordering::Relaxed);
            }
        }
    }
    Merged { keys, names }
}

fn persons(ctx: &Ctx, l2g: &[AtomicU32], names: &[&[u32]], link_l2g: &[AtomicU32]) {
    let mask = (1u32 << ctx.ib) - 1;
    let ib = ctx.ib;
    for slot in l2g {
        let g = slot.load(Ordering::Relaxed);
        let linked = unsafe { names.get_unchecked((g >> ib) as usize) };
        if let Some(&name) = linked.get((g & mask) as usize) {
            slot.store(link_l2g[name as usize].load(Ordering::Relaxed), Ordering::Relaxed);
        }
    }
}

fn route_clicks(ctx: &Ctx, raw: &Sink<ClickRec>, l2p: &[AtomicU32], arena: &mut Arena, out: &mut Sink<ClickRec>) {
    const BATCH: usize = 32;
    let bits = ctx.p2_bits;
    let mut pending: [ClickRec; BATCH] = [ClickRec {
        click: [0, 0],
        person: 0,
        ts: 0,
        campaign: 0,
        spare: 0,
    }; BATCH];
    let mut count = 0usize;
    let flush = |pending: &mut [ClickRec], out: &mut Sink<ClickRec>, arena: &mut Arena| {
        for rec in pending.iter() {
            prefetch(&l2p[rec.person as usize]);
        }
        for rec in pending.iter_mut() {
            rec.person = l2p[rec.person as usize].load(Ordering::Relaxed);
            out.push(arena, part_of(rec.person, bits), *rec);
        }
    };
    let piece = raw.block_bytes();
    for (slice, block) in raw.slices(0).zip(raw.blocks(0)) {
        for rec in slice {
            pending[count] = *rec;
            count += 1;
            if count == BATCH {
                flush(&mut pending, out, arena);
                count = 0;
            }
        }
        arena.recycle(block, piece, piece);
    }
    flush(&mut pending[..count], out, arena);
}

#[inline(always)]
fn part_of(person: u32, bits: u32) -> usize {
    (u64::from(person).wrapping_mul(H2) >> (64 - bits)) as usize
}

#[inline(always)]
fn ingest_code(ctx: &Ctx, ingest: i64) -> Option<u32> {
    let d = ingest.wrapping_sub(ctx.ingest_base) as u64;
    let code = d / 1000;
    (d == code * 1000 && code < u64::from(u32::MAX)).then_some(code as u32)
}

fn parse_events(
    ctx: &Ctx,
    chunk: &[u8],
    arena: &mut Arena,
    bytes: &mut Bytes,
    users: &mut Interner,
    sink: &mut Sink<EventRec>,
) -> (usize, bool) {
    #[cfg(target_arch = "x86_64")]
    if scan::has_avx2() {
        return unsafe { parse_events_avx2(ctx, chunk, arena, bytes, users, sink) };
    }
    unsafe { parse_events_k::<Scalar>(ctx, chunk, arena, bytes, users, sink) }
}

#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "avx2,bmi1,bmi2,popcnt")]
unsafe fn parse_events_avx2(
    ctx: &Ctx,
    chunk: &[u8],
    arena: &mut Arena,
    bytes: &mut Bytes,
    users: &mut Interner,
    sink: &mut Sink<EventRec>,
) -> (usize, bool) {
    parse_events_k::<Avx2>(ctx, chunk, arena, bytes, users, sink)
}

struct EventLines<'a, K> {
    ctx: &'a Ctx<'a>,
    arena: &'a mut Arena,
    bytes: &'a mut Bytes,
    users: &'a mut Interner,
    sink: &'a mut Sink<EventRec>,
    ring: Ring<EventRec>,
    lo: usize,
    hi: usize,
    copies: usize,
    odd: bool,
    kernel: std::marker::PhantomData<K>,
}

impl<K: Kernel> Lines<7> for EventLines<'_, K> {
    #[inline(always)]
    fn line(&mut self, f: &[&[u8]; 7]) {
        let ctx = self.ctx;
        let event_id = f[0];
        if event_id.is_empty() {
            return;
        }
        self.copies += 1;
        unsafe {
            let key = ids::mapped_key(event_id.as_ptr(), event_id.len(), self.lo, self.hi, self.bytes);
            let part = (ids::hash_of(&key) >> (64 - ctx.p1_bits)) as usize;
            let ingest = ctx.calendar.parse(f[3]);
            let mut rec = EventRec {
                key,
                user: 0,
                ts: INVALID,
                payload: 0,
                ingest: u32::MAX,
            };
            if let Some(ingest) = ingest {
                match ingest_code(ctx, ingest) {
                    Some(code) => rec.ingest = code,
                    None => self.odd = true,
                }
                let user = f[1];
                let product = f[5];
                if !user.is_empty() && !product.is_empty() {
                    if let Some(t) = ctx.calendar.parse(f[2]) {
                        if ctx.ws <= t && t < ctx.we && ingest.saturating_sub(t) <= DAY_MS {
                            let kind = f[4];
                            let k4 = (kind.as_ptr() as *const u32).read_unaligned();
                            let k8 = (kind.as_ptr() as *const u64).read_unaligned();
                            let plain = (kind.len() == 4) & ((k4 == VIEW) | (k4 == CART));
                            let price = if (kind.len() == 8) & (k8 == PURCHASE) {
                                parse_price(f[6])
                            } else if plain {
                                Some(0)
                            } else {
                                None
                            };
                            if let Some(price) = price {
                                let category = if price > 0 {
                                    ctx.products.get_field(product.as_ptr(), product.len()).unwrap_or(ctx.unknown)
                                } else {
                                    0
                                };
                                rec.ts = (t - ctx.cws) as u32;
                                rec.payload = price | category << 24;
                                self.ring.add(rec, user, part, self.users, self.arena, self.bytes, self.sink);
                                return;
                            }
                        }
                    }
                }
            }
            self.sink.push(self.arena, part, rec);
        }
    }

    fn flush(&mut self) {
        self.ring.drain(self.users, self.arena, self.bytes, self.sink);
    }
}

#[inline(always)]
unsafe fn parse_events_k<K: Kernel>(
    ctx: &Ctx,
    chunk: &[u8],
    arena: &mut Arena,
    bytes: &mut Bytes,
    users: &mut Interner,
    sink: &mut Sink<EventRec>,
) -> (usize, bool) {
    let mut lines = EventLines::<K> {
        ctx,
        arena,
        bytes,
        users,
        sink,
        ring: Ring::new(EventRec {
            key: [0, 0],
            user: 0,
            ts: 0,
            payload: 0,
            ingest: 0,
        }),
        lo: chunk.as_ptr() as usize,
        hi: chunk.as_ptr() as usize + chunk.len(),
        copies: 0,
        odd: false,
        kernel: std::marker::PhantomData,
    };
    scan::fused::<7, 2, K, _>(chunk, &mut lines);
    lines.flush();
    (lines.copies, lines.odd)
}

fn parse_clicks(
    ctx: &Ctx,
    chunk: &[u8],
    arena: &mut Arena,
    bytes: &mut Bytes,
    users: &mut Interner,
    sink: &mut Sink<ClickRec>,
) -> usize {
    #[cfg(target_arch = "x86_64")]
    if scan::has_avx2() {
        return unsafe { parse_clicks_avx2(ctx, chunk, arena, bytes, users, sink) };
    }
    unsafe { parse_clicks_k::<Scalar>(ctx, chunk, arena, bytes, users, sink) }
}

#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "avx2,bmi1,bmi2,popcnt")]
unsafe fn parse_clicks_avx2(
    ctx: &Ctx,
    chunk: &[u8],
    arena: &mut Arena,
    bytes: &mut Bytes,
    users: &mut Interner,
    sink: &mut Sink<ClickRec>,
) -> usize {
    parse_clicks_k::<Avx2>(ctx, chunk, arena, bytes, users, sink)
}

struct ClickLines<'a, K> {
    ctx: &'a Ctx<'a>,
    arena: &'a mut Arena,
    bytes: &'a mut Bytes,
    users: &'a mut Interner,
    sink: &'a mut Sink<ClickRec>,
    ring: Ring<ClickRec>,
    lo: usize,
    hi: usize,
    total: usize,
    kernel: std::marker::PhantomData<K>,
}

impl<K: Kernel> Lines<4> for ClickLines<'_, K> {
    #[inline(always)]
    fn line(&mut self, f: &[&[u8]; 4]) {
        let ctx = self.ctx;
        let click_id = f[0];
        let user = f[1];
        if click_id.is_empty() || user.is_empty() {
            return;
        }
        unsafe {
            let Some(t) = ctx.calendar.parse(f[3]) else { return };
            if t < ctx.cws || t >= ctx.we {
                return;
            }
            let Some(campaign) = ctx.campaigns.get_field(f[2].as_ptr(), f[2].len()) else { return };
            let rec = ClickRec {
                click: ids::mapped_key(click_id.as_ptr(), click_id.len(), self.lo, self.hi, self.bytes),
                person: 0,
                ts: (t - ctx.cws) as u32,
                campaign,
                spare: 0,
            };
            self.total += 1;
            self.ring.add(rec, user, 0, self.users, self.arena, self.bytes, self.sink);
        }
    }

    fn flush(&mut self) {
        self.ring.drain(self.users, self.arena, self.bytes, self.sink);
    }
}

#[inline(always)]
unsafe fn parse_clicks_k<K: Kernel>(
    ctx: &Ctx,
    chunk: &[u8],
    arena: &mut Arena,
    bytes: &mut Bytes,
    users: &mut Interner,
    sink: &mut Sink<ClickRec>,
) -> usize {
    let mut lines = ClickLines::<K> {
        ctx,
        arena,
        bytes,
        users,
        sink,
        ring: Ring::new(ClickRec {
            click: [0, 0],
            person: 0,
            ts: 0,
            campaign: 0,
            spare: 0,
        }),
        lo: chunk.as_ptr() as usize,
        hi: chunk.as_ptr() as usize + chunk.len(),
        total: 0,
        kernel: std::marker::PhantomData,
    };
    scan::fused::<4, 4, K, _>(chunk, &mut lines);
    lines.flush();
    lines.total
}

#[allow(clippy::too_many_arguments)]
fn dedup(
    ctx: &Ctx,
    l2p: &[&[AtomicU32]],
    sinks: &[&Sink<EventRec>],
    q: usize,
    buf: &mut Vec<EventRec>,
    starts: &mut Vec<usize>,
    table: &mut Vec<(u64, u32)>,
    arena: &mut Arena,
    out: &mut Sink<PersonRec>,
) -> usize {
    buf.clear();
    starts.clear();
    for sink in sinks {
        starts.push(buf.len());
        for slice in sink.slices(q) {
            buf.extend_from_slice(slice);
        }
    }
    starts.push(buf.len());
    let piece = ctx.p2_block * std::mem::size_of::<PersonRec>();
    for sink in sinks {
        let bytes = sink.block_bytes();
        for block in sink.blocks(q) {
            arena.recycle(block, bytes, piece);
        }
    }
    let n = buf.len();
    if n == 0 {
        return 0;
    }
    let size = (n * 2).next_power_of_two().max(16);
    let tbits = size.trailing_zeros();
    let mask = size - 1;
    table.clear();
    table.resize(size, (0, u32::MAX));
    let shift = 64 - ctx.p1_bits - tbits;
    for i in 0..n {
        let key = buf[i].key;
        let h = ids::hash_of(&key);
        let mut slot = ((h >> shift) as usize) & mask;
        loop {
            let entry = unsafe { table.get_unchecked_mut(slot) };
            if entry.1 == u32::MAX {
                *entry = (h, i as u32);
                break;
            }
            if entry.0 == h && ids::same(&buf[entry.1 as usize].key, &key) {
                let j = entry.1 as usize;
                if buf[i].ingest < buf[j].ingest {
                    buf[j].ts = INVALID;
                    entry.1 = i as u32;
                } else {
                    buf[i].ts = INVALID;
                }
                break;
            }
            slot = (slot + 1) & mask;
        }
    }
    const BATCH: usize = 32;
    let mut pending: [(u32, u32, u32); BATCH] = [(0, 0, 0); BATCH];
    let mut winners = 0usize;
    let bits = ctx.p2_bits;
    for (t, map) in l2p.iter().enumerate() {
        let mut count = 0usize;
        let flush = |pending: &[(u32, u32, u32)], out: &mut Sink<PersonRec>, arena: &mut Arena| {
            for &(user, _, _) in pending {
                prefetch(unsafe { map.as_ptr().add(user as usize) });
            }
            for &(user, ts, payload) in pending {
                let person = unsafe { map.get_unchecked(user as usize) }.load(Ordering::Relaxed);
                out.push(arena, part_of(person, bits), PersonRec {
                    person,
                    ts,
                    payload,
                    spare: 0,
                });
            }
        };
        for rec in &buf[starts[t]..starts[t + 1]] {
            if rec.ts != INVALID {
                pending[count] = (rec.user, rec.ts, rec.payload);
                count += 1;
                winners += 1;
                if count == BATCH {
                    flush(&pending, out, arena);
                    count = 0;
                }
            }
        }
        flush(&pending[..count], out, arena);
    }
    winners
}

#[derive(Clone, Copy, Default)]
struct Rec {
    ts: u32,
    payload: u32,
    id: u32,
}

#[derive(Clone, Copy, Default)]
struct ClickTmp {
    ts: u32,
    id: u32,
    campaign: u32,
    click: Key,
}

fn radix_by_ts<T: Copy + Default>(data: &mut Vec<T>, spare: &mut Vec<T>, low: u32, high: u32, ts: impl Fn(&T) -> u32) {
    let n = data.len();
    if n < 2 || low >= high {
        return;
    }
    const BITS: u32 = 11;
    const BUCKETS: usize = 1 << BITS;
    let span = high - low;
    let passes = (32 - span.leading_zeros()).div_ceil(BITS) as usize;
    let mut hist = vec![[0u32; BUCKETS]; passes];
    for item in data.iter() {
        let v = ts(item) - low;
        for (k, h) in hist.iter_mut().enumerate() {
            unsafe { *h.get_unchecked_mut(((v >> (BITS * k as u32)) as usize) & (BUCKETS - 1)) += 1 };
        }
    }
    spare.clear();
    spare.resize(n, T::default());
    for (k, h) in hist.iter_mut().enumerate() {
        let shift = BITS * k as u32;
        if h.iter().any(|&c| c as usize == n) {
            continue;
        }
        let mut acc = 0u32;
        for c in h.iter_mut() {
            let v = *c;
            *c = acc;
            acc += v;
        }
        for item in data.iter() {
            let d = (((ts(item) - low) >> shift) as usize) & (BUCKETS - 1);
            unsafe {
                let at = h.get_unchecked_mut(d);
                *spare.get_unchecked_mut(*at as usize) = *item;
                *at += 1;
            }
        }
        std::mem::swap(data, spare);
    }
}

struct Worker {
    organic: u32,
    days: usize,
    day_shift: i64,
    campaigns: usize,
    credit: Vec<[u64; 3]>,
    assist: Vec<u32>,
    pub rows: write::Part,
    local_keys: Vec<u64>,
    local_ids: Vec<u32>,
    persons: Vec<u64>,
    counts: Vec<u32>,
    click_counts: Vec<u32>,
    recs: Vec<Rec>,
    spare: Vec<Rec>,
    click_recs: Vec<ClickTmp>,
    click_spare: Vec<ClickTmp>,
    sorted: Vec<u64>,
    local_clicks: Vec<LocalClick>,
    in_window: Vec<u32>,
    active_at: Vec<u32>,
    active: Vec<u32>,
    category_sums: Vec<(u32, u64)>,
}

impl Worker {
    fn new(ctx: &Ctx) -> Worker {
        let campaigns = ctx.organic as usize + 1;
        Worker {
            organic: ctx.organic,
            days: ctx.days,
            day_shift: ctx.day_shift,
            campaigns,
            credit: vec![[0; 3]; campaigns * ctx.days],
            assist: vec![0; campaigns * ctx.days],
            rows: write::Part::default(),
            local_keys: Vec::new(),
            local_ids: Vec::new(),
            persons: Vec::new(),
            counts: Vec::new(),
            click_counts: Vec::new(),
            recs: Vec::new(),
            spare: Vec::new(),
            click_recs: Vec::new(),
            click_spare: Vec::new(),
            sorted: Vec::new(),
            local_clicks: Vec::new(),
            in_window: vec![0; campaigns],
            active_at: vec![0; campaigns],
            active: Vec::new(),
            category_sums: Vec::new(),
        }
    }

    fn finish(mut self) -> write::Part {
        let mut cells = vec![[0u64; 4]; self.campaigns * self.days];
        for day in 0..self.days {
            for c in 0..self.campaigns {
                let at = day * self.campaigns + c;
                let credit = self.credit[at];
                cells[c * self.days + day] = [credit[0], credit[1], credit[2], u64::from(self.assist[at])];
            }
        }
        self.rows.cells = cells;
        self.rows
    }

    fn partition(&mut self, ctx: &Ctx, events: &[&Sink<PersonRec>], clicks: &[&Sink<ClickRec>], p: usize) {
        let n: usize = events.iter().map(|s| s.len(p)).sum();
        if n == 0 {
            return;
        }
        let mut size = (n / 8).next_power_of_two().clamp(64, (n * 2).next_power_of_two().max(64));
        let mut mask = size - 1;
        let mut shift = 64 - ctx.p2_bits - size.trailing_zeros();
        self.local_keys.clear();
        self.local_keys.resize(size, 0);
        self.local_ids.clear();
        self.local_ids.resize(size, u32::MAX);
        self.persons.clear();
        self.counts.clear();
        self.recs.clear();
        let mut low = u32::MAX;
        let mut high = 0u32;
        for sink in events {
            for slice in sink.slices(p) {
                for rec in slice {
                    let key = u64::from(rec.person);
                    let mut slot = ((key.wrapping_mul(H2) >> shift) as usize) & mask;
                    let id = loop {
                        let id = unsafe { *self.local_ids.get_unchecked(slot) };
                        if id == u32::MAX {
                            let id = self.persons.len() as u32;
                            self.local_ids[slot] = id;
                            self.local_keys[slot] = key;
                            self.persons.push(key);
                            self.counts.push(0);
                            if self.persons.len() * 2 > size {
                                size *= 2;
                                mask = size - 1;
                                shift -= 1;
                                self.grow_local(size, shift);
                            }
                            break id;
                        }
                        if unsafe { *self.local_keys.get_unchecked(slot) } == key {
                            break id;
                        }
                        slot = (slot + 1) & mask;
                    };
                    unsafe { *self.counts.get_unchecked_mut(id as usize) += 1 };
                    low = low.min(rec.ts);
                    high = high.max(rec.ts);
                    self.recs.push(Rec {
                        ts: rec.ts,
                        payload: rec.payload,
                        id,
                    });
                }
            }
        }
        radix_by_ts(&mut self.recs, &mut self.spare, low, high, |r| r.ts);
        let persons = self.persons.len();
        let mut offsets: Vec<u32> = Vec::with_capacity(persons + 1);
        let mut acc = 0u32;
        for &c in &self.counts {
            offsets.push(acc);
            acc += c;
        }
        offsets.push(acc);
        self.sorted.clear();
        self.sorted.resize(n, 0);
        {
            let mut next: Vec<u32> = offsets[..persons].to_vec();
            for r in &self.recs {
                let at = unsafe { next.get_unchecked_mut(r.id as usize) };
                unsafe { *self.sorted.get_unchecked_mut(*at as usize) = u64::from(r.ts) << 32 | u64::from(r.payload) };
                *at += 1;
            }
        }

        self.click_counts.clear();
        self.click_counts.resize(persons, 0);
        self.click_recs.clear();
        let mut low = u32::MAX;
        let mut high = 0u32;
        for sink in clicks {
            for slice in sink.slices(p) {
                for rec in slice {
                    let key = u64::from(rec.person);
                    let mut slot = ((key.wrapping_mul(H2) >> shift) as usize) & mask;
                    let id = loop {
                        let id = unsafe { *self.local_ids.get_unchecked(slot) };
                        if id == u32::MAX || unsafe { *self.local_keys.get_unchecked(slot) } == key {
                            break id;
                        }
                        slot = (slot + 1) & mask;
                    };
                    if id != u32::MAX {
                        unsafe { *self.click_counts.get_unchecked_mut(id as usize) += 1 };
                        low = low.min(rec.ts);
                        high = high.max(rec.ts);
                        self.click_recs.push(ClickTmp {
                            ts: rec.ts,
                            id,
                            campaign: rec.campaign,
                            click: rec.click,
                        });
                    }
                }
            }
        }
        radix_by_ts(&mut self.click_recs, &mut self.click_spare, low, high, |r| r.ts);
        let mut click_offsets: Vec<u32> = Vec::with_capacity(persons + 1);
        let mut acc = 0u32;
        for &c in &self.click_counts {
            click_offsets.push(acc);
            acc += c;
        }
        click_offsets.push(acc);
        self.local_clicks.clear();
        self.local_clicks.resize(
            acc as usize,
            LocalClick {
                ts: 0,
                campaign: 0,
                click: [0, 0],
            },
        );
        {
            let mut next: Vec<u32> = click_offsets[..persons].to_vec();
            for r in &self.click_recs {
                let at = unsafe { next.get_unchecked_mut(r.id as usize) };
                unsafe {
                    *self.local_clicks.get_unchecked_mut(*at as usize) = LocalClick {
                        ts: r.ts,
                        campaign: r.campaign,
                        click: r.click,
                    }
                };
                *at += 1;
            }
        }
        for id in 0..persons {
            let (first, last) = (click_offsets[id] as usize, click_offsets[id + 1] as usize);
            let mut i = first + 1;
            while i < last {
                if self.local_clicks[i].ts == self.local_clicks[i - 1].ts {
                    let start = i - 1;
                    let mut end = i + 1;
                    while end < last && self.local_clicks[end].ts == self.local_clicks[start].ts {
                        end += 1;
                    }
                    self.local_clicks[start..end].sort_unstable_by(|a, b| ids::cmp(&b.click, &a.click));
                    i = end;
                } else {
                    i += 1;
                }
            }
        }
        for id in 0..persons {
            let er = offsets[id] as usize..offsets[id + 1] as usize;
            let cr = click_offsets[id] as usize..click_offsets[id + 1] as usize;
            let key = self.persons[id];
            self.person(key, er, cr);
        }
    }

    #[cold]
    #[inline(never)]
    fn grow_local(&mut self, size: usize, shift: u32) {
        let mask = size - 1;
        self.local_keys.clear();
        self.local_keys.resize(size, 0);
        self.local_ids.clear();
        self.local_ids.resize(size, u32::MAX);
        for (id, &key) in self.persons.iter().enumerate() {
            let mut slot = ((key.wrapping_mul(H2) >> shift) as usize) & mask;
            while self.local_ids[slot] != u32::MAX {
                slot = (slot + 1) & mask;
            }
            self.local_ids[slot] = id as u32;
            self.local_keys[slot] = key;
        }
    }

    fn person(&mut self, person: u64, events: std::ops::Range<usize>, clicks: std::ops::Range<usize>) {
        let mut low = clicks.start;
        let mut high = clicks.start;
        let click_end = clicks.end;
        let mut i = events.start;
        let end = events.end;
        let mut row_day = usize::MAX;
        let mut row = [0u64; 3];
        while i < end {
            let start = (self.sorted[i] >> 32) as u32;
            let day = ((i64::from(start) + self.day_shift) / DAY_MS) as usize;
            if day != row_day {
                if row_day != usize::MAX {
                    self.finish_row(person, row_day, row);
                }
                row_day = day;
                row = [0; 3];
            }
            let mut last = start;
            let mut events_in = 0u64;
            let mut revenue = 0u64;
            while i < end {
                let value = self.sorted[i];
                let t = (value >> 32) as u32;
                if t - last > GAP_MS {
                    break;
                }
                last = t;
                events_in += 1;
                let price = (value & 0x00ff_ffff) as u32;
                if price > 0 {
                    revenue += u64::from(price);
                    let category = ((value >> 24) & 0xff) as u32;
                    match self.category_sums.iter_mut().find(|(c, _)| *c == category) {
                        Some((_, sum)) => *sum += u64::from(price),
                        None => self.category_sums.push((category, u64::from(price))),
                    }
                }
                i += 1;
            }
            while high < click_end && self.local_clicks[high].ts <= start {
                let c = self.local_clicks[high].campaign as usize;
                self.in_window[c] += 1;
                if self.in_window[c] == 1 {
                    self.active_at[c] = self.active.len() as u32;
                    self.active.push(c as u32);
                }
                high += 1;
            }
            while low < high && start - self.local_clicks[low].ts > WEEK_MS as u32 {
                let c = self.local_clicks[low].campaign as usize;
                self.in_window[c] -= 1;
                if self.in_window[c] == 0 {
                    let at = self.active_at[c] as usize;
                    self.active.swap_remove(at);
                    if let Some(&moved) = self.active.get(at) {
                        self.active_at[moved as usize] = at as u32;
                    }
                }
                low += 1;
            }
            let credited = if low < high {
                self.local_clicks[high - 1].campaign
            } else {
                self.organic
            };
            let row_base = day * self.campaigns;
            let cell = &mut self.credit[row_base + credited as usize];
            cell[0] += 1;
            if revenue > 0 {
                cell[1] += 1;
                cell[2] += revenue;
            }
            let assist = &mut self.assist[row_base..row_base + self.campaigns];
            for &c in &self.active {
                unsafe { *assist.get_unchecked_mut(c as usize) += 1 };
            }
            row[0] += 1;
            row[1] += events_in;
            row[2] += revenue;
        }
        if row_day != usize::MAX {
            self.finish_row(person, row_day, row);
        }
        for &c in &self.active {
            self.in_window[c as usize] = 0;
        }
        self.active.clear();
    }

    fn finish_row(&mut self, person: u64, day: usize, row: [u64; 3]) {
        let top = self
            .category_sums
            .iter()
            .max_by(|(ca, sa), (cb, sb)| sa.cmp(sb).then(cb.cmp(ca)))
            .map_or(u8::MAX, |&(c, _)| c as u8);
        self.category_sums.clear();
        self.rows.push(person, day as u32, row, top);
    }
}
