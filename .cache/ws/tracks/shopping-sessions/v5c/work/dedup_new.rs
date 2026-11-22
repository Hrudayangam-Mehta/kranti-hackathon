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

struct Emit<'a> {
    people: &'a People,
    bits: u32,
    pending: [(Key, u32, u32); 32],
    count: usize,
    winners: usize,
}

impl Emit<'_> {
    #[inline(always)]
    fn push(&mut self, user: Key, ts: u32, payload: u32, out: &mut Persons, arena: &mut Arena) {
        self.pending[self.count] = (user, ts, payload);
        self.count += 1;
        self.winners += 1;
        if self.count == self.pending.len() {
            self.flush(out, arena);
        }
    }

    fn flush(&mut self, out: &mut Persons, arena: &mut Arena) {
        let pending = &self.pending[..self.count];
        for &(user, _, _) in pending {
            prefetch_user(self.people, user);
        }
        for &(user, ts, payload) in pending {
            let person = self.people.name_of(user);
            let part = part_of(person, self.bits);
            if person.hi == 0 {
                out.a.push(arena, part, PersonSmall { person: person.lo, ts, payload });
            } else {
                out.b.push(arena, part, PersonRec { person, ts, payload });
            }
        }
        self.count = 0;
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
                let h = Key { hi: 0, lo: r.event }.hash();
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
        pending: [(Key::default(), 0, 0); 32],
        count: 0,
        winners: 0,
    };
    cand.clear();
    for sink in sinks {
        for slice in sink.a.slices(q) {
            for r in slice {
                let event = Key { hi: 0, lo: r.event };
                if marked(twice, (event.hash() >> sshift) as usize & smask) {
                    cand.push(EventRec {
                        event,
                        user: Key { hi: 0, lo: r.user },
                        ingest: r.ingest,
                        ts: r.ts,
                        payload: r.payload,
                    });
                } else if r.ts != INVALID {
                    emit.push(Key { hi: 0, lo: r.user }, r.ts, r.payload, out, arena);
                }
            }
        }
        for slice in sink.b.slices(q) {
            for r in slice {
                if marked(twice, (r.event.hash() >> sshift) as usize & smask) {
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
            let mut slot = ((key.hash() >> shift) as usize) & mask;
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
    emit.flush(out, arena);
    emit.winners
}
