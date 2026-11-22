pub mod id;
pub mod keys;
pub mod parquet;
pub mod people;
pub mod scan;
pub mod sink;
pub mod trace;
pub mod ts;
pub mod write;

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::{Barrier, Condvar, Mutex, OnceLock};
use std::time::Instant;

use crate::csv;
use crate::events::parse_price;
use crate::input::{self, Result, Window, ORGANIC, UNKNOWN_CATEGORY};
use crate::time::DAY_MS;
use id::{Domain, Key};
use keys::SmallMap;
use people::{prefetch, People};
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
const VIEW: u32 = u32::from_le_bytes(*b"view");
const CART: u32 = u32::from_le_bytes(*b"cart");
const PURCHASE: u64 = u64::from_le_bytes(*b"purchase");
const CODE_MASK: u64 = (1 << 41) - 1;
const TIME_MASK: u64 = (1 << 23) - 1;

#[derive(Clone, Copy)]
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
pub struct EventSmall {
    lo: u64,
    hi: u64,
}

#[inline(always)]
fn short_code(key: Key) -> Option<u64> {
    (key.hi == 0 && key.lo <= CODE_MASK).then_some(key.lo)
}

#[inline(always)]
fn short_key(code: u64) -> Key {
    Key { hi: 0, lo: code }
}

impl EventSmall {
    #[inline(always)]
    fn new(rec: &EventRec, base: i64) -> Option<Self> {
        if rec.payload != 0 || (rec.event.hi | rec.user.hi) != 0 {
            return None;
        }
        let ingest = rec.ingest.checked_sub(base)?;
        if ingest < 0 || ingest % 1000 != 0 {
            return None;
        }
        let ingest = (ingest / 1000) as u64;
        if ingest > TIME_MASK {
            return None;
        }
        let ts = if rec.ts == INVALID {
            TIME_MASK
        } else {
            if rec.ts % 1000 != 0 {
                return None;
            }
            u64::from(rec.ts / 1000)
        };
        let event = short_code(rec.event)?;
        let user = short_code(rec.user)?;
        if event == 0 {
            return None;
        }
        Some(EventSmall {
            lo: event | (user & TIME_MASK) << 41,
            hi: user >> 23 | ingest << 18 | ts << 41,
        })
    }

    #[inline(always)]
    fn event(self) -> Key {
        short_key(self.lo & CODE_MASK)
    }

    #[inline(always)]
    fn user(self) -> Key {
        short_key(self.lo >> 41 | (self.hi & (CODE_MASK >> 23)) << 23)
    }

    #[inline(always)]
    fn ingest(self, base: i64) -> i64 {
        base + (((self.hi >> 18) & TIME_MASK) * 1000) as i64
    }

    #[inline(always)]
    fn ts(self) -> u32 {
        let value = self.hi >> 41;
        if value == TIME_MASK { INVALID } else { value as u32 * 1000 }
    }
}

#[derive(Clone, Copy)]
struct Candidate {
    ptr: *const u8,
}

impl Candidate {
    #[inline(always)]
    fn small(rec: &EventSmall) -> Self {
        Candidate { ptr: rec as *const EventSmall as *const u8 }
    }

    #[inline(always)]
    fn wide(rec: &EventRec) -> Self {
        Candidate { ptr: (rec as *const EventRec as *const u8).map_addr(|addr| addr | 1) }
    }

    #[inline(always)]
    fn event(self) -> Key {
        let ptr = self.ptr.map_addr(|addr| addr & !3);
        unsafe {
            if self.ptr.addr() & 1 == 0 {
                (*(ptr as *const EventSmall)).event()
            } else {
                (*(ptr as *const EventRec)).event
            }
        }
    }

    #[inline(always)]
    fn ingest(self, base: i64) -> i64 {
        let ptr = self.ptr.map_addr(|addr| addr & !3);
        unsafe {
            if self.ptr.addr() & 1 == 0 {
                (*(ptr as *const EventSmall)).ingest(base)
            } else {
                (*(ptr as *const EventRec)).ingest
            }
        }
    }

    #[inline(always)]
    fn discard(&mut self) {
        self.ptr = self.ptr.map_addr(|addr| addr | 2);
    }

    #[inline(always)]
    fn value(self) -> Option<(Key, u32, u32)> {
        if self.ptr.addr() & 2 != 0 {
            return None;
        }
        let ptr = self.ptr.map_addr(|addr| addr & !3);
        unsafe {
            if self.ptr.addr() & 1 == 0 {
                let rec = &*(ptr as *const EventSmall);
                let ts = rec.ts();
                (ts != INVALID).then_some((rec.user(), ts, 0))
            } else {
                let rec = &*(ptr as *const EventRec);
                (rec.ts != INVALID).then_some((rec.user, rec.ts, rec.payload))
            }
        }
    }
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

type Copies = Pair<EventSmall, EventRec>;
type Persons = Pair<PersonSmall, PersonRec>;
type Clicks = Pair<ClickSmall, ClickRec>;

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
    let ctx = Ctx {
        calendar: Calendar::around(ws),
        ws,
        we,
        cws,
        products: SmallMap::new(&product_entries),
        unknown,
        campaigns: SmallMap::new(&campaign_entries),
        organic,
        p1_bits: bits_for(est_events, 12 << 10),
        p2_bits: bits_for(est_events, 12 << 10),
        p1_block: block_for(event_bytes / 77, 1 << bits_for(est_events, 12 << 10), threads, 64),
        click_block: block_for(click_bytes / 47, 1 << bits_for(est_events, 12 << 10), threads, 32),
        p2_block: block_for(event_bytes / 77, 1 << bits_for(est_events, 12 << 10), threads, 64),
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
    let links_done = AtomicBool::new(false);
    let queue = AtomicUsize::new(0);
    let p1_ready = AtomicUsize::new(0);
    let person_queue = AtomicUsize::new(0);
    let file_counter = AtomicUsize::new(0);
    let barrier = Barrier::new(threads);
    let p1_sinks: Vec<OnceLock<Copies>> = (0..threads).map(|_| OnceLock::new()).collect();
    let click_sinks: Vec<OnceLock<Clicks>> = (0..threads).map(|_| OnceLock::new()).collect();
    let p2_sinks: Vec<OnceLock<Persons>> = (0..threads).map(|_| OnceLock::new()).collect();
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
            let links_done = &links_done;
            let queue = &queue;
            let p1_ready = &p1_ready;
            let person_queue = &person_queue;
            let file_counter = &file_counter;
            let barrier = &barrier;
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
                let mut p1: Option<Copies> = Some(Pair::new(1 << ctx.p1_bits, ctx.p1_block, ctx.p1_block / 3));
                let mut clicks: Option<Clicks> = Some(Pair::new(1 << ctx.p2_bits, ctx.click_block, ctx.click_block / 2));
                let mut copies = 0usize;
                let mut click_count = 0usize;
                let mut p2: Persons = Pair::new(1 << ctx.p2_bits, ctx.p2_block, ctx.p2_block * 2 / 3);
                let mut buf: Vec<Candidate> = Vec::new();
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
                            p1_ready.fetch_add(1, Ordering::Release);
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
                                links_done.store(true, Ordering::Release);
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
                                if !links_done.load(Ordering::Acquire) {
                                    let w = tr.now();
                                    while !links_done.load(Ordering::Acquire) {
                                        std::thread::yield_now();
                                    }
                                    tr.add(trace::WAIT_LINKS, w);
                                }
                                let t = tr.now();
                                let people = people.get().unwrap();
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
                        while p1_ready.load(Ordering::Acquire) < threads {
                            for _ in 0..64 {
                                std::hint::spin_loop();
                            }
                            std::thread::yield_now();
                        }
                        tr.add(trace::BAR_PARSE, w);
                        all_p1 = p1_sinks.iter().map(|s| s.get().unwrap()).collect();
                    }
                    let t = tr.now();
                    let people = people.get().unwrap();
                    winners += dedup(ctx, people, &all_p1, q, &mut once, &mut twice, &mut buf, &mut table, &mut arena, &mut p2);
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
                        if let Err(e) =
                            write::user_part(
                                user_dir,
                                file,
                                &worker.rows,
                                0..worker.rows.len(),
                                categories,
                                ctx.first_day,
                                &ctx.users,
                            )
                        {
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
        if n == 0 || *p != domain.prefix {
            return None;
        }
        p = p.add(1);
    }
    let rest = n.wrapping_sub(plen);
    if rest == id::LONG_LEN {
        let (hi, lo) = K::long(p)?;
        return (hi != 0 && hi != id::ODD).then_some(Key { hi, lo });
    }
    K::short(p, rest).map(|lo| Key { hi: 0, lo })
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
    if scan::has_avx2() {
        return unsafe { parse_events_avx2(ctx, chunk, arena, sink) };
    }
    unsafe { parse_events_k::<Scalar>(ctx, chunk, arena, sink) }
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
            let ingest = ctx.calendar.parse(f[3]);
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
            let part = part_of(event, ctx.p1_bits);
            if let Some(small) = EventSmall::new(&rec, ctx.cws) {
                self.sink.a.push(self.arena, part, small);
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
    if scan::has_avx2() {
        return unsafe { parse_clicks_avx2(ctx, people, chunk, arena, sink) };
    }
    unsafe { parse_clicks_k::<Scalar>(ctx, people, chunk, arena, sink) }
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
        rec.person = self.people.name_of(rec.person);
        let part = part_of(rec.person, self.ctx.p2_bits);
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

struct Emit<'a> {
    people: &'a People,
    bits: u32,
    ring: [(Key, u32, u32); RING],
    head: usize,
    len: usize,
    winners: usize,
}

impl Emit<'_> {
    #[inline(always)]
    fn push(&mut self, user: Key, ts: u32, payload: u32, out: &mut Persons, arena: &mut Arena) {
        prefetch_user(self.people, user);
        if self.len == RING {
            let (u, t, p) = self.ring[self.head];
            self.resolve(u, t, p, out, arena);
        } else {
            self.len += 1;
        }
        self.ring[self.head] = (user, ts, payload);
        self.head = (self.head + 1) & (RING - 1);
        self.winners += 1;
    }

    #[inline(always)]
    fn resolve(&mut self, user: Key, ts: u32, payload: u32, out: &mut Persons, arena: &mut Arena) {
        let person = self.people.name_of(user);
        let part = part_of(person, self.bits);
        if person.hi == 0 {
            out.a.push(arena, part, PersonSmall { person: person.lo, ts, payload });
        } else {
            out.b.push(arena, part, PersonRec { person, ts, payload });
        }
    }

    fn flush(&mut self, out: &mut Persons, arena: &mut Arena) {
        for i in 0..self.len {
            let (u, t, p) = self.ring[(self.head + RING - self.len + i) & (RING - 1)];
            self.resolve(u, t, p, out, arena);
        }
        self.len = 0;
    }
}

#[allow(clippy::too_many_arguments)]
fn dedup(
    ctx: &Ctx,
    people: &People,
    sinks: &[&Copies],
    q: usize,
    once: &mut Vec<u64>,
    twice: &mut Vec<u64>,
    cand: &mut Vec<Candidate>,
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
                let h = r.event().hash();
                mark(once, twice, (h >> sshift) as usize & smask);
            }
        }
        for slice in sink.b.slices(q) {
            for r in slice {
                mark(once, twice, (r.event.hash() >> sshift) as usize & smask);
            }
        }
    }
    let mut emit = Emit {
        people,
        bits: ctx.p2_bits,
        ring: [(Key::default(), 0, 0); RING],
        head: 0,
        len: 0,
        winners: 0,
    };
    cand.clear();
    for sink in sinks {
        for slice in sink.a.slices(q) {
            for r in slice {
                let event = r.event();
                if marked(twice, (event.hash() >> sshift) as usize & smask) {
                    cand.push(Candidate::small(r));
                } else if r.ts() != INVALID {
                    emit.push(r.user(), r.ts(), 0, out, arena);
                }
            }
        }
        for slice in sink.b.slices(q) {
            for r in slice {
                if marked(twice, (r.event.hash() >> sshift) as usize & smask) {
                    cand.push(Candidate::wide(r));
                } else if r.ts != INVALID {
                    emit.push(r.user, r.ts, r.payload, out, arena);
                }
            }
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
            let key = cand[i].event();
            let mut slot = ((key.hash() >> shift) as usize) & mask;
            loop {
                let entry = unsafe { table.get_unchecked_mut(slot) };
                if *entry == u32::MAX {
                    *entry = i as u32;
                    break;
                }
                let j = *entry as usize;
                if unsafe { cand.get_unchecked(j) }.event() == key {
                    if cand[i].ingest(ctx.cws) < cand[j].ingest(ctx.cws) {
                        cand[j].discard();
                        *entry = i as u32;
                    } else {
                        cand[i].discard();
                    }
                    break;
                }
                slot = (slot + 1) & mask;
            }
        }
        for rec in cand.iter() {
            if let Some((user, ts, payload)) = rec.value() {
                emit.push(user, ts, payload, out, arena);
            }
        }
    }
    emit.flush(out, arena);
    cand.clear();
    for sink in sinks {
        let bytes = sink.a.block_bytes();
        for block in sink.a.blocks(q) {
            arena.recycle(block, bytes, piece);
        }
        let bytes = sink.b.block_bytes();
        for block in sink.b.blocks(q) {
            arena.recycle(block, bytes, piece);
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

#[derive(Clone, Copy)]
struct SessionBin {
    min: u32,
    max: u32,
    count: u64,
    session: u32,
}

#[derive(Clone, Copy)]
struct BinSession {
    start: u32,
    day: u32,
    events: u64,
    revenue: u64,
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
    bins: Vec<SessionBin>,
    bin_purchases: Vec<u64>,
    bin_sessions: Vec<BinSession>,
    bin_categories: Vec<u64>,
    bin_touched: Vec<usize>,
    bin_best: Vec<(u64, u8)>,
    occupied_bins: Vec<u32>,
    bin_threshold: usize,
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
            bins: vec![SessionBin { min: 0, max: 0, count: 0, session: 0 }; ((ctx.we - ctx.cws) as usize).div_ceil(GAP_MS as usize)],
            bin_purchases: Vec::new(),
            bin_sessions: Vec::new(),
            bin_categories: vec![0; ctx.days * 256],
            bin_touched: Vec::new(),
            bin_best: vec![(0, u8::MAX); ctx.days],
            occupied_bins: Vec::new(),
            bin_threshold: std::env::var("SESSIONS_BIN_THRESHOLD").ok().and_then(|x| x.parse().ok()).unwrap_or(8),
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

    fn partition(&mut self, ctx: &Ctx, events: &[&Persons], clicks: &[&Clicks], p: usize) {
        let n: usize = events.iter().map(|s| s.len(p)).sum();
        if n == 0 {
            return;
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
                if id != u32::MAX {
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
            for slice in sink.a.slices(p) {
                for rec in slice {
                    add_click!(Key { hi: 0, lo: rec.person }, Key { hi: 0, lo: rec.click }, rec.ts, rec.campaign);
                }
            }
            for slice in sink.b.slices(p) {
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
        for id in 0..persons {
            let er = offsets[id] as usize..offsets[id + 1] as usize;
            let cr = click_offsets[id] as usize..click_offsets[id + 1] as usize;
            let name = self.persons[id];
            if er.len() <= self.bin_threshold {
                self.sorted[er.clone()].sort_unstable();
                self.person(name, er, cr);
            } else {
                self.person_bins(name, er, cr);
            }
        }
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

    fn person_bins(&mut self, person: Key, events: std::ops::Range<usize>, clicks: std::ops::Range<usize>) {
        self.bin_purchases.clear();
        self.bin_sessions.clear();
        self.occupied_bins.clear();
        for &value in &self.sorted[events] {
            let ts = (value >> 32) as u32;
            let b = ts / GAP_MS;
            let bin = &mut self.bins[b as usize];
            if bin.count == 0 {
                self.occupied_bins.push(b);
                bin.min = ts;
                bin.max = ts;
            } else {
                bin.min = bin.min.min(ts);
                bin.max = bin.max.max(ts);
            }
            bin.count += 1;
            if value as u32 & 0x00ff_ffff != 0 {
                self.bin_purchases.push(value);
            }
        }
        self.occupied_bins.sort_unstable();
        let mut i = 0usize;
        while i < self.occupied_bins.len() {
            let start = self.bins[self.occupied_bins[i] as usize].min;
            let day = ((i64::from(start) + self.day_shift) / DAY_MS) as u32;
            let session = self.bin_sessions.len() as u32;
            let mut last = start;
            let mut events_in = 0u64;
            while i < self.occupied_bins.len() {
                let b = self.occupied_bins[i] as usize;
                let bin = &mut self.bins[b];
                if bin.min - last > GAP_MS {
                    break;
                }
                last = bin.max;
                events_in += bin.count;
                bin.session = session;
                bin.count = 0;
                i += 1;
            }
            self.bin_sessions.push(BinSession { start, day, events: events_in, revenue: 0 });
        }
        for &value in &self.bin_purchases {
            let ts = (value >> 32) as u32;
            let payload = value as u32;
            let price = u64::from(payload & 0x00ff_ffff);
            let category = (payload >> 24) as u8;
            let session = self.bins[(ts / GAP_MS) as usize].session as usize;
            let session = &mut self.bin_sessions[session];
            session.revenue += price;
            let day = session.day as usize;
            let at = day * 256 + usize::from(category);
            let sum = &mut self.bin_categories[at];
            if *sum == 0 {
                self.bin_touched.push(at);
            }
            *sum += price;
            let best = &mut self.bin_best[day];
            if *sum > best.0 || (*sum == best.0 && category < best.1) {
                *best = (*sum, category);
            }
        }
        let mut low = clicks.start;
        let mut high = clicks.start;
        let click_end = clicks.end;
        let mut row_day = usize::MAX;
        let mut row = [0u64; 3];
        for i in 0..self.bin_sessions.len() {
            let session = self.bin_sessions[i];
            let start = session.start;
            let day = session.day as usize;
            let revenue = session.revenue;
            if day != row_day {
                if row_day != usize::MAX {
                    self.finish_bin_row(person, row_day, row);
                }
                row_day = day;
                row = [0; 3];
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
            row[1] += session.events;
            row[2] += revenue;
        }
        if row_day != usize::MAX {
            self.finish_bin_row(person, row_day, row);
        }
        for at in self.bin_touched.drain(..) {
            self.bin_categories[at] = 0;
        }
        for &c in &self.active {
            self.in_window[c as usize] = 0;
        }
        self.active.clear();
    }

    fn finish_bin_row(&mut self, person: Key, day: usize, row: [u64; 3]) {
        let top = self.bin_best[day].1;
        self.bin_best[day] = (0, u8::MAX);
        self.rows.push(person, day as u32, row, top);
    }

    fn person(&mut self, person: Key, events: std::ops::Range<usize>, clicks: std::ops::Range<usize>) {
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
mod compact_tests {
    use super::*;

    fn text(mut value: u64) -> Vec<u8> {
        let mut out = Vec::new();
        loop {
            let digit = (value % 36) as u8;
            out.push(if digit < 10 { b'0' + digit } else { b'a' + digit - 10 });
            value /= 36;
            if value == 0 {
                break;
            }
        }
        out.reverse();
        out
    }

    fn check_code(domain: Domain, value: u64) {
        let mut bytes = Vec::new();
        if domain.plen != 0 {
            bytes.push(domain.prefix);
        }
        bytes.extend(text(value));
        let key = domain.encode(&bytes);
        let code = short_code(key);
        assert_eq!(code.is_some(), key.hi == 0 && key.lo <= CODE_MASK, "{bytes:?}");
        if let Some(code) = code {
            let restored = short_key(code);
            assert_eq!(key, restored);
            let mut output = Vec::new();
            domain.bytes_of(restored, &mut output);
            assert_eq!(bytes, output);
        }
    }

    #[test]
    fn exact_key_roundtrip() {
        let domains = [Domain::bare(), Domain::with_prefix(b'e'), Domain::with_prefix(b'$')];
        let mut boundaries = vec![0, 1, 35, 36, CODE_MASK - 2, CODE_MASK - 1, CODE_MASK, CODE_MASK + 1];
        for &power in &id::POW36[1..=9] {
            boundaries.extend([power - 1, power, power + 1]);
        }
        for domain in domains {
            for &value in &boundaries {
                check_code(domain, value);
            }
            let mut state = 0x71ce_089d_6b25_f3a1u64;
            for _ in 0..20_000 {
                state ^= state << 13;
                state ^= state >> 7;
                state ^= state << 17;
                check_code(domain, state & CODE_MASK);
            }
        }
        assert_eq!(short_code(Key::default()), Some(0));
        assert_eq!(short_key(0), Key::default());
    }

    #[test]
    fn exact_key_fallbacks() {
        let d = Domain::with_prefix(b'e');
        for bytes in [
            b"e00000000000".as_slice(), b"eA", b"e-1", b"e1_2",
            b"x123", b"e0123456789abcdef0123456789abcdef", b"ezzzzzzzzzzz", b"e",
        ] {
            assert!(short_code(d.encode(bytes)).is_none(), "{bytes:?}");
        }
        for bytes in [b"e0".as_slice(), b"e00", b"e01", b"e00000001"] {
            let key = d.encode(bytes);
            assert_eq!(short_key(short_code(key).unwrap()), key);
        }
    }

    #[test]
    fn exact_record_roundtrip() {
        let d = Domain::with_prefix(b'u');
        let bases = [i64::MIN + 10_000, -1_000_000, 0, 1_830_123_456_789];
        let offsets = [-1000, -1, 0, 1, 999, 1000, 1001, 4_294_967_000, TIME_MASK as i64 * 1000,
            TIME_MASK as i64 * 1000 + 1, (TIME_MASK as i64 + 1) * 1000];
        let times = [0, 1, 999, 1000, 1001, 1_800_000, 4_294_967_000, INVALID];
        for base in bases {
            for offset in offsets {
                let Some(ingest) = base.checked_add(offset) else { continue };
                for ts in times {
                    let rec = EventRec { event: d.encode(b"uabc123"), user: d.encode(b"uz9"), ingest, ts, payload: 0 };
                    let small = EventSmall::new(&rec, base);
                    let exact = offset >= 0 && offset % 1000 == 0 && offset / 1000 <= TIME_MASK as i64
                        && (ts == INVALID || ts % 1000 == 0);
                    assert_eq!(small.is_some(), exact, "{base} {offset} {ts}");
                    if let Some(small) = small {
                        assert_eq!(small.event(), rec.event);
                        assert_eq!(small.user(), rec.user);
                        assert_eq!(small.ingest(base), rec.ingest);
                        assert_eq!(small.ts(), rec.ts);
                    }
                }
            }
        }
        assert_eq!(std::mem::size_of::<EventSmall>(), 16);
        assert_eq!(std::mem::size_of::<Candidate>(), 8);
        assert!(std::mem::align_of::<EventSmall>() >= 4);
        assert!(std::mem::align_of::<EventRec>() >= 4);
    }

    #[test]
    fn exact_record_fallbacks() {
        let d = Domain::with_prefix(b'u');
        let base = 1_830_000_000_123;
        let original = EventRec { event: d.encode(b"u0"), user: d.encode(b"u1"), ingest: base + 1000, ts: 1000, payload: 0 };
        assert!(EventSmall::new(&original, base).is_some());
        let mut rec = original;
        rec.payload = 1;
        assert!(EventSmall::new(&rec, base).is_none());
        rec = original;
        rec.event = d.encode(b"u01");
        assert_eq!(EventSmall::new(&rec, base).unwrap().event(), rec.event);
        rec = original;
        rec.user = d.encode(b"u0123456789abcdef0123456789abcdef");
        assert!(EventSmall::new(&rec, base).is_none());
        rec = original;
        rec.ingest = i64::MIN;
        assert!(EventSmall::new(&rec, i64::MAX).is_none());
        rec.ingest = i64::MAX;
        assert!(EventSmall::new(&rec, i64::MIN).is_none());
        rec = original;
        rec.user = Key::default();
        rec.ts = INVALID;
        let small = EventSmall::new(&rec, base).unwrap();
        assert_eq!(small.user(), Key::default());
        assert_eq!(small.ts(), INVALID);
    }

    #[test]
    fn candidate_tags_preserve_records() {
        let d = Domain::with_prefix(b'u');
        let original = EventRec { event: d.encode(b"u123"), user: d.encode(b"u456"), ingest: 1000, ts: 2000, payload: 0 };
        let packed = EventSmall::new(&original, 0).unwrap();
        let wide = EventRec { ingest: 1001, payload: 17, ..original };
        for (mut candidate, source) in [(Candidate::small(&packed), original), (Candidate::wide(&wide), wide)] {
            assert_eq!(candidate.event(), source.event);
            assert_eq!(candidate.ingest(0), source.ingest);
            assert_eq!(candidate.value(), Some((source.user, source.ts, source.payload)));
            candidate.discard();
            assert!(candidate.value().is_none());
            assert_eq!(candidate.event(), source.event);
            assert_eq!(candidate.ingest(0), source.ingest);
        }
    }
}
