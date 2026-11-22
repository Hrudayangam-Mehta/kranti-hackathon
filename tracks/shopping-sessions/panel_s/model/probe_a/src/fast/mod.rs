pub mod ident;
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
const FLUSH_ROWS: usize = 1 << 16;
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
    link_files: &'a [&'static [u8]],
    decoder: Option<ident::Decoder>,
    units: Vec<Unit>,
    mapped: Vec<&'static [u8]>,
}

#[derive(Clone, Copy)]
enum Unit {
    Links,
    Events(&'static [u8], usize, usize),
    Clicks(&'static [u8], usize, usize),
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

fn chunks(files: &[&'static [u8]], target: usize, out: &mut Vec<(&'static [u8], usize, usize)>) {
    for &file in files {
        let mut start = 0;
        while start < file.len() {
            let end = start.saturating_add(target).min(file.len());
            out.push((file, start, end));
            start = end;
        }
    }
}

fn split_tail(units: &mut Vec<(&'static [u8], usize, usize)>, count: usize, pieces: usize) {
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
    lane_f: AtomicUsize,
    clicks: AtomicUsize,
}

fn env_u64(name: &str) -> Option<u64> {
    let text = std::env::var(name).ok()?;
    let text = text.trim();
    match text.strip_prefix("0x") {
        Some(hex) => u64::from_str_radix(hex, 16).ok(),
        None => text.parse().ok(),
    }
}

fn choose_decoder(event_files: &[&'static [u8]], link_files: &[&'static [u8]], event_bytes: usize) -> Option<ident::Decoder> {
    if std::env::var("SESSIONS_LANE").is_ok_and(|v| v == "G") {
        eprintln!("lane F off: SESSIONS_LANE=G");
        return None;
    }
    let gcap = env_u64("SESSIONS_TEST_GCAP").unwrap_or((event_bytes / 60 / 30 * 2 + 1024) as u64).clamp(1, 1 << 31);
    let started = Instant::now();
    let key = match env_u64("SESSIONS_TEST_USER_KEY") {
        Some(key) => Ok(key & ident::MASK),
        None => ident::recover(event_files, link_files, gcap),
    };
    match key {
        Ok(key) => {
            eprintln!(
                "lane F on: user key {key:#012x}, person cap {gcap}, {:.1} ms",
                started.elapsed().as_secs_f64() * 1e3
            );
            Some(ident::Decoder {
                key,
                gcap,
                twist: std::env::var("SESSIONS_TEST_TWIST").is_ok_and(|v| v == "1"),
            })
        }
        Err(reason) => {
            eprintln!("lane F off: {reason}");
            None
        }
    }
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
    if click_chunks.is_empty() {
        split_tail(&mut event_chunks, 2 * threads, 4);
    } else {
        split_tail(&mut click_chunks, 2 * threads, 4);
    }
    let mut units = vec![Unit::Links];
    units.extend(event_chunks.iter().map(|&(f, s, e)| Unit::Events(f, s, e)));
    units.extend(click_chunks.iter().map(|&(f, s, e)| Unit::Clicks(f, s, e)));

    let est_events = event_bytes / 60 + 1;
    let decoder = choose_decoder(&event_files, &link_files, event_bytes);
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
        link_files: &link_files,
        decoder,
        units,
        mapped: event_files
            .iter()
            .chain(&click_files)
            .chain(&link_files)
            .copied()
            .filter(|f| !f.is_empty())
            .collect(),
    };
    lap("setup");

    let people: OnceLock<People> = OnceLock::new();
    let links_done = AtomicBool::new(false);
    let queue = AtomicUsize::new(0);
    let dedup_queue = AtomicUsize::new(0);
    let person_queue = AtomicUsize::new(0);
    let file_counter = AtomicUsize::new(0);
    let barrier = Barrier::new(threads);
    let p1_sinks: Vec<OnceLock<Sink<EventRec>>> = (0..threads).map(|_| OnceLock::new()).collect();
    let click_sinks: Vec<OnceLock<Sink<ClickRec>>> = (0..threads).map(|_| OnceLock::new()).collect();
    let p2_sinks: Vec<OnceLock<Sink<PersonRec>>> = (0..threads).map(|_| OnceLock::new()).collect();
    let order: OnceLock<Vec<usize>> = OnceLock::new();
    let results: Mutex<Vec<(Vec<[u64; 4]>, [u64; 4])>> = Mutex::new(Vec::new());
    let stats = Stats {
        event_copies: AtomicUsize::new(0),
        winners: AtomicUsize::new(0),
        lane_f: AtomicUsize::new(0),
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
            let file_counter = &file_counter;
            let barrier = &barrier;
            let p1_sinks = &p1_sinks;
            let click_sinks = &click_sinks;
            let p2_sinks = &p2_sinks;
            let order = &order;
            let results = &results;
            let stats = &stats;
            let lap = &lap;
            let user_dir = &user_dir;
            let campaign_dir = &campaign_dir;
            let campaign_ids = &campaign_ids;
            let campaign_channels = &campaign_channels;
            let failure = &failure;
            let categories = &categories;
            scope.spawn(move || {
                let mut arena = Arena::new();
                let mut scratch = Scratch::new();
                let mut p1: Sink<EventRec> = Sink::new(1 << ctx.p1_bits, ctx.p1_block);
                let mut clicks: Sink<ClickRec> = Sink::new(1 << ctx.p2_bits, ctx.click_block);
                let mut copies = 0usize;
                let mut click_count = 0usize;
                loop {
                    let i = queue.fetch_add(1, Ordering::Relaxed);
                    let Some(&unit) = ctx.units.get(i) else { break };
                    match unit {
                        Unit::Links => {
                            let t0 = Instant::now();
                            let built = build_people(ctx.link_files, ctx.decoder);
                            let _ = people.set(built);
                            links_done.store(true, Ordering::Release);
                            eprintln!("links    {:>8.1} ms on one thread", t0.elapsed().as_secs_f64() * 1e3);
                        }
                        Unit::Events(file, s, e) => {
                            let chunk = line_range(file, s, e);
                            if !chunk.is_empty() {
                                copies += parse_events(ctx, chunk, &mut scratch, &mut arena, &mut p1);
                            }
                        }
                        Unit::Clicks(file, s, e) => {
                            let chunk = line_range(file, s, e);
                            while !links_done.load(Ordering::Acquire) {
                                std::thread::yield_now();
                            }
                            let people = people.get().unwrap();
                            if !chunk.is_empty() {
                                click_count += parse_clicks(ctx, people, chunk, &mut scratch, &mut arena, &mut clicks);
                            }
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
                let mut p2: Sink<PersonRec> = Sink::new(1 << ctx.p2_bits, ctx.p2_block);
                let mut buf: Vec<EventRec> = Vec::new();
                let mut table: Vec<(u64, u32)> = Vec::new();
                let mut winners = 0usize;
                let mut lane_f = 0usize;
                let unmaps = ctx.mapped.len();
                loop {
                    let q = dedup_queue.fetch_add(1, Ordering::Relaxed);
                    if q < unmaps {
                        let file = ctx.mapped[q];
                        unsafe { libc::munmap(file.as_ptr() as *mut libc::c_void, file.len()) };
                        continue;
                    }
                    let q = q - unmaps;
                    if q >= 1 << ctx.p1_bits {
                        break;
                    }
                    let (w, f) = dedup(ctx, people, &all_p1, q, &mut buf, &mut table, &mut arena, &mut p2);
                    winners += w;
                    lane_f += f;
                }
                stats.winners.fetch_add(winners, Ordering::Relaxed);
                stats.lane_f.fetch_add(lane_f, Ordering::Relaxed);
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
                let mut flushed = [0u64; 4];
                loop {
                    let i = person_queue.fetch_add(1, Ordering::Relaxed);
                    let Some(&p) = order.get(i) else { break };
                    worker.partition(ctx, people, &all_p2, &all_clicks, p);
                    if worker.rows.len() >= FLUSH_ROWS {
                        let file = file_counter.fetch_add(1, Ordering::Relaxed);
                        if let Err(e) = write::user_part(user_dir, file, &worker.rows, categories, ctx.first_day) {
                            *failure.lock().unwrap() = Some(e.to_string());
                        }
                        let t = worker.rows.totals();
                        for k in 0..4 {
                            flushed[k] += t[k];
                        }
                        worker.rows.clear();
                    }
                }
                let mut part = worker.finish();
                let cells = std::mem::take(&mut part.cells);
                let mut totals = part.totals();
                for k in 0..4 {
                    totals[k] += flushed[k];
                }
                let last = {
                    let mut all = results.lock().unwrap();
                    all.push((cells, totals));
                    all.len() == threads
                };
                if last {
                    let all = results.lock().unwrap();
                    let cells: Vec<&[[u64; 4]]> = all.iter().map(|(c, _)| c.as_slice()).collect();
                    match write::campaign_table(
                        campaign_dir,
                        &cells,
                        campaign_ids,
                        campaign_channels,
                        ORGANIC,
                        ctx.first_day,
                        ctx.days,
                    ) {
                        Ok(campaign_totals) => {
                            let mut users = [0u64; 4];
                            for (_, t) in all.iter() {
                                for k in 0..4 {
                                    users[k] += t[k];
                                }
                            }
                            write::report(users, campaign_totals);
                        }
                        Err(e) => *failure.lock().unwrap() = Some(e.to_string()),
                    }
                }
                if id == 0 || part.len() > 0 {
                    let file = file_counter.fetch_add(1, Ordering::Relaxed);
                    if let Err(e) = write::user_part(user_dir, file, &part, categories, ctx.first_day) {
                        *failure.lock().unwrap() = Some(e.to_string());
                    }
                }
                drop(part);
                if barrier.wait().is_leader() {
                    lap("people");
                }
            });
        }
    });
    if let Some(e) = failure.into_inner().unwrap() {
        return Err(e.into());
    }
    let winners = stats.winners.load(Ordering::Relaxed);
    let lane_f = stats.lane_f.load(Ordering::Relaxed);
    let lane_g_share = if winners == 0 { 0.0 } else { 100.0 * (winners - lane_f) as f64 / winners as f64 };
    eprintln!(
        "lane F winners {lane_f}, lane G share {lane_g_share:.2}%{}",
        if ctx.decoder.is_some() && lane_g_share > 10.0 { " (above 10%)" } else { "" }
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
    unsafe { libc::_exit(0) }
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

#[inline(always)]
unsafe fn user_k<K: Kernel>(decoder: Option<&ident::Decoder>, field: &[u8]) -> u64 {
    if let Some(d) = decoder {
        if let Some(tagged) = K::mixed(field.as_ptr(), field.len()).and_then(|x| d.lane_of_mixed(x)) {
            return tagged;
        }
    }
    intern_k::<K>(field)
}

#[inline(always)]
fn prefetch_user(people: &People, user: u64) {
    if user & ident::TAG != 0 {
        prefetch(people.info_ptr((user & ident::MASK) >> 9));
    } else {
        prefetch(people.slot_ptr(user));
    }
}

#[inline(always)]
fn resolve(people: &People, user: u64) -> u64 {
    if user & ident::TAG != 0 {
        let v = user & ident::MASK;
        let g = v >> 9;
        let word = people.info[g as usize];
        if word & 15 == ident::ODD {
            match people.decoder {
                Some(d) => people.name_of(d.packed_of(v)),
                None => unreachable!(),
            }
        } else {
            ident::FKEY | g << 4 | ident::rep(word, v & 511)
        }
    } else {
        people.name_of(user)
    }
}

struct LinkSets {
    pairs: Vec<(u64, u64)>,
    regular: Vec<u64>,
    odd: Vec<u64>,
}

fn build_people(files: &[&'static [u8]], decoder: Option<ident::Decoder>) -> People {
    let mut sets = LinkSets {
        pairs: Vec::new(),
        regular: Vec::new(),
        odd: decoder.map_or(Vec::new(), |d| vec![0u64; (d.gcap as usize).div_ceil(64)]),
    };
    let mut scratch = Scratch::new();
    let started = Instant::now();
    for &file in files {
        for (start, end) in csv::data_chunks(file, usize::MAX) {
            let body = &file[start..end];
            #[cfg(target_arch = "x86_64")]
            if scan::has_avx2() {
                unsafe { link_pairs_avx2(body, &mut scratch, &mut sets, decoder.as_ref()) };
                continue;
            }
            unsafe { link_pairs::<Scalar>(body, &mut scratch, &mut sets, decoder.as_ref()) };
        }
    }
    let LinkSets { mut pairs, regular, odd } = sets;
    let mut info: Vec<u64> = Vec::new();
    if let Some(d) = decoder {
        info = vec![0u64; d.gcap as usize];
        for &r in &regular {
            let g = (r >> 8) as usize;
            info[g] = ident::union(info[g], (r >> 4) & 15, r & 15);
        }
        for &r in &regular {
            let g = r >> 8;
            if odd[(g >> 6) as usize] >> (g & 63) & 1 == 1 {
                let base = g * 512;
                pairs.push((d.packed_of(base + ((r >> 4) & 15)), d.packed_of(base + (r & 15))));
            } else {
                info[g as usize] = ident::compress(info[g as usize]);
            }
        }
        for (w, &bits) in odd.iter().enumerate() {
            let mut bits = bits;
            while bits != 0 {
                let g = w * 64 + bits.trailing_zeros() as usize;
                info[g] = ident::ODD;
                bits &= bits - 1;
            }
        }
        eprintln!(
            "links    split and merged in {:.1} ms; lane F {} lines, general {} lines, odd persons {}",
            started.elapsed().as_secs_f64() * 1e3,
            regular.len(),
            pairs.len(),
            odd.iter().map(|b| b.count_ones() as usize).sum::<usize>()
        );
    }
    let mut people = People::build(&pairs);
    people.info = info;
    people.decoder = decoder;
    people
}

#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "avx2,bmi1,bmi2,popcnt")]
unsafe fn link_pairs_avx2(body: &[u8], scratch: &mut Scratch, sets: &mut LinkSets, decoder: Option<&ident::Decoder>) {
    link_pairs::<Avx2>(body, scratch, sets, decoder)
}

struct LinkLines<'a, K> {
    sets: &'a mut LinkSets,
    decoder: Option<&'a ident::Decoder>,
    kernel: std::marker::PhantomData<K>,
}

impl<K: Kernel> Lines<2> for LinkLines<'_, K> {
    #[inline(always)]
    fn line(&mut self, f: &[&[u8]; 2]) {
        if f[0].is_empty() || f[1].is_empty() {
            return;
        }
        unsafe {
            let Some(d) = self.decoder else {
                self.sets.pairs.push((intern_k::<K>(f[0]), intern_k::<K>(f[1])));
                return;
            };
            let va = K::mixed(f[0].as_ptr(), f[0].len()).map(|x| d.of_mixed(x));
            let vb = K::mixed(f[1].as_ptr(), f[1].len()).map(|x| d.of_mixed(x));
            if let (Some(a), Some(b)) = (va, vb) {
                if a >> 9 == b >> 9 && d.in_lane(a) && d.in_lane(b) {
                    self.sets.regular.push((a >> 9) << 8 | (a & 15) << 4 | (b & 15));
                    return;
                }
            }
            for v in [va, vb].into_iter().flatten() {
                let g = v >> 9;
                if g < d.gcap {
                    self.sets.odd[(g >> 6) as usize] |= 1 << (g & 63);
                }
            }
            self.sets.pairs.push((intern_k::<K>(f[0]), intern_k::<K>(f[1])));
        }
    }
}

#[inline(always)]
unsafe fn link_pairs<K: Kernel>(body: &[u8], scratch: &mut Scratch, sets: &mut LinkSets, decoder: Option<&ident::Decoder>) {
    let mut lines = LinkLines::<K> {
        sets,
        decoder,
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
                                rec.user = user_k::<K>(ctx.decoder.as_ref(), user);
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
            prefetch_user(self.people, rec.person);
        }
        for i in 0..self.pending {
            let mut rec = self.batch[i];
            rec.person = resolve(self.people, rec.person);
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
                person: user_k::<K>(ctx.decoder.as_ref(), user),
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
) -> (usize, usize) {
    buf.clear();
    for sink in sinks {
        for slice in sink.slices(q) {
            buf.extend_from_slice(slice);
        }
    }
    let piece = ctx.p2_block * std::mem::size_of::<PersonRec>();
    for sink in sinks {
        let bytes = sink.block_bytes();
        for block in sink.blocks(q) {
            arena.recycle(block, bytes, piece);
        }
    }
    let n = buf.len();
    if n == 0 {
        return (0, 0);
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
    let mut lane_f = 0usize;
    let bits = ctx.p2_bits;
    let flush = |pending: &[(u64, u32, u32)], out: &mut Sink<PersonRec>, arena: &mut Arena| {
        for &(user, _, _) in pending {
            prefetch_user(people, user);
        }
        let mut fkeys = 0usize;
        for &(user, ts, payload) in pending {
            let person = resolve(people, user);
            fkeys += (person & ident::FKEY != 0) as usize;
            out.push(arena, part_of(person, H2, bits), PersonRec { person, ts, payload });
        }
        fkeys
    };
    for rec in buf.iter() {
        if rec.event != 0 && rec.ts != INVALID {
            pending[count] = (rec.user, rec.ts, rec.payload);
            count += 1;
            winners += 1;
            if count == BATCH {
                lane_f += flush(&pending, out, arena);
                count = 0;
            }
        }
    }
    lane_f += flush(&pending[..count], out, arena);
    (winners, lane_f)
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

    fn partition(&mut self, ctx: &Ctx, people: &People, events: &[&Sink<PersonRec>], clicks: &[&Sink<ClickRec>], p: usize) {
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
            let key = self.persons[id];
            let name = match people.decoder {
                Some(d) if key & ident::FKEY != 0 => ident::person_name(&d, &people.info, key),
                _ => key,
            };
            self.person(name, er, cr);
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
