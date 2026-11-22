use super::*;

#[test]
fn compact_events_reach_raw_aliases_before_owned_clicks_and_exact_sessions() {
    for anchor_ms in [0i64, 123] {
        for scalar in [false, true] {
            let mut ctx = super::raw48_tests::context();
            ctx.p2_bits = 5;
            ctx.ws += anchor_ms;
            ctx.we += anchor_ms;
            ctx.cws += anchor_ms;
            ctx.day_shift += anchor_ms;
            ctx.event_layout = EventLayout::new(ctx.p1_bits, ctx.cws).unwrap();
            ctx.products = SmallMap::new(&[(keys::intern(b"p1"), 1), (keys::intern(b"p2"), 2)]);
            ctx.campaigns = SmallMap::new(&[(keys::intern(b"g0"), 0), (keys::intern(b"g1"), 1), (keys::intern(b"g2"), 2)]);
            ctx.organic = 3;
            let root = ctx.users.encode(b"u0");
            let hex_alias = ctx.users.encode(b"u0123456789abcdef0123456789abcdef");
            let extended_alias = ctx.users.encode(b"u000000001");
            let click_only = ctx.users.encode(b"uClickOnly");
            let direct = ctx.users.encode(b"u9");
            let people = People::build(&[(root, hex_alias), (hex_alias, extended_alias),
                (extended_alias, click_only), (root, root)], &ctx.users);
            for key in [root, hex_alias, extended_alias, click_only] {
                assert_eq!(people.resolve(key), (root, true));
            }
            assert_eq!(people.resolve(direct), (direct, false));

            let a = crate::time::parse_timestamp(b"2028-03-01T23:29:59Z").unwrap();
            let b = a + i64::from(GAP_MS);
            let c = b + 1001;
            let d = c + 1000;
            let direct_a = crate::time::parse_timestamp(b"2028-03-01T00:00:01Z").unwrap();
            let direct_b = direct_a + i64::from(GAP_MS) + 1;
            let relative = |absolute: i64| u32::try_from(absolute - ctx.cws).unwrap();
            let mut lines = vec![
                "e1,u0,2028-03-01T23:29:59Z,2028-03-01T23:29:59Z,view,p1,ignored\n".to_string(),
                "e1,u9,2028-03-01T23:29:59Z,2028-03-01T23:30:00Z,purchase,p1,999\n".to_string(),
                "e2,u0123456789abcdef0123456789abcdef,2028-03-01T23:59:59Z,2028-03-01T23:59:59Z,purchase,p1,7\n".to_string(),
                "e2,u0,2028-03-01T23:59:59Z,2028-03-02T00:00:00Z,view,p1,ignored\n".to_string(),
                format!("e3,u000000001,{c},2028-03-02T00:00:00Z,purchase,p2,7\n"),
                format!("e3,u0123456789abcdef0123456789abcdef,{c},2028-03-02T05:33:20Z,purchase,p2,999\n"),
                format!("e4,u0,{d},2028-03-01T18:26:41Z,view,p1,ignored\n"),
                format!("e4,u0123456789abcdef0123456789abcdef,{d},2028-03-02T00:00:01Z,purchase,p1,999\n"),
            ];
            let mut expected_raw = vec![
                (root.hi, root.lo, relative(a), 0),
                (hex_alias.hi, hex_alias.lo, relative(b), (1 << 24) | 7),
                (extended_alias.hi, extended_alias.lo, relative(c), (2 << 24) | 7),
                (root.hi, root.lo, relative(d), 0),
            ];
            for i in 1..=5 {
                let user_bytes = if i % 2 == 0 { "u0123456789abcdef0123456789abcdef" } else { "u0" };
                let user = ctx.users.encode(user_bytes.as_bytes());
                let absolute = b + i * 100;
                lines.push(format!("eextra{i},{user_bytes},{absolute},2028-03-01T23:59:59Z,view,p1,ignored\n"));
                expected_raw.push((user.hi, user.lo, relative(absolute), 0));
            }
            lines.extend([
                "ed0,u9,2028-03-01T00:00:01Z,2028-03-01T00:00:01Z,view,p1,ignored\n".to_string(),
                format!("ed1,u9,{direct_b},2028-03-01T00:30:01Z,view,p1,ignored\n"),
                "ebad,u9,bad,2028-03-01T10:00:00Z,view,p1,ignored\n".to_string(),
                "ebad,u9,2028-03-01T10:00:01Z,2028-03-01T10:00:01Z,purchase,p1,999\n".to_string(),
                "e000000001,u0,bad,2028-03-01T10:00:00Z,view,p1,ignored\n".to_string(),
                "e000000001,u0123456789abcdef0123456789abcdef,2028-03-01T10:00:01Z,2028-03-01T10:00:01Z,purchase,p1,999\n".to_string(),
                "e000000001,u0,2028-03-01T10:00:02Z,2028-03-01T10:00:02Z,purchase,p2,999\n".to_string(),
                format!("e000000002,u000000001,{},2028-03-01T23:59:59Z,view,p1,ignored\n", b + 700),
                format!("e000000002,u0,{},2028-03-02T00:00:00Z,purchase,p1,999\n", b + 700),
            ]);
            expected_raw.extend([
                (direct.hi, direct.lo, relative(direct_a), 0),
                (direct.hi, direct.lo, relative(direct_b), 0),
                (extended_alias.hi, extended_alias.lo, relative(b + 700), 0),
            ]);
            assert_eq!(lines.len(), 22);
            expected_raw.sort_unstable();
            let mut producer_text = [String::new(), String::new()];
            if scalar { lines.reverse(); }
            for (i, line) in lines.iter().enumerate() { producer_text[i & 1].push_str(line); }
            let mut arena = Arena::new();
            let mut copies = [Copies::new(&ctx), Copies::new(&ctx)];
            let mut accepted = 0;
            for producer in 0..2 {
                accepted += if scalar {
                    unsafe { parse_events_k::<Scalar>(&ctx, producer_text[producer].as_bytes(), &mut arena, &mut copies[producer]) }
                } else {
                    parse_events(&ctx, producer_text[producer].as_bytes(), &mut arena, &mut copies[producer])
                };
                copies[producer].finish(&mut arena);
            }
            assert_eq!(accepted, 22);
            let mut lane_counts = [0usize; 3];
            for source in &copies {
                for p in 0..1 << ctx.p1_bits {
                    lane_counts[0] += source.a.len(p);
                    lane_counts[1] += source.middle.len(p);
                    lane_counts[2] += source.b.len(p);
                }
                assert_eq!([source.a.block_bytes(), source.middle.block_bytes(), source.b.block_bytes()], [32 * ctx.p1_block; 3]);
            }
            assert_eq!(lane_counts, [4, 14, 4]);
            let mut events: Persons = Pair::new(1 << ctx.p2_bits, ctx.p2_block * 2, ctx.p2_block * 2 / 3);
            let (mut once, mut twice, mut candidates, mut table) = (Vec::new(), Vec::new(), Vec::new(), Vec::new());
            let mut winners = 0;
            for p in 0..1 << ctx.p1_bits {
                winners += dedup(&ctx, &[&copies[0], &copies[1]], p, &mut once, &mut twice,
                    &mut candidates, &mut table, &mut arena, &mut events);
            }
            events.finish(&mut arena);
            assert_eq!(winners, 12);
            let compact = (0..1 << ctx.p2_bits).map(|p| events.a.len(p)).sum::<usize>();
            assert_eq!(compact, if anchor_ms == 0 { 2 } else { 0 });
            assert_eq!((0..1 << ctx.p2_bits).map(|p| events.b.len(p)).sum::<usize>(), 12 - compact);
            assert_eq!(events.a.block_bytes(), 16 * ctx.p2_block);
            assert_eq!(events.b.block_bytes(), events.a.block_bytes());
            let mut actual_raw = Vec::new();
            for p in 0..1 << ctx.p2_bits {
                for rec in events.a.slices(p).flatten() {
                    let layout = PersonLayout::new(ctx.p2_bits).unwrap();
                    let user = rec.identity(p, &layout).to_key();
                    actual_raw.push((user.hi, user.lo, rec.ts(&layout), 0));
                }
                for rec in events.b.slices(p).flatten() { actual_raw.push((rec.person.hi, rec.person.lo, rec.ts, rec.payload)); }
            }
            actual_raw.sort_unstable();
            assert_eq!(actual_raw, expected_raw, "dedup must preserve original aliases before grouping");

            let click_text = format!(concat!(
                "k9,u0,g0,2028-03-01T23:29:59Z\n",
                "k000000000,u000000001,g1,2028-03-01T23:29:59Z\n",
                "K0,uClickOnly,g2,2028-03-01T23:29:59Z\n",
                "kd0,u9,g0,2028-03-01T00:00:01Z\n",
                "kd1,u9,g1,{}\n",
                "korphan,u8,g2,2028-03-01T23:29:59Z\n"), direct_b);
            let mut clicks = new_clicks(&ctx);
            let click_count = if scalar {
                unsafe { parse_clicks_k::<Scalar>(&ctx, &people, click_text.as_bytes(), &mut arena, &mut clicks) }
            } else {
                parse_clicks(&ctx, &people, click_text.as_bytes(), &mut arena, &mut clicks)
            };
            clicks.finish(&mut arena);
            assert_eq!(click_count, 6);
            let parts = 1usize << ctx.p2_bits;
            assert_eq!((0..parts).map(|p| clicks.len(p)).sum::<usize>(), 3);
            assert_eq!((parts..2 * parts).map(|p| clicks.len(p)).sum::<usize>(), 3);
            let linked_bucket = click_bucket(part_of(root, ctx.p2_bits), ctx.p2_bits, true);
            assert_eq!(clicks.len(linked_bucket), 3);

            let mut workers = [Worker::new(&ctx), Worker::new(&ctx)];
            let mut stores = [alias::Store::new(ctx.p2_bits), alias::Store::new(ctx.p2_bits)];
            for p in 0..parts {
                let owner = p & 1;
                workers[owner].compress_aliases(&ctx, &[&events], &[&clicks], p, &people, &mut stores[owner]);
            }
            let direct_owner = part_of(direct, ctx.p2_bits) & 1;
            for (owner, worker) in workers.iter().enumerate() {
                let mut expected = write::Part::default();
                if owner == direct_owner { expected.push(direct, 0, [2, 2, 0], u8::MAX); }
                assert_eq!(worker.rows, expected, "linked roots must wait for their aliases");
                let n = u64::from(owner == direct_owner);
                assert_eq!(&worker.credit[..4], &[[n, 0, 0], [n, 0, 0], [0; 3], [0; 3]]);
                assert_eq!(&worker.assist[..4], &[2 * n as u32, n as u32, 0, 0]);
            }
            assert_eq!(stores.iter().map(|s| s.direct_users).sum::<usize>(), 1);
            assert_eq!(stores.iter().map(|s| s.direct_events).sum::<usize>(), 2);
            assert_eq!(stores.iter().map(|s| s.aliases).sum::<usize>(), 3);
            assert_eq!(stores.iter().map(|s| s.plain.len()).sum::<usize>(), 8);
            assert_eq!(stores.iter().map(|s| s.paid.len()).sum::<usize>(), 2);
            let mut canonical = Worker::new(&ctx);
            for p in 0..parts { canonical.partition_aliases(&ctx, &[&stores[0], &stores[1]], &[&clicks], p); }
            let mut expected = write::Part::default();
            expected.push(root, 0, [1, 10, 14], 1);
            assert_eq!(canonical.rows, expected, "exact gap, midnight bridge and tied categories");
            assert_eq!(&canonical.credit[..4], &[[0; 3], [0; 3], [1, 1, 14], [0; 3]]);
            assert_eq!(&canonical.assist[..4], &[1, 1, 1, 0]);
            assert!(canonical.credit[4..].iter().all(|&cell| cell == [0; 3]));
            assert!(canonical.active.is_empty());
            assert!(canonical.in_window.iter().all(|&count| count == 0));
            arena.release();
        }
    }
}
