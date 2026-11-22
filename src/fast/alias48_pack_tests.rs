use super::*;
use super::raw48_tests::context;
use super::person48::{KEY_MASK, MIN_PARTITION_BITS, TIME_MAX, person_hash48};

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
fn raw_table_growth_preserves_direct_clicks_after_canonical_name_rewrite() {
    let mut ctx = context();
    ctx.p2_bits = MIN_PARTITION_BITS;
    ctx.organic = 2;
    ctx.campaigns = SmallMap::new(&[(keys::intern(b"g0"), 0), (keys::intern(b"g1"), 1)]);
    let raw_part = 13;
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
            if part_of(key, ctx.p2_bits) == raw_part {
                chosen.push((name, key));
                if chosen.len() - start == 64 { break; }
            }
        }
        assert_eq!(chosen.len() - start, 64);
    }
    let root_name = (0..1000).map(|i| format!("!root{i}"))
        .find(|name| part_of(ctx.users.encode(name.as_bytes()), ctx.p2_bits) != raw_part).unwrap();
    let root = ctx.users.encode(root_name.as_bytes());
    let click_only = ctx.users.encode(b"z-click-only");
    let mut pairs: Vec<_> = chosen.iter().enumerate().filter(|(i, _)| i % 2 == 0)
        .map(|(_, (_, key))| (root, *key)).collect();
    pairs.push((root, click_only));
    let people = People::build(&pairs, &ctx.users);
    for (i, (_, key)) in chosen.iter().enumerate() {
        assert_eq!(people.resolve(*key), if i % 2 == 0 { (root, true) } else { (*key, false) });
    }

    let mut arena = Arena::new();
    let parts = 1 << ctx.p2_bits;
    let mut events: Persons = Pair::new(parts, ctx.p2_block * 2, ctx.p2_block * 2 / 3);
    let mut emit = Emit { bits: ctx.p2_bits, layout: PersonLayout::new(ctx.p2_bits), winners: 0 };
    let mut click_text = String::new();
    for (i, (name, key)) in chosen.iter().enumerate() {
        let ts = WEEK_MS as u32 + i as u32 * 1000;
        emit.push(*key, ts, 0, &mut events, &mut arena);
        emit.push(*key, ts + 1, 0, &mut events, &mut arena);
        emit.push(*key, ts + 2, (1 << 24) | 2, &mut events, &mut arena);
        click_text.push_str(&format!("k{i},{name},g{},{}\n", i % 2, ctx.cws + i64::from(ts)));
    }
    // A canonical root with its own event is still linked and must wait.
    emit.push(root, WEEK_MS as u32, 0, &mut events, &mut arena);
    assert_eq!(emit.winners, 769);
    events.finish(&mut arena);
    assert_eq!((0..parts).map(|p| events.a.len(p)).sum::<usize>(), 64);
    assert_eq!((0..parts).map(|p| events.b.len(p)).sum::<usize>(), 705);
    click_text.push_str(&format!("K0,z-click-only,g0,{}\nkorphan,Orphan,g1,{}\n", ctx.ws, ctx.ws));
    let mut clicks = new_clicks(&ctx);
    assert_eq!(parse_clicks(&ctx, &people, click_text.as_bytes(), &mut arena, &mut clicks), 258);
    clicks.finish(&mut arena);
    assert_eq!((0..parts).map(|p| clicks.len(p)).sum::<usize>(), 129);
    assert_eq!((parts..2 * parts).map(|p| clicks.len(p)).sum::<usize>(), 129);

    let mut worker = Worker::new(&ctx);
    let mut store = alias::Store::new(ctx.p2_bits);
    // Process the dense raw partition first so the growth and rewrite seam is
    // inspected before a later partition legitimately resets the local table.
    worker.compress_aliases(&ctx, &[&events], &[&clicks], raw_part, &people, &mut store);
    assert!(worker.local_ids.len() >= 512);
    assert!(!worker.persons.contains(&chosen[0].1));
    assert!(worker.persons.contains(&root));
    assert!(worker.local_keys.contains(&PersonIdentity::from_key(chosen[0].1)),
        "canonical output names must not overwrite the raw identity table");
    for p in 0..parts {
        if p != raw_part { worker.compress_aliases(&ctx, &[&events], &[&clicks], p, &people, &mut store); }
    }
    assert_eq!(worker.rows.totals(), [128, 128, 384, 256]);
    assert_eq!(&worker.credit[..3], &[[0; 3], [128, 128, 256], [0; 3]]);
    assert_eq!(&worker.assist[..3], &[0, 128, 0]);
    assert_eq!((store.aliases, store.direct_users, store.direct_events), (129, 128, 384));
    assert_eq!((store.plain.len(), store.paid.len()), (257, 128));
    let root_part = part_of(root, ctx.p2_bits);
    assert_ne!(root_part, raw_part);
    assert!(store.routes.iter().enumerate().all(|(p, runs)| p == root_part || runs.is_empty()));

    let mut canonical = Worker::new(&ctx);
    for p in 0..parts { canonical.partition_aliases(&ctx, &[&store], &[&clicks], p); }
    let mut expected = write::Part::default();
    expected.push(root, 0, [1, 385, 256], 1);
    assert_eq!(canonical.rows, expected);
    assert_eq!(&canonical.credit[..3], &[[1, 1, 256], [0; 3], [0; 3]]);
    assert_eq!(&canonical.assist[..3], &[1, 0, 0]);
    arena.release();
}

#[test]
fn three_event_lanes_recycle_into_both_raw_person_lanes_before_alias_join() {
    let mut ctx = context();
    ctx.p2_bits = MIN_PARTITION_BITS;
    ctx.organic = 1;
    ctx.campaigns = SmallMap::new(&[(keys::intern(b"g0"), 0)]);
    let root = ctx.users.encode(b"u0");
    let alias = ctx.users.encode(b"u000000001");
    let people = People::build(&[(root, alias)], &ctx.users);
    let mut names = Vec::new();
    for i in 0..100_000u32 {
        let name = format!("e{i:x}");
        if event_hash(ctx.event_ids.encode(name.as_bytes())) >> (64 - ctx.p1_bits) == 0 {
            names.push(name);
            if names.len() == 600 { break; }
        }
    }
    assert_eq!(names.len(), 600);
    let mut input = String::new();
    let mut expected_raw = Vec::new();
    for (i, name) in names.iter().enumerate() {
        let absolute = ctx.ws + i as i64 * 1000;
        let ts = u32::try_from(absolute - ctx.cws).unwrap();
        let (small_ingest, middle_ingest, full_ingest, user, payload) = match i % 3 {
            0 => ("2028-03-01T01:00:00Z", "2028-03-01T01:00:01Z", "2028-03-01T12:00:00Z", root, 0),
            1 => ("2028-03-01T01:00:01Z", "2028-03-01T01:00:00Z", "2028-03-01T12:00:00Z", root, 3),
            _ => ("2028-03-01T01:00:00Z", "2028-03-01T01:00:01Z", "2028-02-29T18:26:40Z", alias, 0),
        };
        input.push_str(&format!("{name},u0,{absolute},{small_ingest},view,p,ignored\n"));
        input.push_str(&format!("{name},u0,{absolute},{middle_ingest},purchase,p,3\n"));
        input.push_str(&format!("{name},u000000001,{absolute},{full_ingest},view,p,ignored\n"));
        expected_raw.push((user.hi, user.lo, ts, payload));
    }
    expected_raw.sort_unstable();
    let mut arena = Arena::new();
    let mut copies = Copies::new(&ctx);
    assert_eq!(parse_events(&ctx, input.as_bytes(), &mut arena, &mut copies), 1800);
    copies.finish(&mut arena);
    assert_eq!([copies.a.len(0), copies.middle.len(0), copies.b.len(0)], [600; 3]);
    assert!((1..1 << ctx.p1_bits).all(|p| copies.len(p) == 0));
    let bytes = 32 * ctx.p1_block;
    assert_eq!([copies.a.block_bytes(), copies.middle.block_bytes(), copies.b.block_bytes()], [bytes; 3]);
    let ranges: Vec<_> = copies.a.blocks(0).chain(copies.middle.blocks(0)).chain(copies.b.blocks(0))
        .map(|ptr| (ptr as usize, ptr as usize + bytes)).collect();
    assert!(ranges.len() > 30);
    let parts = 1 << ctx.p2_bits;
    let mut events: Persons = Pair::new(parts, ctx.p2_block * 2, ctx.p2_block * 2 / 3);
    let (mut once, mut twice, mut candidates, mut table) = (Vec::new(), Vec::new(), Vec::new(), Vec::new());
    assert_eq!(dedup(&ctx, &[&copies], 0, &mut once, &mut twice, &mut candidates,
        &mut table, &mut arena, &mut events), 600);
    events.finish(&mut arena);
    assert_eq!((0..parts).map(|p| events.a.len(p)).sum::<usize>(), 200);
    assert_eq!((0..parts).map(|p| events.b.len(p)).sum::<usize>(), 400);
    let piece = 16 * ctx.p2_block;
    assert_eq!(events.a.block_bytes(), piece);
    assert_eq!(events.b.block_bytes(), piece);
    let layout = PersonLayout::new(ctx.p2_bits).unwrap();
    let mut actual_raw = Vec::new();
    let mut blocks = 0;
    for p in 0..parts {
        for ptr in events.a.blocks(p).chain(events.b.blocks(p)) {
            let address = ptr as usize;
            assert!(ranges.iter().any(|&(start, end)| start <= address && address + piece <= end),
                "candidate expansion must precede recycling into either P2 lane");
            blocks += 1;
        }
        for rec in events.a.slices(p).flatten() {
            let user = rec.identity(p, &layout).to_key();
            actual_raw.push((user.hi, user.lo, rec.ts(&layout), 0));
        }
        for rec in events.b.slices(p).flatten() {
            actual_raw.push((rec.person.hi, rec.person.lo, rec.ts, rec.payload));
        }
    }
    assert!(blocks > 10);
    actual_raw.sort_unstable();
    assert_eq!(actual_raw, expected_raw);
    let mut clicks = new_clicks(&ctx);
    assert_eq!(parse_clicks(&ctx, &people,
        b"k0,u000000001,g0,2028-03-01T00:00:00Z\n", &mut arena, &mut clicks), 1);
    clicks.finish(&mut arena);
    let mut raw = Worker::new(&ctx);
    let mut store = alias::Store::new(ctx.p2_bits);
    for p in 0..parts { raw.compress_aliases(&ctx, &[&events], &[&clicks], p, &people, &mut store); }
    assert_eq!(raw.rows.len(), 0);
    assert_eq!((store.aliases, store.plain.len(), store.paid.len()), (2, 400, 200));
    let mut canonical = Worker::new(&ctx);
    for p in 0..parts { canonical.partition_aliases(&ctx, &[&store], &[&clicks], p); }
    let mut expected = write::Part::default();
    expected.push(root, 0, [1, 600, 600], 0);
    assert_eq!(canonical.rows, expected);
    assert_eq!(&canonical.credit[..2], &[[1, 1, 600], [0; 3]]);
    assert_eq!(&canonical.assist[..2], &[1, 0]);
    arena.release();
}

