#[inline(always)]
unsafe fn id_k<K: Kernel>(field: &[u8]) -> u64 {
    match K::pack(field.as_ptr(), field.len()) {
        Some(key) => key,
        None => EX | keys::make_ref(field),
    }
}

#[inline(always)]
unsafe fn key_id_k<K: Kernel>(field: &[u8]) -> (u64, u64) {
    match K::pack(field.as_ptr(), field.len()) {
        Some(key) => (key, key),
        None => (keys::ex_key(field), EX | keys::make_ref(field)),
    }
}

#[inline(always)]
unsafe fn lookup_k<K: Kernel>(map: &IdMap, field: &[u8]) -> Option<u32> {
    match K::pack(field.as_ptr(), field.len()) {
        Some(key) => map.get_packed(key),
        None => map.get_bytes(field),
    }
}

#[inline(always)]
fn is_uref(person: u64) -> bool {
    person & (EX | LNK) == EX
}

#[inline(always)]
fn prefetch_ref(r: u64) {
    let p = keys::ref_ptr(r);
    prefetch(p);
    prefetch(p.wrapping_add(32));
}

#[inline(always)]
fn group_key(person: u64) -> u64 {
    if is_uref(person) {
        keys::ex_key(keys::ref_bytes(person))
    } else {
        person
    }
}

fn build_people(files: &[&'static [u8]]) -> People {
    let mut pairs: Vec<[u64; 4]> = Vec::new();
    for &file in files {
        for (start, end) in csv::data_chunks(file, usize::MAX) {
            let body = &file[start..end];
            #[cfg(target_arch = "x86_64")]
            if scan::has_avx2() {
                unsafe { link_pairs_avx2(body, &mut pairs) };
                continue;
            }
            unsafe { link_pairs::<Scalar>(body, &mut pairs) };
        }
    }
    People::build(&pairs)
}

#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "avx2,bmi1,bmi2,popcnt")]
unsafe fn link_pairs_avx2(body: &[u8], pairs: &mut Vec<[u64; 4]>) {
    link_pairs::<Avx2>(body, pairs)
}

struct LinkLines<'a, K> {
    pairs: &'a mut Vec<[u64; 4]>,
    kernel: std::marker::PhantomData<K>,
}

impl<K: Kernel> Lines<2> for LinkLines<'_, K> {
    #[inline(always)]
    fn line(&mut self, f: &[&[u8]; 2]) {
        if f[0].is_empty() || f[1].is_empty() {
            return;
        }
        unsafe {
            let (ka, ia) = key_id_k::<K>(f[0]);
            let (kb, ib) = key_id_k::<K>(f[1]);
            self.pairs.push([ka, ia, kb, ib]);
        }
    }
}

#[inline(always)]
unsafe fn link_pairs<K: Kernel>(body: &[u8], pairs: &mut Vec<[u64; 4]>) {
    let mut lines = LinkLines::<K> {
        pairs,
        kernel: std::marker::PhantomData,
    };
    scan::fused::<2, 2, K, _>(body, &mut lines);
}

#[inline(always)]
fn part_of(key: u64, mult: u64, bits: u32) -> usize {
    (key.wrapping_mul(mult) >> (64 - bits)) as usize
}

fn parse_events(ctx: &Ctx, chunk: &[u8], arena: &mut Arena, sink: &mut Sink<EventRec>, long: &mut Sink<LongRec>) -> (usize, usize) {
    #[cfg(target_arch = "x86_64")]
    if scan::has_avx2() {
        return unsafe { parse_events_avx2(ctx, chunk, arena, sink, long) };
    }
    unsafe { parse_events_k::<Scalar>(ctx, chunk, arena, sink, long) }
}

#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "avx2,bmi1,bmi2,popcnt")]
unsafe fn parse_events_avx2(ctx: &Ctx, chunk: &[u8], arena: &mut Arena, sink: &mut Sink<EventRec>, long: &mut Sink<LongRec>) -> (usize, usize) {
    parse_events_k::<Avx2>(ctx, chunk, arena, sink, long)
}

struct EventLines<'a, K> {
    ctx: &'a Ctx<'a>,
    arena: &'a mut Arena,
    sink: &'a mut Sink<EventRec>,
    long: &'a mut Sink<LongRec>,
    copies: usize,
    longs: usize,
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
            let event = K::pack(event_id.as_ptr(), event_id.len());
            let ingest = ctx.calendar.parse(f[3]);
            let mut user = 0u64;
            let mut ts = INVALID;
            let mut payload = 0u32;
            if let Some(ingest) = ingest {
                let user_id = f[1];
                let product = f[5];
                if !user_id.is_empty() && !product.is_empty() {
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
                                    lookup_k::<K>(&ctx.products, product).unwrap_or(ctx.unknown)
                                } else {
                                    0
                                };
                                user = id_k::<K>(user_id);
                                ts = (t - ctx.cws) as u32;
                                payload = price | category << 24;
                            }
                        }
                    }
                }
            }
            let ingest = ingest.unwrap_or(i64::MAX);
            match event {
                Some(event) => {
                    let rec = EventRec {
                        event,
                        user,
                        ingest,
                        ts,
                        payload,
                    };
                    self.sink.push(self.arena, part_of(event, H1, ctx.p1_bits), rec);
                }
                None => {
                    let key = keys::ex_key(event_id);
                    let rec = LongRec {
                        key,
                        eref: keys::make_ref(event_id),
                        user,
                        ingest,
                        ts,
                        payload,
                    };
                    self.long.push(self.arena, part_of(key, H1, ctx.p1_bits), rec);
                    self.longs += 1;
                }
            }
        }
    }
}

#[inline(always)]
unsafe fn parse_events_k<K: Kernel>(ctx: &Ctx, chunk: &[u8], arena: &mut Arena, sink: &mut Sink<EventRec>, long: &mut Sink<LongRec>) -> (usize, usize) {
    let mut lines = EventLines::<K> {
        ctx,
        arena,
        sink,
        long,
        copies: 0,
        longs: 0,
        kernel: std::marker::PhantomData,
    };
    scan::fused::<7, 3, K, _>(chunk, &mut lines);
    (lines.copies, lines.longs)
}

fn parse_clicks(ctx: &Ctx, people: &People, chunk: &[u8], arena: &mut Arena, sink: &mut Sink<ClickRec>) -> usize {
    #[cfg(target_arch = "x86_64")]
    if scan::has_avx2() {
        return unsafe { parse_clicks_avx2(ctx, people, chunk, arena, sink) };
    }
    unsafe { parse_clicks_k::<Scalar>(ctx, people, chunk, arena, sink) }
}

#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "avx2,bmi1,bmi2,popcnt")]
unsafe fn parse_clicks_avx2(ctx: &Ctx, people: &People, chunk: &[u8], arena: &mut Arena, sink: &mut Sink<ClickRec>) -> usize {
    parse_clicks_k::<Avx2>(ctx, people, chunk, arena, sink)
}

const CLICK_BATCH: usize = 32;

#[derive(Clone, Copy)]
struct PendingClick {
    key: u64,
    user: u64,
    click: u64,
    ts: u32,
    campaign: u32,
}

struct ClickLines<'a, K> {
    ctx: &'a Ctx<'a>,
    people: &'a People,
    arena: &'a mut Arena,
    sink: &'a mut Sink<ClickRec>,
    batch: [PendingClick; CLICK_BATCH],
    pending: usize,
    total: usize,
    kernel: std::marker::PhantomData<K>,
}

impl<K: Kernel> ClickLines<'_, K> {
    #[inline(always)]
    fn flush(&mut self) {
        let bits = self.ctx.p2_bits;
        for rec in &self.batch[..self.pending] {
            self.people.prefetch_key(rec.key);
        }
        for i in 0..self.pending {
            let rec = self.batch[i];
            let (person, group) = match self.people.get(rec.key, rec.user) {
                Some(name) => (name, name),
                None => (rec.user, rec.key),
            };
            let out = ClickRec {
                person,
                click: rec.click,
                ts: rec.ts,
                campaign: rec.campaign,
            };
            self.sink.push(self.arena, part_of(group, H2, bits), out);
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
            let Some(campaign) = lookup_k::<K>(&ctx.campaigns, f[2]) else { return };
            let (key, user) = key_id_k::<K>(user);
            self.batch[self.pending] = PendingClick {
                key,
                user,
                click: id_k::<K>(click_id),
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
unsafe fn parse_clicks_k<K: Kernel>(ctx: &Ctx, people: &People, chunk: &[u8], arena: &mut Arena, sink: &mut Sink<ClickRec>) -> usize {
    let mut lines = ClickLines::<K> {
        ctx,
        people,
        arena,
        sink,
        batch: [PendingClick {
            key: 0,
            user: 0,
            click: 0,
            ts: 0,
            campaign: 0,
        }; CLICK_BATCH],
        pending: 0,
        total: 0,
        kernel: std::marker::PhantomData,
    };
    scan::fused::<4, 4, K, _>(chunk, &mut lines);
    lines.flush();
    lines.total
}

const WIN_BATCH: usize = 32;

struct Winners<'a> {
    people: &'a People,
    bits: u32,
    pending: [(u64, u32, u32); WIN_BATCH],
    count: usize,
    total: usize,
}

impl Winners<'_> {
    #[inline(always)]
    fn add(&mut self, user: u64, ts: u32, payload: u32, out: &mut Sink<PersonRec>, arena: &mut Arena) {
        self.pending[self.count] = (user, ts, payload);
        self.count += 1;
        self.total += 1;
        if self.count == WIN_BATCH {
            self.flush(out, arena);
        }
    }

    #[inline(always)]
    fn flush(&mut self, out: &mut Sink<PersonRec>, arena: &mut Arena) {
        let n = self.count;
        let mut keys = [0u64; WIN_BATCH];
        for &(user, _, _) in &self.pending[..n] {
            if user & EX == 0 {
                self.people.prefetch_key(user);
            } else {
                prefetch_ref(user);
            }
        }
        for (k, &(user, _, _)) in self.pending[..n].iter().enumerate() {
            keys[k] = if user & EX == 0 {
                user
            } else {
                let key = keys::ex_key(keys::ref_bytes(user));
                self.people.prefetch_key(key);
                key
            };
        }
        for (k, &(user, ts, payload)) in self.pending[..n].iter().enumerate() {
            let (person, group) = match self.people.get(keys[k], user) {
                Some(name) => (name, name),
                None => (user, keys[k]),
            };
            out.push(arena, part_of(group, H2, self.bits), PersonRec { person, ts, payload });
        }
        self.count = 0;
    }
}

#[allow(clippy::too_many_arguments)]
fn dedup(
    ctx: &Ctx,
    people: &People,
    sinks: &[&Sink<EventRec>],
    longs: &[&Sink<LongRec>],
    q: usize,
    buf: &mut Vec<EventRec>,
    long_buf: &mut Vec<LongRec>,
    table: &mut Vec<(u64, u32)>,
    arena: &mut Arena,
    out: &mut Sink<PersonRec>,
) -> usize {
    buf.clear();
    for sink in sinks {
        for slice in sink.slices(q) {
            buf.extend_from_slice(slice);
        }
    }
    long_buf.clear();
    for sink in longs {
        for slice in sink.slices(q) {
            long_buf.extend_from_slice(slice);
        }
    }
    let piece = ctx.p2_block * std::mem::size_of::<PersonRec>();
    for sink in sinks {
        let bytes = sink.block_bytes();
        for block in sink.blocks(q) {
            arena.recycle(block, bytes, piece);
        }
    }
    let mut winners = Winners {
        people,
        bits: ctx.p2_bits,
        pending: [(0, 0, 0); WIN_BATCH],
        count: 0,
        total: 0,
    };
    let n = buf.len();
    if n > 0 {
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
        for rec in buf.iter() {
            if rec.event != 0 && rec.ts != INVALID {
                winners.add(rec.user, rec.ts, rec.payload, out, arena);
            }
        }
    }
    let n = long_buf.len();
    if n > 0 {
        let size = (n * 2).next_power_of_two().max(16);
        let tbits = size.trailing_zeros();
        let mask = size - 1;
        table.clear();
        table.resize(size, (0, 0));
        let shift = 64 - ctx.p1_bits - tbits;
        for i in 0..n {
            let key = long_buf[i].key;
            let mut slot = ((key.wrapping_mul(H1) >> shift) as usize) & mask;
            loop {
                let entry = unsafe { table.get_unchecked_mut(slot) };
                if entry.0 == 0 {
                    *entry = (key, i as u32);
                    break;
                }
                if entry.0 == key {
                    let j = entry.1 as usize;
                    if keys::same_ref(long_buf[i].eref, long_buf[j].eref) {
                        if long_buf[i].ingest < long_buf[j].ingest {
                            long_buf[j].key = 0;
                            entry.1 = i as u32;
                        } else {
                            long_buf[i].key = 0;
                        }
                        break;
                    }
                }
                slot = (slot + 1) & mask;
            }
        }
        for rec in long_buf.iter() {
            if rec.key != 0 && rec.ts != INVALID {
                winners.add(rec.user, rec.ts, rec.payload, out, arena);
            }
        }
    }
    winners.flush(out, arena);
    winners.total
}
