import sys
root = sys.argv[1]
p = root + '/src/fast/sink.rs'
s = open(p).read()
old = '''    pub fn slices(&self, part: usize)'''
new = '''    pub fn blocks(&self, part: usize) -> usize {
        self.full[part].len() + usize::from(!self.cur[part].is_null())
    }

    pub fn block(&self, part: usize, i: usize) -> (*mut T, usize) {
        if i < self.full[part].len() {
            (self.full[part][i], self.block)
        } else {
            let start = unsafe { self.end[part].sub(self.block) };
            (start, unsafe { self.cur[part].offset_from(start) } as usize)
        }
    }

    pub fn prefix(&self, part: usize, count: usize) -> impl Iterator<Item = &[T]> + '_ {
        let mut left = count;
        self.slices(part).map(move |slice| {
            let take = slice.len().min(left);
            left -= take;
            &slice[..take]
        })
    }

    pub fn slices(&self, part: usize)'''
assert old in s
s = s.replace(old, new)
open(p, 'w').write(s)

p = root + '/src/fast/mod.rs'
s = open(p).read()
def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, (s.count(old), old[:80])
    s = s.replace(old, new)
rep('''    let join_queue = AtomicUsize::new(0);''', '''    let join_queue = AtomicUsize::new(0);
    let part_count = 1usize << ctx.p2_bits;
    let kept_events: Vec<AtomicU32> = (0..threads * part_count).map(|_| AtomicU32::new(0)).collect();
    let kept_clicks: Vec<AtomicU32> = (0..threads * part_count).map(|_| AtomicU32::new(0)).collect();''')
rep('''use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};''', '''use std::sync::atomic::{AtomicU32, AtomicUsize, Ordering};''')
rep('''    let links_done = AtomicBool::new(false);
''', '')
rep('''            let links_done = &links_done;
''', '')
rep('''                            let _ = people.set(built);
                            links_done.store(true, Ordering::Release);''', '''                            let _ = people.set(built);''')
rep('''            let join_queue = &join_queue;''', '''            let join_queue = &join_queue;
            let kept_events = &kept_events;
            let kept_clicks = &kept_clicks;''')
rep('''                let mut click_arena = Arena::new();
                let mut p3: Sink<PersonRec> = Sink::new(1 << ctx.p2_bits, 256);
                let mut p3_clicks: Sink<ClickRec> = Sink::new(1 << ctx.p2_bits, 512);
                loop {
                    let q = join_queue.fetch_add(1, Ordering::Relaxed);
                    if q >= 1 << ctx.p2_bits {
                        break;
                    }
                    join(ctx, people, &all_p2, &all_clicks, q, &mut arena, &mut click_arena, &mut p3, &mut p3_clicks);
                }''', '''                let mut p3: Sink<PersonRec> = Sink::new(1 << ctx.p2_bits, 256);
                let mut p3_clicks: Sink<ClickRec> = Sink::new(1 << ctx.p2_bits, 512);
                let mut moved: Vec<PersonRec> = Vec::new();
                let mut moved_clicks: Vec<ClickRec> = Vec::new();
                loop {
                    let q = join_queue.fetch_add(1, Ordering::Relaxed);
                    if q >= 1 << ctx.p2_bits {
                        break;
                    }
                    let bits = ctx.p2_bits;
                    moved.clear();
                    for (t, sink) in all_p2.iter().enumerate() {
                        let kept = unsafe {
                            compact(sink, q, &mut moved, |r| people.name_of(r.person), |r, person| PersonRec { person, ..r }, |r| r.person)
                        };
                        kept_events[t * part_count + q].store(kept as u32, Ordering::Relaxed);
                    }
                    for rec in &moved {
                        p3.push(&mut arena, part_of(rec.person, H2, bits), *rec);
                    }
                    moved_clicks.clear();
                    for (t, sink) in all_clicks.iter().enumerate() {
                        let kept = unsafe {
                            compact(sink, q, &mut moved_clicks, |r| people.name_of(r.person), |r, person| ClickRec { person, ..r }, |r| r.person)
                        };
                        kept_clicks[t * part_count + q].store(kept as u32, Ordering::Relaxed);
                    }
                    for rec in &moved_clicks {
                        p3_clicks.push(&mut arena, part_of(rec.person, H2, bits), *rec);
                    }
                }''')
rep('''                p3.finish(&mut arena);
                p3_clicks.finish(&mut click_arena);''', '''                p3.finish(&mut arena);
                p3_clicks.finish(&mut arena);''')
rep('''                    let all_p2: Vec<&Sink<PersonRec>> = p3_sinks.iter().map(|s| s.get().unwrap()).collect();
                    let all_clicks: Vec<&Sink<ClickRec>> = p3_click_sinks.iter().map(|s| s.get().unwrap()).collect();
                    let mut sizes: Vec<(usize, usize)> = (0..1usize << ctx.p2_bits)
                        .map(|p| {
                            let n: usize = all_p2.iter().map(|s| s.len(p)).sum::<usize>()
                                + all_clicks.iter().map(|s| s.len(p)).sum::<usize>() / 4;
                            (n, p)
                        })
                        .collect();''', '''                    let all_p3: Vec<&Sink<PersonRec>> = p3_sinks.iter().map(|s| s.get().unwrap()).collect();
                    let all_p3_clicks: Vec<&Sink<ClickRec>> = p3_click_sinks.iter().map(|s| s.get().unwrap()).collect();
                    let kept = |counts: &[AtomicU32], p: usize| -> usize {
                        (0..threads).map(|t| counts[t * part_count + p].load(Ordering::Relaxed) as usize).sum()
                    };
                    let mut sizes: Vec<(usize, usize)> = (0..part_count)
                        .map(|p| {
                            let n: usize = kept(kept_events, p)
                                + all_p3.iter().map(|s| s.len(p)).sum::<usize>()
                                + (kept(kept_clicks, p) + all_p3_clicks.iter().map(|s| s.len(p)).sum::<usize>()) / 4;
                            (n, p)
                        })
                        .collect();''')
rep('''                let all_p2: Vec<&Sink<PersonRec>> = p3_sinks.iter().map(|s| s.get().unwrap()).collect();
                let all_clicks: Vec<&Sink<ClickRec>> = p3_click_sinks.iter().map(|s| s.get().unwrap()).collect();
                let order = order.get().unwrap();
                let mut worker = Worker::new(ctx);
                loop {
                    let i = person_queue.fetch_add(1, Ordering::Relaxed);
                    let Some(&p) = order.get(i) else { break };
                    worker.partition(ctx, &all_p2, &all_clicks, p);
                }''', '''                let all_p3: Vec<&Sink<PersonRec>> = p3_sinks.iter().map(|s| s.get().unwrap()).collect();
                let all_p3_clicks: Vec<&Sink<ClickRec>> = p3_click_sinks.iter().map(|s| s.get().unwrap()).collect();
                let order = order.get().unwrap();
                let mut worker = Worker::new(ctx);
                let mut event_slices: Vec<&[PersonRec]> = Vec::new();
                let mut click_slices: Vec<&[ClickRec]> = Vec::new();
                loop {
                    let i = person_queue.fetch_add(1, Ordering::Relaxed);
                    let Some(&p) = order.get(i) else { break };
                    event_slices.clear();
                    click_slices.clear();
                    for (t, sink) in all_p2.iter().enumerate() {
                        let count = kept_events[t * part_count + p].load(Ordering::Relaxed) as usize;
                        event_slices.extend(sink.prefix(p, count));
                    }
                    for sink in &all_p3 {
                        event_slices.extend(sink.slices(p));
                    }
                    for (t, sink) in all_clicks.iter().enumerate() {
                        let count = kept_clicks[t * part_count + p].load(Ordering::Relaxed) as usize;
                        click_slices.extend(sink.prefix(p, count));
                    }
                    for sink in &all_p3_clicks {
                        click_slices.extend(sink.slices(p));
                    }
                    worker.partition(ctx, &event_slices, &click_slices);
                }''')
i0 = s.index('#[allow(clippy::too_many_arguments)]\nfn join(')
i1 = s.index('#[derive(Clone, Copy, Default)]\nstruct Rec {')
s = s[:i0] + '''unsafe fn compact<T: Copy>(
    sink: &Sink<T>,
    q: usize,
    moved: &mut Vec<T>,
    name: impl Fn(&T) -> u64,
    rename: impl Fn(T, u64) -> T,
    key: impl Fn(&T) -> u64,
) -> usize {
    let blocks = sink.blocks(q);
    if blocks == 0 {
        return 0;
    }
    moved.reserve(sink.len(q));
    let out = moved.as_mut_ptr().add(moved.len());
    let mut out_len = 0usize;
    let (mut write, mut write_len) = sink.block(q, 0);
    let mut write_block = 0usize;
    let mut at = 0usize;
    let mut kept = 0usize;
    for b in 0..blocks {
        let (read, n) = sink.block(q, b);
        for i in 0..n {
            let rec = *read.add(i);
            let person = name(&rec);
            let stay = person == key(&rec);
            while at == write_len {
                write_block += 1;
                (write, write_len) = sink.block(q, write_block);
                at = 0;
            }
            *write.add(at) = rec;
            at += usize::from(stay);
            kept += usize::from(stay);
            *out.add(out_len) = rename(rec, person);
            out_len += usize::from(!stay);
        }
    }
    moved.set_len(moved.len() + out_len);
    kept
}

''' + s[i1:]
rep('''    fn partition(&mut self, ctx: &Ctx, events: &[&Sink<PersonRec>], clicks: &[&Sink<ClickRec>], p: usize) {
        let n: usize = events.iter().map(|s| s.len(p)).sum();''', '''    fn partition(&mut self, ctx: &Ctx, events: &[&[PersonRec]], clicks: &[&[ClickRec]]) {
        let n: usize = events.iter().map(|s| s.len()).sum();''')
rep('''        for sink in events {
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
        }''', '''        for slice in events {
            for rec in slice.iter() {
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
        }''')
rep('''        for sink in clicks {
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
        }''', '''        for slice in clicks {
            for rec in slice.iter() {
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
        }''')
open(p, 'w').write(s)
print("applied")
