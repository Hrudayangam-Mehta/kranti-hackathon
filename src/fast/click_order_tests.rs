use super::*;
use std::collections::{BTreeMap, BTreeSet};

#[derive(Clone)]
struct InputClick {
    person: Key,
    name: Vec<u8>,
    ts: u32,
    campaign: u32,
    bucket: usize,
}

fn name(i: usize) -> Vec<u8> {
    match i % 7 {
        0 => format!("k{i:06}").into_bytes(),
        1 => format!("k{i:011}").into_bytes(),
        2 => format!("k{:032x}", (1u128 << 64) + i as u128).into_bytes(),
        3 => format!("K opaque {i}").into_bytes(),
        4 => format!(" leading-{i}").into_bytes(),
        5 => format!("k\0{i}").into_bytes(),
        _ => format!("点击{i}").into_bytes(),
    }
}

fn push_click(ctx: &Ctx, sink: &mut Clicks, arena: &mut Arena, row: &InputClick, compact: bool) {
    let click = ctx.click_ids.encode(&row.name);
    if compact && row.person.hi == 0 && click.hi == 0 {
        sink.a.push(arena, row.bucket, ClickSmall { person: row.person.lo, click: click.lo,
            ts: row.ts, campaign: row.campaign });
    } else {
        sink.b.push(arena, row.bucket, ClickRec { person: row.person, click,
            ts: row.ts, campaign: row.campaign });
    }
}

fn decoded(rows: &[LocalClick], domain: &Domain) -> Vec<(u32, Vec<u8>, u32)> {
    rows.iter().map(|row| {
        let mut name = Vec::new();
        domain.bytes_of(row.click, &mut name);
        (row.ts, name, row.campaign)
    }).collect()
}

// The old global radix then per-person equal-time tie pass, retained as a
// test-only ordering control. A separate byte-string oracle below does not
// call either radix or Domain::cmp.
fn baseline_order(ctx: &Ctx, persons: &[Key], rows: &[InputClick], accept_even: bool) -> Vec<Vec<LocalClick>> {
    let mut recs = Vec::new();
    for row in rows.iter().filter(|row| row.bucket == 0) {
        if let Some(id) = persons.iter().position(|&person| person == row.person) {
            if accept_even && id % 2 != 0 { continue; }
            recs.push(ClickTmp { ts: row.ts, id: id as u32, campaign: row.campaign,
                click: ctx.click_ids.encode(&row.name) });
        }
    }
    let low = recs.iter().map(|row| row.ts).min().unwrap_or(u32::MAX);
    let high = recs.iter().map(|row| row.ts).max().unwrap_or(0);
    radix_by_ts(&mut recs, &mut Vec::new(), low, high, |row| row.ts);
    let mut groups = vec![Vec::new(); persons.len()];
    for row in recs {
        groups[row.id as usize].push(LocalClick { ts: row.ts, campaign: row.campaign, click: row.click });
    }
    for group in &mut groups {
        let mut at = 0;
        while at < group.len() {
            let mut end = at + 1;
            while end < group.len() && group[end].ts == group[at].ts { end += 1; }
            group[at..end].sort_unstable_by(|a, b| ctx.click_ids.cmp(b.click, a.click));
            at = end;
        }
    }
    groups
}

fn check_groups(counts: &[usize], equal_time: bool, expect_local: bool) {
    let mut ctx = raw48_tests::context();
    ctx.organic = 3;
    let persons: Vec<Key> = (0..counts.len()).map(|i| ctx.users.encode(format!("u{i}").as_bytes())).collect();
    let mut rows: Vec<InputClick> = Vec::new();
    for (id, &count) in counts.iter().enumerate() {
        let begin = rows.len();
        for i in 0..count {
            if count >= 16 && i + 1 == count {
                rows.push(rows[begin].clone()); // identical duplicate; multiplicity must survive
            } else {
                rows.push(InputClick { person: persons[id], name: name(id * 20_000 + i),
                    ts: if equal_time { 100 } else { ((i * 97) % 5) as u32 * GAP_MS + id as u32 },
                    campaign: (i % 3) as u32, bucket: 0 });
            }
        }
    }
    rows.reverse();
    rows.push(InputClick { person: ctx.users.encode(b"u-not-in-this-partition"), name: b"outside".to_vec(),
        ts: u32::MAX, campaign: 2, bucket: 0 });
    if let Some(&person) = persons.first() {
        rows.push(InputClick { person, name: b"other-owner".to_vec(), ts: u32::MAX, campaign: 1, bucket: 1 });
    }
    let mut arena = Arena::new();
    let mut sinks = [new_clicks(&ctx), new_clicks(&ctx)];
    for (i, row) in rows.iter().enumerate() {
        push_click(&ctx, &mut sinks[i & 1], &mut arena, row, i % 3 != 0);
    }
    for sink in &mut sinks { sink.finish(&mut arena); }
    let mut worker = Worker::new(&ctx);
    worker.persons = persons.clone();
    let size = (2 * persons.len()).next_power_of_two().max(64);
    let shift = 64 - ctx.p2_bits - size.trailing_zeros();
    // Setup is in the raw phase: grow_local must derive packed identities
    // from these original Keys, just as index_raw_events does before rewrite.
    worker.grow_local(size, shift);
    for (id, &key) in persons.iter().enumerate() {
        let slot = worker.local_ids.iter().position(|&found| found == id as u32).unwrap();
        assert_eq!(worker.local_keys[slot], PersonIdentity::from_key(key));
    }
    for (iteration, accept_even) in [false, true, false].into_iter().enumerate() {
        let offsets = worker.group_clicks(&[&sinks[0], &sinks[1]], 0, shift, size - 1,
            |id| !accept_even || id % 2 == 0);
        if iteration == 0 {
            let low = worker.click_recs.iter().map(|row| row.ts).min().unwrap_or(u32::MAX);
            let high = worker.click_recs.iter().map(|row| row.ts).max().unwrap_or(0);
            assert_eq!(prefer_local_click_order(&worker.click_counts, worker.click_recs.len(), low, high), expect_local);
            if expect_local { assert!(worker.click_spare.is_empty()); }
            else if low < high { assert_eq!(worker.click_spare.len(), worker.click_recs.len()); }
        }
        let baseline = baseline_order(&ctx, &persons, &rows, accept_even);
        assert_eq!(offsets.len(), persons.len() + 1);
        assert_eq!(offsets.last().copied().unwrap(), worker.local_clicks.len() as u32);
        for (id, &person) in persons.iter().enumerate() {
            let mut expected: Vec<_> = rows.iter().filter(|row| row.person == person && row.bucket == 0
                && (!accept_even || id % 2 == 0)).map(|row| (row.ts, row.name.clone(), row.campaign)).collect();
            expected.sort_by(|a, b| a.0.cmp(&b.0).then_with(|| b.1.cmp(&a.1)));
            let actual = decoded(&worker.local_clicks[offsets[id] as usize..offsets[id + 1] as usize], &ctx.click_ids);
            assert_eq!(actual, expected, "person {id}, filter {accept_even}");
            assert_eq!(actual, decoded(&baseline[id], &ctx.click_ids), "frozen radix control, person {id}");
            assert_eq!(worker.click_counts[id] as usize, expected.len());
        }
    }
    arena.release();
}

#[test]
fn local_click_order_empty_single_pair_and_16_17_boundaries() {
    check_groups(&[], false, true);
    check_groups(&[0], false, true);
    check_groups(&[0, 1], false, true);
    check_groups(&[0, 1, 2, 16, 17, 35, 65], false, true);
}

#[test]
fn local_click_order_heavy_and_equal_time_keep_exact_global_fallback() {
    check_groups(&[0, 1, 2, 16, 17, 8192], false, false);
    check_groups(&[0, 1, 2, 16, 17, 65], true, false);
}

#[test]
fn local_click_order_dispatch_uses_counts_span_and_skew() {
    assert!(prefer_local_click_order(&[1; 8192], 8192, 0, u32::MAX));
    assert!(prefer_local_click_order(&[16; 128], 2048, 0, u32::MAX));
    assert!(!prefer_local_click_order(&[16; 128], 2048, 0, 1));
    assert!(prefer_local_click_order(&[1023], 1023, 0, u32::MAX));
    assert!(!prefer_local_click_order(&[1024], 1024, 0, u32::MAX));
    assert!(!prefer_local_click_order(&[17; 1024], 17 * 1024, 0, 1));
    // A heavy group that is a tiny fraction does not itself force the whole
    // partition through radix; it still uses an O(n log n) local comparator.
    let mut mixed = vec![1; 8192];
    mixed.push(1024);
    assert!(prefer_local_click_order(&mixed, 9216, 0, u32::MAX));
}

#[derive(Default)]
struct DayOracle { sessions: u64, events: u64, revenue: u64, categories: BTreeMap<u32, u64> }

#[test]
fn local_click_order_full_alias_attribution_matches_independent_row_oracle() {
    for heavy in [0usize, 2048] {
        let mut ctx = raw48_tests::context();
        ctx.organic = 3;
        ctx.campaigns = SmallMap::new(&[(keys::intern(b"g0"), 0), (keys::intern(b"g1"), 1), (keys::intern(b"g2"), 2)]);
        let user_names: [&[u8]; 4] = [b"u0", b"u1", b"u2", b"u9"];
        let users: Vec<Key> = user_names.iter().map(|name| ctx.users.encode(name)).collect();
        let people = People::build(&[(users[0], users[1]), (users[1], users[2])], &ctx.users);
        let t = WEEK_MS as u32 + 1000;
        let next_day = (WEEK_MS + DAY_MS + 50) as u32;
        // (original raw identity, timestamp, category, price); the manual
        // component mapping is independent of People::resolve.
        let events = [(0usize, t, 1u32, 7u32), (1, t + GAP_MS, 0, 0),
            (1, t + 2 * GAP_MS + 1, 2, 3), (0, next_day, 2, 9),
            (3, WEEK_MS as u32, 0, 0), (3, WEEK_MS as u32 + GAP_MS + 1, 1, 5),
            (3, next_day, 0, 0)];
        let mut click_rows: Vec<(usize, u32, Vec<u8>, u32)> = vec![
            (0, t - WEEK_MS as u32, b"kold".to_vec(), 0),
            (2, t, b" A".to_vec(), 1), (2, t, b" A".to_vec(), 1),
            (1, t, b"kZ".to_vec(), 2), (0, t, b"k0000000".to_vec(), 0),
            (0, t + 1, b"kfuture".to_vec(), 2),
            (0, next_day, b"k0".to_vec(), 2), (1, next_day, b"k00".to_vec(), 0),
            (3, t + 500, b"kdirect0".to_vec(), 0), (3, t + 501, b"kdirect1".to_vec(), 1),
        ];
        for i in 0..heavy {
            click_rows.push((i % 3, t - (i % 1000) as u32, format!("kheavy{i:06}").into_bytes(), (i % 3) as u32));
        }
        let mut arena = Arena::new();
        let parts = 1usize << ctx.p2_bits;
        let mut event_sink: Persons = Pair::new(parts, 96, 32);
        for &(raw, ts, category, price) in events.iter().rev() {
            let person = users[raw];
            let payload = if price == 0 { 0 } else { category << 24 | price };
            event_sink.b.push(&mut arena, part_of(person, ctx.p2_bits), PersonRec { person, ts, payload });
        }
        event_sink.finish(&mut arena);
        let mut click_text = Vec::new();
        for (raw, ts, name, campaign) in click_rows.iter().rev() {
            click_text.extend_from_slice(name);
            click_text.push(b',');
            click_text.extend_from_slice(user_names[*raw]);
            click_text.extend_from_slice(format!(",g{campaign},{}\n", ctx.cws + i64::from(*ts)).as_bytes());
        }
        let mut click_sink = new_clicks(&ctx);
        assert_eq!(parse_clicks(&ctx, &people, &click_text, &mut arena, &mut click_sink), click_rows.len());
        click_sink.finish(&mut arena);
        let mut worker = Worker::new(&ctx);
        let mut store = alias::Store::new(ctx.p2_bits);
        for p in 0..parts { worker.compress_aliases(&ctx, &[&event_sink], &[&click_sink], p, &people, &mut store); }
        for p in 0..parts { worker.partition_aliases(&ctx, &[&store], &[&click_sink], p); }

        let mut expected_rows = write::Part::default();
        let mut expected_credit = vec![[0u64; 3]; ctx.days * 4];
        let mut expected_assist = vec![0u32; ctx.days * 4];
        // The one graph-absent person finishes in the raw phase, then the one
        // linked component finishes in the canonical phase.
        for direct in [true, false] {
            let canonical = if direct { users[3] } else { users[0] };
            let mut selected: Vec<_> = events.iter().copied().filter(|row| (row.0 == 3) == direct).collect();
            selected.sort_by_key(|row| row.1);
            let mut days: BTreeMap<usize, DayOracle> = BTreeMap::new();
            let mut at = 0;
            while at < selected.len() {
                let start = selected[at].1;
                let day = ((u64::from(start) - WEEK_MS as u64) / DAY_MS as u64) as usize;
                let day_row = days.entry(day).or_default();
                day_row.sessions += 1;
                let mut last = start;
                let mut revenue = 0u64;
                while at < selected.len() && selected[at].1 - last <= GAP_MS {
                    let (_, ts, category, price) = selected[at];
                    day_row.events += 1;
                    revenue += u64::from(price);
                    if price > 0 { *day_row.categories.entry(category).or_default() += u64::from(price); }
                    last = ts;
                    at += 1;
                }
                day_row.revenue += revenue;
                let qualifying: Vec<_> = click_rows.iter().filter(|row| (row.0 == 3) == direct
                    && row.1 <= start && start - row.1 <= WEEK_MS as u32).collect();
                let winner = qualifying.iter().min_by(|a, b| b.1.cmp(&a.1).then_with(|| a.2.cmp(&b.2)));
                let campaign = winner.map_or(ctx.organic, |row| row.3) as usize;
                let cell = &mut expected_credit[day * 4 + campaign];
                cell[0] += 1;
                if revenue > 0 { cell[1] += 1; cell[2] += revenue; }
                let assists: BTreeSet<_> = qualifying.iter().map(|row| row.3).collect();
                for campaign in assists { expected_assist[day * 4 + campaign as usize] += 1; }
            }
            for (day, row) in days {
                let top = row.categories.iter().max_by(|(ca, sa), (cb, sb)| sa.cmp(sb).then_with(|| cb.cmp(ca)))
                    .map_or(u8::MAX, |(&category, _)| category as u8);
                expected_rows.push(canonical, day as u32, [row.sessions, row.events, row.revenue], top);
            }
        }
        assert_eq!(worker.rows, expected_rows, "heavy={heavy}: all user-day fields");
        assert_eq!(worker.credit, expected_credit, "heavy={heavy}: all credited cells");
        assert_eq!(worker.assist, expected_assist, "heavy={heavy}: exact deduplicated campaign assists");
        assert!(worker.active.is_empty());
        assert!(worker.in_window.iter().all(|&count| count == 0));
        arena.release();
    }
}
