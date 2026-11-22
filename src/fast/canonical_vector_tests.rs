// Scanner entry receipts are test-only and thread-local. The fixture is
// independently continued through the canonical PersonIdentity/output pipeline;
// it does not import the alias owner's two-half click bucket assumptions.
use super::*;
use super::raw48_tests::context;

#[test]
fn native_dispatch_preserves_canonical_packed_rows_and_clicks() {
    fn receipt(expected: usize) {
        let counts = scan::take_kernel_calls();
        assert!(counts[expected] > 0, "expected kernel {expected}: {counts:?}");
        for (kernel, &count) in counts.iter().enumerate() {
            if kernel != expected { assert_eq!(count, 0, "mixed dispatch: {counts:?}"); }
        }
    }
    fn decode(ctx: &Ctx, copies: &Copies) -> Vec<(u64, u64, u64, u64, i64, u32, u32)> {
        let mut rows = Vec::new();
        for p in 0..1 << ctx.p1_bits {
            let mut add = |r: EventRec| rows.push((r.event.hi, r.event.lo, r.user.hi,
                r.user.lo, r.ingest, r.ts, r.payload));
            for r in copies.a.slices(p).flatten() { add(ctx.event_layout.decode(r, p)); }
            for r in copies.middle.slices(p).flatten() { add(r.decode(ctx.cws)); }
            for r in copies.b.slices(p).flatten() { add(*r); }
        }
        rows.sort_unstable();
        rows
    }
    let mut ctx = context();
    ctx.p2_bits = 5;
    let parts = 1usize << ctx.p2_bits;
    ctx.products = SmallMap::new(&[(keys::intern(b"p"), 1)]);
    ctx.campaigns = SmallMap::new(&[(keys::intern(b"g0"), 0), (keys::intern(b"g1"), 1)]);
    ctx.organic = 2;
    let native = if scan::has_avx512() { 2 } else if scan::has_avx2() { 1 } else { 0 };
    eprintln!("scanner entry dispatch: kernel {native} (0 scalar,1 AVX2,2 AVX512)");
    static LINKS: &[u8] = b"left,right\n\"u0\",\"u9\"\nu9,u000000001\nu2,u3\nbad\"quote,u4\nu4,u5,extra\n";
    scan::take_kernel_calls();
    let people = build_people(&[LINKS], &ctx.users);
    receipt(native);
    assert_eq!(people.linked(), 5);
    for name in [b"u0".as_slice(), b"u9", b"u000000001"] {
        assert_eq!(people.name_of(ctx.users.encode(name)), ctx.users.encode(b"u0"));
    }
    assert_eq!(people.name_of(ctx.users.encode(b"u8")), ctx.users.encode(b"u8"));
    let expected_pairs = vec![
        (ctx.users.encode(b"u0"), ctx.users.encode(b"u9")),
        (ctx.users.encode(b"u9"), ctx.users.encode(b"u000000001")),
        (ctx.users.encode(b"u2"), ctx.users.encode(b"u3")),
    ];
    let events = concat!(
        "\"e0\",\"u0\",2028-03-01T00:00:00Z,2028-03-01T00:00:00Z,view,p,ignored\n",
        "e1,u000000001,2028-03-01T00:00:01Z,2028-03-01T00:00:01Z,purchase,p,7\n",
        "e000000001,u000000001,2028-03-01T00:00:02Z,2028-03-01T00:00:02Z,view,p,ignored\n",
        "ebad,u0,invalid,2028-03-01T00:00:00Z,view,p,ignored\n",
        "e\"broken,u0,2028-03-01T00:00:00Z,2028-03-01T00:00:00Z,view,p,ignored\n",
        "e2,u0,2028-03-01T00:00:03Z,2028-03-01T00:00:03Z,view,p,ignored",
    ).as_bytes();
    let clicks = concat!(
        "\"k0\",\"u9\",g0,2028-03-01T00:00:00Z\n",
        "k000000001,u0,g1,2028-03-01T00:00:01Z\n",
        "k2,u8,g1,2028-03-01T00:00:02Z\n",
        "k\"bad,u0,g0,2028-03-01T00:00:00Z\n",
        "K0,u3,g0,2028-03-01T00:00:03Z",
    ).as_bytes();
    let mut event_control = None;
    let mut click_control = None;
    // Scalar is the first reference. Direct vector calls are separately
    // guarded and the final iteration invokes the real entry dispatch.
    for mode in [0usize, 1, 2, 3] {
        if mode == 1 && !scan::has_avx2() || mode == 2 && !scan::has_avx512() { continue; }
        let expected_kernel = if mode == 3 { native } else { mode };
        let mut pairs = Vec::new();
        let body = &LINKS[LINKS.iter().position(|&b| b == b'\n').unwrap() + 1..];
        scan::take_kernel_calls();
        unsafe {
            match mode {
                #[cfg(target_arch = "x86_64")]
                1 => link_pairs_avx2(body, &mut pairs, &ctx.users),
                #[cfg(target_arch = "x86_64")]
                2 => link_pairs_avx512(body, &mut pairs, &ctx.users),
                // Native link dispatch was already observed in build_people.
                3 => link_pairs::<Scalar>(body, &mut pairs, &ctx.users),
                _ => link_pairs::<Scalar>(body, &mut pairs, &ctx.users),
            }
        }
        receipt(if mode == 3 { 0 } else { expected_kernel });
        assert_eq!(pairs, expected_pairs);
        let mut arena = Arena::new();
        let mut copies = Copies::new(&ctx);
        scan::take_kernel_calls();
        let count = unsafe { match mode {
            #[cfg(target_arch = "x86_64")]
            1 => parse_events_avx2(&ctx, events, &mut arena, &mut copies),
            #[cfg(target_arch = "x86_64")]
            2 => parse_events_avx512(&ctx, events, &mut arena, &mut copies),
            3 => parse_events(&ctx, events, &mut arena, &mut copies),
            _ => parse_events_k::<Scalar>(&ctx, events, &mut arena, &mut copies),
        }};
        receipt(expected_kernel);
        assert_eq!(count, 5);
        copies.finish(&mut arena);
        let mut lanes = [0; 3];
        for p in 0..1 << ctx.p1_bits {
            lanes[0] += copies.a.len(p);
            lanes[1] += copies.middle.len(p);
            lanes[2] += copies.b.len(p);
        }
        assert_eq!(lanes, [3, 1, 1]);
        let rows = decode(&ctx, &copies);
        if let Some(control) = &event_control { assert_eq!(&rows, control); }
        else { event_control = Some(rows); }
        let mut sink: Clicks = Pair::new(parts, ctx.click_block, ctx.click_block / 2);
        scan::take_kernel_calls();
        let count = unsafe { match mode {
            #[cfg(target_arch = "x86_64")]
            1 => parse_clicks_avx2(&ctx, &people, clicks, &mut arena, &mut sink),
            #[cfg(target_arch = "x86_64")]
            2 => parse_clicks_avx512(&ctx, &people, clicks, &mut arena, &mut sink),
            3 => parse_clicks(&ctx, &people, clicks, &mut arena, &mut sink),
            _ => parse_clicks_k::<Scalar>(&ctx, &people, clicks, &mut arena, &mut sink),
        }};
        receipt(expected_kernel);
        assert_eq!(count, 4);
        sink.finish(&mut arena);
        let buckets = parts;
        assert_eq!((0..buckets).map(|p| sink.a.len(p)).sum::<usize>(), 2);
        assert_eq!((0..buckets).map(|p| sink.b.len(p)).sum::<usize>(), 2);
        let rows = decoded_clicks(&ctx, &sink);
        if let Some(control) = &click_control { assert_eq!(&rows, control); }
        else { click_control = Some(rows); }
        // Continue through the canonical pipeline. Three valid views use
        // 8-byte person records after link resolution; the purchase keeps its
        // exact 24-byte payload record. The invalid event must disappear.
        let mut persons: Persons = Pair::new(parts, ctx.p2_block * 2, ctx.p2_block * 2 / 3);
        let (mut once, mut twice, mut candidates, mut table) =
            (Vec::new(), Vec::new(), Vec::new(), Vec::new());
        let mut winners = 0;
        for part in 0..1 << ctx.p1_bits {
            winners += dedup(&ctx, &people, &[&copies], part, &mut once, &mut twice,
                &mut candidates, &mut table, &mut arena, &mut persons);
        }
        persons.finish(&mut arena);
        assert_eq!(winners, 4);
        assert_eq!(persons.a.block_bytes(), 16 * ctx.p2_block);
        assert_eq!(persons.b.block_bytes(), persons.a.block_bytes());
        assert_eq!((0..parts).map(|part| persons.a.len(part)).sum::<usize>(), 3);
        assert_eq!((0..parts).map(|part| persons.b.len(part)).sum::<usize>(), 1);
        let canonical = ctx.users.encode(b"u0");
        let canonical_part = person_part(canonical, ctx.p2_bits);
        assert_eq!(persons.len(canonical_part), 4);
        let mut worker = Worker::new(&ctx);
        for part in 0..parts {
            if persons.len(part) == 0 { continue; }
            worker.partition(&ctx, &[&persons], &[&sink], part);
            assert_eq!(worker.persons, vec![canonical]);
            assert_eq!(worker.local_keys.iter().filter(|key| **key ==
                PersonIdentity::from_key(canonical)).count(), 1);
        }
        assert_eq!(worker.rows.totals(), [1, 1, 4, 7]);
        assert_eq!(&worker.credit[..3], &[[1, 1, 7], [0; 3], [0; 3]]);
        assert_eq!(&worker.assist[..3], &[1, 0, 0]);
        arena.release();
    }
}

fn decoded_clicks(ctx: &Ctx, clicks: &Clicks) -> Vec<(usize, Vec<u8>, Vec<u8>, u32, u32)> {
    let mut rows = Vec::new();
    for bucket in 0..1usize << ctx.p2_bits {
        let mut add = |person, click, ts, campaign| {
            let mut user_bytes = Vec::new();
            let mut click_bytes = Vec::new();
            ctx.users.bytes_of(person, &mut user_bytes);
            ctx.click_ids.bytes_of(click, &mut click_bytes);
            rows.push((bucket, user_bytes, click_bytes, ts, campaign));
        };
        for rec in clicks.a.slices(bucket).flatten() {
            add(Key { hi: 0, lo: rec.person }, Key { hi: 0, lo: rec.click }, rec.ts, rec.campaign);
        }
        for rec in clicks.b.slices(bucket).flatten() {
            add(rec.person, rec.click, rec.ts, rec.campaign);
        }
    }
    rows.sort_unstable();
    rows
}

