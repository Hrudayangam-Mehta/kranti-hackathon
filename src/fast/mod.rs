mod alias;
mod event16;
mod event32;
pub mod id;
pub mod keys;
pub mod parquet;
pub mod people;
mod ready;
pub mod scan;
pub mod sink;
pub mod trace;
pub mod ts;
pub mod write;

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Barrier, Condvar, Mutex, OnceLock};
use std::time::Instant;

use crate::csv;
use crate::events::parse_price;
use crate::input::{self, Result, Window, ORGANIC, UNKNOWN_CATEGORY};
use crate::time::DAY_MS;
use id::{Domain, Key};
use event16::{hash as event_hash, Layout as EventLayout};
pub use event16::EventSmall;
pub use event32::EventMid;
use keys::SmallMap;
use people::{prefetch, People};
#[cfg(target_arch = "x86_64")]
use scan::{Avx2, Avx512};
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
const VIEW: u32 = u32::from_le_bytes(*b"view");
const CART: u32 = u32::from_le_bytes(*b"cart");
const PURCHASE: u64 = u64::from_le_bytes(*b"purchase");

#[derive(Clone, Copy)]
#[cfg_attr(test, derive(Debug, PartialEq, Eq))]
#[repr(C)]
pub struct EventRec {
    event: Key,
    user: Key,
    ingest: i64,
    ts: u32,
    payload: u32,
}

#[derive(Clone, Copy)]
#[repr(C)]
pub struct PersonSmall {
    person: u64,
    ts: u32,
    payload: u32,
}

#[derive(Clone, Copy)]
#[repr(C)]
pub struct ClickSmall {
    person: u64,
    click: u64,
    ts: u32,
    campaign: u32,
}

pub struct Pair<A: Copy, B: Copy> {
    a: Sink<A>,
    b: Sink<B>,
}

impl<A: Copy, B: Copy> Pair<A, B> {
    fn new(parts: usize, block_a: usize, block_b: usize) -> Self {
        Pair {
            a: Sink::new(parts, block_a),
            b: Sink::new(parts, block_b),
        }
    }

    fn finish(&mut self, arena: &mut Arena) {
        self.a.finish(arena);
        self.b.finish(arena);
    }

    fn len(&self, part: usize) -> usize {
        self.a.len(part) + self.b.len(part)
    }
}

struct Copies {
    a: Sink<EventSmall>,
    middle: Sink<EventMid>,
    b: Sink<EventRec>,
}

impl Copies {
    fn new(ctx: &Ctx) -> Self {
        let parts = 1 << ctx.p1_bits;
        Self {
            a: Sink::new(parts, ctx.p1_block * 2),
            middle: Sink::new(parts, ctx.p1_block),
            b: Sink::new(parts, ctx.p1_block * 2 / 3),
        }
    }

    fn finish(&mut self, arena: &mut Arena) {
        self.a.finish(arena);
        self.middle.finish(arena);
        self.b.finish(arena);
    }

    fn len(&self, part: usize) -> usize {
        self.a.len(part) + self.middle.len(part) + self.b.len(part)
    }
}
type Persons = Pair<PersonSmall, PersonRec>;
type Clicks = Pair<ClickSmall, ClickRec>;

#[inline(always)]
fn click_bucket(part: usize, bits: u32, linked: bool) -> usize {
    part + ((linked as usize) << bits)
}

fn split_click_block(requested: usize) -> usize {
    // Both unchanged click lanes stream eight records at a time. Halve the
    // previous effective block size, then round up to that same quantum.
    const QUANTUM: usize = 8;
    let previous = requested.div_ceil(QUANTUM) * QUANTUM;
    previous.div_ceil(2 * QUANTUM).max(1) * QUANTUM
}

fn new_clicks(ctx: &Ctx) -> Clicks {
    Pair::new(
        2 * (1usize << ctx.p2_bits),
        split_click_block(ctx.click_block),
        split_click_block(ctx.click_block / 2),
    )
}

#[derive(Clone, Copy)]
#[repr(C)]
pub struct PersonRec {
    person: Key,
    ts: u32,
    payload: u32,
}

#[derive(Clone, Copy)]
#[repr(C)]
pub struct ClickRec {
    person: Key,
    click: Key,
    ts: u32,
    campaign: u32,
}

const _: () = assert!(std::mem::size_of::<ClickSmall>() == 24 && std::mem::size_of::<ClickRec>() == 40);

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
    products: SmallMap,
    unknown: u32,
    campaigns: SmallMap,
    organic: u32,
    p1_bits: u32,
    event_layout: EventLayout,
    p2_bits: u32,
    p1_block: usize,
    click_block: usize,
    p2_block: usize,
    first_day: i64,
    days: usize,
    day_shift: i64,
    link_files: Vec<&'static [u8]>,
    users: Domain,
    event_ids: Domain,
    click_ids: Domain,
    units: Vec<Unit>,
    files: Vec<&'static [u8]>,
    remaining: Vec<AtomicUsize>,
    first_click: usize,
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

fn release_chunk(ctx: &Ctx, f: usize, tr: &mut trace::Trace) {
    if ctx.remaining[f].fetch_sub(1, Ordering::AcqRel) == 1 {
        let t = tr.now();
        let file = ctx.files[f];
        unsafe { libc::munmap(file.as_ptr() as *mut libc::c_void, file.len()) };
        tr.add(trace::UNMAP, t);
    }
}

fn person_order(ctx: &Ctx, all_p2: &[&Persons], all_clicks: &[&Clicks]) -> Vec<usize> {
    let mut sizes: Vec<(usize, usize)> = (0..1usize << ctx.p2_bits)
        .map(|p| {
            let bucket = click_bucket(p, ctx.p2_bits, false);
            let n: usize = all_p2.iter().map(|s| s.len(p)).sum::<usize>()
                + all_clicks.iter().map(|s| s.len(bucket)).sum::<usize>() / 4;
            (n, p)
        })
        .collect();
    sizes.sort_unstable_by(|a, b| b.cmp(a));
    sizes.into_iter().map(|(_, p)| p).collect()
}

fn alias_order(ctx: &Ctx, stores: &[&alias::Store], clicks: &[&Clicks]) -> Vec<usize> {
    let mut sizes: Vec<(usize, usize)> = (0..1usize << ctx.p2_bits).map(|p| {
        let bucket = click_bucket(p, ctx.p2_bits, true);
        let work = stores.iter().map(|s| s.work(p)).sum::<usize>()
            + clicks.iter().map(|s| s.len(bucket)).sum::<usize>() / 4;
        (work, p)
    }).collect();
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
    (records / (parts * threads * 4)).clamp(low, 512) / 24 * 24
}

fn bits_for(records: usize, per_part: usize) -> u32 {
    let parts = (records / per_part).max(1).next_power_of_two();
    parts.trailing_zeros().clamp(4, 14)
}

struct Stats {
    event_copies: AtomicUsize,
    winners: AtomicUsize,
    clicks: AtomicUsize,
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
    let window = Window::from_manifest(&manifest)?;
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
    let mut product_entries: Vec<(u64, u32)> = Vec::with_capacity(products_file.len() / 16 + 1);
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
        product_entries.push((keys::intern(p), id));
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
    let mut campaign_entries: Vec<(u64, u32)> = Vec::new();
    {
        let mut seen = std::collections::HashSet::new();
        for [id, channel] in csv::rows(campaigns_file).filter_map(csv::fields::<2>) {
            if seen.insert(id) {
                campaign_entries.push((keys::intern(id), campaign_ids.len() as u32));
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
    let threads = config.threads.max(1);
    sink::reserve(event_bytes + click_bytes + threads * (160 << 20) + (512 << 20));
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
    let first_click = units.len();
    units.extend(click_chunks.iter().map(|&(f, s, e)| Unit::Clicks(f, s, e)));
    let files: Vec<&'static [u8]> = event_files.iter().chain(&click_files).copied().collect();
    let remaining: Vec<AtomicUsize> = (0..files.len()).map(|_| AtomicUsize::new(0)).collect();
    for &(f, _, _) in event_chunks.iter().chain(&click_chunks) {
        remaining[f].fetch_add(1, Ordering::Relaxed);
    }

    mark("chunks");
    let est_events = event_bytes / 60 + 1;
    let users = if !event_files.iter().all(|f| f.is_empty()) {
        id::detect::<7>(&event_files, &[1])
    } else if !click_files.iter().all(|f| f.is_empty()) {
        id::detect::<4>(&click_files, &[1])
    } else {
        id::detect::<2>(&link_files, &[0, 1])
    };
    let event_ids = id::detect::<7>(&event_files, &[0]);
    let click_ids = id::detect::<4>(&click_files, &[0]);
    mark("domains");
    let first_day = ws.div_euclid(DAY_MS);
    let last_day = (we - 1).div_euclid(DAY_MS);
    let p1_bits = bits_for(est_events, 48 << 10);
    let p2_bits = bits_for(est_events, 24 << 10);
    let Some(event_layout) = EventLayout::new(p1_bits, cws) else {
        return Ok(Outcome::Fallback("event partition codec".into()));
    };
    let ctx = Ctx {
        calendar: Calendar::around(ws),
        ws,
        we,
        cws,
        products: SmallMap::new(&product_entries),
        unknown,
        campaigns: SmallMap::new(&campaign_entries),
        organic,
        p1_bits,
        event_layout,
        p2_bits,
        p1_block: block_for(event_bytes / 77, 1 << p1_bits, threads, 64),
        click_block: block_for(click_bytes / 47, 1 << p2_bits, threads, 32),
        p2_block: block_for(event_bytes / 77, 1 << p2_bits, threads, 64),
        first_day,
        days: (last_day - first_day + 1) as usize,
        day_shift: cws - first_day * DAY_MS,
        link_files,
        users,
        event_ids,
        click_ids,
        units,
        files,
        remaining,
        first_click,
        marker: std::marker::PhantomData,
    };
    lap("setup");

    let people: OnceLock<People> = OnceLock::new();
    let queue = AtomicUsize::new(0);
    let p1_ready = ready::Completion::new(threads);
    let person_queue = AtomicUsize::new(0);
    let alias_queue = AtomicUsize::new(0);
    let raw_work_order: OnceLock<Vec<usize>> = OnceLock::new();
    let canonical_work_order: OnceLock<Vec<usize>> = OnceLock::new();
    let file_counter = AtomicUsize::new(0);
    let barrier = Barrier::new(threads);
    let p1_sinks: Vec<OnceLock<Copies>> = (0..threads).map(|_| OnceLock::new()).collect();
    let click_sinks: Vec<OnceLock<Clicks>> = (0..threads).map(|_| OnceLock::new()).collect();
    let p2_sinks: Vec<OnceLock<Persons>> = (0..threads).map(|_| OnceLock::new()).collect();
    let alias_sinks: Vec<OnceLock<alias::Store>> = (0..threads).map(|_| OnceLock::new()).collect();
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
    };
    let user_dir = config.output_dir.join("user_daily");
    let campaign_dir = config.output_dir.join("campaign_daily");
    crate::output::create_table_dir(config.output_dir, "user_daily")?;
    crate::output::create_table_dir(config.output_dir, "campaign_daily")?;
    let failure: Mutex<Option<String>> = Mutex::new(None);
    let traces: Mutex<Vec<(usize, trace::Trace)>> = Mutex::new(Vec::new());
    let parse_units = ctx.units.len();
    let dedup_units = 1usize << ctx.p1_bits;
    let pieces = threads.clamp(1, 4);
    mark("dirs");

    std::thread::scope(|scope| {
        for id in 0..threads {
            let ctx = &ctx;
            let people = &people;
            let queue = &queue;
            let p1_ready = &p1_ready;
            let person_queue = &person_queue;
            let alias_queue = &alias_queue;
            let raw_work_order = &raw_work_order;
            let canonical_work_order = &canonical_work_order;
            let file_counter = &file_counter;
            let barrier = &barrier;
            let p1_sinks = &p1_sinks;
            let click_sinks = &click_sinks;
            let p2_sinks = &p2_sinks;
            let alias_sinks = &alias_sinks;
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
                let mut p1: Option<Copies> = Some(Copies::new(ctx));
                let mut clicks: Option<Clicks> = Some(new_clicks(ctx));
                let mut copies = 0usize;
                let mut click_count = 0usize;
                let mut p2: Persons = Pair::new(1 << ctx.p2_bits, ctx.p2_block, ctx.p2_block * 2 / 3);
                let mut buf: Vec<EventRec> = Vec::new();
                let mut table: Vec<u32> = Vec::new();
                let mut once: Vec<u64> = Vec::new();
                let mut twice: Vec<u64> = Vec::new();
                let mut winners = 0usize;
                let mut all_p1: Vec<&Copies> = Vec::new();
                loop {
                    let i = queue.fetch_add(1, Ordering::Relaxed);
                    if i >= ctx.first_click {
                        if let Some(mut sink) = p1.take() {
                            sink.finish(&mut arena);
                            let _ = p1_sinks[id].set(sink);
                            p1_ready.arrive();
                        }
                    }
                    if i >= parse_units {
                        if let Some(mut sink) = clicks.take() {
                            sink.finish(&mut arena);
                            let _ = click_sinks[id].set(sink);
                        }
                    }
                    let t = tr.now();
                    if let Some(&unit) = ctx.units.get(i) {
                        match unit {
                            Unit::Links => {
                                let t0 = Instant::now();
                                let built = build_people(&ctx.link_files, &ctx.users);
                                let _ = people.set(built);
                                eprintln!("links    {:>8.1} ms on one thread", t0.elapsed().as_secs_f64() * 1e3);
                                for file in ctx.link_files.iter().filter(|f| !f.is_empty()) {
                                    unsafe { libc::munmap(file.as_ptr() as *mut libc::c_void, file.len()) };
                                }
                                tr.add(trace::LINKS, t);
                            }
                            Unit::Events(f, s, e) => {
                                let file = ctx.files[f];
                                let chunk = line_range(file, s, e);
                                if !chunk.is_empty() {
                                    copies += parse_events(ctx, chunk, &mut arena, p1.as_mut().unwrap());
                                }
                                tr.add(trace::EVENTS, t);
                                release_chunk(ctx, f, &mut tr);
                            }
                            Unit::Clicks(f, s, e) => {
                                let file = ctx.files[f];
                                let chunk = line_range(file, s, e);
                                let people = if let Some(ready) = people.get() {
                                    ready
                                } else {
                                    let w = tr.now();
                                    let ready = people.wait();
                                    tr.add(trace::WAIT_LINKS, w);
                                    ready
                                };
                                let t = tr.now();
                                if !chunk.is_empty() {
                                    click_count += parse_clicks(ctx, people, chunk, &mut arena, clicks.as_mut().unwrap());
                                }
                                tr.add(trace::CLICKS, t);
                                release_chunk(ctx, f, &mut tr);
                            }
                        }
                        continue;
                    }
                    let q = i - parse_units;
                    if q >= dedup_units {
                        break;
                    }
                    if all_p1.is_empty() {
                        let w = tr.now();
                        p1_ready.wait();
                        tr.add(trace::BAR_PARSE, w);
                        all_p1 = p1_sinks.iter().map(|s| s.get().unwrap()).collect();
                    }
                    let t = tr.now();
                    winners += dedup(ctx, &all_p1, q, &mut once, &mut twice, &mut buf, &mut table, &mut arena, &mut p2);
                    tr.add(trace::DEDUP, t);
                }
                drop(all_p1);
                drop(buf);
                drop(table);
                drop(once);
                drop(twice);
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
                let all_p2: Vec<&Persons> = p2_sinks.iter().map(|s| s.get().unwrap()).collect();
                let all_clicks: Vec<&Clicks> = click_sinks.iter().map(|s| s.get().unwrap()).collect();
                let mut worker = Worker::new(ctx);
                let raw_order = raw_work_order.get_or_init(|| person_order(ctx, &all_p2, &all_clicks));
                let mut aliases = alias::Store::new(ctx.p2_bits);
                let mut flushed = [0u64; 4];
                let mut flush_rows = |worker: &mut Worker, tr: &mut trace::Trace| {
                    if worker.rows.len() < FLUSH_ROWS {
                        return;
                    }
                    let tw = tr.now();
                    let file = file_counter.fetch_add(1, Ordering::Relaxed);
                    if let Err(e) = write::user_part(
                        user_dir, file, &worker.rows, 0..worker.rows.len(),
                        categories, ctx.first_day, &ctx.users,
                    ) {
                        *failure.lock().unwrap() = Some(e.to_string());
                    }
                    let totals = worker.rows.totals();
                    for k in 0..4 {
                        flushed[k] += totals[k];
                    }
                    worker.rows.clear();
                    tr.add(trace::USER_WRITE, tw);
                };
                tr.add(trace::ORDER, t);
                loop {
                    let i = alias_queue.fetch_add(1, Ordering::Relaxed);
                    let Some(&p) = raw_order.get(i) else { break };
                    let t = tr.now();
                    worker.compress_aliases(ctx, &all_p2, &all_clicks, p, people.get().unwrap(), &mut aliases);
                    tr.add(trace::PEOPLE, t);
                    flush_rows(&mut worker, &mut tr);
                }
                let _ = alias_sinks[id].set(aliases);
                let t = tr.now();
                if barrier.wait().is_leader() {
                    lap("aliases");
                }
                tr.add(trace::BAR_DEDUP, t);
                let stores: Vec<&alias::Store> = alias_sinks.iter().map(|s| s.get().unwrap()).collect();
                if id == 0 {
                    eprintln!("alias raw4: aliases {}, plain events {}, payload events {}, direct users {}, direct events {}",
                        stores.iter().map(|s| s.aliases).sum::<usize>(),
                        stores.iter().map(|s| s.plain.len()).sum::<usize>(),
                        stores.iter().map(|s| s.paid.len()).sum::<usize>(),
                        stores.iter().map(|s| s.direct_users).sum::<usize>(),
                        stores.iter().map(|s| s.direct_events).sum::<usize>());
                }
                let t = tr.now();
                let order = canonical_work_order.get_or_init(|| alias_order(ctx, &stores, &all_clicks));
                tr.add(trace::ORDER, t);
                loop {
                    let i = person_queue.fetch_add(1, Ordering::Relaxed);
                    let Some(&p) = order.get(i) else { break };
                    let t = tr.now();
                    worker.partition_aliases(ctx, &stores, &all_clicks, p);
                    tr.add(trace::PEOPLE, t);
                    flush_rows(&mut worker, &mut tr);
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
                            if let Err(e) = write::user_part(user_dir, file, &part, a..b, categories, ctx.first_day, &ctx.users) {
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
                tr.add(trace::RELEASE, t);
                trace::collect(traces, id, tr);
            });
        }
    });
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
    let winners = stats.winners.load(Ordering::Relaxed);
    eprintln!(
        "id prefixes: user {:?}, event {:?}, click {:?}",
        ctx.users.plen.checked_sub(1).map(|_| ctx.users.prefix as char),
        ctx.event_ids.plen.checked_sub(1).map(|_| ctx.event_ids.prefix as char),
        ctx.click_ids.plen.checked_sub(1).map(|_| ctx.click_ids.prefix as char)
    );
    eprintln!(
        "event copies {}, winners {}, clicks {}, linked {}, exotic {}",
        stats.event_copies.load(Ordering::Relaxed),
        winners,
        stats.clicks.load(Ordering::Relaxed),
        people.get().map_or(0, |p| p.linked()),
        keys::exotic_count()
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

#[inline(always)]
unsafe fn exact_k<K: Kernel>(domain: &Domain, field: &[u8]) -> Option<Key> {
    let n = field.len();
    let mut p = field.as_ptr();
    let plen = domain.plen;
    if plen == 1 {
        if n == 0 || domain.prefix == 0 || *p != domain.prefix {
            return None;
        }
        p = p.add(1);
    }
    let rest = n.wrapping_sub(plen);
    if rest == id::LONG_LEN {
        let (hi, lo) = K::long(p)?;
        return (!id::reserved_high(hi)).then_some(Key { hi, lo });
    }
    K::short(p, rest).map(|lo| id::short_key(lo, rest))
}

#[inline(always)]
unsafe fn encode_k<K: Kernel>(domain: &Domain, field: &[u8]) -> Key {
    match exact_k::<K>(domain, field) {
        Some(key) => key,
        None => domain.odd(field),
    }
}

#[inline(always)]
unsafe fn lookup_k<K: Kernel>(field: &[u8]) -> Option<u64> {
    match K::pack(field.as_ptr(), field.len()) {
        Some(key) => Some(key),
        None => keys::lookup_exotic(field),
    }
}

#[inline(always)]
fn prefetch_user(people: &People, user: Key) {
    prefetch(people.slot_ptr(user));
}

fn build_people(files: &[&'static [u8]], users: &Domain) -> People {
    let mut pairs: Vec<(Key, Key)> = Vec::new();
    for &file in files {
        for (start, end) in csv::data_chunks(file, usize::MAX) {
            let body = &file[start..end];
            #[cfg(target_arch = "x86_64")]
            if scan::has_avx512() {
                unsafe { link_pairs_avx512(body, &mut pairs, users) };
                continue;
            }
            #[cfg(target_arch = "x86_64")]
            if scan::has_avx2() {
                unsafe { link_pairs_avx2(body, &mut pairs, users) };
                continue;
            }
            unsafe { link_pairs::<Scalar>(body, &mut pairs, users) };
        }
    }
    People::build(&pairs, users)
}

#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "avx512f,avx512bw,avx2,bmi1,bmi2,popcnt")]
unsafe fn link_pairs_avx512(body: &[u8], pairs: &mut Vec<(Key, Key)>, users: &Domain) {
    link_pairs::<Avx512>(body, pairs, users)
}

#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "avx2,bmi1,bmi2,popcnt")]
unsafe fn link_pairs_avx2(body: &[u8], pairs: &mut Vec<(Key, Key)>, users: &Domain) {
    link_pairs::<Avx2>(body, pairs, users)
}

struct LinkLines<'a, K> {
    pairs: &'a mut Vec<(Key, Key)>,
    users: &'a Domain,
    kernel: std::marker::PhantomData<K>,
}

impl<K: Kernel> Lines<2> for LinkLines<'_, K> {
    #[inline(always)]
    fn line(&mut self, f: &[&[u8]; 2]) {
        if f[0].is_empty() || f[1].is_empty() {
            return;
        }
        unsafe {
            self.pairs.push((encode_k::<K>(self.users, f[0]), encode_k::<K>(self.users, f[1])));
        }
    }
}

#[inline(always)]
unsafe fn link_pairs<K: Kernel>(body: &[u8], pairs: &mut Vec<(Key, Key)>, users: &Domain) {
    let mut lines = LinkLines::<K> {
        pairs,
        users,
        kernel: std::marker::PhantomData,
    };
    scan::fused::<2, 2, K, _>(body, &mut lines);
}

#[inline(always)]
fn part_of(key: Key, bits: u32) -> usize {
    (key.hash() >> (64 - bits)) as usize
}

fn parse_events(ctx: &Ctx, chunk: &[u8], arena: &mut Arena, sink: &mut Copies) -> usize {
    #[cfg(target_arch = "x86_64")]
    if scan::has_avx512() {
        return unsafe { parse_events_avx512(ctx, chunk, arena, sink) };
    }
    #[cfg(target_arch = "x86_64")]
    if scan::has_avx2() {
        return unsafe { parse_events_avx2(ctx, chunk, arena, sink) };
    }
    unsafe { parse_events_k::<Scalar>(ctx, chunk, arena, sink) }
}

#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "avx512f,avx512bw,avx2,bmi1,bmi2,popcnt")]
unsafe fn parse_events_avx512(ctx: &Ctx, chunk: &[u8], arena: &mut Arena, sink: &mut Copies) -> usize {
    parse_events_k::<Avx512>(ctx, chunk, arena, sink)
}

#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "avx2,bmi1,bmi2,popcnt")]
unsafe fn parse_events_avx2(ctx: &Ctx, chunk: &[u8], arena: &mut Arena, sink: &mut Copies) -> usize {
    parse_events_k::<Avx2>(ctx, chunk, arena, sink)
}

struct EventLines<'a, K> {
    ctx: &'a Ctx<'a>,
    arena: &'a mut Arena,
    sink: &'a mut Copies,
    copies: usize,
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
            let event = encode_k::<K>(&ctx.event_ids, event_id);
            let ingest = ctx.calendar.parse_ingest(f[3]);
            let mut rec = EventRec {
                event,
                user: Key::default(),
                ingest: ingest.unwrap_or(i64::MAX),
                ts: INVALID,
                payload: 0,
            };
            if let Some(ingest) = ingest {
                let user = f[1];
                let product = f[5];
                if !user.is_empty() && !product.is_empty() {
                    if let Some(t) = ctx.calendar.parse_after_ingest(f[2], f[3], ingest) {
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
                                    lookup_k::<K>(product)
                                        .and_then(|k| ctx.products.get(k))
                                        .unwrap_or(ctx.unknown)
                                } else {
                                    0
                                };
                                rec.user = encode_k::<K>(&ctx.users, user);
                                rec.ts = (t - ctx.cws) as u32;
                                rec.payload = price | category << 24;
                            }
                        }
                    }
                }
            }
            let hash = event_hash(event);
            let part = (hash >> (64 - ctx.p1_bits)) as usize;
            if let Some(small) = ctx.event_layout.pack(&rec, hash) {
                self.sink.a.push(self.arena, part, small);
            } else if let Some(middle) = EventMid::pack(&rec, ctx.cws) {
                self.sink.middle.push(self.arena, part, middle);
            } else {
                self.sink.b.push(self.arena, part, rec);
            }
        }
    }
}

#[inline(always)]
unsafe fn parse_events_k<K: Kernel>(ctx: &Ctx, chunk: &[u8], arena: &mut Arena, sink: &mut Copies) -> usize {
    let mut lines = EventLines::<K> {
        ctx,
        arena,
        sink,
        copies: 0,
        kernel: std::marker::PhantomData,
    };
    scan::fused::<7, 3, K, _>(chunk, &mut lines);
    lines.copies
}

fn parse_clicks(ctx: &Ctx, people: &People, chunk: &[u8], arena: &mut Arena, sink: &mut Clicks) -> usize {
    #[cfg(target_arch = "x86_64")]
    if scan::has_avx512() {
        return unsafe { parse_clicks_avx512(ctx, people, chunk, arena, sink) };
    }
    #[cfg(target_arch = "x86_64")]
    if scan::has_avx2() {
        return unsafe { parse_clicks_avx2(ctx, people, chunk, arena, sink) };
    }
    unsafe { parse_clicks_k::<Scalar>(ctx, people, chunk, arena, sink) }
}

#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "avx512f,avx512bw,avx2,bmi1,bmi2,popcnt")]
unsafe fn parse_clicks_avx512(ctx: &Ctx, people: &People, chunk: &[u8], arena: &mut Arena, sink: &mut Clicks) -> usize {
    parse_clicks_k::<Avx512>(ctx, people, chunk, arena, sink)
}

#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "avx2,bmi1,bmi2,popcnt")]
unsafe fn parse_clicks_avx2(ctx: &Ctx, people: &People, chunk: &[u8], arena: &mut Arena, sink: &mut Clicks) -> usize {
    parse_clicks_k::<Avx2>(ctx, people, chunk, arena, sink)
}

struct ClickLines<'a, K> {
    ctx: &'a Ctx<'a>,
    people: &'a People,
    arena: &'a mut Arena,
    sink: &'a mut Clicks,
    ring: [ClickRec; RING],
    head: usize,
    len: usize,
    total: usize,
    kernel: std::marker::PhantomData<K>,
}

impl<K: Kernel> ClickLines<'_, K> {
    #[inline(always)]
    fn resolve(&mut self, mut rec: ClickRec) {
        // Retain membership from the existing lookup. A canonical root's own
        // clicks, self-links and click-only aliases all belong to the linked half.
        let (person, linked) = self.people.resolve(rec.person);
        rec.person = person;
        let part = click_bucket(part_of(person, self.ctx.p2_bits), self.ctx.p2_bits, linked);
        if (rec.person.hi | rec.click.hi) == 0 {
            let small = ClickSmall {
                person: rec.person.lo,
                click: rec.click.lo,
                ts: rec.ts,
                campaign: rec.campaign,
            };
            self.sink.a.push(self.arena, part, small);
        } else {
            self.sink.b.push(self.arena, part, rec);
        }
    }

    fn flush(&mut self) {
        for i in 0..self.len {
            let rec = self.ring[(self.head + RING - self.len + i) & (RING - 1)];
            self.resolve(rec);
        }
        self.len = 0;
    }
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
        let rec = unsafe {
            let Some(t) = ctx.calendar.parse(f[3]) else { return };
            if t < ctx.cws || t >= ctx.we {
                return;
            }
            let Some(campaign) = lookup_k::<K>(f[2]).and_then(|k| ctx.campaigns.get(k)) else { return };
            ClickRec {
                person: encode_k::<K>(&ctx.users, user),
                click: encode_k::<K>(&ctx.click_ids, click_id),
                ts: (t - ctx.cws) as u32,
                campaign,
            }
        };
        prefetch_user(self.people, rec.person);
        if self.len == RING {
            let old = self.ring[self.head];
            self.resolve(old);
        } else {
            self.len += 1;
        }
        self.ring[self.head] = rec;
        self.head = (self.head + 1) & (RING - 1);
        self.total += 1;
    }
}

#[inline(always)]
unsafe fn parse_clicks_k<K: Kernel>(ctx: &Ctx, people: &People, chunk: &[u8], arena: &mut Arena, sink: &mut Clicks) -> usize {
    let mut lines = ClickLines::<K> {
        ctx,
        people,
        arena,
        sink,
        ring: [ClickRec {
            person: Key::default(),
            click: Key::default(),
            ts: 0,
            campaign: 0,
        }; RING],
        head: 0,
        len: 0,
        total: 0,
        kernel: std::marker::PhantomData,
    };
    scan::fused::<4, 4, K, _>(chunk, &mut lines);
    lines.flush();
    lines.total
}

#[inline(always)]
fn mark(once: &mut [u64], twice: &mut [u64], slot: usize) {
    let w = slot >> 6;
    let b = 1u64 << (slot & 63);
    unsafe {
        *twice.get_unchecked_mut(w) |= *once.get_unchecked(w) & b;
        *once.get_unchecked_mut(w) |= b;
    }
}

#[inline(always)]
fn marked(twice: &[u64], slot: usize) -> bool {
    unsafe { *twice.get_unchecked(slot >> 6) >> (slot & 63) & 1 != 0 }
}

const RING: usize = 64;

struct Emit {
    bits: u32,
    winners: usize,
}

impl Emit {
    #[inline(always)]
    fn push(&mut self, user: Key, ts: u32, payload: u32, out: &mut Persons, arena: &mut Arena) {
        let part = part_of(user, self.bits);
        if user.hi == 0 {
            out.a.push(arena, part, PersonSmall { person: user.lo, ts, payload });
        } else {
            out.b.push(arena, part, PersonRec { person: user, ts, payload });
        }
        self.winners += 1;
    }
}

#[allow(clippy::too_many_arguments)]
fn dedup(
    ctx: &Ctx,
    sinks: &[&Copies],
    q: usize,
    once: &mut Vec<u64>,
    twice: &mut Vec<u64>,
    cand: &mut Vec<EventRec>,
    table: &mut Vec<u32>,
    arena: &mut Arena,
    out: &mut Persons,
) -> usize {
    let n: usize = sinks.iter().map(|s| s.len(q)).sum();
    let piece = ctx.p2_block * std::mem::size_of::<PersonSmall>();
    if n == 0 {
        return 0;
    }
    let slots = (n * 8).next_power_of_two().clamp(1 << 10, 1 << 18);
    let words = slots / 64;
    once.clear();
    once.resize(words, 0);
    twice.clear();
    twice.resize(words, 0);
    let sshift = 64 - ctx.p1_bits - slots.trailing_zeros();
    let smask = slots - 1;
    for sink in sinks {
        for slice in sink.a.slices(q) {
            for r in slice {
                let h = ctx.event_layout.hash(r, q);
                mark(once, twice, (h >> sshift) as usize & smask);
            }
        }
        for slice in sink.middle.slices(q) {
            for r in slice {
                mark(once, twice, (r.hash() >> sshift) as usize & smask);
            }
        }
        for slice in sink.b.slices(q) {
            for r in slice {
                mark(once, twice, (event_hash(r.event) >> sshift) as usize & smask);
            }
        }
    }
    let mut emit = Emit { bits: ctx.p2_bits, winners: 0 };
    cand.clear();
    for sink in sinks {
        for slice in sink.a.slices(q) {
            for r in slice {
                if marked(twice, (ctx.event_layout.hash(r, q) >> sshift) as usize & smask) {
                    cand.push(ctx.event_layout.decode(r, q));
                } else if let Some((user, ts)) = ctx.event_layout.winner(r) {
                    emit.push(user, ts, 0, out, arena);
                }
            }
        }
        for slice in sink.middle.slices(q) {
            for r in slice {
                if marked(twice, (r.hash() >> sshift) as usize & smask) {
                    cand.push(r.decode(ctx.cws));
                } else if let Some((user, ts, payload)) = r.winner() {
                    emit.push(user, ts, payload, out, arena);
                }
            }
        }
        for slice in sink.b.slices(q) {
            for r in slice {
                if marked(twice, (event_hash(r.event) >> sshift) as usize & smask) {
                    cand.push(*r);
                } else if r.ts != INVALID {
                    emit.push(r.user, r.ts, r.payload, out, arena);
                }
            }
        }
    }
    for sink in sinks {
        let bytes = sink.a.block_bytes();
        for block in sink.a.blocks(q) {
            arena.recycle(block, bytes, piece);
        }
        let bytes = sink.middle.block_bytes();
        for block in sink.middle.blocks(q) {
            arena.recycle(block, bytes, piece);
        }
        let bytes = sink.b.block_bytes();
        for block in sink.b.blocks(q) {
            arena.recycle(block, bytes, piece);
        }
    }
    let m = cand.len();
    if m > 0 {
        let size = (m * 2).next_power_of_two().max(16);
        let tbits = size.trailing_zeros();
        let mask = size - 1;
        table.clear();
        table.resize(size, u32::MAX);
        let shift = 64 - ctx.p1_bits - tbits;
        for i in 0..m {
            let key = cand[i].event;
            let mut slot = ((event_hash(key) >> shift) as usize) & mask;
            loop {
                let entry = unsafe { table.get_unchecked_mut(slot) };
                if *entry == u32::MAX {
                    *entry = i as u32;
                    break;
                }
                let j = *entry as usize;
                if unsafe { cand.get_unchecked(j) }.event == key {
                    if cand[i].ingest < cand[j].ingest {
                        cand[j].ts = INVALID;
                        *entry = i as u32;
                    } else {
                        cand[i].ts = INVALID;
                    }
                    break;
                }
                slot = (slot + 1) & mask;
            }
        }
        for rec in cand.iter() {
            if rec.ts != INVALID {
                emit.push(rec.user, rec.ts, rec.payload, out, arena);
            }
        }
    }
    emit.winners
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

#[derive(Default)]
struct TimeBin {
    min: u32,
    max: u32,
    count: u32,
    session: u32,
}

#[derive(Clone, Default, Debug, PartialEq, Eq)]
struct SessionSummary {
    start: u32,
    end: u32,
    count: u64,
    revenue: u64,
    categories: Vec<(u32, u64)>,
}

/// Exact connected-component summaries. All events in one half-open bin of
/// width GAP_MS are connected. Between occupied bins the only possible split
/// is next.min - previous.max > GAP_MS. Purchases are carried separately until
/// each bin has its final session, so category sums never lose information.
struct SessionBins {
    limit: usize,
    cells: Vec<TimeBin>,
    touched: Vec<usize>,
    purchases: Vec<(u32, u32)>,
    sessions: Vec<SessionSummary>,
    used: usize,
}

impl SessionBins {
    fn new(limit: usize) -> Self {
        Self { limit, cells: Vec::new(), touched: Vec::new(), purchases: Vec::new(), sessions: Vec::new(), used: 0 }
    }

    fn reset_summaries(&mut self) {
        self.used = 0;
    }

    fn add_fragment(&mut self, start: u32, end: u32, count: u64, revenue: u64, categories: &[(u32, u64)]) {
        if self.used == 0 || start.saturating_sub(self.sessions[self.used - 1].end) > GAP_MS {
            if self.used == self.sessions.len() {
                self.sessions.push(SessionSummary::default());
            }
            let next = &mut self.sessions[self.used];
            next.start = start;
            next.end = end;
            next.count = 0;
            next.revenue = 0;
            next.categories.clear();
            self.used += 1;
        }
        let current = &mut self.sessions[self.used - 1];
        current.end = current.end.max(end);
        current.count += count;
        current.revenue += revenue;
        for &(category, value) in categories {
            match current.categories.iter_mut().find(|(c, _)| *c == category) {
                Some((_, sum)) => *sum += value,
                None => current.categories.push((category, value)),
            }
        }
    }

    fn build_sorted(&mut self, events: &[u64]) {
        self.reset_summaries();
        for &value in events {
            let ts = (value >> 32) as u32;
            let price = value & 0x00ff_ffff;
            if price != 0 {
                self.add_fragment(ts, ts, 1, price, &[(((value >> 24) & 0xff) as u32, price)]);
            } else {
                self.add_fragment(ts, ts, 1, 0, &[]);
            }
        }
    }

    fn begin_unsorted(&mut self) {
        if self.cells.is_empty() {
            self.cells.resize_with(self.limit, TimeBin::default);
        }
        for &b in &self.touched {
            self.cells[b].count = 0;
        }
        self.touched.clear();
        self.purchases.clear();
        self.used = 0;
    }

    #[inline(always)]
    fn add_unsorted(&mut self, ts: u32, payload: u32) {
        let b = (ts / GAP_MS) as usize;
        let cell = &mut self.cells[b];
        if cell.count == 0 {
            cell.min = ts;
            cell.max = ts;
            self.touched.push(b);
        } else {
            cell.min = cell.min.min(ts);
            cell.max = cell.max.max(ts);
        }
        cell.count += 1;
        if payload & 0x00ff_ffff != 0 {
            self.purchases.push((b as u32, payload));
        }
    }

    fn finish_unsorted(&mut self) {
        self.touched.sort_unstable();
        for &b in &self.touched {
            let cell = &mut self.cells[b];
            if self.used == 0 || cell.min - self.sessions[self.used - 1].end > GAP_MS {
                if self.used == self.sessions.len() {
                    self.sessions.push(SessionSummary::default());
                }
                let next = &mut self.sessions[self.used];
                next.start = cell.min;
                next.end = cell.max;
                next.count = 0;
                next.revenue = 0;
                next.categories.clear();
                self.used += 1;
            }
            cell.session = (self.used - 1) as u32;
            let current = &mut self.sessions[self.used - 1];
            current.end = current.end.max(cell.max);
            current.count += u64::from(cell.count);
        }
        for &(b, payload) in &self.purchases {
            let current = &mut self.sessions[self.cells[b as usize].session as usize];
            let price = u64::from(payload & 0x00ff_ffff);
            let category = payload >> 24;
            current.revenue += price;
            match current.categories.iter_mut().find(|(c, _)| *c == category) {
                Some((_, sum)) => *sum += price,
                None => current.categories.push((category, price)),
            }
        }
    }

    fn build(&mut self, events: &[u64]) {
        self.begin_unsorted();
        for &value in events {
            self.add_unsorted((value >> 32) as u32, value as u32);
        }
        self.finish_unsorted();
    }

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

fn fold_alias_runs(bins: &mut SessionBins, runs: &[alias::Reference], stores: &[&alias::Store], partition: usize) {
    bins.begin_unsorted();
    for reference in runs {
        let store = stores[reference.owner as usize];
        let run = store.routes[partition][reference.index as usize];
        for &ts in &store.plain[run.plain_range()] {
            bins.add_unsorted(ts, 0);
        }
        for &value in &store.paid[run.paid_range()] {
            bins.add_unsorted((value >> 32) as u32, value as u32);
        }
    }
    bins.finish_unsorted();
}

struct Worker {
    click_ids: Domain,
    organic: u32,
    days: usize,
    day_shift: i64,
    campaigns: usize,
    credit: Vec<[u64; 3]>,
    assist: Vec<u32>,
    pub rows: write::Part,
    local_keys: Vec<Key>,
    local_ids: Vec<u32>,
    persons: Vec<Key>,
    counts: Vec<u32>,
    paid_counts: Vec<u32>,
    click_counts: Vec<u32>,
    recs: Vec<Rec>,
    click_recs: Vec<ClickTmp>,
    click_spare: Vec<ClickTmp>,
    sorted: Vec<u64>,
    local_clicks: Vec<LocalClick>,
    in_window: Vec<u32>,
    active_at: Vec<u32>,
    active: Vec<u32>,
    category_sums: Vec<(u32, u64)>,
    bins: SessionBins,
}

struct PersonState {
    low: usize,
    high: usize,
    click_end: usize,
    row_day: usize,
    row: [u64; 3],
}

impl PersonState {
    fn new(clicks: std::ops::Range<usize>) -> Self {
        Self { low: clicks.start, high: clicks.start, click_end: clicks.end, row_day: usize::MAX, row: [0; 3] }
    }
}

#[inline]
fn sum_categories(sums: &mut Vec<(u32, u64)>, categories: &[(u32, u64)]) {
    for &(category, value) in categories {
        match sums.iter_mut().find(|(c, _)| *c == category) {
            Some((_, sum)) => *sum += value,
            None => sums.push((category, value)),
        }
    }
}

impl Worker {
    fn new(ctx: &Ctx) -> Worker {
        let campaigns = ctx.organic as usize + 1;
        Worker {
            click_ids: ctx.click_ids,
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
            paid_counts: Vec::new(),
            click_counts: Vec::new(),
            recs: Vec::new(),
            click_recs: Vec::new(),
            click_spare: Vec::new(),
            sorted: Vec::new(),
            local_clicks: Vec::new(),
            in_window: vec![0; campaigns],
            active_at: vec![0; campaigns],
            active: Vec::new(),
            category_sums: Vec::new(),
            bins: SessionBins::new(((ctx.we - ctx.cws - 1) / i64::from(GAP_MS) + 1) as usize),
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

    fn compress_aliases(&mut self, ctx: &Ctx, events: &[&Persons], clicks: &[&Clicks], p: usize, people: &People, store: &mut alias::Store) {
        if !self.index_raw_events(ctx, events, p) {
            return;
        }
        // The local table retains raw keys. Resolve each raw alias once; only
        // graph-absent identities may finish before every alias has arrived.
        let mut linked = Vec::with_capacity(self.persons.len());
        let mut plain_total = 0usize;
        let mut paid_total = 0usize;
        let mut direct_total = 0usize;
        let mut direct_offsets = Vec::with_capacity(self.persons.len() + 1);
        for (id, person) in self.persons.iter_mut().enumerate() {
            let (root, was_linked) = people.resolve(*person);
            *person = root;
            linked.push(was_linked);
            direct_offsets.push(direct_total as u32);
            let count = self.counts[id] as usize;
            if was_linked {
                let paid = self.paid_counts[id] as usize;
                paid_total += paid;
                plain_total += count - paid;
            } else {
                direct_total += count;
                store.direct_users += 1;
                store.direct_events += count;
            }
        }
        direct_offsets.push(direct_total as u32);
        let (mut plain_at, mut paid_at) = store.reserve_rows(plain_total, paid_total);
        let mut primary_cursor = vec![0usize; self.persons.len()];
        let mut paid_cursor = vec![0usize; self.persons.len()];
        for id in 0..self.persons.len() {
            if linked[id] {
                let paid = self.paid_counts[id] as usize;
                let plain = self.counts[id] as usize - paid;
                store.add_run(self.persons[id], plain_at, plain, paid_at, paid);
                primary_cursor[id] = plain_at;
                paid_cursor[id] = paid_at;
                plain_at += plain;
                paid_at += paid;
            } else {
                primary_cursor[id] = direct_offsets[id] as usize;
            }
        }
        debug_assert_eq!(plain_at, store.plain.len());
        debug_assert_eq!(paid_at, store.paid.len());
        // Linked records scatter directly into their final worker-owned pools.
        // There is no linked-alias 8B scratch, timestamp sort or session build.
        self.sorted.clear();
        self.sorted.resize(direct_total, 0);
        for rec in &self.recs {
            let id = rec.id as usize;
            if linked[id] {
                if rec.payload == 0 {
                    store.plain[primary_cursor[id]] = rec.ts;
                    primary_cursor[id] += 1;
                } else {
                    store.paid[paid_cursor[id]] = u64::from(rec.ts) << 32 | u64::from(rec.payload);
                    paid_cursor[id] += 1;
                }
            } else {
                self.sorted[primary_cursor[id]] = u64::from(rec.ts) << 32 | u64::from(rec.payload);
                primary_cursor[id] += 1;
            }
        }
        if direct_total == 0 {
            return;
        }
        let size = self.local_ids.len();
        let shift = 64 - ctx.p2_bits - size.trailing_zeros();
        let bucket = click_bucket(p, ctx.p2_bits, false);
        let click_offsets = self.group_clicks(clicks, bucket, shift, size - 1, |id| !linked[id]);
        for id in 0..self.persons.len() {
            if linked[id] { continue; }
            let range = direct_offsets[id] as usize..direct_offsets[id + 1] as usize;
            if range.len() < 1024 {
                self.sorted[range.clone()].sort_unstable();
                self.bins.build_sorted(&self.sorted[range]);
            } else {
                self.bins.build(&self.sorted[range]);
            }
            let cr = click_offsets[id] as usize..click_offsets[id + 1] as usize;
            self.person_summaries(self.persons[id], cr);
        }
    }

    fn partition_aliases(&mut self, ctx: &Ctx, stores: &[&alias::Store], clicks: &[&Clicks], p: usize) {
        let n: usize = stores.iter().map(|s| s.routes[p].len()).sum();
        if n == 0 {
            return;
        }
        let size = (n * 2).next_power_of_two().max(64);
        let mask = size - 1;
        let shift = 64 - ctx.p2_bits - size.trailing_zeros();
        self.local_keys.clear();
        self.local_keys.resize(size, Key::default());
        self.local_ids.clear();
        self.local_ids.resize(size, u32::MAX);
        self.persons.clear();
        self.counts.clear();
        let mut records: Vec<(u32, alias::Reference)> = Vec::with_capacity(n);
        for (owner, store) in stores.iter().enumerate() {
            for (index, run) in store.routes[p].iter().enumerate() {
                let mut slot = ((run.root.hash() >> shift) as usize) & mask;
                let id = loop {
                    let id = self.local_ids[slot];
                    if id == u32::MAX {
                        let id = self.persons.len() as u32;
                        self.persons.push(run.root);
                        self.counts.push(0);
                        self.local_ids[slot] = id;
                        self.local_keys[slot] = run.root;
                        break id;
                    }
                    if self.local_keys[slot] == run.root {
                        break id;
                    }
                    slot = (slot + 1) & mask;
                };
                self.counts[id as usize] += 1;
                records.push((id, alias::Reference { owner: owner as u32, index: index as u32 }));
            }
        }
        let persons = self.persons.len();
        let mut offsets = Vec::with_capacity(persons + 1);
        let mut acc = 0u32;
        for &count in &self.counts {
            offsets.push(acc);
            acc += count;
        }
        offsets.push(acc);
        let mut ordered = vec![alias::Reference::default(); n];
        let mut next = offsets[..persons].to_vec();
        for (id, reference) in records {
            let at = &mut next[id as usize];
            ordered[*at as usize] = reference;
            *at += 1;
        }
        let bucket = click_bucket(p, ctx.p2_bits, true);
        let click_offsets = self.group_clicks(clicks, bucket, shift, mask, |_| true);
        for id in 0..persons {
            let range = offsets[id] as usize..offsets[id + 1] as usize;
            let cr = click_offsets[id] as usize..click_offsets[id + 1] as usize;
            self.complete_alias_runs(self.persons[id], cr, &ordered[range], stores, p);
        }
    }

    fn complete_alias_runs(&mut self, person: Key, clicks: std::ops::Range<usize>, runs: &[alias::Reference], stores: &[&alias::Store], partition: usize) {
        let events: usize = runs.iter().map(|r| stores[r.owner as usize].routes[partition][r.index as usize].len()).sum();
        if events <= 8 {
            // Tiny final roots need at most 64 bytes of local sort scratch.
            self.sorted.clear();
            for reference in runs {
                let store = stores[reference.owner as usize];
                let run = store.routes[partition][reference.index as usize];
                self.sorted.extend(store.plain[run.plain_range()].iter().map(|&ts| u64::from(ts) << 32));
                self.sorted.extend_from_slice(&store.paid[run.paid_range()]);
            }
            self.sorted.sort_unstable();
            self.bins.build_sorted(&self.sorted);
        } else {
            // The final canonical root consumes immutable exact event values
            // directly. No root 8B materialization, interval sort or merge.
            fold_alias_runs(&mut self.bins, runs, stores, partition);
        }
        self.person_summaries(person, clicks);
    }

    fn index_raw_events(&mut self, ctx: &Ctx, events: &[&Persons], p: usize) -> bool {
        let n: usize = events.iter().map(|s| s.len(p)).sum();
        if n == 0 {
            return false;
        }
        let mut size = (n / 8).next_power_of_two().clamp(64, (n * 2).next_power_of_two().max(64));
        let mut mask = size - 1;
        let mut shift = 64 - ctx.p2_bits - size.trailing_zeros();
        self.local_keys.clear();
        self.local_keys.resize(size, Key::default());
        self.local_ids.clear();
        self.local_ids.resize(size, u32::MAX);
        self.persons.clear();
        self.counts.clear();
        self.paid_counts.clear();
        self.recs.clear();
        macro_rules! add_event {
            ($key:expr, $ts:expr, $payload:expr) => {{
                let key: Key = $key;
                let mut slot = ((key.hash() >> shift) as usize) & mask;
                let id = loop {
                    let id = unsafe { *self.local_ids.get_unchecked(slot) };
                    if id == u32::MAX {
                        let id = self.persons.len() as u32;
                        self.local_ids[slot] = id;
                        self.local_keys[slot] = key;
                        self.persons.push(key);
                        self.counts.push(0);
                        self.paid_counts.push(0);
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
                if $payload != 0 { self.paid_counts[id as usize] += 1; }
                self.recs.push(Rec {
                    ts: $ts,
                    payload: $payload,
                    id,
                });
            }};
        }
        for sink in events {
            for slice in sink.a.slices(p) {
                for rec in slice {
                    add_event!(Key { hi: 0, lo: rec.person }, rec.ts, rec.payload);
                }
            }
            for slice in sink.b.slices(p) {
                for rec in slice {
                    add_event!(rec.person, rec.ts, rec.payload);
                }
            }
        }
        true
    }

    fn group_clicks(&mut self, clicks: &[&Clicks], bucket: usize, shift: u32, mask: usize, accepts: impl Fn(usize) -> bool) -> Vec<u32> {
        let persons = self.persons.len();
        self.click_counts.clear();
        self.click_counts.resize(persons, 0);
        self.click_recs.clear();
        let mut low = u32::MAX;
        let mut high = 0u32;
        macro_rules! add_click {
            ($key:expr, $click:expr, $ts:expr, $campaign:expr) => {{
                let key: Key = $key;
                let mut slot = ((key.hash() >> shift) as usize) & mask;
                let id = loop {
                    let id = unsafe { *self.local_ids.get_unchecked(slot) };
                    if id == u32::MAX || unsafe { *self.local_keys.get_unchecked(slot) } == key {
                        break id;
                    }
                    slot = (slot + 1) & mask;
                };
                if id != u32::MAX && accepts(id as usize) {
                    unsafe { *self.click_counts.get_unchecked_mut(id as usize) += 1 };
                    low = low.min($ts);
                    high = high.max($ts);
                    self.click_recs.push(ClickTmp {
                        ts: $ts,
                        id,
                        campaign: $campaign,
                        click: $click,
                    });
                }
            }};
        }
        for sink in clicks {
            for slice in sink.a.slices(bucket) {
                for rec in slice {
                    add_click!(Key { hi: 0, lo: rec.person }, Key { hi: 0, lo: rec.click }, rec.ts, rec.campaign);
                }
            }
            for slice in sink.b.slices(bucket) {
                for rec in slice {
                    add_click!(rec.person, rec.click, rec.ts, rec.campaign);
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
                click: Key::default(),
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
                    let domain = self.click_ids;
                    self.local_clicks[start..end].sort_unstable_by(|a, b| domain.cmp(b.click, a.click));
                    i = end;
                } else {
                    i += 1;
                }
            }
        }
        click_offsets
    }

    #[cold]
    #[inline(never)]
    fn grow_local(&mut self, size: usize, shift: u32) {
        let mask = size - 1;
        self.local_keys.clear();
        self.local_keys.resize(size, Key::default());
        self.local_ids.clear();
        self.local_ids.resize(size, u32::MAX);
        for (id, &key) in self.persons.iter().enumerate() {
            let mut slot = ((key.hash() >> shift) as usize) & mask;
            while self.local_ids[slot] != u32::MAX {
                slot = (slot + 1) & mask;
            }
            self.local_ids[slot] = id as u32;
            self.local_keys[slot] = key;
        }
    }

    #[inline(always)]
    fn attribute_session(&mut self, start: u32, day: usize, revenue: u64, low_cursor: &mut usize, high_cursor: &mut usize, click_end: usize) {
        let (mut low, mut high) = (*low_cursor, *high_cursor);
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
        *low_cursor = low;
        *high_cursor = high;
    }

    #[inline]
    fn accumulate_session(&mut self, person: Key, start: u32, count: u64, revenue: u64, state: &mut PersonState) {
        let day = ((i64::from(start) + self.day_shift) / DAY_MS) as usize;
        if day != state.row_day {
            if state.row_day != usize::MAX {
                self.finish_row(person, state.row_day, state.row);
            }
            state.row_day = day;
            state.row = [0; 3];
        }
        self.attribute_session(start, day, revenue, &mut state.low, &mut state.high, state.click_end);
        state.row[0] += 1;
        state.row[1] += count;
        state.row[2] += revenue;
    }

    #[inline]
    fn complete_person(&mut self, person: Key, state: PersonState) {
        if state.row_day != usize::MAX {
            self.finish_row(person, state.row_day, state.row);
        }
        for &c in &self.active {
            self.in_window[c as usize] = 0;
        }
        self.active.clear();
    }

    fn person_summaries(&mut self, person: Key, clicks: std::ops::Range<usize>) {
        let mut state = PersonState::new(clicks);
        for index in 0..self.bins.used {
            let start = self.bins.sessions[index].start;
            let count = self.bins.sessions[index].count;
            let revenue = self.bins.sessions[index].revenue;
            self.accumulate_session(person, start, count, revenue, &mut state);
            sum_categories(&mut self.category_sums, &self.bins.sessions[index].categories);
        }
        self.complete_person(person, state);
    }

    fn finish_row(&mut self, person: Key, day: usize, row: [u64; 3]) {
        let top = self
            .category_sums
            .iter()
            .max_by(|(ca, sa), (cb, sb)| sa.cmp(sb).then(cb.cmp(ca)))
            .map_or(u8::MAX, |&(c, _)| c as u8);
        self.category_sums.clear();
        self.rows.push(person, day as u32, row, top);
    }
}

#[cfg(test)]
mod bin_tests {
    use super::*;

    fn direct_test_context() -> Ctx<'static> {
        Ctx {
            calendar: Calendar::around(WEEK_MS), ws: WEEK_MS, we: WEEK_MS + 3 * DAY_MS,
            cws: 0, products: SmallMap::new(&[]), unknown: 0,
            campaigns: SmallMap::new(&[]), organic: 2,
            p1_bits: 4, p2_bits: 4, p1_block: 24, click_block: 24, p2_block: 24,
            event_layout: EventLayout::new(4, 0).unwrap(),
            first_day: 7, days: 3, day_shift: -WEEK_MS,
            link_files: Vec::new(), users: Domain::with_prefix(b'u'),
            event_ids: Domain::with_prefix(b'e'), click_ids: Domain::with_prefix(b'c'),
            units: Vec::new(), files: Vec::new(), remaining: Vec::new(), first_click: 0,
            marker: std::marker::PhantomData,
        }
    }

    fn direct_test_events(ctx: &Ctx, arena: &mut Arena, rows: &[(Key, u32, u32)]) -> Persons {
        let mut sink = Pair::new(1 << ctx.p2_bits, 24, 24);
        for &(person, ts, payload) in rows {
            sink.b.push(arena, part_of(person, ctx.p2_bits), PersonRec { person, ts, payload });
        }
        sink.finish(arena);
        sink
    }

    #[test]
    fn unlinked_raw_phase_finishes_but_canonical_root_waits_for_aliases() {
        let ctx = direct_test_context();
        let user = |name: &[u8]| ctx.users.encode(name);
        let root = user(b"u1");
        let alias = user(b"u2");
        let standalone = user(b"u3");
        let click_only_alias = user(b"u4");
        let people = People::build(&[(root, alias), (alias, click_only_alias)], &ctx.users);
        let t = WEEK_MS as u32 + 1000;
        let mut arena = Arena::new();
        let events = direct_test_events(&ctx, &mut arena, &[
            (root, t, (1 << 24) | 5),
            (alias, t + GAP_MS, (2 << 24) | 8),
            (standalone, t, 9),
            (standalone, t + GAP_MS + 1, (1 << 24) | 12),
        ]);
        let mut clicks = new_clicks(&ctx);
        for (raw, click, ts, campaign) in [
            (click_only_alias, b"c2".as_slice(), t, 0),
            (root, b"c1".as_slice(), t, 1),
            (standalone, b"c3".as_slice(), t, 0),
            (standalone, b"c4".as_slice(), t + 1, 1),
            (user(b"u5"), b"c5".as_slice(), t, 0),
        ] {
            let (person, linked) = people.resolve(raw);
            let bucket = click_bucket(part_of(person, ctx.p2_bits), ctx.p2_bits, linked);
            clicks.b.push(&mut arena, bucket, ClickRec {
                person, click: ctx.click_ids.encode(click), ts, campaign,
            });
        }
        clicks.finish(&mut arena);
        let mut worker = Worker::new(&ctx);
        let mut store = alias::Store::new(ctx.p2_bits);
        for p in 0..1 << ctx.p2_bits {
            worker.compress_aliases(&ctx, &[&events], &[&clicks], p, &people, &mut store);
        }
        let mut expected = write::Part::default();
        expected.push(standalone, 0, [2, 2, 21], 1);
        assert_eq!(worker.rows, expected, "only graph-absent users may produce early rows");
        assert_eq!((store.direct_users, store.direct_events, store.aliases), (1, 2, 2));
        assert_eq!((store.plain.len(), store.paid.len()), (0, 2));
        for p in 0..1 << ctx.p2_bits {
            worker.partition_aliases(&ctx, &[&store], &[&clicks], p);
        }
        expected.push(root, 0, [1, 2, 13], 2);
        assert_eq!(worker.rows, expected);
        assert_eq!(worker.credit[..3], [[1, 1, 9], [2, 2, 25], [0, 0, 0]]);
        assert_eq!(worker.assist[..3], [3, 2, 0]);
        assert!(worker.active.is_empty());
        assert!(worker.in_window.iter().all(|&count| count == 0));
        arena.release();
    }

    #[test]
    fn linked_events_forward_exact_values_without_sort_or_summary() {
        let ctx = direct_test_context();
        let root = ctx.users.encode(b"u1");
        let alias = ctx.users.encode(b"u2");
        let people = People::build(&[(root, alias)], &ctx.users);
        let t = WEEK_MS as u32;
        let mut arena = Arena::new();
        let rows = [
            (alias, t + 9, 0), (alias, t + 1, 7), (alias, t + 6, 0),
            (alias, t, 0), (alias, t + 2, (1 << 24) | 11),
            (alias, t + 5, 0), (alias, t + 8, 0), (alias, t + 3, 0),
        ];
        let events = direct_test_events(&ctx, &mut arena, &rows);
        let mut worker = Worker::new(&ctx);
        worker.bins.build_sorted(&[value(t + 99, 5, 123)]);
        let old_summaries = worker.bins.sessions[..worker.bins.used].to_vec();
        let mut store = alias::Store::new(ctx.p2_bits);
        worker.compress_aliases(&ctx, &[&events], &[], part_of(alias, ctx.p2_bits), &people, &mut store);
        assert_eq!(worker.bins.sessions[..worker.bins.used], old_summaries);
        assert_eq!(store.plain, [t + 9, t + 6, t, t + 5, t + 8, t + 3]);
        assert_eq!(store.paid, [value(t + 1, 0, 7), value(t + 2, 1, 11)]);
        assert_eq!((store.aliases, store.direct_events), (1, 0));
        assert_eq!(worker.rows.len(), 0);
        assert!(worker.sorted.is_empty(), "linked records must not materialize in8B alias scratch");
        arena.release();
    }

    #[test]
    fn fused_scatter_keeps_interleaved_direct_and_linked_alias_ranges() {
        let ctx = direct_test_context();
        let mut users = Vec::new();
        for i in 0..5000 {
            let key = ctx.users.encode(format!("u{i}").as_bytes());
            if part_of(key, ctx.p2_bits) == 0 {
                users.push(key);
                if users.len() == 4 { break; }
            }
        }
        assert_eq!(users.len(), 4);
        let root = ctx.users.encode(b"A canonical name");
        let people = People::build(&[(users[1], root), (users[3], root)], &ctx.users);
        let t = WEEK_MS as u32;
        let rows = [
            (users[0], t + 3000, 0), (users[1], t + 4001, 0),
            (users[2], t + 3, 0), (users[3], t + 2, 0),
            (users[0], t + 1000, 5), (users[1], t + 2001, 7),
            (users[2], t + 1, 0), (users[3], t + 6, 9),
            (users[0], t + 2000, 0), (users[3], t + 4, 0),
        ];
        let mut arena = Arena::new();
        let events = direct_test_events(&ctx, &mut arena, &rows);
        let mut worker = Worker::new(&ctx);
        let mut store = alias::Store::new(ctx.p2_bits);
        worker.compress_aliases(&ctx, &[&events], &[], 0, &people, &mut store);
        assert_eq!((store.aliases, store.direct_users, store.direct_events), (2, 2, 5));
        assert_eq!(store.plain, [t + 4001, t + 2, t + 4]);
        assert_eq!(store.paid, [value(t + 2001, 0, 7), value(t + 6, 0, 9)]);
        assert_eq!(worker.sorted.len(), 5);
        let mut expected = write::Part::default();
        expected.push(users[0], 0, [1, 3, 5], 0);
        expected.push(users[2], 0, [1, 2, 0], u8::MAX);
        assert_eq!(worker.rows, expected);
        for p in 0..1 << ctx.p2_bits {
            worker.partition_aliases(&ctx, &[&store], &[], p);
        }
        expected.push(root, 0, [1, 5, 16], 0);
        assert_eq!(worker.rows, expected);
        assert_eq!(worker.credit[2], [3, 2, 21]);
        arena.release();
    }

    #[test]
    fn final_roots_match_complete_rows_for_small_and_streamed_runs() {
        let ctx = direct_test_context();
        let root = ctx.users.encode(b"link-only canonical root");
        let t = WEEK_MS as u32;
        let day = DAY_MS as u32;
        let base = vec![
            value(t + day + 100, 2, 9), value(t + day - 100, 1, 9),
            value(t + 2 * day + 100, 3, 4), value(t + day + GAP_MS + 101, 0, 18),
        ];
        for streamed in [false, true] {
            let mut events = base.clone();
            if streamed {
                events.extend((0..8).map(|i| value(t + 2 * day + 101 + i, 0, 0)));
            }
            let mut store = alias::Store::new(ctx.p2_bits);
            store.put_raw(root, &events);
            let mut actual = Worker::new(&ctx);
            let mut expected = Worker::new(&ctx);
            actual.sorted.push(0xaabbccdd);
            expected.bins.sessions = reference(&events);
            expected.bins.used = expected.bins.sessions.len();
            expected.person_summaries(root, 0..0);
            let mut manual = write::Part::default();
            manual.push(root, 0, [1, 2, 18], 1);
            manual.push(root, 1, [1, 1, 18], 0);
            manual.push(root, 2, [1, if streamed { 9 } else { 1 }, 4], 3);
            assert_eq!(expected.rows, manual);
            actual.complete_alias_runs(root, 0..0, &[alias::Reference { owner: 0, index: 0 }], &[&store], part_of(root, ctx.p2_bits));
            assert_eq!(actual.rows, expected.rows);
            assert_eq!(actual.credit, expected.credit);
            assert_eq!(actual.assist, expected.assist);
            if streamed {
                assert_eq!(actual.sorted, [0xaabbccdd], "streamed root must not materialize8B event scratch");
            } else {
                assert!(actual.sorted.len() <= 8);
            }
            assert!(actual.active.is_empty());
        }
    }
    use std::collections::BTreeMap;

    fn value(ts: u32, category: u32, price: u32) -> u64 {
        u64::from(ts) << 32 | u64::from((category << 24) | price)
    }

    fn reference(input: &[u64]) -> Vec<SessionSummary> {
        let mut sorted = input.to_vec();
        sorted.sort_unstable();
        let mut groups: Vec<(u32, u32, u64, u64, BTreeMap<u32, u64>)> = Vec::new();
        for item in sorted {
            let ts = (item >> 32) as u32;
            if groups.last().is_none_or(|group| ts - group.1 > GAP_MS) {
                groups.push((ts, ts, 0, 0, BTreeMap::new()));
            }
            let group = groups.last_mut().unwrap();
            group.1 = ts;
            group.2 += 1;
            let price = item & 0x00ff_ffff;
            if price != 0 {
                group.3 += price;
                *group.4.entry(((item >> 24) & 0xff) as u32).or_default() += price;
            }
        }
        groups.into_iter().map(|(start, end, count, revenue, categories)| SessionSummary {
            start, end, count, revenue, categories: categories.into_iter().collect()
        }).collect()
    }

    fn check(bins: &mut SessionBins, input: &[u64]) {
        bins.build(input);
        let mut actual = bins.sessions[..bins.used].to_vec();
        for session in &mut actual {
            session.categories.sort_unstable();
        }
        assert_eq!(actual, reference(input), "events={input:?}");
    }

    #[test]
    fn bins_match_exact_gap_and_day_boundaries() {
        let g = GAP_MS;
        let day = DAY_MS as u32;
        let mut bins = SessionBins::new(200);
        for times in [
            vec![0, g],
            vec![0, g + 1],
            vec![0, 2 * g - 1],
            vec![g - 1, g],
            vec![0, g, 2 * g],
            vec![0, g + 1, 2 * g + 2],
            vec![day - 10, day, day + 10],
            vec![g, g, g, g],
            vec![],
        ] {
            let input: Vec<_> = times.into_iter().rev().enumerate()
                .map(|(i, t)| value(t, (i % 4) as u32, if i % 3 == 0 { 10_000_000 } else { 0 }))
                .collect();
            check(&mut bins, &input);
        }
    }

    #[test]
    fn exhaustive_discrete_subsets_match_event_sort() {
        let g = GAP_MS;
        let times = [0, 1, g - 1, g, g + 1, 2 * g - 1, 2 * g, 2 * g + 1, 3 * g + 1,
            DAY_MS as u32 - 1, DAY_MS as u32, DAY_MS as u32 + g];
        let mut bins = SessionBins::new(100);
        for mask in 0u32..1u32 << times.len() {
            let mut input = Vec::new();
            for (i, &time) in times.iter().enumerate().rev() {
                if mask & (1 << i) != 0 {
                    input.push(value(time, (i % 5) as u32, (i * 103) as u32));
                    if i % 3 == 0 {
                        input.push(value(time, ((i + 1) % 5) as u32, 99));
                    }
                }
            }
            check(&mut bins, &input);
        }
    }

    #[test]
    fn counts_revenue_categories_and_reused_scratch_are_complete() {
        let mut bins = SessionBins::new(100);
        let mut events = Vec::new();
        for i in 0..10_000 {
            events.push(value((i % 3) * GAP_MS, i % 11, 10_000_000));
        }
        check(&mut bins, &events);
        assert_eq!(bins.sessions[0].revenue, 100_000_000_000);
        assert_eq!(bins.sessions[0].count, 10_000);
        check(&mut bins, &[]);
        check(&mut bins, &[value(3 * GAP_MS + 1, 99, 1), value(0, 20, 2)]);
        check(&mut bins, &events);
    }

    #[test]
    fn max_representable_event_offset_remains_exact() {
        let mut bins = SessionBins::new((u32::MAX / GAP_MS + 1) as usize);
        let input = [
            value(u32::MAX - 2, 254, 10_000_000),
            value(u32::MAX - GAP_MS - 2, 0, 1),
            value(0, 3, 9),
        ];
        check(&mut bins, &input);
    }

    fn merge_stores(stores: &[&alias::Store], root: Key, expected: &[u64]) {
        let p = part_of(root, 4);
        let refs: Vec<_> = stores.iter().enumerate().flat_map(|(owner, store)| {
            (0..store.routes[p].len()).map(move |index| alias::Reference { owner: owner as u32, index: index as u32 })
        }).collect();
        let mut bins = SessionBins::new(3000);
        fold_alias_runs(&mut bins, &refs, stores, p);
        let mut actual = bins.sessions[..bins.used].to_vec();
        for session in &mut actual { session.categories.sort_unstable(); }
        assert_eq!(actual, reference(expected));
    }

    #[test]
    fn alias_raw_bridges_and_categories_match_complete_event_union() {
        let root = Key { hi: 0x1234, lo: 77 };
        let mut a = alias::Store::new(4);
        let mut b = alias::Store::new(4);
        let outer: Vec<_> = (0..=8).rev().map(|i| value(i * GAP_MS, i % 3, 100)).collect();
        let inner = [value(9 * GAP_MS, 1, 7), value(GAP_MS + 1, 2, 500), value(GAP_MS + 2, 0, 0)];
        a.put_raw(root, &outer);
        b.put_raw(root, &inner);
        let mut expected = outer;
        expected.extend_from_slice(&inner);
        merge_stores(&[&a, &b], root, &expected);
    }

    #[test]
    fn raw4_storage_retains_milliseconds_and_all_payload_bits() {
        let root = Key { hi: 0x1234, lo: 77 };
        let input = [value(1001, 0, 0), value(0, 2, 7), value(u32::MAX - 2, 0, 0),
            value(999, 254, 10_000_000), value(1001, 0, 0), value(4, 7, 0)];
        let mut store = alias::Store::new(4);
        store.put_raw(root, &input);
        assert_eq!(store.plain, [1001, u32::MAX - 2, 1001]);
        assert_eq!(store.paid, [value(0, 2, 7), value(999, 254, 10_000_000), value(4, 7, 0)]);
        let run = store.routes[part_of(root, 4)][0];
        assert_eq!(run.root, root);
        assert_eq!(run.len(), input.len());
        assert_eq!(store.aliases, 1);
        assert_eq!(std::mem::size_of::<alias::Run>(), 32);
        assert_eq!(store.plain.len() * 4 + store.paid.len() * 8, 36);
    }

    #[test]
    fn alias_arbitrary_partitioned_inputs_match_event_level_reference() {
        let root = Key { hi: 0, lo: 101 };
        let mut state = 0x8bfc_ef12_901a_d53bu64;
        for trial in 0..200 {
            let mut stores: Vec<_> = (0..3).map(|_| alias::Store::new(4)).collect();
            let mut expected = Vec::new();
            for alias in 0..7 {
                let count = if alias == 0 && trial % 5 == 0 { 1500 } else { 1 + (trial + alias) % 27 };
                let mut events = Vec::new();
                for _ in 0..count {
                    state ^= state << 13; state ^= state >> 7; state ^= state << 17;
                    let timestamp = ((state >> 16) % (20 * GAP_MS as u64)) as u32;
                    let price = if state & 3 == 0 { (state % 10_000_000 + 1) as u32 } else { 0 };
                    events.push(value(timestamp, ((state >> 8) % 23) as u32, price));
                }
                expected.extend_from_slice(&events);
                stores[alias % 3].put_raw(root, &events);
            }
            let refs: Vec<_> = stores.iter().collect();
            merge_stores(&refs, root, &expected);
        }
    }
}


#[cfg(test)]
mod raw48_tests {
    use super::*;

    pub(super) fn context() -> Ctx<'static> {
        let ws = crate::time::parse_timestamp(b"2028-03-01T00:00:00Z").unwrap();
        Ctx {
            calendar: Calendar::around(ws), ws, we: ws + 3 * DAY_MS, cws: ws - WEEK_MS,
            products: SmallMap::new(&[]), unknown: 0,
            campaigns: SmallMap::new(&[]), organic: 0,
            p1_bits: 4, p2_bits: 4, p1_block: 48, click_block: 24, p2_block: 48,
            event_layout: EventLayout::new(4, ws - WEEK_MS).unwrap(),
            first_day: ws.div_euclid(DAY_MS), days: 3, day_shift: -WEEK_MS,
            link_files: Vec::new(), users: Domain::with_prefix(b'u'),
            event_ids: Domain::with_prefix(b'e'), click_ids: Domain::with_prefix(b'k'),
            units: Vec::new(), files: Vec::new(), remaining: Vec::new(), first_click: 0,
            marker: std::marker::PhantomData,
        }
    }

    #[test]
    fn runtime_dispatch_selects_actual_event_click_and_link_kernel() {
        fn receipt(expected: usize) {
            let counts = scan::take_kernel_calls();
            assert!(counts[expected] > 0, "expected kernel {expected}: {counts:?}");
            for (kernel, &count) in counts.iter().enumerate() {
                if kernel != expected { assert_eq!(count, 0, "mixed dispatch: {counts:?}"); }
            }
        }
        fn decode(ctx: &Ctx, copies: &Copies) -> Vec<(u64, u64, u64, u64, i64, u32, u32)> {
            let mut rows = Vec::new();
            for p in 0..1 << ctx.p1_bits {
                let mut add = |r: EventRec| rows.push((r.event.hi, r.event.lo, r.user.hi,
                    r.user.lo, r.ingest, r.ts, r.payload));
                for r in copies.a.slices(p).flatten() { add(ctx.event_layout.decode(r, p)); }
                for r in copies.middle.slices(p).flatten() { add(r.decode(ctx.cws)); }
                for r in copies.b.slices(p).flatten() { add(*r); }
            }
            rows.sort_unstable();
            rows
        }
        let mut ctx = context();
        ctx.products = SmallMap::new(&[(keys::intern(b"p"), 1)]);
        ctx.campaigns = SmallMap::new(&[(keys::intern(b"g0"), 0), (keys::intern(b"g1"), 1)]);
        ctx.organic = 2;
        let native = if scan::has_avx512() { 2 } else if scan::has_avx2() { 1 } else { 0 };
        eprintln!("scanner entry dispatch: kernel {native} (0 scalar,1 AVX2,2 AVX512)");
        static LINKS: &[u8] = b"left,right\n\"u0\",\"u9\"\nu9,u000000001\nu2,u3\nbad\"quote,u4\nu4,u5,extra\n";
        scan::take_kernel_calls();
        let people = build_people(&[LINKS], &ctx.users);
        receipt(native);
        assert_eq!(people.linked(), 5);
        for name in [b"u0".as_slice(), b"u9", b"u000000001"] {
            assert_eq!(people.resolve(ctx.users.encode(name)), (ctx.users.encode(b"u0"), true));
        }
        assert_eq!(people.resolve(ctx.users.encode(b"u8")), (ctx.users.encode(b"u8"), false));
        let expected_pairs = vec![
            (ctx.users.encode(b"u0"), ctx.users.encode(b"u9")),
            (ctx.users.encode(b"u9"), ctx.users.encode(b"u000000001")),
            (ctx.users.encode(b"u2"), ctx.users.encode(b"u3")),
        ];
        let events = concat!(
            "\"e0\",\"u0\",2028-03-01T00:00:00Z,2028-03-01T00:00:00Z,view,p,ignored\n",
            "e1,u000000001,2028-03-01T00:00:01Z,2028-03-01T00:00:01Z,purchase,p,7\n",
            "e000000001,u000000001,2028-03-01T00:00:02Z,2028-03-01T00:00:02Z,view,p,ignored\n",
            "ebad,u0,invalid,2028-03-01T00:00:00Z,view,p,ignored\n",
            "e\"broken,u0,2028-03-01T00:00:00Z,2028-03-01T00:00:00Z,view,p,ignored\n",
            "e2,u0,2028-03-01T00:00:03Z,2028-03-01T00:00:03Z,view,p,ignored",
        ).as_bytes();
        let clicks = concat!(
            "\"k0\",\"u9\",g0,2028-03-01T00:00:00Z\n",
            "k000000001,u0,g1,2028-03-01T00:00:01Z\n",
            "k2,u8,g1,2028-03-01T00:00:02Z\n",
            "k\"bad,u0,g0,2028-03-01T00:00:00Z\n",
            "K0,u3,g0,2028-03-01T00:00:03Z",
        ).as_bytes();
        let mut event_control = None;
        let mut click_control = None;
        // Scalar is the first reference. Direct vector calls are separately
        // guarded and the final iteration invokes the real entry dispatch.
        for mode in [0usize, 1, 2, 3] {
            if mode == 1 && !scan::has_avx2() || mode == 2 && !scan::has_avx512() { continue; }
            let expected_kernel = if mode == 3 { native } else { mode };
            let mut pairs = Vec::new();
            let body = &LINKS[LINKS.iter().position(|&b| b == b'\n').unwrap() + 1..];
            scan::take_kernel_calls();
            unsafe {
                match mode {
                    #[cfg(target_arch = "x86_64")]
                    1 => link_pairs_avx2(body, &mut pairs, &ctx.users),
                    #[cfg(target_arch = "x86_64")]
                    2 => link_pairs_avx512(body, &mut pairs, &ctx.users),
                    // Native link dispatch was already observed in build_people.
                    3 => link_pairs::<Scalar>(body, &mut pairs, &ctx.users),
                    _ => link_pairs::<Scalar>(body, &mut pairs, &ctx.users),
                }
            }
            receipt(if mode == 3 { 0 } else { expected_kernel });
            assert_eq!(pairs, expected_pairs);
            let mut arena = Arena::new();
            let mut copies = Copies::new(&ctx);
            scan::take_kernel_calls();
            let count = unsafe { match mode {
                #[cfg(target_arch = "x86_64")]
                1 => parse_events_avx2(&ctx, events, &mut arena, &mut copies),
                #[cfg(target_arch = "x86_64")]
                2 => parse_events_avx512(&ctx, events, &mut arena, &mut copies),
                3 => parse_events(&ctx, events, &mut arena, &mut copies),
                _ => parse_events_k::<Scalar>(&ctx, events, &mut arena, &mut copies),
            }};
            receipt(expected_kernel);
            assert_eq!(count, 5);
            copies.finish(&mut arena);
            let mut lanes = [0; 3];
            for p in 0..1 << ctx.p1_bits {
                lanes[0] += copies.a.len(p);
                lanes[1] += copies.middle.len(p);
                lanes[2] += copies.b.len(p);
            }
            assert_eq!(lanes, [3, 1, 1]);
            let rows = decode(&ctx, &copies);
            if let Some(control) = &event_control { assert_eq!(&rows, control); }
            else { event_control = Some(rows); }
            let mut sink = new_clicks(&ctx);
            scan::take_kernel_calls();
            let count = unsafe { match mode {
                #[cfg(target_arch = "x86_64")]
                1 => parse_clicks_avx2(&ctx, &people, clicks, &mut arena, &mut sink),
                #[cfg(target_arch = "x86_64")]
                2 => parse_clicks_avx512(&ctx, &people, clicks, &mut arena, &mut sink),
                3 => parse_clicks(&ctx, &people, clicks, &mut arena, &mut sink),
                _ => parse_clicks_k::<Scalar>(&ctx, &people, clicks, &mut arena, &mut sink),
            }};
            receipt(expected_kernel);
            assert_eq!(count, 4);
            sink.finish(&mut arena);
            let buckets = 2 * (1usize << ctx.p2_bits);
            assert_eq!((0..buckets).map(|p| sink.a.len(p)).sum::<usize>(), 2);
            assert_eq!((0..buckets).map(|p| sink.b.len(p)).sum::<usize>(), 2);
            let rows = decoded_clicks(&ctx, &sink);
            if let Some(control) = &click_control { assert_eq!(&rows, control); }
            else { click_control = Some(rows); }
            arena.release();
        }
    }

    fn decoded_clicks(ctx: &Ctx, clicks: &Clicks) -> Vec<(usize, Vec<u8>, Vec<u8>, u32, u32)> {
        let mut rows = Vec::new();
        for bucket in 0..2 * (1usize << ctx.p2_bits) {
            let mut add = |person, click, ts, campaign| {
                let mut user_bytes = Vec::new();
                let mut click_bytes = Vec::new();
                ctx.users.bytes_of(person, &mut user_bytes);
                ctx.click_ids.bytes_of(click, &mut click_bytes);
                rows.push((bucket, user_bytes, click_bytes, ts, campaign));
            };
            for rec in clicks.a.slices(bucket).flatten() {
                add(Key { hi: 0, lo: rec.person }, Key { hi: 0, lo: rec.click }, rec.ts, rec.campaign);
            }
            for rec in clicks.b.slices(bucket).flatten() {
                add(rec.person, rec.click, rec.ts, rec.campaign);
            }
        }
        rows.sort_unstable();
        rows
    }

    #[test]
    fn owner_click_routing_matches_manual_graph_classes_and_all_records() {
        let users: [&[u8]; 8] = [
            b"u!root", b"uAlias", b"uClickOnly", b"uDirect", b"uSelf",
            b"u000000001", b"u0123456789abcdef0123456789abcdef", b"z-odd-user",
        ];
        for mode in 0..3 {
            for block in [24, 48, 504] {
                let mut ctx = context();
                ctx.click_block = block;
                ctx.campaigns = SmallMap::new(&[(keys::intern(b"g0"), 0), (keys::intern(b"g1"), 1)]);
                ctx.organic = 2;
                let keys: Vec<_> = users.iter().map(|bytes| ctx.users.encode(bytes)).collect();
                let pairs: Vec<_> = match mode {
                    0 => Vec::new(),
                    1 => keys.iter().map(|&key| (keys[0], key)).collect(),
                    _ => vec![(keys[0], keys[1]), (keys[1], keys[2]), (keys[4], keys[4])],
                };
                let people = People::build(&pairs, &ctx.users);
                let mut input = Vec::new();
                let mut expected = Vec::new();
                for (user_index, &user_bytes) in users.iter().enumerate() {
                    // More than the ring and largest split block: both lane
                    // rollovers and the final partial stage are exercised.
                    for repeat in 0..129 {
                        let row = user_index * 129 + repeat;
                        let click_bytes = match row % 4 {
                            0 => format!("k{row:07}").into_bytes(),
                            1 => format!("k0000000000000001{row:016x}").into_bytes(),
                            2 => format!("k{row:09}").into_bytes(),
                            _ => format!("X-opaque-{row}").into_bytes(),
                        };
                        let campaign = (row % 2) as u32;
                        input.extend_from_slice(&click_bytes);
                        input.push(b',');
                        input.extend_from_slice(user_bytes);
                        input.extend_from_slice(if campaign == 0 { b",g0," } else { b",g1," });
                        input.extend_from_slice(b"2028-03-01T00:00:00Z\n");
                        let linked = mode == 1 || (mode == 2 && (user_index < 3 || user_index == 4));
                        let canonical = if mode == 1 || (mode == 2 && user_index < 3) { users[0] } else { user_bytes };
                        let part = part_of(ctx.users.encode(canonical), ctx.p2_bits);
                        let bucket = part + if linked { 1usize << ctx.p2_bits } else { 0 };
                        expected.push((bucket, canonical.to_vec(), click_bytes, WEEK_MS as u32, campaign));
                    }
                }
                input.extend_from_slice(b"kbad,uAlias,unknown,2028-03-01T00:00:00Z\n");
                input.extend_from_slice(b"kbad,,g0,2028-03-01T00:00:00Z\n");
                input.extend_from_slice(b"kbad,uAlias,g0,invalid\n");
                expected.sort_unstable();
                for scalar in [true, false] {
                    let mut arena = Arena::new();
                    let mut clicks = new_clicks(&ctx);
                    let accepted = if scalar {
                        unsafe { parse_clicks_k::<Scalar>(&ctx, &people, &input, &mut arena, &mut clicks) }
                    } else {
                        parse_clicks(&ctx, &people, &input, &mut arena, &mut clicks)
                    };
                    clicks.finish(&mut arena);
                    assert_eq!(accepted, expected.len());
                    let rows = decoded_clicks(&ctx, &clicks);
                    assert_eq!(rows, expected, "mode={mode} block={block} scalar={scalar}");
                    let split = 1usize << ctx.p2_bits;
                    let direct: usize = (0..split).map(|p| clicks.len(p)).sum();
                    let linked: usize = (split..2 * split).map(|p| clicks.len(p)).sum();
                    assert_eq!(direct + linked, accepted);
                    if mode == 0 { assert_eq!(linked, 0); }
                    if mode == 1 { assert_eq!(direct, 0); }
                    if mode == 2 { assert!(direct > 0 && linked > 0); }
                    arena.release();
                }
            }
        }
    }

    #[test]
    fn owner_empty_click_halves_keep_organic_direct_and_linked_sessions() {
        let ctx = context();
        let root = ctx.users.encode(b"u1");
        let alias = ctx.users.encode(b"u2");
        let direct = ctx.users.encode(b"u3");
        let people = People::build(&[(root, alias)], &ctx.users);
        let mut arena = Arena::new();
        let mut clicks = new_clicks(&ctx);
        assert_eq!(parse_clicks(&ctx, &people, b"", &mut arena, &mut clicks), 0);
        clicks.finish(&mut arena);
        assert!(decoded_clicks(&ctx, &clicks).is_empty());
        let mut events: Persons = Pair::new(1 << ctx.p2_bits, 48, 32);
        let mut emit = Emit { bits: ctx.p2_bits, winners: 0 };
        for (person, ts) in [(root, WEEK_MS as u32), (alias, WEEK_MS as u32 + GAP_MS), (direct, WEEK_MS as u32)] {
            emit.push(person, ts, 0, &mut events, &mut arena);
        }
        events.finish(&mut arena);
        let mut worker = Worker::new(&ctx);
        let mut store = alias::Store::new(ctx.p2_bits);
        for p in 0..1 << ctx.p2_bits {
            worker.compress_aliases(&ctx, &[&events], &[&clicks], p, &people, &mut store);
        }
        for p in 0..1 << ctx.p2_bits {
            worker.partition_aliases(&ctx, &[&store], &[&clicks], p);
        }
        let mut expected = write::Part::default();
        expected.push(direct, 0, [1, 1, 0], u8::MAX);
        expected.push(root, 0, [1, 2, 0], u8::MAX);
        assert_eq!(worker.rows, expected);
        assert_eq!(worker.credit[0], [2, 0, 0]);
        assert!(worker.assist.iter().all(|&n| n == 0));
        arena.release();
    }

    #[test]
    fn owner_click_work_orders_consider_only_their_matching_half() {
        let mut ctx = context();
        ctx.campaigns = SmallMap::new(&[(keys::intern(b"g0"), 0)]);
        ctx.organic = 1;
        let root = ctx.users.encode(b"u!root");
        let root_part = part_of(root, ctx.p2_bits);
        let direct_bytes = (0..5000).map(|i| format!("uD{i}").into_bytes())
            .find(|name| part_of(ctx.users.encode(name), ctx.p2_bits) != root_part).unwrap();
        let direct_part = part_of(ctx.users.encode(&direct_bytes), ctx.p2_bits);
        let people = People::build(&[(root, root)], &ctx.users);
        let mut input = Vec::new();
        for (user, count) in [(b"u!root".as_slice(), 64), (direct_bytes.as_slice(), 8)] {
            for i in 0..count {
                input.extend_from_slice(format!("k{i},").as_bytes());
                input.extend_from_slice(user);
                input.extend_from_slice(b",g0,2028-03-01T00:00:00Z\n");
            }
        }
        let mut arena = Arena::new();
        let mut clicks = new_clicks(&ctx);
        assert_eq!(parse_clicks(&ctx, &people, &input, &mut arena, &mut clicks), 72);
        clicks.finish(&mut arena);
        let mut events: Persons = Pair::new(1 << ctx.p2_bits, 48, 32);
        events.finish(&mut arena);
        assert_eq!(person_order(&ctx, &[&events], &[&clicks])[0], direct_part);
        let mut store = alias::Store::new(ctx.p2_bits);
        store.put_raw(root, &[u64::from(WEEK_MS as u32) << 32]);
        assert_eq!(alias_order(&ctx, &[&store], &[&clicks])[0], root_part);
        arena.release();
    }

    #[test]
    fn runtime_key_converters_match_tagged_scalar_identity() {
        assert_eq!(std::mem::size_of::<EventSmall>(), 16);
        assert_eq!(std::mem::size_of::<EventMid>(), 32);
        assert_eq!(std::mem::size_of::<EventRec>(), 48);
        assert_eq!(std::mem::size_of::<PersonSmall>(), 16);
        assert_eq!(std::mem::size_of::<PersonRec>(), 24);
        let ids = [
            b"u0".as_slice(), b"u00", b"u00000000", b"u000000000", b"u00000000000",
            b"uzz", b"uzzzzzzzz", b"uzzzzzzzzz", b"uzzzzzzzzzzz",
            b"u0123456789abcdef0123456789abcdef", b"u0000000000000000ffffffffffffffff",
            b"ufffffffffffffffe0000000000000000", b"uffffffffffffffff0000000000000000",
            b"ufffffffffffffffd0000000000000000", b"u", b"uA", b"u1 ", b" x",
            b"u\xff", b"u\x80", b"u\x01", b"u!_A", b"u\0x", b"uabc\0",
            b"u\xff\xff\xff\xff\xff\xff\xff\xff", b"\xff\xff\xff\xff\xff\xff\xff\xff",
            b"", b"\0", b"\0abc", b"\0abcdefgh", b"\0abcdefghi",
            b"\0abcdef0123456789abcdef0123456789",
        ];
        for domain in [Domain::bare(), Domain::with_prefix(b'u'), Domain::with_prefix(0)] {
            for bytes in ids {
                let expected = domain.encode(bytes);
                let mut padded = bytes.to_vec();
                padded.resize(bytes.len() + 64, 0xff);
                let input = &padded[..bytes.len()];
                unsafe {
                    assert_eq!(encode_k::<Scalar>(&domain, input), expected);
                    #[cfg(target_arch = "x86_64")]
                    if scan::has_avx2() {
                        assert_eq!(encode_k::<Avx2>(&domain, input), expected);
                    }
                    #[cfg(target_arch = "x86_64")]
                    if scan::has_avx512() {
                        assert_eq!(encode_k::<Avx512>(&domain, input), expected);
                    }
                }
            }
        }
    }

    #[test]
    fn raw48_parser_and_dedup_preserve_mixed_routes_and_invalid_winners() {
        let ctx = context();
        let input = concat!(
            "e1,u000000001,2028-03-01T00:00:00Z,2028-03-01T00:00:00Z,view,p,ignored\n",
            "e1,u1,2028-03-01T00:00:00Z,2028-03-01T00:00:01Z,purchase,p,99\n",
            "e2,u1,invalid,2028-03-01T00:00:00Z,view,p,ignored\n",
            "e2,u000000001,2028-03-01T00:00:00Z,2028-03-01T00:00:01Z,purchase,p,99\n",
            "e000000001,u00,2028-03-01T00:00:00Z,2028-03-01T00:00:00Z,view,p,ignored\n",
            "e000000001,u1,2028-03-01T00:00:00Z,2028-03-01T00:00:01Z,purchase,p,99\n",
        );
        let parts = 1 << ctx.p1_bits;
        let mut arena = Arena::new();
        let mut copies = Copies::new(&ctx);
        assert_eq!(parse_events(&ctx, input.as_bytes(), &mut arena, &mut copies), 6);
        copies.finish(&mut arena);
        assert_eq!((0..parts).map(|p| copies.a.len(p)).sum::<usize>(), 1);
        assert_eq!((0..parts).map(|p| copies.middle.len(p)).sum::<usize>(), 5);
        assert_eq!((0..parts).map(|p| copies.b.len(p)).sum::<usize>(), 0);
        let mut out: Persons = Pair::new(parts, 48, 32);
        let mut once = Vec::new();
        let mut twice = Vec::new();
        let mut candidates = Vec::new();
        let mut table = Vec::new();
        let mut winners = 0;
        for part in 0..parts {
            winners += dedup(&ctx, &[&copies], part, &mut once, &mut twice, &mut candidates, &mut table, &mut arena, &mut out);
        }
        out.finish(&mut arena);
        let mut actual = Vec::new();
        for part in 0..parts {
            for record in out.a.slices(part).flatten() {
                let mut name = Vec::new();
                ctx.users.bytes_of(Key { hi: 0, lo: record.person }, &mut name);
                actual.push((name, record.ts, record.payload));
            }
            for record in out.b.slices(part).flatten() {
                let mut name = Vec::new();
                ctx.users.bytes_of(record.person, &mut name);
                actual.push((name, record.ts, record.payload));
            }
        }
        actual.sort();
        assert_eq!(winners, 2);
        assert_eq!(actual, vec![
            (b"u00".to_vec(), WEEK_MS as u32, 0),
            (b"u000000001".to_vec(), WEEK_MS as u32, 0),
        ]);
        arena.release();
    }

    #[test]
    fn tied_click_attribution_uses_raw_byte_minimum_across_key_tags() {
        let mut ctx = context();
        let ids = [
            b"k0".as_slice(), b"k00", b"k00000000", b"k000000000", b"k00000000000",
            b"k00000000000000000000000000000000", b"k0123456789abcdef0123456789abcdef",
            b"kfffffffffffffffe0000000000000000", b"kffffffffffffffff0000000000000000",
            b"K0", b"k0 ",
        ];
        ctx.organic = ids.len() as u32;
        let mut arena = Arena::new();
        let parts = 1 << ctx.p2_bits;
        let mut events: Persons = Pair::new(parts, 48, 32);
        let mut clicks = new_clicks(&ctx);
        let person = ctx.users.encode(b"u0");
        let part = part_of(person, ctx.p2_bits);
        let ts = WEEK_MS as u32;
        events.a.push(&mut arena, part, PersonSmall { person: person.lo, ts, payload: 0 });
        for (campaign, bytes) in ids.iter().enumerate() {
            let click = ctx.click_ids.encode(bytes);
            if click.hi == 0 {
                clicks.a.push(&mut arena, part, ClickSmall { person: person.lo, click: click.lo, ts, campaign: campaign as u32 });
            } else {
                clicks.b.push(&mut arena, part, ClickRec { person, click, ts, campaign: campaign as u32 });
            }
        }
        events.finish(&mut arena);
        clicks.finish(&mut arena);
        let mut worker = Worker::new(&ctx);
        let people = People::build(&[], &ctx.users);
        let mut aliases = alias::Store::new(ctx.p2_bits);
        worker.compress_aliases(&ctx, &[&events], &[&clicks], part, &people, &mut aliases);
        assert_eq!(aliases.aliases, 0);
        let expected = ids.iter().enumerate().min_by_key(|(_, bytes)| **bytes).unwrap().0;
        for campaign in 0..=ids.len() {
            assert_eq!(worker.credit[campaign][0], u64::from(campaign == expected));
        }
        assert_eq!(&worker.assist[..ids.len()], vec![1; ids.len()]);
        arena.release();
    }

    #[test]
    fn raw48_alias_pipeline_preserves_opaque_roots_and_exact_values() {
        // Preserve every former full64-bit Raw8 byte case. Values outside the
        // checked Raw48 alphabet now use exact ODD storage, never a truncated
        // rank, an empty table slot or a rendered internal tag.
        let components: &[(&[u8], &[u8], u64)] = &[
            (b"u\xff\xff\xff\xff\xff\xff\xff\xff", b"v-exotic-alias", id::ODD),
            (b"u000000000", b"u1", id::EXTENDED_SHORT),
            (b"u00000000000000010000000000000000", b"u9", 1),
            (b"u00000000000000000000000000000000", b"u2", id::ODD),
            (b"u\x80\x80\x80\x80\x80\x80\x80\x80", b"u\x90\x90\x90\x90\x90\x90\x90\x90", id::ODD),
        ];
        for (case, &(root_bytes, alias_bytes, root_tag)) in components.iter().enumerate() {
            let mut ctx = context();
            ctx.organic = 2;
            let root = ctx.users.encode(root_bytes);
            let alias = ctx.users.encode(alias_bytes);
            let click_only = ctx.users.encode(b"w-click-only");
            let direct_bytes = if case == components.len() - 1 {
                b"u\0plain".as_slice()
            } else {
                b"u\x81\x81\x81\x81\x81\x81\x81\x81".as_slice()
            };
            let direct = ctx.users.encode(direct_bytes);
            assert_eq!(root.hi, root_tag);
            let people = People::build(&[(root, alias), (alias, click_only)], &ctx.users);
            for key in [root, alias, click_only] {
                assert_eq!(people.resolve(key), (root, true));
            }
            assert_eq!(people.resolve(direct), (direct, false));
            for (key, bytes) in [(root, root_bytes), (direct, direct_bytes)] {
                let mut rendered = Vec::new();
                ctx.users.bytes_of(key, &mut rendered);
                assert_eq!(rendered, bytes);
            }

            let mut arena = Arena::new();
            let parts = 1 << ctx.p2_bits;
            let mut events: Persons = Pair::new(parts, 48, 32);
            let mut clicks = new_clicks(&ctx);
            let mut emit = Emit { bits: ctx.p2_bits, winners: 0 };
            let t = (WEEK_MS + DAY_MS - 3) as u32;
            let mut forwarded = vec![(t - GAP_MS, (1 << 24) | 7), (t, 0)];
            emit.push(root, forwarded[0].0, forwarded[0].1, &mut events, &mut arena);
            emit.push(alias, t, 0, &mut events, &mut arena);
            for i in 1..=7 {
                let payload = if i == 7 { (2 << 24) | 7 } else { 0 };
                let user = if i % 2 == 0 { root } else { alias };
                emit.push(user, t + i, payload, &mut events, &mut arena);
                forwarded.push((t + i, payload));
            }
            let direct_t = WEEK_MS as u32 + 1000;
            for ts in [direct_t, direct_t + GAP_MS + 1] {
                emit.push(direct, ts, 0, &mut events, &mut arena);
            }
            assert_eq!(emit.winners, 11);
            for (raw, click_bytes, campaign) in [
                (root, b"kz".as_slice(), 0),
                (click_only, b"k000000000".as_slice(), 1),
            ] {
                let (person, linked) = people.resolve(raw);
                let click = ctx.click_ids.encode(click_bytes);
                let part = click_bucket(part_of(person, ctx.p2_bits), ctx.p2_bits, linked);
                let ts = t - GAP_MS;
                if person.hi == 0 && click.hi == 0 {
                    clicks.a.push(&mut arena, part, ClickSmall { person: person.lo, click: click.lo, ts, campaign });
                } else {
                    clicks.b.push(&mut arena, part, ClickRec { person, click, ts, campaign });
                }
            }
            events.finish(&mut arena);
            clicks.finish(&mut arena);

            let mut raw_workers = [Worker::new(&ctx), Worker::new(&ctx)];
            let mut stores = [alias::Store::new(ctx.p2_bits), alias::Store::new(ctx.p2_bits)];
            for part in 0..parts {
                let owner = part & 1;
                raw_workers[owner].compress_aliases(&ctx, &[&events], &[&clicks], part, &people, &mut stores[owner]);
            }
            let direct_owner = part_of(direct, ctx.p2_bits) & 1;
            for (owner, worker) in raw_workers.iter().enumerate() {
                let mut expected = write::Part::default();
                if owner == direct_owner {
                    expected.push(direct, 0, [2, 2, 0], u8::MAX);
                }
                assert_eq!(worker.rows, expected, "case {case}: linked roots must wait for every alias");
                assert_eq!(worker.credit[2], [if owner == direct_owner { 2 } else { 0 }, 0, 0]);
                assert!(worker.assist.iter().all(|&n| n == 0));
            }
            assert_eq!(stores.iter().map(|s| s.direct_users).sum::<usize>(), 1);
            assert_eq!(stores.iter().map(|s| s.direct_events).sum::<usize>(), 2);
            assert_eq!(stores.iter().map(|s| s.aliases).sum::<usize>(), 2);
            assert_eq!(stores.iter().map(|s| s.plain.len()).sum::<usize>(), 7);
            assert_eq!(stores.iter().map(|s| s.paid.len()).sum::<usize>(), 2);
            let mut actual_forwarded = Vec::new();
            for store in &stores {
                for (partition, runs) in store.routes.iter().enumerate() {
                    for run in runs {
                        assert_eq!(run.root, root);
                        assert_eq!(partition, part_of(root, ctx.p2_bits));
                        actual_forwarded.extend(store.plain[run.plain_range()].iter().map(|&ts| (ts, 0)));
                        actual_forwarded.extend(store.paid[run.paid_range()].iter().map(|&value| ((value >> 32) as u32, value as u32)));
                    }
                }
            }
            forwarded.sort_unstable();
            actual_forwarded.sort_unstable();
            assert_eq!(actual_forwarded, forwarded);

            let mut canonical = Worker::new(&ctx);
            for part in 0..parts {
                canonical.partition_aliases(&ctx, &[&stores[0], &stores[1]], &[&clicks], part);
            }
            let mut expected = write::Part::default();
            expected.push(root, 0, [1, 9, 14], 1);
            assert_eq!(canonical.rows, expected, "case {case}: exact gap and midnight bridge");
            assert_eq!(&canonical.credit[..3], &[[0, 0, 0], [1, 1, 14], [0, 0, 0]]);
            assert_eq!(&canonical.assist[..3], &[1, 1, 0]);
            assert!(canonical.credit[3..].iter().all(|&cell| cell == [0; 3]));
            assert!(canonical.assist[3..].iter().all(|&n| n == 0));
            assert!(canonical.active.is_empty());
            assert!(canonical.in_window.iter().all(|&n| n == 0));
            arena.release();
        }
    }
}

#[cfg(test)]
mod compact48_tests;
#[cfg(test)]
mod alias48_tests;
