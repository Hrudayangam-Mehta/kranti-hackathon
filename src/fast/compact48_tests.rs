use super::*;
use std::collections::{BTreeMap, HashMap};

type Row = (u64, u64, u32, u32);

fn context(bits: u32, cws: i64) -> Ctx<'static> {
    let ws = cws + WEEK_MS;
    Ctx {
        calendar: Calendar::around(ws), ws, we: ws + 30 * DAY_MS, cws,
        products: SmallMap::new(&[]), unknown: 0,
        campaigns: SmallMap::new(&[]), organic: 0,
        p1_bits: bits, p2_bits: 4, p1_block: 48, click_block: 24, p2_block: 24,
        event_layout: EventLayout::new(bits, cws).unwrap(),
        first_day: ws.div_euclid(DAY_MS), days: 31,
        day_shift: cws - ws.div_euclid(DAY_MS) * DAY_MS,
        link_files: Vec::new(), users: Domain::with_prefix(b'u'),
        event_ids: Domain::with_prefix(b'e'), click_ids: Domain::with_prefix(b'k'),
        units: Vec::new(), files: Vec::new(), remaining: Vec::new(), first_click: 0,
        marker: std::marker::PhantomData,
    }
}

fn append(ctx: &Ctx, copies: &mut Copies, arena: &mut Arena, rec: EventRec) {
    let h = event_hash(rec.event);
    let p = (h >> (64 - ctx.p1_bits)) as usize;
    if let Some(small) = ctx.event_layout.pack(&rec, h) {
        assert_eq!(ctx.event_layout.hash(&small, p), h);
        copies.a.push(arena, p, small);
    } else if let Some(middle) = EventMid::pack(&rec, ctx.cws) {
        assert_eq!(middle.hash(), h);
        copies.middle.push(arena, p, middle);
    } else {
        copies.b.push(arena, p, rec);
    }
}

fn row(user: Key, ts: u32, payload: u32) -> Row {
    (user.hi, user.lo, ts, payload)
}

fn consume(ctx: &Ctx, copies: &Copies, arena: &mut Arena) -> (usize, Vec<Row>, Vec<(usize, usize)>) {
    let mut out: Persons = Pair::new(1 << ctx.p2_bits, ctx.p2_block, ctx.p2_block * 2 / 3);
    let (mut once, mut twice, mut candidates, mut table) = (Vec::new(), Vec::new(), Vec::new(), Vec::new());
    let mut winners = 0;
    for p in 0..1 << ctx.p1_bits {
        winners += dedup(ctx, &[copies], p, &mut once, &mut twice, &mut candidates, &mut table, arena, &mut out);
    }
    out.finish(arena);
    let mut rows = Vec::new();
    let mut blocks = Vec::new();
    for p in 0..1 << ctx.p2_bits {
        for rec in out.a.slices(p).flatten() {
            rows.push(row(Key { hi: 0, lo: rec.person }, rec.ts, rec.payload));
        }
        for rec in out.b.slices(p).flatten() {
            rows.push(row(rec.person, rec.ts, rec.payload));
        }
        blocks.extend(out.a.blocks(p).map(|ptr| (ptr as usize, out.a.block_bytes())));
        blocks.extend(out.b.blocks(p).map(|ptr| (ptr as usize, out.b.block_bytes())));
    }
    rows.sort_unstable();
    (winners, rows, blocks)
}

#[test]
fn real_parser_mixed_lanes_keep_earliest_invalid_and_fractional_anchor() {
    let event_ms = crate::time::parse_timestamp(b"2028-03-01T00:00:01Z").unwrap();
    let late_ms = crate::time::parse_timestamp(b"2028-03-25T00:00:00Z").unwrap();
    let cws = event_ms - 1000 + 123 - WEEK_MS;
    let ctx = context(4, cws);
    let mut input = concat!(
        "e1,u1,2028-03-01T00:00:01Z,2028-03-01T00:00:01Z,view,p,ignored\n",
        "e1,u000000001,2028-03-01T00:00:01Z,2028-03-01T00:00:02Z,purchase,p,99\n",
        "e2,u000000001,2028-03-01T00:00:01Z,2028-03-01T00:00:00Z,purchase,p,17\n",
        "e2,u1,2028-03-01T00:00:01Z,2028-03-01T00:00:02Z,view,p,ignored\n",
        "e3,u1,bad,2028-03-01T00:00:00Z,view,p,ignored\n",
        "e3,u1,2028-03-01T00:00:01Z,2028-03-01T00:00:01Z,view,p,ignored\n",
        "e0,u0,2028-03-01T00:00:01Z,2028-03-01T00:00:01Z,view,p,ignored\n",
        "e00,u00,2028-03-01T00:00:01Z,2028-03-01T00:00:01Z,view,p,ignored\n",
        "e~~~~~~~~,u~~~~~~~~,2028-03-01T00:00:01Z,2028-03-01T00:00:01Z,view,p,ignored\n",
    ).to_string();
    input.push_str(&format!("e4,u1,{},2028-03-01T00:00:01Z,view,p,ignored\n", event_ms + 1));
    input.push_str("e5,u1,2028-03-25T00:00:00Z,2028-03-25T00:00:00Z,view,p,ignored\n");
    let ts = u32::try_from(event_ms - cws).unwrap();
    let mut expected = vec![
        row(ctx.users.encode(b"u1"), ts, 0),
        row(ctx.users.encode(b"u000000001"), ts, 17),
        row(ctx.users.encode(b"u0"), ts, 0),
        row(ctx.users.encode(b"u00"), ts, 0),
        row(ctx.users.encode(b"u~~~~~~~~"), ts, 0),
        row(ctx.users.encode(b"u1"), ts + 1, 0),
        row(ctx.users.encode(b"u1"), u32::try_from(late_ms - cws).unwrap(), 0),
    ];
    expected.sort_unstable();
    for native in [false, true] {
        let mut arena = Arena::new();
        let mut copies = Copies::new(&ctx);
        let count = if native {
            parse_events(&ctx, input.as_bytes(), &mut arena, &mut copies)
        } else {
            unsafe { parse_events_k::<Scalar>(&ctx, input.as_bytes(), &mut arena, &mut copies) }
        };
        assert_eq!(count, 11);
        copies.finish(&mut arena);
        assert_eq!((0..1 << ctx.p1_bits).map(|p| copies.a.len(p)).sum::<usize>(), 7);
        assert_eq!((0..1 << ctx.p1_bits).map(|p| copies.middle.len(p)).sum::<usize>(), 4);
        assert_eq!((0..1 << ctx.p1_bits).map(|p| copies.b.len(p)).sum::<usize>(), 0);
        let (winners, actual, _) = consume(&ctx, &copies, &mut arena);
        assert_eq!(winners, 7);
        assert_eq!(actual, expected);
        arena.release();
    }
}

#[test]
fn actual_dedup_matches_full_record_reference_for_signed_and_invalid_cases() {
    for bits in [4, 10, 14] {
        let cws = -604_800_123i64;
        let ctx = context(bits, cws);
        let event_ms = 1000i64;
        let ts = u32::try_from(event_ms - cws).unwrap();
        let user = ctx.users.encode(b"u1");
        let wide_user = ctx.users.encode(b"U-exact-fallback");
        let limit = 1i64 << (10 + bits);
        let mut records = Vec::new();
        let e = |n| ctx.event_ids.encode(format!("e{n}").as_bytes());
        let base = |event, ingest, payload, user| EventRec { event, user, ingest, ts, payload };
        records.extend([
            base(e(1), event_ms - limit * 1000, 0, user),
            base(e(1), event_ms - limit * 1000 + 1000, 1, wide_user),
            base(e(2), event_ms - (limit + 1) * 1000, 2, wide_user),
            base(e(2), event_ms, 0, user),
            EventRec { ts: INVALID, user: Key::default(), ..base(e(3), -1000, 0, user) },
            base(e(3), event_ms, 0, user),
            // Fractional ingest is an extra-contract robustness case; official
            // ingest is F1. It must still retain ordering in the exact fallback.
            EventRec { ts: INVALID, user: Key::default(), ..base(e(4), -1001, 0, user) },
            base(e(4), event_ms, 0, user),
            base(e(5), event_ms + (limit - 1) * 1000, 0, user),
            base(e(5), event_ms + limit * 1000, 3, wide_user),
            base(e(6), event_ms, 4, wide_user),
            base(e(6), event_ms, 4, wide_user), // equal-ingest copies are identical
            base(ctx.event_ids.encode(b"e000000001"), event_ms, 5, user),
        ]);
        let mut expected = BTreeMap::<(u64, u64), EventRec>::new();
        for &rec in &records {
            expected.entry((rec.event.hi, rec.event.lo)).and_modify(|old| {
                if rec.ingest < old.ingest { *old = rec; }
            }).or_insert(rec);
        }
        let mut expected: Vec<_> = expected.values().filter(|rec| rec.ts != INVALID)
            .map(|rec| row(rec.user, rec.ts, rec.payload)).collect();
        expected.sort_unstable();
        for reverse in [false, true] {
            let mut arena = Arena::new();
            let mut copies = Copies::new(&ctx);
            if reverse {
                for &rec in records.iter().rev() { append(&ctx, &mut copies, &mut arena, rec); }
            } else {
                for &rec in &records { append(&ctx, &mut copies, &mut arena, rec); }
            }
            copies.finish(&mut arena);
            assert!((0..1 << bits).any(|p| copies.a.len(p) > 0));
            assert!((0..1 << bits).any(|p| copies.b.len(p) > 0));
            let (winners, actual, _) = consume(&ctx, &copies, &mut arena);
            assert_eq!(winners, expected.len());
            assert_eq!(actual, expected, "bits={bits}, reverse={reverse}");
            arena.release();
        }
    }
}

#[test]
fn bitmap_false_positive_never_merges_distinct_mixed_lane_event_ids() {
    let ctx = context(4, 0);
    let mut by_slot = HashMap::new();
    let mut collision = None;
    for n in 1..100_000 {
        let key = ctx.event_ids.encode(format!("e{n:x}").as_bytes());
        let bucket_and_slot = event_hash(key) >> (64 - ctx.p1_bits - 10);
        if let Some(other) = by_slot.insert(bucket_and_slot, key) {
            if other != key { collision = Some((other, key)); break; }
        }
    }
    let (a, b) = collision.expect("bounded search must exercise a real bitmap collision");
    let user = ctx.users.encode(b"u1");
    let wide_user = ctx.users.encode(b"U-wide-user");
    let records = [
        EventRec { event: a, user, ingest: 2000, ts: 1000, payload: 0 },
        EventRec { event: b, user: wide_user, ingest: 1000, ts: 1000, payload: 9 },
        EventRec { event: a, user: Key::default(), ingest: 0, ts: INVALID, payload: 0 },
    ];
    let mut arena = Arena::new();
    let mut copies = Copies::new(&ctx);
    for rec in records { append(&ctx, &mut copies, &mut arena, rec); }
    copies.finish(&mut arena);
    let (winners, actual, _) = consume(&ctx, &copies, &mut arena);
    assert_eq!(winners, 1);
    assert_eq!(actual, [row(wide_user, 1000, 9)]);
    arena.release();
}

#[test]
fn mixed_lane_winners_survive_recycling_and_real_block_rollover() {
    let ctx = context(4, 0);
    let mut events = Vec::new();
    for n in 0..100_000 {
        let event = ctx.event_ids.encode(format!("e{n:x}").as_bytes());
        if event_hash(event) >> (64 - ctx.p1_bits) == 0 {
            events.push(event);
            if events.len() == 600 { break; }
        }
    }
    assert_eq!(events.len(), 600);
    let mut arena = Arena::new();
    let mut copies = Copies::new(&ctx);
    assert_eq!(copies.a.block_bytes(), 32 * ctx.p1_block);
    assert_eq!(copies.middle.block_bytes(), 32 * ctx.p1_block);
    assert_eq!(copies.b.block_bytes(), 32 * ctx.p1_block);
    let mut expected = Vec::new();
    for (i, &event) in events.iter().enumerate() {
        let ts = WEEK_MS as u32 + (i % 5) as u32 * 1000;
        let user = ctx.users.encode(format!("u{i:x}").as_bytes());
        let wide_user = ctx.users.encode(format!("opaque person {i}").as_bytes());
        let (early, later) = if i % 2 == 0 {
            (EventRec { event, user, ts, ingest: i64::from(ts), payload: 0 },
             EventRec { event, user: wide_user, ts, ingest: i64::from(ts) + 1000, payload: 1 })
        } else {
            (EventRec { event, user: wide_user, ts, ingest: i64::from(ts), payload: 17 },
             EventRec { event, user, ts, ingest: i64::from(ts) + 1000, payload: 0 })
        };
        expected.push(row(early.user, early.ts, early.payload));
        append(&ctx, &mut copies, &mut arena, early);
        append(&ctx, &mut copies, &mut arena, later);
    }
    copies.finish(&mut arena);
    assert_eq!(copies.a.len(0), 600);
    assert_eq!(copies.middle.len(0), 600);
    assert_eq!(copies.b.len(0), 0);
    let mut ranges: Vec<(usize, usize)> = copies.a.blocks(0).map(|p| (p as usize, copies.a.block_bytes())).collect();
    ranges.extend(copies.middle.blocks(0).map(|p| (p as usize, copies.middle.block_bytes())));
    ranges.extend(copies.b.blocks(0).map(|p| (p as usize, copies.b.block_bytes())));
    assert!(ranges.len() >= 20);
    let (winners, actual, output_blocks) = consume(&ctx, &copies, &mut arena);
    expected.sort_unstable();
    assert_eq!(winners, 600);
    assert_eq!(actual, expected);
    assert!(output_blocks.len() > 10);
    let piece = ctx.p2_block * std::mem::size_of::<PersonSmall>();
    assert_eq!(piece, 384);
    for (address, bytes) in output_blocks {
        assert_eq!(bytes, piece);
        assert!(ranges.iter().any(|&(start, size)| address >= start && address + bytes <= start + size),
            "every output block should use a copied-candidate P1 recycling piece");
    }
    arena.release();
}

#[test]
fn three_lanes_preserve_every_pairwise_winner_and_wide_invalid_suppression() {
    let ctx = context(4, -123);
    let event_ms = 604_800_000i64;
    let ts = u32::try_from(event_ms - ctx.cws).unwrap();
    let mut records = Vec::new();
    let mut expected = Vec::new();
    for winning_lane in 0..3 {
        for later_lane in 0..3 {
            let event = ctx.event_ids.encode(format!("e{winning_lane}{later_lane}").as_bytes());
            let make = |lane: usize, winner: bool| {
                let user = if lane == 2 {
                    ctx.users.encode(format!("U-wide-{winning_lane}-{later_lane}-{winner}").as_bytes())
                } else {
                    ctx.users.encode(format!("u{winning_lane}{later_lane}{}", u8::from(winner)).as_bytes())
                };
                let seconds = if lane == 2 { if winner { -20_000 } else { 20_000 } }
                    else if winner { 0 } else { 1 };
                EventRec { event, user, ts, ingest: event_ms + seconds * 1000,
                    payload: if lane == 0 { 0 } else if winner { 17 } else { 23 } }
            };
            let early = make(winning_lane, true);
            let late = make(later_lane, false);
            assert!(early.ingest < late.ingest);
            expected.push(row(early.user, early.ts, early.payload));
            records.extend([early, late]);
        }
    }
    // An extended event key puts an invalid whole-second copy in the middle
    // lane. It must suppress both a middle valid copy and a both-wide copy.
    for suffix in [b"000000001".as_slice(), b"000000002", b"000000003"] {
        let mut name = b"e".to_vec();
        name.extend_from_slice(suffix);
        let event = ctx.event_ids.encode(&name);
        let user = if suffix[8] == b'3' { ctx.users.encode(b"U-wide-winner") } else { ctx.users.encode(b"u1") };
        let valid = EventRec { event, user, ts, ingest: event_ms, payload: 31 };
        let invalid = EventRec { event, user: Key::default(), ts: INVALID,
            ingest: event_ms + if suffix[8] == b'1' { -1000 } else { 1000 }, payload: 0 };
        if suffix[8] == b'1' {
            records.push(EventRec { user: ctx.users.encode(b"U-wide-later"), ingest: event_ms + 2000, ..valid });
        } else {
            expected.push(row(valid.user, valid.ts, valid.payload));
        }
        records.extend([valid, invalid]);
    }
    expected.sort_unstable();
    for reverse in [false, true] {
        let mut arena = Arena::new();
        let mut copies = Copies::new(&ctx);
        if reverse {
            for &rec in records.iter().rev() { append(&ctx, &mut copies, &mut arena, rec); }
        } else {
            for &rec in &records { append(&ctx, &mut copies, &mut arena, rec); }
        }
        copies.finish(&mut arena);
        let count = |lane: usize| (0..1 << ctx.p1_bits).map(|p| match lane {
            0 => copies.a.len(p), 1 => copies.middle.len(p), _ => copies.b.len(p),
        }).sum::<usize>();
        assert_eq!([count(0), count(1), count(2)], [6, 11, 8]);
        let (winners, actual, _) = consume(&ctx, &copies, &mut arena);
        assert_eq!(winners, expected.len());
        assert_eq!(actual, expected, "reverse={reverse}");
        arena.release();
    }
}

#[test]
fn three_lane_candidates_are_copied_before_all_source_blocks_are_recycled() {
    let ctx = context(4, 0);
    let mut events = Vec::new();
    for n in 0..100_000 {
        let event = ctx.event_ids.encode(format!("e{n:x}").as_bytes());
        if event_hash(event) >> (64 - ctx.p1_bits) == 0 {
            events.push(event);
            if events.len() == 600 { break; }
        }
    }
    assert_eq!(events.len(), 600);
    let mut arena = Arena::new();
    let mut copies = Copies::new(&ctx);
    let mut expected = Vec::new();
    for (i, &event) in events.iter().enumerate() {
        let ts = WEEK_MS as u32 + (i % 7) as u32 * 1000;
        let short_user = ctx.users.encode(format!("u{i:x}").as_bytes());
        let middle_user = if i % 2 == 0 { short_user } else { ctx.users.encode(format!("U-mid-{i}").as_bytes()) };
        let wide_user = ctx.users.encode(format!("U-full-{i}").as_bytes());
        let winner = i % 3;
        let small = EventRec { event, user: short_user, ts, ingest: i64::from(ts) + if winner == 0 { 0 } else { 1000 }, payload: 0 };
        let middle = EventRec { event, user: middle_user, ts, ingest: i64::from(ts) + if winner == 1 { 0 } else { 2000 }, payload: 17 };
        let wide = EventRec { event, user: wide_user, ts, ingest: i64::from(ts) + if winner == 2 { -20_000_000 } else { 20_000_000 }, payload: 23 };
        let rows = [small, middle, wide];
        let early = rows[winner];
        expected.push(row(early.user, early.ts, early.payload));
        for rec in rows { append(&ctx, &mut copies, &mut arena, rec); }
    }
    copies.finish(&mut arena);
    assert_eq!([copies.a.len(0), copies.middle.len(0), copies.b.len(0)], [600, 600, 600]);
    let bytes = 32 * ctx.p1_block;
    assert_eq!([copies.a.block_bytes(), copies.middle.block_bytes(), copies.b.block_bytes()], [bytes; 3]);
    let mut ranges: Vec<_> = copies.a.blocks(0).map(|p| (p as usize, bytes)).collect();
    ranges.extend(copies.middle.blocks(0).map(|p| (p as usize, bytes)));
    ranges.extend(copies.b.blocks(0).map(|p| (p as usize, bytes)));
    assert!(ranges.len() > 35);
    let (winners, actual, blocks) = consume(&ctx, &copies, &mut arena);
    expected.sort_unstable();
    assert_eq!(winners, 600);
    assert_eq!(actual, expected);
    assert!(blocks.len() > 10);
    for (address, size) in blocks {
        assert_eq!(size, 16 * ctx.p2_block);
        assert!(ranges.iter().any(|&(start, bytes)| address >= start && address + size <= start + bytes),
            "all output pieces must come from the already decoded three-lane candidates");
    }
    arena.release();
}
