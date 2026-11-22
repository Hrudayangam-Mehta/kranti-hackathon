use super::*;
use super::raw48_tests::context;
use super::person48::{KEY_MASK, MIN_PARTITION_BITS, TIME_MAX, person_hash48};
use std::collections::BTreeSet;

fn emit_records(ctx: &Ctx, people: &People, records: &[(Key, u32, u32)], arena: &mut Arena) -> Persons {
    let mut output = Pair::new(1 << ctx.p2_bits, ctx.p2_block * 2, ctx.p2_block * 2 / 3);
    let mut emit = Emit {
        people, bits: ctx.p2_bits, layout: PersonLayout::new(ctx.p2_bits),
        ring: [(Key::default(), 0, 0); RING], head: 0, len: 0, winners: 0,
    };
    for &(user, ts, payload) in records {
        emit.push(user, ts, payload, &mut output, arena);
    }
    emit.flush(&mut output, arena);
    assert_eq!(emit.winners, records.len());
    output.finish(arena);
    output
}

fn click_rows(ctx: &Ctx, people: &People, rows: &str, expected: usize, arena: &mut Arena) -> Clicks {
    let mut output = Pair::new(1 << ctx.p2_bits, ctx.click_block, ctx.click_block / 2);
    assert_eq!(parse_clicks(ctx, people, rows.as_bytes(), arena, &mut output), expected);
    output.finish(arena);
    output
}

#[test]
fn reversible_identity_preserves_raw_keys_and_wide_tags() {
    let mut state = 0x6a09_e667_f3bc_c909u64;
    for _ in 0..4096 {
        state = state.wrapping_mul(0x5851_f42d_4c95_7f2d).wrapping_add(1);
        let key = Key { hi: 0, lo: state & KEY_MASK };
        let identity = PersonIdentity::from_key(key);
        assert_eq!(identity.to_key(), key);
        assert_eq!(identity.hash(), person_hash48(key));
    }
    let domain = Domain::with_prefix(b'u');
    let short = domain.encode(b"u00000001");
    let identity = PersonIdentity::from_key(short);
    let text = format!("u123456789abcdef0{:016x}", identity.0.lo);
    let wide = domain.encode(text.as_bytes());
    assert_eq!(wide.lo, identity.0.lo);
    assert_ne!(wide.hi, 0);
    assert_ne!(PersonIdentity::from_key(wide), identity);
    assert_eq!(PersonIdentity::from_key(wide).to_key(), wide);
    for text in [b"u000000001".as_slice(), b"u00000000000", b"U0", b"ufffffffffffffffe0000000000000000"] {
        let key = domain.encode(text);
        assert_ne!(key.hi, 0);
        let identity = PersonIdentity::from_key(key);
        assert_eq!(identity.0, key);
        assert_eq!(identity.to_key(), key);
        assert_eq!(identity.hash(), key.hash());
    }
}

#[test]
fn compact_person_roundtrips_all_widths_and_inclusive_time_boundary() {
    let domain = Domain::with_prefix(b'u');
    let shorts = [b"u0".as_slice(), b"u00", b"u00000000", b"u00000001", b"uzzzzzzzz", b"u ", b"u?", b"u`", b"u~", b"u~~~~~~~~"];
    for bits in MIN_PARTITION_BITS..=14 {
        let layout = PersonLayout::new(bits).unwrap();
        for text in shorts {
            let key = domain.encode(text);
            let identity = PersonIdentity::from_key(key);
            let part = identity.part(bits);
            for seconds in [0, 1, 1800, 604800, TIME_MAX - 1, TIME_MAX] {
                let ts = seconds * 1000;
                let record = PersonSmall::new(identity, ts, 0, Some(&layout)).unwrap();
                assert_eq!(record.identity(part, &layout), identity);
                assert_eq!(record.identity(part, &layout).to_key(), key);
                assert_eq!(record.ts(&layout), ts);
            }
            for ts in [1, 999, 1001, (TIME_MAX + 1) * 1000, TIME_MAX * 1000 + 1, INVALID] {
                assert!(PersonSmall::new(identity, ts, 0, Some(&layout)).is_none());
            }
            for payload in [1, 1 << 24, u32::MAX] {
                assert!(PersonSmall::new(identity, 1000, payload, Some(&layout)).is_none());
            }
        }
        for text in [b"u000000001".as_slice(), b"u0123456789abcdef0123456789abcdef", b"U0"] {
            assert!(PersonSmall::new(PersonIdentity::from_key(domain.encode(text)), 1000, 0, Some(&layout)).is_none());
        }
        assert!(PersonSmall::new(PersonIdentity::default(), 1000, 0, Some(&layout)).is_none());
    }
    for bits in (0..MIN_PARTITION_BITS).chain(15..=64) {
        assert!(PersonLayout::new(bits).is_none());
        let identity = PersonIdentity::from_key(domain.encode(b"u0"));
        assert!(PersonSmall::new(identity, 1000, 0, PersonLayout::new(bits).as_ref()).is_none());
    }
}

#[test]
fn zero_and_all_ones_compact_words_are_data_not_sentinels() {
    let layout = PersonLayout::new(MIN_PARTITION_BITS).unwrap();
    assert_eq!(layout.remainder_bits, 43);
    // The partition supplies the nonzero high identity bits even when every
    // stored remainder/time bit is zero. Neither endpoint is a missing record.
    let low = PersonIdentity(Key { hi: 0, lo: 1 << layout.remainder_bits });
    let zero = PersonSmall::new(low, 0, 0, Some(&layout)).unwrap();
    assert_eq!(low.part(MIN_PARTITION_BITS), 1);
    assert_eq!(zero.value, 0);
    assert_eq!(zero.identity(1, &layout), low);
    assert_eq!(zero.ts(&layout), 0);
    let high = PersonIdentity(Key { hi: 0, lo: KEY_MASK });
    let full = PersonSmall::new(high, TIME_MAX * 1000, 0, Some(&layout)).unwrap();
    assert_eq!(high.part(MIN_PARTITION_BITS), 31);
    assert_eq!(full.value, u64::MAX);
    assert_eq!(full.identity(31, &layout), high);
    assert_eq!(full.ts(&layout), TIME_MAX * 1000);
}

#[test]
fn mixed_lanes_join_canonical_clicks_and_keep_session_boundaries() {
    let mut ctx = context();
    ctx.p2_bits = MIN_PARTITION_BITS;
    ctx.organic = 3;
    ctx.campaigns = SmallMap::new(&[(keys::intern(b"c0"), 0), (keys::intern(b"c1"), 1), (keys::intern(b"c2"), 2)]);
    let links = [
        ("u0", "u0123456789abcdef0123456789abcdef"),
        ("u0123456789abcdef0123456789abcdef", "u000000001"),
        ("u000000001", "uA"),
        ("uz", "u123456789abcdef0123456789abcdef0"),
        ("u200000001", "u123456789abcdef0123456789abcdef0"),
        ("u3", "u000000002"),
        ("u4", "U0"),
    ];
    let pairs: Vec<_> = links.iter().map(|(a, b)| (ctx.users.encode(a.as_bytes()), ctx.users.encode(b.as_bytes()))).collect();
    let people = People::build(&pairs, &ctx.users);
    let base = WEEK_MS as u32;
    let rows = [
        ("u0", base, 0),
        ("u0123456789abcdef0123456789abcdef", base + 1000, 7),
        ("u000000001", base + 1001, 0),
        ("uA", base + GAP_MS + 1000, 0),
        ("u0", base + 2 * GAP_MS + 1001, 0),
        ("uz", base + 2000, 0),
        ("u3", base + 2000, 0),
        ("u4", base + 2000, 11),
    ];
    let records: Vec<_> = rows.iter().map(|(u, ts, payload)| (ctx.users.encode(u.as_bytes()), *ts, *payload)).collect();
    let click_input = [
        ("k0", "uA", 0, base),
        ("k000000000", "u0123456789abcdef0123456789abcdef", 1, base),
        ("K0", "u000000001", 2, base),
        ("k9", "u0", 0, base + GAP_MS + 1001),
        ("k2", "uz", 1, base),
        ("k3", "u3", 1, base),
        ("k4", "u4", 0, base),
    ].iter().map(|(click, user, campaign, ts)| format!("{click},{user},c{campaign},{}\n", ctx.cws + i64::from(*ts))).collect::<String>();
    let mut arena = Arena::new();
    let events = emit_records(&ctx, &people, &records, &mut arena);
    let clicks = click_rows(&ctx, &people, &click_input, 7, &mut arena);
    let parts = 1 << ctx.p2_bits;
    assert_eq!((0..parts).map(|p| events.a.len(p)).sum::<usize>(), 2);
    assert_eq!((0..parts).map(|p| events.b.len(p)).sum::<usize>(), 6);
    assert_eq!((0..parts).map(|p| clicks.a.len(p)).sum::<usize>(), 2);
    assert_eq!((0..parts).map(|p| clicks.b.len(p)).sum::<usize>(), 5);
    let mut worker = Worker::new(&ctx);
    let mut names = BTreeSet::new();
    for part in 0..parts {
        if events.len(part) == 0 { continue; }
        worker.partition(&ctx, &[&events], &[&clicks], part);
        for &key in &worker.persons {
            let mut name = Vec::new();
            ctx.users.bytes_of(key, &mut name);
            names.insert(name);
        }
    }
    let expected: BTreeSet<_> = [b"u0".to_vec(), b"u123456789abcdef0123456789abcdef0".to_vec(), b"u000000002".to_vec(), b"U0".to_vec()].into_iter().collect();
    assert_eq!(names, expected);
    assert_eq!(worker.rows.totals(), [4, 5, 8, 18]);
    assert_eq!(&worker.credit[..4], &[[2, 1, 11], [2, 0, 0], [1, 1, 7], [0, 0, 0]]);
    assert_eq!(&worker.assist[..3], &[3, 4, 2]);
    arena.release();
}

#[test]
fn local_table_growth_keeps_hash_identities_and_original_output_names() {
    let mut ctx = context();
    ctx.p2_bits = MIN_PARTITION_BITS;
    ctx.organic = 1;
    ctx.campaigns = SmallMap::new(&[(keys::intern(b"c0"), 0)]);
    let part = 13;
    let mut chosen = Vec::new();
    for family in 0..4 {
        let start = chosen.len();
        for i in 0..200_000u32 {
            let name = match family {
                0 => format!("u{i:08x}"),
                1 => format!("u{i:09x}"),
                2 => format!("u123456789abcdef0{i:016x}"),
                _ => format!("U{i}"),
            };
            let key = ctx.users.encode(name.as_bytes());
            if PersonIdentity::from_key(key).part(ctx.p2_bits) == part {
                chosen.push((name, key));
                if chosen.len() - start == 64 { break; }
            }
        }
        assert_eq!(chosen.len() - start, 64, "each identity family must exercise the same growing table");
    }
    let base = WEEK_MS as u32;
    let records: Vec<_> = chosen.iter().enumerate().map(|(i, (_, key))| {
        (*key, base + i as u32 * 1000 + u32::from(i % 3 == 0), if i % 5 == 0 { 3 } else { 0 })
    }).collect();
    let click_input = chosen.iter().enumerate().map(|(i, (name, _))| format!("k{i},{name},c0,{}\n", ctx.ws)).collect::<String>();
    let people = People::build(&[], &ctx.users);
    let mut arena = Arena::new();
    let events = emit_records(&ctx, &people, &records, &mut arena);
    let clicks = click_rows(&ctx, &people, &click_input, chosen.len(), &mut arena);
    assert!(events.a.len(part) > 0);
    assert!(events.b.len(part) > 0);
    assert_eq!(events.len(part), chosen.len());
    let mut worker = Worker::new(&ctx);
    worker.partition(&ctx, &[&events], &[&clicks], part);
    assert!(worker.local_ids.len() >= 512, "test must traverse multiple local-table growth steps");
    let actual: BTreeSet<_> = worker.persons.iter().map(|&key| {
        let mut bytes = Vec::new();
        ctx.users.bytes_of(key, &mut bytes);
        bytes
    }).collect();
    let expected: BTreeSet<_> = chosen.iter().map(|(name, _)| name.as_bytes().to_vec()).collect();
    assert_eq!(actual, expected);
    let conversions = records.iter().filter(|r| r.2 > 0).count() as u64;
    let revenue = records.iter().map(|r| u64::from(r.2)).sum::<u64>();
    assert_eq!(worker.rows.totals(), [256, 256, 256, revenue]);
    assert_eq!(worker.credit[0], [256, conversions, revenue]);
    arena.release();
}

#[test]
fn small_partition_fallback_keeps_fractional_and_purchase_fields() {
    for bits in 4..MIN_PARTITION_BITS {
        let mut ctx = context();
        ctx.p2_bits = bits;
        ctx.organic = 1;
        ctx.campaigns = SmallMap::new(&[(keys::intern(b"c0"), 0)]);
        let person = ctx.users.encode(b"u00");
        let base = WEEK_MS as u32;
        let records = [(person, base, 0), (person, base + 1, 0), (person, base + 1000, 9)];
        let people = People::build(&[], &ctx.users);
        let mut arena = Arena::new();
        let events = emit_records(&ctx, &people, &records, &mut arena);
        let click_input = format!("k0,u00,c0,{}\n", ctx.ws);
        let clicks = click_rows(&ctx, &people, &click_input, 1, &mut arena);
        let part = PersonIdentity::from_key(person).part(bits);
        assert_eq!(events.a.len(part), 0);
        assert_eq!(events.b.len(part), 3);
        let mut worker = Worker::new(&ctx);
        worker.partition(&ctx, &[&events], &[&clicks], part);
        assert_eq!(worker.persons, vec![person]);
        assert_eq!(worker.rows.totals(), [1, 1, 3, 9]);
        assert_eq!(worker.credit[0], [1, 1, 9]);
        arena.release();
    }
}

#[test]
fn dedup_recycles_input_blocks_across_both_person_lane_rollovers() {
    let mut ctx = context();
    ctx.p2_bits = MIN_PARTITION_BITS;
    ctx.organic = 1;
    ctx.campaigns = SmallMap::new(&[(keys::intern(b"c0"), 0)]);
    let mut input = String::new();
    for i in 0..600u32 {
        let ts = ctx.ws + i64::from(i) * 1000 + i64::from(i % 7 == 0);
        let (kind, price) = if i % 5 == 0 { ("purchase", "7") } else { ("view", "ignored") };
        input.push_str(&format!("e{i:06x},u0,{ts},2028-03-01T01:00:00Z,{kind},p,{price}\n"));
    }
    let people = People::build(&[], &ctx.users);
    let mut arena = Arena::new();
    let mut copies = Copies::new(&ctx);
    assert_eq!(parse_events(&ctx, input.as_bytes(), &mut arena, &mut copies), 600);
    copies.finish(&mut arena);
    let mut input_ranges = Vec::new();
    for part in 0..1 << ctx.p1_bits {
        for ptr in copies.a.blocks(part) {
            input_ranges.push((ptr as usize, ptr as usize + copies.a.block_bytes()));
        }
        for ptr in copies.middle.blocks(part) {
            input_ranges.push((ptr as usize, ptr as usize + copies.middle.block_bytes()));
        }
        for ptr in copies.b.blocks(part) {
            input_ranges.push((ptr as usize, ptr as usize + copies.b.block_bytes()));
        }
    }
    let mut output: Persons = Pair::new(1 << ctx.p2_bits, ctx.p2_block * 2, ctx.p2_block * 2 / 3);
    let mut once = Vec::new();
    let mut twice = Vec::new();
    let mut candidates = Vec::new();
    let mut table = Vec::new();
    let mut winners = 0;
    for part in 0..1 << ctx.p1_bits {
        winners += dedup(&ctx, &people, &[&copies], part, &mut once, &mut twice, &mut candidates, &mut table, &mut arena, &mut output);
    }
    output.finish(&mut arena);
    assert_eq!(winners, 600);
    let person = ctx.users.encode(b"u0");
    let part = PersonIdentity::from_key(person).part(ctx.p2_bits);
    assert_eq!(output.len(part), 600);
    assert!(output.a.blocks(part).count() >= 2);
    assert!(output.b.blocks(part).count() >= 2);
    let piece = output.a.block_bytes();
    assert_eq!(piece, output.b.block_bytes());
    let reused = output.a.blocks(part).chain(output.b.blocks(part)).filter(|&ptr| {
        let p = ptr as usize;
        input_ranges.iter().any(|&(start, end)| start <= p && p + piece <= end)
    }).count();
    assert!(reused > 0, "test must consume actual recycled P1 memory, not only fresh allocations");
    let click_input = format!("k0,u0,c0,{}\n", ctx.ws);
    let clicks = click_rows(&ctx, &people, &click_input, 1, &mut arena);
    let mut worker = Worker::new(&ctx);
    worker.partition(&ctx, &[&output], &[&clicks], part);
    assert_eq!(worker.persons, vec![person]);
    assert_eq!(worker.rows.totals(), [1, 1, 600, 840]);
    assert_eq!(worker.credit[0], [1, 1, 840]);
    arena.release();
}

#[test]
fn fractional_window_anchor_preserves_exact_relative_milliseconds() {
    let mut ctx = context();
    let absolute_second = ctx.ws + 1000;
    ctx.ws += 1;
    ctx.we += 1;
    ctx.cws += 1;
    ctx.day_shift += 1;
    ctx.event_layout = EventLayout::new(ctx.p1_bits, ctx.cws).unwrap();
    ctx.p2_bits = MIN_PARTITION_BITS;
    let input = format!(
        "e0,u0,{absolute_second},2028-03-01T01:00:00Z,view,p,ignored\ne1,u0,{},2028-03-01T01:00:00Z,view,p,ignored\n",
        absolute_second + 1,
    );
    let people = People::build(&[], &ctx.users);
    let mut arena = Arena::new();
    let mut copies = Copies::new(&ctx);
    assert_eq!(parse_events(&ctx, input.as_bytes(), &mut arena, &mut copies), 2);
    copies.finish(&mut arena);
    let mut output: Persons = Pair::new(1 << ctx.p2_bits, ctx.p2_block * 2, ctx.p2_block * 2 / 3);
    let (mut once, mut twice, mut candidates, mut table) = (Vec::new(), Vec::new(), Vec::new(), Vec::new());
    let mut winners = 0;
    for q in 0..1 << ctx.p1_bits {
        winners += dedup(&ctx, &people, &[&copies], q, &mut once, &mut twice, &mut candidates, &mut table, &mut arena, &mut output);
    }
    output.finish(&mut arena);
    assert_eq!(winners, 2);
    let person = ctx.users.encode(b"u0");
    let part = PersonIdentity::from_key(person).part(ctx.p2_bits);
    assert_eq!(output.a.len(part), 1);
    assert_eq!(output.b.len(part), 1);
    let layout = PersonLayout::new(ctx.p2_bits).unwrap();
    let compact: Vec<_> = output.a.slices(part).flatten().map(|r| r.ts(&layout)).collect();
    let wide: Vec<_> = output.b.slices(part).flatten().map(|r| r.ts).collect();
    // Absolute whole seconds are fractional relative to this anchor; an
    // absolute millisecond ending in001 is exactly representable instead.
    assert_eq!(compact, vec![WEEK_MS as u32 + 1000]);
    assert_eq!(wide, vec![WEEK_MS as u32 + 999]);
    let mut worker = Worker::new(&ctx);
    worker.partition(&ctx, &[&output], &[], part);
    assert_eq!(worker.persons, vec![person]);
    assert_eq!(worker.rows.totals(), [1, 1, 2, 0]);
    arena.release();
}

#[test]
fn both_person_lanes_preserve_original_recycling_piece_bytes() {
    for block in (24..=504).step_by(24) {
        let small = Sink::<PersonSmall>::new(1, block * 2);
        let wide = Sink::<PersonRec>::new(1, block * 2 / 3);
        assert_eq!(small.block_bytes(), block * 16);
        assert_eq!(small.block_bytes(), wide.block_bytes());
        assert_eq!(small.block_bytes() % 64, 0);
    }
}
