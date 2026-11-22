use super::*;

#[test]
fn native_entry_kernel_reaches_packed_alias_flow_with_exact_final_rows() {
    fn receipt(expected: usize) {
        let calls = scan::take_kernel_calls();
        assert!(calls[expected] > 0, "selected native kernel must classify input: {calls:?}");
        for (kernel, count) in calls.into_iter().enumerate() {
            if kernel != expected { assert_eq!(count, 0, "unexpected backend: {calls:?}"); }
        }
    }
    let expected_kernel = if scan::has_avx512() { 2 } else if scan::has_avx2() { 1 } else { 0 };
    let mut ctx = raw48_tests::context();
    ctx.p2_bits = 5;
    ctx.products = SmallMap::new(&[(keys::intern(b"p1"), 1)]);
    ctx.campaigns = SmallMap::new(&[(keys::intern(b"g0"), 0), (keys::intern(b"g1"), 1)]);
    ctx.organic = 2;
    static LINKS: &[u8] = b"left,right\nu0,u1\nu1,u2\n";
    scan::take_kernel_calls();
    let people = build_people(&[LINKS], &ctx.users);
    receipt(expected_kernel);
    let root = ctx.users.encode(b"u0");
    let direct = ctx.users.encode(b"u9");
    assert_eq!(people.resolve(ctx.users.encode(b"u2")), (root, true));
    assert_eq!(people.resolve(direct), (direct, false));

    // Fractional milliseconds use official F3 (digit-only epoch milliseconds),
    // not an unsupported fractional extension of the whole-second F1 form.
    let fractional_event = ctx.ws + i64::from(GAP_MS) + 1;
    let fractional_text = fractional_event.to_string();
    assert!(fractional_text.bytes().all(|b| b.is_ascii_digit()));
    assert_eq!(crate::time::parse_timestamp(fractional_text.as_bytes()), Some(fractional_event));
    assert_eq!(fractional_event.rem_euclid(1_000), 1);
    let input = format!(concat!(
        "e0,u0,2028-03-01T00:00:00Z,2028-03-01T00:00:00Z,view,p1,ignored\n",
        "e0,u9,2028-03-01T00:00:00Z,2028-03-01T00:00:01Z,purchase,p1,99\n",
        "e1,u1,2028-03-01T00:30:00Z,2028-03-01T00:30:00Z,view,p1,ignored\n",
        "e2,u1,{fractional_event},2028-03-01T00:30:01Z,purchase,p1,7\n",
        "ed0,u9,2028-03-01T00:00:00Z,2028-03-01T00:00:00Z,view,p1,ignored\n",
        "ed1,u9,{fractional_event},2028-02-29T18:26:40Z,view,p1,ignored\n",
        "ebad,u9,invalid,2028-03-01T00:00:00Z,view,p1,ignored\n",
        "ebad,u9,2028-03-01T00:00:00Z,2028-03-01T00:00:01Z,purchase,p1,99\n",
    ), fractional_event = fractional_text);
    // Validate fixture semantics independently of the compact record encoders:
    // only the explicitly invalid earliest ebad copy is a tombstone. Both
    // fractional events are inside the window and satisfy the late-ingest rule.
    for (i, row) in input.lines().enumerate() {
        let fields: Vec<_> = row.split(',').collect();
        let event = crate::time::parse_timestamp(fields[2].as_bytes());
        let ingest = crate::time::parse_timestamp(fields[3].as_bytes()).unwrap();
        assert_eq!(event.is_some(), i != 6, "fixture event validity at row {i}");
        if let Some(event) = event {
            assert!((ctx.ws..ctx.we).contains(&event), "fixture window at row {i}");
            assert!(ingest.saturating_sub(event) <= DAY_MS, "fixture ingest at row {i}");
            if i == 3 || i == 5 {
                assert_eq!(event, fractional_event);
                let delta = ingest.div_euclid(1_000) - event.div_euclid(1_000);
                assert_eq!(delta, if i == 3 { 1 } else { -21_800 });
                assert_eq!((-16_384..16_384).contains(&delta), i == 3);
            }
        }
    }
    let mut arena = Arena::new();
    let mut copies = Copies::new(&ctx);
    scan::take_kernel_calls();
    assert_eq!(parse_events(&ctx, input.as_bytes(), &mut arena, &mut copies), 8);
    receipt(expected_kernel);
    copies.finish(&mut arena);
    let mut lanes = [0; 3];
    for p in 0..1 << ctx.p1_bits {
        lanes[0] += copies.a.len(p);
        lanes[1] += copies.middle.len(p);
        lanes[2] += copies.b.len(p);
    }
    assert_eq!(lanes, [4, 3, 1]);
    let parts = 1 << ctx.p2_bits;
    let mut events: Persons = Pair::new(parts, ctx.p2_block * 2, ctx.p2_block * 2 / 3);
    let (mut once, mut twice, mut candidates, mut table) = (Vec::new(), Vec::new(), Vec::new(), Vec::new());
    let mut winners = 0;
    for p in 0..1 << ctx.p1_bits {
        winners += dedup(&ctx, &[&copies], p, &mut once, &mut twice, &mut candidates,
            &mut table, &mut arena, &mut events);
    }
    events.finish(&mut arena);
    assert_eq!(winners, 5);
    assert_eq!((0..parts).map(|p| events.a.len(p)).sum::<usize>(), 3);
    assert_eq!((0..parts).map(|p| events.b.len(p)).sum::<usize>(), 2);
    assert_eq!([events.a.block_bytes(), events.b.block_bytes()], [16 * ctx.p2_block; 2]);

    let click_input = concat!(
        "kz,u0,g0,2028-03-01T00:00:00Z\n",
        "K0,u2,g1,2028-03-01T00:00:00Z\n",
        "kd,u9,g0,2028-03-01T00:00:00Z\n",
    );
    let mut clicks = new_clicks(&ctx);
    scan::take_kernel_calls();
    assert_eq!(parse_clicks(&ctx, &people, click_input.as_bytes(), &mut arena, &mut clicks), 3);
    receipt(expected_kernel);
    clicks.finish(&mut arena);
    assert_eq!((0..parts).map(|p| clicks.len(p)).sum::<usize>(), 1);
    assert_eq!((parts..2 * parts).map(|p| clicks.len(p)).sum::<usize>(), 2);
    let mut worker = Worker::new(&ctx);
    let mut store = alias::Store::new(ctx.p2_bits);
    for p in 0..parts { worker.compress_aliases(&ctx, &[&events], &[&clicks], p, &people, &mut store); }
    assert_eq!((store.direct_users, store.direct_events, store.aliases), (1, 2, 2));
    assert_eq!(worker.rows.totals(), [1, 2, 2, 0]);
    for p in 0..parts { worker.partition_aliases(&ctx, &[&store], &[&clicks], p); }
    let mut expected = write::Part::default();
    expected.push(direct, 0, [2, 2, 0], u8::MAX);
    expected.push(root, 0, [1, 3, 7], 1);
    assert_eq!(worker.rows, expected);
    assert_eq!(worker.rows.totals(), [2, 3, 5, 7]);
    assert_eq!(&worker.credit[..3], &[[2, 0, 0], [1, 1, 7], [0; 3]]);
    assert_eq!(&worker.assist[..3], &[3, 1, 0]);
    assert!(worker.bins.sessions.is_empty());
    assert!(worker.category_sums.is_empty());
    assert!(worker.active.is_empty());
    assert!(worker.in_window.iter().all(|&count| count == 0));
    arena.release();
}
