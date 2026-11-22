use std::marker::PhantomData;
use std::sync::atomic::{AtomicBool, AtomicU32, AtomicUsize, Ordering};
use std::sync::{Barrier, Mutex, OnceLock};
use std::time::Instant;

use super::*;

pub const S_MAX: u64 = (1 << 21) - 1;
const K_VALID: u64 = 1;
const K_SIDE: u64 = 2;
const CAMPAIGN_BITS: u32 = 28;
const CAMPAIGN_MASK: u32 = (1 << CAMPAIGN_BITS) - 1;
const EXTRA: u32 = 1 << 31;
const INDEX_BITS: u32 = 40;

pub struct Lane2 {
    pub key: u64,
    pub ncap: u64,
    pub bits: u32,
    pub buckets: usize,
    pub base: i64,
    pub thresh: i64,
    pub cb: u32,
    pub click_parts: usize,
}

#[derive(Clone, Copy, Default)]
#[repr(C)]
pub struct FRec {
    lo: u64,
    hi: u64,
}

#[derive(Clone, Copy)]
pub struct SideRec {
    ingest: i64,
    user: u64,
    ts: u32,
    payload: u32,
}

#[derive(Clone, Copy, Default)]
#[repr(C)]
pub struct FW {
    ga: u32,
    ts: u32,
    payload: u32,
}

#[derive(Clone, Copy)]
struct Run {
    g: u32,
    start: u32,
    end: u32,
}

#[derive(Clone, Copy, Default)]
struct CRec {
    ts: u32,
    campaign: u32,
    click: u64,
}

#[derive(Clone, Copy)]
struct Entry {
    g: u32,
    src: u32,
    start: u32,
    end: u32,
}

struct BucketOut {
    w: Vec<FW>,
    runs: Vec<Run>,
}

struct ClickPart {
    data: Vec<CRec>,
    offsets: Vec<u32>,
}

#[inline(always)]
fn multi(count: u32) -> bool {
    count > 1
}

pub(super) fn choose(
    event_files: &[&'static [u8]],
    decoder: &ident::Decoder,
    calendar: &Calendar,
    window: (i64, i64, i64),
    event_bytes: usize,
    campaigns: u32,
) -> Option<Lane2> {
    let (ws, we, cws) = window;
    if std::env::var("SESSIONS_F2").is_ok_and(|v| v == "0") {
        eprintln!("buckets off: SESSIONS_F2=0");
        return None;
    }
    let base = cws;
    let thresh = base + (S_MAX as i64) * 1000;
    if decoder.gcap > 1 << 26
        || we.saturating_add(DAY_MS) > thresh
        || we - cws >= 1 << 31
        || u64::from(campaigns) >= 1 << CAMPAIGN_BITS
    {
        eprintln!("buckets off: layout guard");
        return None;
    }
    let bits = env_u64("SESSIONS_TEST_BUCKET_BITS").map_or(15, |b| b.clamp(6, 15) as u32);
    let slots = 1u64 << bits;
    let ncap = env_u64("SESSIONS_TEST_NCAP")
        .unwrap_or((event_bytes / 30 + 65536) as u64)
        .clamp(1, 1 << 36)
        .div_ceil(slots)
        * slots;
    let started = Instant::now();
    let key = match env_u64("SESSIONS_TEST_EVENT_KEY") {
        Some(key) => Ok(key & ident::MASK),
        None => ident::recover_events(event_files, decoder, calendar, (ws, we), ncap),
    };
    match key {
        Ok(key) => {
            eprintln!(
                "buckets on: event key {key:#012x}, number cap {ncap}, {} slots, {:.1} ms",
                slots,
                started.elapsed().as_secs_f64() * 1e3
            );
            Some(Lane2 {
                key,
                ncap,
                bits,
                buckets: (ncap / slots) as usize,
                base,
                thresh,
                cb: 10,
                click_parts: (decoder.gcap as usize).div_ceil(1 << 10),
            })
        }
        Err(reason) => {
            eprintln!("buckets off: {reason}");
            None
        }
    }
}

impl Lane2 {
    #[inline(always)]
    fn record(&self, slot: u64, ingest: Option<i64>, valid: Option<(u64, u32, u32)>, side: &mut Vec<SideRec>, thread: u64) -> FRec {
        match ingest {
            Some(i) => {
                let d = i.wrapping_sub(self.base);
                if i >= self.base && d % 1000 == 0 {
                    let s = ((d / 1000) as u64).min(S_MAX);
                    match valid {
                        None => return FRec { lo: slot | s << 15, hi: 0 },
                        Some((user, ts, payload)) => {
                            if user & ident::TAG != 0 && s < S_MAX && payload >> 29 == 0 {
                                let v = user & ident::MASK;
                                return FRec {
                                    lo: slot | s << 15 | K_VALID << 36 | (v >> 9) << 38,
                                    hi: u64::from(ts) | (v & 15) << 31 | u64::from(payload) << 35,
                                };
                            }
                        }
                    }
                }
            }
            None => {
                if valid.is_none() {
                    return FRec { lo: slot | S_MAX << 15, hi: 0 };
                }
            }
        }
        let (user, ts, payload) = valid.unwrap_or((0, INVALID, 0));
        let index = side.len() as u64;
        side.push(SideRec {
            ingest: ingest.unwrap_or(i64::MAX),
            user,
            ts,
            payload,
        });
        FRec {
            lo: slot | K_SIDE << 36,
            hi: thread << INDEX_BITS | index,
        }
    }

    #[inline(always)]
    fn value(&self, rec: &FRec, sides: &[&[SideRec]]) -> i64 {
        if (rec.lo >> 36) & 3 == K_SIDE {
            let s = &sides[(rec.hi >> INDEX_BITS) as usize][(rec.hi & ((1 << INDEX_BITS) - 1)) as usize];
            s.ingest.min(self.thresh)
        } else {
            self.base + (((rec.lo >> 15) & S_MAX) as i64) * 1000
        }
    }

    #[inline(always)]
    fn better(&self, new: &FRec, old: &FRec, sides: &[&[SideRec]]) -> bool {
        if ((new.lo | old.lo) >> 37) & 1 == 0 {
            (new.lo >> 15) & S_MAX < (old.lo >> 15) & S_MAX
        } else {
            self.value(new, sides) < self.value(old, sides)
        }
    }
}

struct EventLinesF<'a, K> {
    ctx: &'a Ctx<'a>,
    f2: &'a Lane2,
    arena: &'a mut Arena,
    buckets: &'a mut Sink<FRec>,
    p1: &'a mut Sink<EventRec>,
    side: &'a mut Vec<SideRec>,
    thread: u64,
    copies: usize,
    kernel: PhantomData<K>,
}

impl<K: Kernel> Lines<7> for EventLinesF<'_, K> {
    #[inline(always)]
    fn line(&mut self, f: &[&[u8]; 7]) {
        let ctx = self.ctx;
        let event_id = f[0];
        if event_id.is_empty() {
            return;
        }
        self.copies += 1;
        unsafe {
            let f2 = self.f2;
            let number = K::mixed_e(event_id.as_ptr(), event_id.len())
                .map(|x| ident::unscramble(x, f2.key))
                .filter(|&n| n < f2.ncap);
            let ingest = ctx.calendar.parse(f[3]);
            let mut valid: Option<(u64, u32, u32)> = None;
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
                                valid = Some((
                                    user_k::<K>(ctx.decoder.as_ref(), user),
                                    (t - ctx.cws) as u32,
                                    price | category << 24,
                                ));
                            }
                        }
                    }
                }
            }
            match number {
                Some(n) => {
                    let slot = n & ((1 << f2.bits) - 1);
                    let rec = f2.record(slot, ingest, valid, self.side, self.thread);
                    self.buckets.push(self.arena, (n >> f2.bits) as usize, rec);
                }
                None => {
                    let event = intern_k::<K>(event_id);
                    let (user, ts, payload) = valid.unwrap_or((0, INVALID, 0));
                    let rec = EventRec {
                        event,
                        user,
                        ingest: ingest.unwrap_or(i64::MAX),
                        ts,
                        payload,
                    };
                    self.p1.push(self.arena, part_of(event, H1, ctx.p1_bits), rec);
                }
            }
        }
    }
}

#[allow(clippy::too_many_arguments)]
fn parse_events_f2(
    ctx: &Ctx,
    f2: &Lane2,
    chunk: &[u8],
    arena: &mut Arena,
    buckets: &mut Sink<FRec>,
    p1: &mut Sink<EventRec>,
    side: &mut Vec<SideRec>,
    thread: u64,
) -> usize {
    #[cfg(target_arch = "x86_64")]
    if scan::has_avx2() {
        return unsafe { parse_events_f2_avx2(ctx, f2, chunk, arena, buckets, p1, side, thread) };
    }
    unsafe { parse_events_f2_k::<Scalar>(ctx, f2, chunk, arena, buckets, p1, side, thread) }
}

#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "avx2,bmi1,bmi2,popcnt")]
#[allow(clippy::too_many_arguments)]
unsafe fn parse_events_f2_avx2(
    ctx: &Ctx,
    f2: &Lane2,
    chunk: &[u8],
    arena: &mut Arena,
    buckets: &mut Sink<FRec>,
    p1: &mut Sink<EventRec>,
    side: &mut Vec<SideRec>,
    thread: u64,
) -> usize {
    parse_events_f2_k::<Avx2>(ctx, f2, chunk, arena, buckets, p1, side, thread)
}

#[inline(always)]
#[allow(clippy::too_many_arguments)]
unsafe fn parse_events_f2_k<K: Kernel>(
    ctx: &Ctx,
    f2: &Lane2,
    chunk: &[u8],
    arena: &mut Arena,
    buckets: &mut Sink<FRec>,
    p1: &mut Sink<EventRec>,
    side: &mut Vec<SideRec>,
    thread: u64,
) -> usize {
    let mut lines = EventLinesF::<K> {
        ctx,
        f2,
        arena,
        buckets,
        p1,
        side,
        thread,
        copies: 0,
        kernel: PhantomData,
    };
    scan::fused::<7, 3, K, _>(chunk, &mut lines);
    lines.copies
}

struct ClickLinesF<'a, K> {
    ctx: &'a Ctx<'a>,
    f2: &'a Lane2,
    people: &'a People,
    arena: &'a mut Arena,
    fclicks: &'a mut Sink<ClickRec>,
    gclicks: &'a mut Sink<ClickRec>,
    total: usize,
    kernel: PhantomData<K>,
}

impl<K: Kernel> Lines<4> for ClickLinesF<'_, K> {
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
            let person = user_k::<K>(ctx.decoder.as_ref(), user);
            let click = intern_k::<K>(click_id);
            let ts = (t - ctx.cws) as u32;
            self.total += 1;
            if person & ident::TAG != 0 {
                let v = person & ident::MASK;
                let g = v >> 9;
                self.fclicks.push(
                    self.arena,
                    (g >> self.f2.cb) as usize,
                    ClickRec {
                        person: g << 4 | (v & 15),
                        click,
                        ts,
                        campaign,
                    },
                );
            } else {
                let person = self.people.name_of(person);
                self.gclicks.push(
                    self.arena,
                    part_of(person, H2, ctx.p2_bits),
                    ClickRec {
                        person,
                        click,
                        ts,
                        campaign,
                    },
                );
            }
        }
    }
}

#[allow(clippy::too_many_arguments)]
fn parse_clicks_f2(
    ctx: &Ctx,
    f2: &Lane2,
    people: &People,
    chunk: &[u8],
    arena: &mut Arena,
    fclicks: &mut Sink<ClickRec>,
    gclicks: &mut Sink<ClickRec>,
) -> usize {
    #[cfg(target_arch = "x86_64")]
    if scan::has_avx2() {
        return unsafe { parse_clicks_f2_avx2(ctx, f2, people, chunk, arena, fclicks, gclicks) };
    }
    unsafe { parse_clicks_f2_k::<Scalar>(ctx, f2, people, chunk, arena, fclicks, gclicks) }
}

#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "avx2,bmi1,bmi2,popcnt")]
#[allow(clippy::too_many_arguments)]
unsafe fn parse_clicks_f2_avx2(
    ctx: &Ctx,
    f2: &Lane2,
    people: &People,
    chunk: &[u8],
    arena: &mut Arena,
    fclicks: &mut Sink<ClickRec>,
    gclicks: &mut Sink<ClickRec>,
) -> usize {
    parse_clicks_f2_k::<Avx2>(ctx, f2, people, chunk, arena, fclicks, gclicks)
}

#[inline(always)]
#[allow(clippy::too_many_arguments)]
unsafe fn parse_clicks_f2_k<K: Kernel>(
    ctx: &Ctx,
    f2: &Lane2,
    people: &People,
    chunk: &[u8],
    arena: &mut Arena,
    fclicks: &mut Sink<ClickRec>,
    gclicks: &mut Sink<ClickRec>,
) -> usize {
    let mut lines = ClickLinesF::<K> {
        ctx,
        f2,
        people,
        arena,
        fclicks,
        gclicks,
        total: 0,
        kernel: PhantomData,
    };
    scan::fused::<4, 4, K, _>(chunk, &mut lines);
    lines.total
}

#[allow(clippy::too_many_arguments)]
fn pass1_bucket(
    ctx: &Ctx,
    f2: &Lane2,
    people: &People,
    sinks: &[&Sink<FRec>],
    sides: &[&[SideRec]],
    b: usize,
    table: &mut Vec<FRec>,
    occ: &mut Vec<u64>,
    arena: &mut Arena,
    out: &mut Sink<PersonRec>,
    counts: &[AtomicU32],
    tally: &mut [usize; 2],
) -> BucketOut {
    let slots = 1usize << f2.bits;
    let mask = (slots - 1) as u64;
    occ.clear();
    occ.resize(slots / 64, 0);
    if table.len() < slots {
        table.resize(slots, FRec::default());
    }
    let mut copies = 0usize;
    for sink in sinks {
        for slice in sink.slices(b) {
            copies += slice.len();
            for rec in slice {
                let s = (rec.lo & mask) as usize;
                unsafe {
                    let word = occ.get_unchecked_mut(s >> 6);
                    let bit = 1u64 << (s & 63);
                    let entry = table.get_unchecked_mut(s);
                    if *word & bit == 0 {
                        *word |= bit;
                        *entry = *rec;
                    } else if f2.better(rec, entry, sides) {
                        *entry = *rec;
                    }
                }
            }
        }
    }
    let piece = ctx.p2_block * std::mem::size_of::<PersonRec>();
    for sink in sinks {
        let bytes = sink.block_bytes();
        for block in sink.blocks(b) {
            arena.recycle(block, bytes, piece);
        }
    }
    let mut w: Vec<FW> = Vec::with_capacity(copies);
    let mut runs: Vec<Run> = Vec::new();
    if copies == 0 {
        return BucketOut { w, runs };
    }
    let decoder = people.decoder.unwrap();
    let info = &people.info;
    let bits = ctx.p2_bits;
    let mut run_g = u32::MAX;
    let mut run_start = 0u32;
    let mut winners = 0usize;
    for (wi, &word) in occ.iter().enumerate() {
        let mut set = word;
        while set != 0 {
            let s = wi * 64 + set.trailing_zeros() as usize;
            set &= set - 1;
            let rec = unsafe { *table.get_unchecked(s) };
            let kind = (rec.lo >> 36) & 3;
            let (v, ts, payload) = if kind == K_VALID {
                (
                    (rec.lo >> 38) << 9 | (rec.hi >> 31) & 15,
                    (rec.hi & 0x7fff_ffff) as u32,
                    (rec.hi >> 35) as u32,
                )
            } else if kind == K_SIDE {
                let side = &sides[(rec.hi >> INDEX_BITS) as usize][(rec.hi & ((1 << INDEX_BITS) - 1)) as usize];
                if side.ts == INVALID {
                    continue;
                }
                if side.user & ident::TAG == 0 {
                    winners += 1;
                    let person = people.name_of(side.user);
                    out.push(arena, part_of(person, H2, bits), PersonRec {
                        person,
                        ts: side.ts,
                        payload: side.payload,
                    });
                    continue;
                }
                (side.user & ident::MASK, side.ts, side.payload)
            } else {
                continue;
            };
            winners += 1;
            let g = v >> 9;
            if unsafe { *info.get_unchecked(g as usize) } & 15 == ident::ODD {
                let person = people.name_of(decoder.packed_of(v));
                out.push(arena, part_of(person, H2, bits), PersonRec { person, ts, payload });
                continue;
            }
            let g = g as u32;
            if g != run_g {
                if run_g != u32::MAX {
                    runs.push(Run {
                        g: run_g,
                        start: run_start,
                        end: w.len() as u32,
                    });
                    counts[run_g as usize].fetch_add(1, Ordering::Relaxed);
                }
                run_g = g;
                run_start = w.len() as u32;
            }
            w.push(FW {
                ga: g << 4 | (v & 15) as u32,
                ts,
                payload,
            });
        }
    }
    if run_g != u32::MAX {
        runs.push(Run {
            g: run_g,
            start: run_start,
            end: w.len() as u32,
        });
        counts[run_g as usize].fetch_add(1, Ordering::Relaxed);
    }
    tally[0] += winners;
    tally[1] += w.len();
    BucketOut { w, runs }
}

#[allow(clippy::too_many_arguments)]
fn pass1_general(
    ctx: &Ctx,
    people: &People,
    sinks: &[&Sink<EventRec>],
    q: usize,
    buf: &mut Vec<EventRec>,
    table: &mut Vec<(u64, u32)>,
    arena: &mut Arena,
    out: &mut Sink<PersonRec>,
    extras: &mut Vec<FW>,
    counts: &[AtomicU32],
    tally: &mut [usize; 2],
) {
    buf.clear();
    for sink in sinks {
        for slice in sink.slices(q) {
            buf.extend_from_slice(slice);
        }
    }
    let n = buf.len();
    if n == 0 {
        return;
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
            let entry = &mut table[slot];
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
    let decoder = people.decoder.unwrap();
    let bits = ctx.p2_bits;
    for rec in buf.iter() {
        if rec.event == 0 || rec.ts == INVALID {
            continue;
        }
        tally[0] += 1;
        let person = if rec.user & ident::TAG != 0 {
            let v = rec.user & ident::MASK;
            let g = v >> 9;
            if people.info[g as usize] & 15 != ident::ODD {
                tally[1] += 1;
                extras.push(FW {
                    ga: (g as u32) << 4 | (v & 15) as u32,
                    ts: rec.ts,
                    payload: rec.payload,
                });
                counts[g as usize].fetch_or(EXTRA, Ordering::Relaxed);
                continue;
            }
            people.name_of(decoder.packed_of(v))
        } else {
            people.name_of(rec.user)
        };
        out.push(arena, part_of(person, H2, bits), PersonRec {
            person,
            ts: rec.ts,
            payload: rec.payload,
        });
    }
}

#[allow(clippy::too_many_arguments)]
fn click_part(
    ctx: &Ctx,
    f2: &Lane2,
    people: &People,
    sinks: &[&Sink<ClickRec>],
    c: usize,
    arena: &mut Arena,
    late: &mut Sink<ClickRec>,
    buf: &mut Vec<ClickRec>,
) -> ClickPart {
    buf.clear();
    for sink in sinks {
        for slice in sink.slices(c) {
            buf.extend_from_slice(slice);
        }
    }
    let width = 1usize << f2.cb;
    let first = (c << f2.cb) as u64;
    let mut offsets = vec![0u32; width + 1];
    if buf.is_empty() {
        return ClickPart { data: Vec::new(), offsets };
    }
    for rec in buf.iter() {
        offsets[((rec.person >> 4) - first) as usize + 1] += 1;
    }
    for i in 0..width {
        offsets[i + 1] += offsets[i];
    }
    let mut next: Vec<u32> = offsets[..width].to_vec();
    let mut data = vec![CRec::default(); buf.len()];
    for rec in buf.iter() {
        let at = &mut next[((rec.person >> 4) - first) as usize];
        data[*at as usize] = CRec {
            ts: rec.ts,
            campaign: rec.campaign | ((rec.person & 15) as u32) << CAMPAIGN_BITS,
            click: rec.click,
        };
        *at += 1;
    }
    let decoder = people.decoder.unwrap();
    let bits = ctx.p2_bits;
    let mut kept = 0usize;
    let mut packed = vec![0u32; width + 1];
    for i in 0..width {
        let (s, e) = (offsets[i] as usize, offsets[i + 1] as usize);
        packed[i] = kept as u32;
        if s == e {
            continue;
        }
        let g = first + i as u64;
        if people.info[g as usize] & 15 == ident::ODD {
            for k in s..e {
                let r = data[k];
                let v = g << 9 | u64::from(r.campaign >> CAMPAIGN_BITS);
                let person = people.name_of(decoder.packed_of(v));
                late.push(arena, part_of(person, H2, bits), ClickRec {
                    person,
                    click: r.click,
                    ts: r.ts,
                    campaign: r.campaign & CAMPAIGN_MASK,
                });
            }
            continue;
        }
        if kept != s {
            data.copy_within(s..e, kept);
        }
        let slice = &mut data[kept..kept + (e - s)];
        if slice.len() > 1 {
            slice.sort_unstable_by(|a, b| a.ts.cmp(&b.ts).then_with(|| keys::cmp(b.click, a.click)));
        }
        kept += e - s;
    }
    packed[width] = kept as u32;
    data.truncate(kept);
    ClickPart { data, offsets: packed }
}

impl Worker {
    fn f_group(&mut self, decoder: &ident::Decoder, info: &[u64], g: u64, slices: &[&[FW]], clicks: &[CRec]) {
        let word = info[g as usize];
        let mut present = 0u32;
        for slice in slices {
            for e in slice.iter() {
                present |= 1 << ident::rep(word, u64::from(e.ga & 15));
            }
        }
        let single = present.count_ones() == 1;
        while present != 0 {
            let r = u64::from(present.trailing_zeros());
            present &= present - 1;
            self.sorted.clear();
            let mut ordered = true;
            let mut last = 0u32;
            for slice in slices {
                for e in slice.iter() {
                    if single || ident::rep(word, u64::from(e.ga & 15)) == r {
                        ordered &= e.ts >= last;
                        last = e.ts;
                        self.sorted.push(u64::from(e.ts) << 32 | u64::from(e.payload));
                    }
                }
            }
            if !ordered {
                self.sorted.sort_unstable();
            }
            self.local_clicks.clear();
            for c in clicks {
                if ident::rep(word, u64::from(c.campaign >> CAMPAIGN_BITS)) == r {
                    self.local_clicks.push(LocalClick {
                        ts: c.ts,
                        campaign: c.campaign & CAMPAIGN_MASK,
                        click: c.click,
                    });
                }
            }
            let name = ident::person_name(decoder, info, ident::FKEY | g << 4 | r);
            let n = self.sorted.len();
            let m = self.local_clicks.len();
            self.person(name, 0..n, 0..m);
        }
    }
}

struct Shared {
    people: OnceLock<People>,
    links_done: AtomicBool,
    parse_queue: AtomicUsize,
    pass1_queue: AtomicUsize,
    multi_queue: AtomicUsize,
    final_queue: AtomicUsize,
    file_counter: AtomicUsize,
    barrier: Barrier,
    bucket_sinks: Vec<OnceLock<Sink<FRec>>>,
    p1_sinks: Vec<OnceLock<Sink<EventRec>>>,
    fclick_sinks: Vec<OnceLock<Sink<ClickRec>>>,
    gclick_sinks: Vec<OnceLock<Sink<ClickRec>>>,
    sides: Vec<OnceLock<Vec<SideRec>>>,
    p2_sinks: Vec<OnceLock<Sink<PersonRec>>>,
    late_sinks: Vec<OnceLock<Sink<ClickRec>>>,
    extras: Vec<OnceLock<Vec<FW>>>,
    outs: Vec<OnceLock<BucketOut>>,
    click_parts: Vec<OnceLock<ClickPart>>,
    counts: Vec<AtomicU32>,
    entries: Mutex<Vec<Entry>>,
    plan: OnceLock<(Vec<Entry>, Vec<(usize, usize)>, Vec<usize>)>,
    results: Mutex<Vec<(Vec<[u64; 4]>, [u64; 4])>>,
    failure: Mutex<Option<String>>,
    tallies: Mutex<[usize; 6]>,
}

fn clicks_of(parts: &[OnceLock<ClickPart>], cb: u32, g: u64) -> &[CRec] {
    let c = (g >> cb) as usize;
    let part = parts[c].get().unwrap();
    let i = (g - ((c as u64) << cb)) as usize;
    &part.data[part.offsets[i] as usize..part.offsets[i + 1] as usize]
}

fn zeroed_counts(n: usize) -> Vec<AtomicU32> {
    let mut v = std::mem::ManuallyDrop::new(vec![0u32; n]);
    unsafe { Vec::from_raw_parts(v.as_mut_ptr() as *mut AtomicU32, v.len(), v.capacity()) }
}

#[allow(clippy::too_many_arguments)]
pub(super) fn run_f2(
    config: &Config,
    ctx: &Ctx,
    f2: &Lane2,
    categories: &[&'static [u8]],
    campaign_ids: &[&'static [u8]],
    campaign_channels: &[&'static [u8]],
    started: Instant,
    est_events: usize,
    click_bytes: usize,
) -> Result<Outcome> {
    let lap = |name: &str| eprintln!("{name:<8} {:>8.1} ms", started.elapsed().as_secs_f64() * 1e3);
    let threads = config.threads.max(1);
    let decoder = ctx.decoder.unwrap();
    let gcap = decoder.gcap as usize;
    let shared = Shared {
        people: OnceLock::new(),
        links_done: AtomicBool::new(false),
        parse_queue: AtomicUsize::new(0),
        pass1_queue: AtomicUsize::new(0),
        multi_queue: AtomicUsize::new(0),
        final_queue: AtomicUsize::new(0),
        file_counter: AtomicUsize::new(0),
        barrier: Barrier::new(threads),
        bucket_sinks: (0..threads).map(|_| OnceLock::new()).collect(),
        p1_sinks: (0..threads).map(|_| OnceLock::new()).collect(),
        fclick_sinks: (0..threads).map(|_| OnceLock::new()).collect(),
        gclick_sinks: (0..threads).map(|_| OnceLock::new()).collect(),
        sides: (0..threads).map(|_| OnceLock::new()).collect(),
        p2_sinks: (0..threads).map(|_| OnceLock::new()).collect(),
        late_sinks: (0..threads).map(|_| OnceLock::new()).collect(),
        extras: (0..threads).map(|_| OnceLock::new()).collect(),
        outs: (0..f2.buckets).map(|_| OnceLock::new()).collect(),
        click_parts: (0..f2.click_parts).map(|_| OnceLock::new()).collect(),
        counts: zeroed_counts(gcap),
        entries: Mutex::new(Vec::new()),
        plan: OnceLock::new(),
        results: Mutex::new(Vec::new()),
        failure: Mutex::new(None),
        tallies: Mutex::new([0; 6]),
    };
    let user_dir = config.output_dir.join("user_daily");
    let campaign_dir = config.output_dir.join("campaign_daily");
    crate::output::create_table_dir(config.output_dir, "user_daily")?;
    crate::output::create_table_dir(config.output_dir, "campaign_daily")?;
    let used_buckets = (est_events >> f2.bits).max(1);
    let bucket_block = block_for(est_events, used_buckets, threads, 64);
    let used_parts = (est_events / 30 / (1 << f2.cb)).max(1);
    let fclick_block = block_for(click_bytes / 47, used_parts, threads, 32);
    lap("plan");

    std::thread::scope(|scope| {
        for id in 0..threads {
            let shared = &shared;
            let lap = &lap;
            let user_dir = &user_dir;
            let campaign_dir = &campaign_dir;
            scope.spawn(move || {
                warm_heap();
                let mut arena = Arena::new();
                let mut buckets: Sink<FRec> = Sink::new(f2.buckets, bucket_block);
                let mut p1: Sink<EventRec> = Sink::new(1 << ctx.p1_bits, ctx.p1_block);
                let mut fclicks: Sink<ClickRec> = Sink::new(f2.click_parts, fclick_block);
                let mut gclicks: Sink<ClickRec> = Sink::new(1 << ctx.p2_bits, ctx.click_block);
                let mut side: Vec<SideRec> = Vec::new();
                let mut copies = 0usize;
                let mut click_count = 0usize;
                loop {
                    let i = shared.parse_queue.fetch_add(1, Ordering::Relaxed);
                    let Some(&unit) = ctx.units.get(i) else { break };
                    match unit {
                        Unit::Links => {
                            let t0 = Instant::now();
                            let built = build_people(ctx.link_files, ctx.decoder);
                            let _ = shared.people.set(built);
                            shared.links_done.store(true, Ordering::Release);
                            eprintln!("links    {:>8.1} ms on one thread", t0.elapsed().as_secs_f64() * 1e3);
                        }
                        Unit::Events(file, s, e) => {
                            let chunk = line_range(file, s, e);
                            if !chunk.is_empty() {
                                copies += parse_events_f2(
                                    ctx,
                                    f2,
                                    chunk,
                                    &mut arena,
                                    &mut buckets,
                                    &mut p1,
                                    &mut side,
                                    id as u64,
                                );
                            }
                        }
                        Unit::Clicks(file, s, e) => {
                            let chunk = line_range(file, s, e);
                            while !shared.links_done.load(Ordering::Acquire) {
                                std::thread::yield_now();
                            }
                            let people = shared.people.get().unwrap();
                            if !chunk.is_empty() {
                                click_count += parse_clicks_f2(
                                    ctx,
                                    f2,
                                    people,
                                    chunk,
                                    &mut arena,
                                    &mut fclicks,
                                    &mut gclicks,
                                );
                            }
                        }
                    }
                }
                buckets.finish(&mut arena);
                p1.finish(&mut arena);
                fclicks.finish(&mut arena);
                gclicks.finish(&mut arena);
                {
                    let mut t = shared.tallies.lock().unwrap();
                    t[0] += copies;
                    t[1] += click_count;
                    t[4] += side.len();
                }
                let _ = shared.bucket_sinks[id].set(buckets);
                let _ = shared.p1_sinks[id].set(p1);
                let _ = shared.fclick_sinks[id].set(fclicks);
                let _ = shared.gclick_sinks[id].set(gclicks);
                let _ = shared.sides[id].set(side);
                if shared.barrier.wait().is_leader() {
                    lap("parse");
                }

                let people = shared.people.get().unwrap();
                let all_buckets: Vec<&Sink<FRec>> = shared.bucket_sinks.iter().map(|s| s.get().unwrap()).collect();
                let all_p1: Vec<&Sink<EventRec>> = shared.p1_sinks.iter().map(|s| s.get().unwrap()).collect();
                let all_fclicks: Vec<&Sink<ClickRec>> = shared.fclick_sinks.iter().map(|s| s.get().unwrap()).collect();
                let sides: Vec<&[SideRec]> = shared.sides.iter().map(|s| s.get().unwrap().as_slice()).collect();
                let mut p2: Sink<PersonRec> = Sink::new(1 << ctx.p2_bits, ctx.p2_block);
                let mut late: Sink<ClickRec> = Sink::new(1 << ctx.p2_bits, ctx.click_block);
                let mut extras: Vec<FW> = Vec::new();
                let mut table: Vec<FRec> = Vec::new();
                let mut occ: Vec<u64> = Vec::new();
                let mut buf: Vec<EventRec> = Vec::new();
                let mut htable: Vec<(u64, u32)> = Vec::new();
                let mut cbuf: Vec<ClickRec> = Vec::new();
                let mut tally = [0usize; 2];
                let unmaps = ctx.mapped.len();
                let parts = f2.click_parts;
                let nb = f2.buckets;
                let general = 1usize << ctx.p1_bits;
                loop {
                    let q = shared.pass1_queue.fetch_add(1, Ordering::Relaxed);
                    if q < unmaps {
                        let file = ctx.mapped[q];
                        unsafe { libc::munmap(file.as_ptr() as *mut libc::c_void, file.len()) };
                        continue;
                    }
                    let q = q - unmaps;
                    if q < parts {
                        let part = click_part(ctx, f2, people, &all_fclicks, q, &mut arena, &mut late, &mut cbuf);
                        let _ = shared.click_parts[q].set(part);
                    } else if q < parts + nb {
                        let b = q - parts;
                        let out = pass1_bucket(
                            ctx,
                            f2,
                            people,
                            &all_buckets,
                            &sides,
                            b,
                            &mut table,
                            &mut occ,
                            &mut arena,
                            &mut p2,
                            &shared.counts,
                            &mut tally,
                        );
                        let _ = shared.outs[b].set(out);
                    } else if q < parts + nb + general {
                        pass1_general(
                            ctx,
                            people,
                            &all_p1,
                            q - parts - nb,
                            &mut buf,
                            &mut htable,
                            &mut arena,
                            &mut p2,
                            &mut extras,
                            &shared.counts,
                            &mut tally,
                        );
                    } else {
                        break;
                    }
                }
                drop(table);
                drop(buf);
                drop(htable);
                drop(cbuf);
                p2.finish(&mut arena);
                late.finish(&mut arena);
                {
                    let mut t = shared.tallies.lock().unwrap();
                    t[2] += tally[0];
                    t[3] += tally[1];
                    t[5] += extras.len();
                }
                let _ = shared.p2_sinks[id].set(p2);
                let _ = shared.late_sinks[id].set(late);
                let _ = shared.extras[id].set(extras);
                if shared.barrier.wait().is_leader() {
                    lap("pass 1");
                }

                let mut mine: Vec<Entry> = Vec::new();
                loop {
                    let b = shared.multi_queue.fetch_add(1, Ordering::Relaxed);
                    if b >= nb {
                        break;
                    }
                    let out = shared.outs[b].get().unwrap();
                    for run in &out.runs {
                        if multi(shared.counts[run.g as usize].load(Ordering::Relaxed)) {
                            mine.push(Entry {
                                g: run.g,
                                src: b as u32,
                                start: run.start,
                                end: run.end,
                            });
                        }
                    }
                }
                for (i, e) in shared.extras[id].get().unwrap().iter().enumerate() {
                    mine.push(Entry {
                        g: e.ga >> 4,
                        src: (nb + id) as u32,
                        start: i as u32,
                        end: i as u32 + 1,
                    });
                }
                shared.entries.lock().unwrap().extend(mine);
                if shared.barrier.wait().is_leader() {
                    let mut entries = std::mem::take(&mut *shared.entries.lock().unwrap());
                    entries.sort_unstable_by_key(|e| (e.g, e.src, e.start));
                    let mut units: Vec<(usize, usize, usize)> = Vec::new();
                    let mut i = 0;
                    while i < entries.len() {
                        let mut j = i;
                        let mut size = 0usize;
                        while j < entries.len() && entries[j].g == entries[i].g {
                            size += (entries[j].end - entries[j].start) as usize;
                            j += 1;
                        }
                        units.push((size, i, j));
                        i = j;
                    }
                    units.sort_unstable_by(|a, b| b.cmp(a));
                    let all_p2: Vec<&Sink<PersonRec>> = shared.p2_sinks.iter().map(|s| s.get().unwrap()).collect();
                    let mut sizes: Vec<(usize, usize)> = (0..1usize << ctx.p2_bits)
                        .map(|p| {
                            let n: usize = all_p2.iter().map(|s| s.len(p)).sum::<usize>();
                            (n, p)
                        })
                        .filter(|&(n, _)| n > 0)
                        .collect();
                    sizes.sort_unstable_by(|a, b| b.cmp(a));
                    eprintln!(
                        "multi    {} persons, {} entries, {} events; general partitions {}",
                        units.len(),
                        entries.len(),
                        units.iter().map(|u| u.0).sum::<usize>(),
                        sizes.len()
                    );
                    let _ = shared.plan.set((
                        entries,
                        units.into_iter().map(|(_, a, b)| (a, b)).collect(),
                        sizes.into_iter().map(|(_, p)| p).collect(),
                    ));
                    lap("pass 1.5");
                }
                shared.barrier.wait();

                let (entries, units, gorder) = shared.plan.get().unwrap();
                let all_p2: Vec<&Sink<PersonRec>> = shared.p2_sinks.iter().map(|s| s.get().unwrap()).collect();
                let all_gclicks: Vec<&Sink<ClickRec>> = shared
                    .gclick_sinks
                    .iter()
                    .chain(shared.late_sinks.iter())
                    .map(|s| s.get().unwrap())
                    .collect();
                let extras: Vec<&[FW]> = shared.extras.iter().map(|s| s.get().unwrap().as_slice()).collect();
                let info = &people.info;
                let mut worker = Worker::new(ctx);
                let mut flushed = [0u64; 4];
                let mut slices: Vec<&[FW]> = Vec::new();
                let total = units.len() + gorder.len() + nb;
                loop {
                    let i = shared.final_queue.fetch_add(1, Ordering::Relaxed);
                    if i >= total {
                        break;
                    }
                    if i < units.len() {
                        let (a, b) = units[i];
                        let g = entries[a].g;
                        slices.clear();
                        for e in &entries[a..b] {
                            let src = e.src as usize;
                            let w: &[FW] = if src < nb {
                                &shared.outs[src].get().unwrap().w
                            } else {
                                extras[src - nb]
                            };
                            slices.push(&w[e.start as usize..e.end as usize]);
                        }
                        worker.f_group(&decoder, info, u64::from(g), &slices, clicks_of(&shared.click_parts, f2.cb, u64::from(g)));
                    } else if i < units.len() + gorder.len() {
                        worker.partition(ctx, people, &all_p2, &all_gclicks, gorder[i - units.len()]);
                    } else {
                        let b = i - units.len() - gorder.len();
                        let out = shared.outs[b].get().unwrap();
                        for run in &out.runs {
                            if multi(shared.counts[run.g as usize].load(Ordering::Relaxed)) {
                                continue;
                            }
                            let g = u64::from(run.g);
                            worker.f_group(
                                &decoder,
                                info,
                                g,
                                &[&out.w[run.start as usize..run.end as usize]],
                                clicks_of(&shared.click_parts, f2.cb, g),
                            );
                        }
                    }
                    if worker.rows.len() >= FLUSH_ROWS {
                        let file = shared.file_counter.fetch_add(1, Ordering::Relaxed);
                        if let Err(e) = write::user_part(user_dir, file, &worker.rows, categories, ctx.first_day) {
                            *shared.failure.lock().unwrap() = Some(e.to_string());
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
                    let mut all = shared.results.lock().unwrap();
                    all.push((cells, totals));
                    all.len() == threads
                };
                if last {
                    let all = shared.results.lock().unwrap();
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
                        Err(e) => *shared.failure.lock().unwrap() = Some(e.to_string()),
                    }
                }
                if id == 0 || part.len() > 0 {
                    let file = shared.file_counter.fetch_add(1, Ordering::Relaxed);
                    if let Err(e) = write::user_part(user_dir, file, &part, categories, ctx.first_day) {
                        *shared.failure.lock().unwrap() = Some(e.to_string());
                    }
                }
                drop(part);
                if shared.barrier.wait().is_leader() {
                    lap("people");
                }
            });
        }
    });
    if let Some(e) = shared.failure.into_inner().unwrap() {
        return Err(e.into());
    }
    let t = *shared.tallies.lock().unwrap();
    let winners = t[2];
    let lane_f = t[3];
    let lane_g_share = if winners == 0 { 0.0 } else { 100.0 * (winners - lane_f) as f64 / winners as f64 };
    eprintln!(
        "buckets  winners {winners}, lane F {lane_f}, lane G share {lane_g_share:.2}%{}, side records {}, general-ID lane F winners {}",
        if lane_g_share > 10.0 { " (above 10%)" } else { "" },
        t[4],
        t[5]
    );
    eprintln!(
        "event copies {}, clicks {}, linked {}, exotic {}",
        t[0],
        t[1],
        shared.people.get().map_or(0, |p| p.linked()),
        keys::exotic_count()
    );
    lap("write");
    unsafe { libc::_exit(0) }
}

#[cfg(test)]
mod tests {
    use super::*;

    const BASE: i64 = 1_800_000_000_000;

    fn lane() -> Lane2 {
        Lane2 {
            key: 0,
            ncap: 1 << 20,
            bits: 15,
            buckets: 32,
            base: BASE,
            thresh: BASE + (S_MAX as i64) * 1000,
            cb: 10,
            click_parts: 1,
        }
    }

    #[test]
    fn record_order_and_fields() {
        let f2 = lane();
        let thresh = f2.thresh;
        let fuser = ident::TAG | (5 << 9 | 3);
        let raw = keys::intern(b"U7");
        let valid = |user: u64| Some((user, 1234u32, 777u32 | 9 << 24));
        let cases: Vec<(Option<i64>, Option<(u64, u32, u32)>)> = vec![
            (Some(BASE + 5000), valid(fuser)),
            (Some(BASE + 4000), None),
            (Some(BASE + 4500), valid(fuser)),
            (Some(BASE - 1000), valid(fuser)),
            (None, None),
            (Some(thresh + 7000), None),
            (Some(thresh + 1), None),
            (Some(thresh - 1000), None),
            (Some(BASE + 3000), valid(raw)),
            (Some(BASE + 3000), Some((fuser, 5, 1 | 40 << 24))),
            (Some(BASE), valid(fuser)),
            (Some(BASE + 5000), None),
        ];
        let mut side = Vec::new();
        let recs: Vec<FRec> = cases.iter().map(|&(i, v)| f2.record(7, i, v, &mut side, 0)).collect();
        let sides = [side.as_slice()];
        let effective = |i: Option<i64>| i.unwrap_or(i64::MAX).min(thresh);
        for (x, &(ix, _)) in recs.iter().zip(&cases) {
            for (y, &(iy, _)) in recs.iter().zip(&cases) {
                assert_eq!(f2.better(x, y, &sides), effective(ix) < effective(iy), "{ix:?} {iy:?}");
            }
            assert_eq!(x.lo & 0x7fff, 7);
        }
        let plain = recs[0];
        assert_eq!((plain.lo >> 36) & 3, K_VALID);
        assert_eq!(plain.lo >> 38, 5);
        assert_eq!((plain.hi >> 31) & 15, 3);
        assert_eq!(plain.hi & 0x7fff_ffff, 1234);
        assert_eq!((plain.hi >> 35) as u32, 777 | 9 << 24);
        for k in [2usize, 3, 6, 8, 9] {
            assert_eq!((recs[k].lo >> 36) & 3, K_SIDE, "case {k}");
        }
        for k in [1usize, 4, 5, 7, 11] {
            assert_eq!((recs[k].lo >> 36) & 3, 0, "case {k}");
        }
        assert_eq!(side.len(), 5);
        assert_eq!(side[3].user, raw);
    }

    fn base36(value: u64) -> Vec<u8> {
        const DIGITS: &[u8; 36] = b"0123456789abcdefghijklmnopqrstuvwxyz";
        let mut out = Vec::new();
        let mut rest = value;
        loop {
            out.push(DIGITS[(rest % 36) as usize]);
            rest /= 36;
            if rest == 0 {
                break;
            }
        }
        out.reverse();
        out
    }

    #[test]
    fn recovers_event_key() {
        let ukey = 0x0012_3456_789au64;
        let ekey = 0x00fe_dcba_9876u64;
        let ws = 1_800_000_000_000i64 / DAY_MS * DAY_MS;
        let mut lines: Vec<Vec<u8>> = Vec::new();
        let mut n = 0u64;
        for g in 0..600u64 {
            let count = if g < 5 { 3000 } else { 40 };
            for k in 0..count {
                let ts = ws + (k as i64) * 60_000 + (g as i64 % 7) * 1000;
                let mut line = b"e".to_vec();
                line.extend_from_slice(&base36(ident::scramble(n, ekey)));
                line.extend_from_slice(b",u");
                line.extend_from_slice(&base36(ident::scramble(g * 512 + k % 2, ukey)));
                line.extend_from_slice(format!(",{ts},2026-01-01T00:00:00Z,view,p1,").as_bytes());
                lines.push(line);
                n += 1;
            }
        }
        let mut state = 17u64;
        for i in (1..lines.len()).rev() {
            state = state.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
            lines.swap(i, (state >> 33) as usize % (i + 1));
        }
        let mut files: Vec<Vec<u8>> = Vec::new();
        for (i, line) in lines.iter().enumerate() {
            if i % 1500 == 0 {
                files.push(b"event_id,user_id,ts,ingest_ts,event_type,product_id,price_cents\n".to_vec());
            }
            let file = files.last_mut().unwrap();
            file.extend_from_slice(line);
            file.push(b'\n');
        }
        let views: Vec<&[u8]> = files.iter().map(|f| f.as_slice()).collect();
        let decoder = ident::Decoder {
            key: ukey,
            gcap: 1 << 16,
            twist: false,
        };
        let calendar = Calendar::around(ws);
        let window = (ws, ws + 14 * DAY_MS);
        assert_eq!(ident::recover_events(&views, &decoder, &calendar, window, 1 << 21), Ok(ekey & ident::MASK));
        let wrong = ident::Decoder { key: ukey ^ 1, ..decoder };
        assert!(ident::recover_events(&views, &wrong, &calendar, window, 1 << 21).is_err());
        assert!(ident::recover_events(&views[..1], &decoder, &calendar, window, 1 << 21).is_err());
    }
}
