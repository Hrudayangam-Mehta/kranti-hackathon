pub mod keys;
pub mod parquet;
pub mod people;
pub mod scan;
pub mod sink;
pub mod ts;
pub mod write;

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::{Barrier, Mutex, OnceLock};
use std::time::Instant;

use crate::csv;
use crate::events::parse_price;
use crate::input::{self, Result, Window, ORGANIC, UNKNOWN_CATEGORY};
use crate::time::DAY_MS;
use keys::SmallMap;
use people::{prefetch, People};
#[cfg(target_arch = "x86_64")]
use scan::Avx2;
use scan::{Kernel, Lines, Scalar, Scratch};
use sink::{Arena, Sink};
use ts::Calendar;

const WEEK_MS: i64 = 7 * DAY_MS;
const GAP_MS: u32 = 30 * 60 * 1000;
const INVALID: u32 = u32::MAX;
const H1: u64 = 0x9e37_79b9_7f4a_7c15;
const H2: u64 = 0xc2b2_ae3d_27d4_eb4f;

#[derive(Clone, Copy)]
#[repr(C)]
pub struct EventRec {
    event: u64,
    user: u64,
    ingest: i64,
    ts: u32,
    payload: u32,
}

#[derive(Clone, Copy)]
#[repr(C)]
pub struct PersonRec {
    person: u64,
    ts: u32,
    payload: u32,
}

#[derive(Clone, Copy)]
#[repr(C)]
pub struct ClickRec {
    person: u64,
    click: u64,
    ts: u32,
    campaign: u32,
}

#[derive(Clone, Copy)]
struct LocalClick {
    ts: u32,
    campaign: u32,
    click: u64,
}

pub struct Config<'a> {
    pub data_dir: &'a Path,
    pub output_dir: &'a Path,
    pub threads: usize,
}

pub enum Outcome {
    Done,
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
    first_day: i64,
    days: usize,
    day_shift: i64,
    link_files: &'a [&'static [u8]],
    units: Vec<Unit>,
}

#[derive(Clone, Copy)]
enum Unit {
    Links,
    Events(&'static [u8]),
    Clicks(&'static [u8]),
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

fn chunks(files: &[&'static [u8]], target: usize, out: &mut Vec<&'static [u8]>) {
    for &file in files {
        for (start, end) in csv::data_chunks(file, target) {
            out.push(&file[start..end]);
        }
    }
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
    let lap = |name: &str| eprintln!("{name:<8} {:>8.1} ms", started.elapsed().as_secs_f64() * 1e3);
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
    let product_rows: Vec<[&[u8]; 2]> = csv::rows(products_file).filter_map(csv::fields::<2>).collect();
    let mut categories: Vec<&'static [u8]> = product_rows.iter().map(|[_, c]| *c).collect();
    categories.push(UNKNOWN_CATEGORY);
    categories.sort_unstable();
    categories.dedup();
    if categories.len() > 255 {
        return Ok(Outcome::Fallback("category count".into()));
    }
    let category_index = |name: &[u8]| categories.binary_search(&name).unwrap() as u32;
    let product_entries: Vec<(u64, u32)> = product_rows
        .iter()
        .map(|[p, c]| (keys::intern(p), category_index(c)))
        .collect();
    let unknown = category_index(UNKNOWN_CATEGORY);
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

    let event_files = map_folder(&data.join("events"))?;
    let click_files = map_folder(&data.join("clicks"))?;
    let link_files = map_folder(&data.join("links"))?;
    let event_bytes: usize = event_files.iter().map(|f| f.len()).sum();
    let click_bytes: usize = click_files.iter().map(|f| f.len()).sum();
    let threads = config.threads.max(1);
    let target = ((event_bytes + click_bytes) / (threads * 24)).clamp(64 << 10, 4 << 20);
    let mut event_chunks = Vec::new();
    chunks(&event_files, target, &mut event_chunks);
    let mut click_chunks = Vec::new();
    chunks(&click_files, target, &mut click_chunks);
    let mut units = vec![Unit::Links];
    units.extend(event_chunks.iter().map(|&c| Unit::Events(c)));
    units.extend(click_chunks.iter().map(|&c| Unit::Clicks(c)));

    let est_events = event_bytes / 60 + 1;
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
        first_day,
        days: (last_day - first_day + 1) as usize,
        day_shift: cws - first_day * DAY_MS,
        link_files: &link_files,
        units,
    };
    lap("setup");

    let people: OnceLock<People> = OnceLock::new();
    let links_done = AtomicBool::new(false);
    let queue = AtomicUsize::new(0);
    let dedup_queue = AtomicUsize::new(0);
    let person_queue = AtomicUsize::new(0);
    let barrier = Barrier::new(threads);
    let p1_sinks: Vec<OnceLock<Sink<EventRec>>> = (0..threads).map(|_| OnceLock::new()).collect();
    let click_sinks: Vec<OnceLock<Sink<ClickRec>>> = (0..threads).map(|_| OnceLock::new()).collect();
    let p2_sinks: Vec<OnceLock<Sink<PersonRec>>> = (0..threads).map(|_| OnceLock::new()).collect();
    let order: OnceLock<Vec<usize>> = OnceLock::new();
    let results: Mutex<Vec<write::Part>> = Mutex::new(Vec::new());
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

    std::thread::scope(|scope| {
        for id in 0..threads {
            let ctx = &ctx;
            let people = &people;
            let links_done = &links_done;
            let queue = &queue;
            let dedup_queue = &dedup_queue;
            let person_queue = &person_queue;
            let barrier = &barrier;
            let p1_sinks = &p1_sinks;
            let click_sinks = &click_sinks;
            let p2_sinks = &p2_sinks;
            let order = &order;
            let results = &results;
            let stats = &stats;
            let lap = &lap;
            let user_dir = &user_dir;
            let failure = &failure;
            let categories = &categories;
            scope.spawn(move || {
                let mut arena = Arena::new();
                let mut scratch = Scratch::new();
                let mut p1: Sink<EventRec> = Sink::new(1 << ctx.p1_bits, 512);
                let mut clicks: Sink<ClickRec> = Sink::new(1 << ctx.p2_bits, 512);
                let mut copies = 0usize;
                let mut click_count = 0usize;
                loop {
                    let i = queue.fetch_add(1, Ordering::Relaxed);
                    let Some(&unit) = ctx.units.get(i) else { break };
                    match unit {
                        Unit::Links => {
                            let t0 = Instant::now();
                            let built = build_people(ctx.link_files);
                            let _ = people.set(built);
                            links_done.store(true, Ordering::Release);
                            eprintln!("links    {:>8.1} ms on one thread", t0.elapsed().as_secs_f64() * 1e3);
                        }
                        Unit::Events(chunk) => copies += parse_events(ctx, chunk, &mut scratch, &mut arena, &mut p1),
                        Unit::Clicks(chunk) => {
                            while !links_done.load(Ordering::Acquire) {
                                std::thread::yield_now();
                            }
                            let people = people.get().unwrap();
                            click_count += parse_clicks(ctx, people, chunk, &mut scratch, &mut arena, &mut clicks);
                        }
                    }
                }
                if id == 0 {
                    eprintln!("thread 0 parse busy {:>8.1} ms", started.elapsed().as_secs_f64() * 1e3);
                }
                stats.event_copies.fetch_add(copies, Ordering::Relaxed);
                stats.clicks.fetch_add(click_count, Ordering::Relaxed);
                p1.finish(&mut arena);
                clicks.finish(&mut arena);
                let _ = p1_sinks[id].set(p1);
                let _ = click_sinks[id].set(clicks);
                if barrier.wait().is_leader() {
                    lap("parse");
                }

                let people = people.get().unwrap();
                let all_p1: Vec<&Sink<EventRec>> = p1_sinks.iter().map(|s| s.get().unwrap()).collect();
                arena.retire();
                let mut p2: Sink<PersonRec> = Sink::new(1 << ctx.p2_bits, 256);
                let mut buf: Vec<EventRec> = Vec::new();
                let mut table: Vec<(u64, u32)> = Vec::new();
                let mut winners = 0usize;
                loop {
                    let q = dedup_queue.fetch_add(1, Ordering::Relaxed);
                    if q >= 1 << ctx.p1_bits {
                        break;
                    }
                    winners += dedup(ctx, people, &all_p1, q, &mut buf, &mut table, &mut arena, &mut p2);
                }
                stats.winners.fetch_add(winners, Ordering::Relaxed);
                p2.finish(&mut arena);
                let _ = p2_sinks[id].set(p2);
                if barrier.wait().is_leader() {
                    let all_p2: Vec<&Sink<PersonRec>> = p2_sinks.iter().map(|s| s.get().unwrap()).collect();
                    let all_clicks: Vec<&Sink<ClickRec>> = click_sinks.iter().map(|s| s.get().unwrap()).collect();
                    let mut sizes: Vec<(usize, usize)> = (0..1usize << ctx.p2_bits)
                        .map(|p| {
                            let n: usize = all_p2.iter().map(|s| s.len(p)).sum::<usize>()
                                + all_clicks.iter().map(|s| s.len(p)).sum::<usize>() / 4;
                            (n, p)
                        })
                        .collect();
                    sizes.sort_unstable_by(|a, b| b.cmp(a));
                    let _ = order.set(sizes.into_iter().map(|(_, p)| p).collect());
                    lap("dedup");
                }
                barrier.wait();

                let all_p2: Vec<&Sink<PersonRec>> = p2_sinks.iter().map(|s| s.get().unwrap()).collect();
                let all_clicks: Vec<&Sink<ClickRec>> = click_sinks.iter().map(|s| s.get().unwrap()).collect();
                let order = order.get().unwrap();
                let mut worker = Worker::new(ctx);
                loop {
                    let i = person_queue.fetch_add(1, Ordering::Relaxed);
                    let Some(&p) = order.get(i) else { break };
                    worker.partition(ctx, &all_p2, &all_clicks, p);
                }
                let part = worker.finish();
                if let Err(e) = write::user_part(user_dir, id, &part, categories, ctx.first_day) {
                    *failure.lock().unwrap() = Some(e.to_string());
                }
                results.lock().unwrap().push(part);
                if barrier.wait().is_leader() {
                    lap("people");
                }
            });
        }
    });
    if let Some(e) = failure.into_inner().unwrap() {
        return Err(e.into());
    }
    let parts = results.into_inner().unwrap();
    write::campaign_table(&campaign_dir, &parts, &campaign_ids, &campaign_channels, ORGANIC, first_day, ctx.days)?;
    write::report(&parts, ctx.days, organic as usize);
    eprintln!(
        "event copies {}, winners {}, clicks {}, linked {}, exotic {}",
        stats.event_copies.load(Ordering::Relaxed),
        stats.winners.load(Ordering::Relaxed),
        stats.clicks.load(Ordering::Relaxed),
        people.get().map_or(0, |p| p.linked()),
        keys::exotic_count()
    );
    lap("write");
    Ok(Outcome::Done)
}

#[inline(always)]
unsafe fn intern_k<K: Kernel>(field: &[u8]) -> u64 {
    match K::pack(field.as_ptr(), field.len()) {
        Some(key) => key,
        None => keys::intern_exotic(field),
    }
}

#[inline(always)]
unsafe fn lookup_k<K: Kernel>(field: &[u8]) -> Option<u64> {
    match K::pack(field.as_ptr(), field.len()) {
        Some(key) => Some(key),
        None => keys::lookup_exotic(field),
    }
}

fn build_people(files: &[&'static [u8]]) -> People {
    let mut pairs: Vec<(u64, u64)> = Vec::new();
    let mut scratch = Scratch::new();
    for &file in files {
        for (start, end) in csv::data_chunks(file, usize::MAX) {
            let body = &file[start..end];
            #[cfg(target_arch = "x86_64")]
            if scan::has_avx2() {
                unsafe { link_pairs_avx2(body, &mut scratch, &mut pairs) };
                continue;
            }
            unsafe { link_pairs::<Scalar>(body, &mut scratch, &mut pairs) };
        }
    }
    People::build(&pairs)
}

#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "avx2,bmi1,bmi2,popcnt")]
unsafe fn link_pairs_avx2(body: &[u8], scratch: &mut Scratch, pairs: &mut Vec<(u64, u64)>) {
    link_pairs::<Avx2>(body, scratch, pairs)
}

struct LinkLines<'a, K> {
    pairs: &'a mut Vec<(u64, u64)>,
    kernel: std::marker::PhantomData<K>,
}

impl<K: Kernel> Lines<2> for LinkLines<'_, K> {
    #[inline(always)]
    fn line(&mut self, f: &[&[u8]; 2]) {
        if !f[0].is_empty() && !f[1].is_empty() {
            unsafe { self.pairs.push((intern_k::<K>(f[0]), intern_k::<K>(f[1]))) };
        }
    }
}

#[inline(always)]
unsafe fn link_pairs<K: Kernel>(body: &[u8], scratch: &mut Scratch, pairs: &mut Vec<(u64, u64)>) {
    let mut lines = LinkLines::<K> {
        pairs,
        kernel: std::marker::PhantomData,
    };
    scan::scan::<2, K, _>(body, scratch, &mut lines);
}

#[inline(always)]
fn part_of(key: u64, mult: u64, bits: u32) -> usize {
    (key.wrapping_mul(mult) >> (64 - bits)) as usize
}

fn parse_events(ctx: &Ctx, chunk: &[u8], scratch: &mut Scratch, arena: &mut Arena, sink: &mut Sink<EventRec>) -> usize {
    #[cfg(target_arch = "x86_64")]
    if scan::has_avx2() {
        return unsafe { parse_events_avx2(ctx, chunk, scratch, arena, sink) };
    }
    unsafe { parse_events_k::<Scalar>(ctx, chunk, scratch, arena, sink) }
}

#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "avx2,bmi1,bmi2,popcnt")]
unsafe fn parse_events_avx2(
    ctx: &Ctx,
    chunk: &[u8],
    scratch: &mut Scratch,
    arena: &mut Arena,
    sink: &mut Sink<EventRec>,
) -> usize {
    parse_events_k::<Avx2>(ctx, chunk, scratch, arena, sink)
}

struct EventLines<'a, K> {
    ctx: &'a Ctx<'a>,
    arena: &'a mut Arena,
    sink: &'a mut Sink<EventRec>,
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
            let event = intern_k::<K>(event_id);
            let ingest = ctx.calendar.parse(f[3]);
            let mut rec = EventRec {
                event,
                user: 0,
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
                            let price = match kind {
                                b"view" | b"cart" => Some(0),
                                b"purchase" => parse_price(f[6]),
                                _ => None,
                            };
                            if let Some(price) = price {
                                let category = if price > 0 {
                                    lookup_k::<K>(product)
                                        .and_then(|k| ctx.products.get(k))
                                        .unwrap_or(ctx.unknown)
                                } else {
                                    0
                                };
                                rec.user = intern_k::<K>(user);
                                rec.ts = (t - ctx.cws) as u32;
                                rec.payload = price | category << 24;
                            }
                        }
                    }
                }
            }
            self.sink.push(self.arena, part_of(event, H1, ctx.p1_bits), rec);
        }
    }
}

#[inline(always)]
unsafe fn parse_events_k<K: Kernel>(
    ctx: &Ctx,
    chunk: &[u8],
    scratch: &mut Scratch,
    arena: &mut Arena,
    sink: &mut Sink<EventRec>,
) -> usize {
    let mut lines = EventLines::<K> {
        ctx,
        arena,
        sink,
        copies: 0,
        kernel: std::marker::PhantomData,
    };
    scan::scan::<7, K, _>(chunk, scratch, &mut lines);
    lines.copies
}

fn parse_clicks(
    ctx: &Ctx,
    people: &People,
    chunk: &[u8],
    scratch: &mut Scratch,
    arena: &mut Arena,
    sink: &mut Sink<ClickRec>,
) -> usize {
    #[cfg(target_arch = "x86_64")]
    if scan::has_avx2() {
        return unsafe { parse_clicks_avx2(ctx, people, chunk, scratch, arena, sink) };
    }
    unsafe { parse_clicks_k::<Scalar>(ctx, people, chunk, scratch, arena, sink) }
}

#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "avx2,bmi1,bmi2,popcnt")]
unsafe fn parse_clicks_avx2(
    ctx: &Ctx,
    people: &People,
    chunk: &[u8],
    scratch: &mut Scratch,
    arena: &mut Arena,
    sink: &mut Sink<ClickRec>,
) -> usize {
    parse_clicks_k::<Avx2>(ctx, people, chunk, scratch, arena, sink)
}

const CLICK_BATCH: usize = 32;

struct ClickLines<'a, K> {
    ctx: &'a Ctx<'a>,
    people: &'a People,
    arena: &'a mut Arena,
    sink: &'a mut Sink<ClickRec>,
    batch: [ClickRec; CLICK_BATCH],
    pending: usize,
    total: usize,
    kernel: std::marker::PhantomData<K>,
}

impl<K: Kernel> ClickLines<'_, K> {
    #[inline(always)]
    fn flush(&mut self) {
        let bits = self.ctx.p2_bits;
        for rec in &self.batch[..self.pending] {
            prefetch(self.people.slot_ptr(rec.person));
        }
        for i in 0..self.pending {
            let mut rec = self.batch[i];
            rec.person = self.people.name_of(rec.person);
            self.sink.push(self.arena, part_of(rec.person, H2, bits), rec);
        }
        self.pending = 0;
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
        unsafe {
            let Some(t) = ctx.calendar.parse(f[3]) else { return };
            if t < ctx.cws || t >= ctx.we {
                return;
            }
            let Some(campaign) = lookup_k::<K>(f[2]).and_then(|k| ctx.campaigns.get(k)) else { return };
            self.batch[self.pending] = ClickRec {
                person: intern_k::<K>(user),
                click: intern_k::<K>(click_id),
                ts: (t - ctx.cws) as u32,
                campaign,
            };
        }
        self.pending += 1;
        self.total += 1;
        if self.pending == CLICK_BATCH {
            self.flush();
        }
    }
}

#[inline(always)]
unsafe fn parse_clicks_k<K: Kernel>(
    ctx: &Ctx,
    people: &People,
    chunk: &[u8],
    scratch: &mut Scratch,
    arena: &mut Arena,
    sink: &mut Sink<ClickRec>,
) -> usize {
    let mut lines = ClickLines::<K> {
        ctx,
        people,
        arena,
        sink,
        batch: [ClickRec {
            person: 0,
            click: 0,
            ts: 0,
            campaign: 0,
        }; CLICK_BATCH],
        pending: 0,
        total: 0,
        kernel: std::marker::PhantomData,
    };
    scan::scan::<4, K, _>(chunk, scratch, &mut lines);
    lines.flush();
    lines.total
}

#[allow(clippy::too_many_arguments)]
fn dedup(
    ctx: &Ctx,
    people: &People,
    sinks: &[&Sink<EventRec>],
    q: usize,
    buf: &mut Vec<EventRec>,
    table: &mut Vec<(u64, u32)>,
    arena: &mut Arena,
    out: &mut Sink<PersonRec>,
) -> usize {
    buf.clear();
    for sink in sinks {
        for slice in sink.slices(q) {
            buf.extend_from_slice(slice);
        }
        sink.release(q, arena);
    }
    let n = buf.len();
    if n == 0 {
        return 0;
    }
    let size = (n * 2).next_power_of_two().max(16);
    let tbits = size.trailing_zeros();
    let mask = size - 1;
    table.clear();
    table.resize(size, (0, 0));
    let shift = 64 - ctx.p1_bits - tbits;
    for i in 0..n {
        let key = buf[i].event;
        let mut slot = ((key.wrapping_mul(H1) >> shift) as usize) & mask;
        loop {
            let entry = unsafe { table.get_unchecked_mut(slot) };
            if entry.0 == 0 {
                *entry = (key, i as u32);
                break;
            }
            if entry.0 == key {
                let j = entry.1 as usize;
                if buf[i].ingest < buf[j].ingest {
                    buf[j].event = 0;
                    entry.1 = i as u32;
                } else {
                    buf[i].event = 0;
                }
                break;
            }
            slot = (slot + 1) & mask;
        }
    }
    const BATCH: usize = 32;
    let mut pending: [(u64, u32, u32); BATCH] = [(0, 0, 0); BATCH];
    let mut count = 0usize;
    let mut winners = 0usize;
    let bits = ctx.p2_bits;
    let flush = |pending: &[(u64, u32, u32)], out: &mut Sink<PersonRec>, arena: &mut Arena| {
        for &(user, _, _) in pending {
            prefetch(people.slot_ptr(user));
        }
        for &(user, ts, payload) in pending {
            let person = people.name_of(user);
            out.push(arena, part_of(person, H2, bits), PersonRec { person, ts, payload });
        }
    };
    for rec in buf.iter() {
        if rec.event != 0 && rec.ts != INVALID {
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
    click: u64,
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
    rows: write::Part,
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
        let size = (n * 2).next_power_of_two().max(16);
        let tbits = size.trailing_zeros();
        let mask = size - 1;
        let shift = 64 - ctx.p2_bits - tbits;
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
                    let key = rec.person;
                    let mut slot = ((key.wrapping_mul(H2) >> shift) as usize) & mask;
                    let id = loop {
                        let id = unsafe { *self.local_ids.get_unchecked(slot) };
                        if id == u32::MAX {
                            let id = self.persons.len() as u32;
                            self.local_ids[slot] = id;
                            self.local_keys[slot] = key;
                            self.persons.push(key);
                            self.counts.push(0);
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
                    let key = rec.person;
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
                click: 0,
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
                    self.local_clicks[start..end].sort_unstable_by(|a, b| keys::cmp(b.click, a.click));
                    i = end;
                } else {
                    i += 1;
                }
            }
        }
        for id in 0..persons {
            let er = offsets[id] as usize..offsets[id + 1] as usize;
            let cr = click_offsets[id] as usize..click_offsets[id + 1] as usize;
            self.person(self.persons[id], er, cr);
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
