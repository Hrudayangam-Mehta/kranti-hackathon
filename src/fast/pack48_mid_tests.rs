use super::*;
use super::raw48_tests::context;
use std::collections::BTreeSet;

#[test]
fn three_event_lanes_join_both_person_lanes_after_global_winner_selection() {
    for scalar in [false, true] {
        let mut ctx = context();
        ctx.p2_bits = 5;
        ctx.organic = 3;
        ctx.products = SmallMap::new(&[(keys::intern(b"p1"), 1), (keys::intern(b"p2"), 2)]);
        ctx.campaigns = SmallMap::new(&[(keys::intern(b"c0"), 0), (keys::intern(b"c1"), 1), (keys::intern(b"c2"), 2)]);
        let root = ctx.users.encode(b"u0");
        let wide_alias = ctx.users.encode(b"u900000000");
        let click_only = ctx.users.encode(b"uabcdef0123456789abcdef0123456789");
        let wide_root = ctx.users.encode(b"u000000001");
        let short_alias = ctx.users.encode(b"u9");
        let people = People::build(&[(root, wide_alias), (wide_alias, click_only), (wide_root, short_alias)], &ctx.users);
        for key in [root, wide_alias, click_only] { assert_eq!(people.name_of(key), root); }
        for key in [wide_root, short_alias] { assert_eq!(people.name_of(key), wide_root); }
        let mut lines = vec![
            // Six winners cover every P1(16/32/48) -> P2(8/24) combination.
            "e0,u0,2028-03-01T00:00:00Z,2028-03-01T00:00:00Z,view,p1,ignored\n",
            "e0,u900000000,2028-03-01T00:00:00Z,2028-03-01T00:00:01Z,purchase,p1,99\n",
            "e1,u9,2028-03-01T00:00:01Z,2028-03-01T00:00:01Z,view,p1,ignored\n",
            "e1,u900000000,2028-03-01T00:00:01Z,2028-03-01T00:00:02Z,purchase,p1,99\n",
            "e2,u900000000,2028-03-01T00:00:02Z,2028-03-01T00:00:02Z,view,p1,ignored\n",
            "e2,u9,2028-03-01T00:00:02Z,2028-03-01T00:00:03Z,view,p1,ignored\n",
            "e3,u9,2028-03-01T00:00:03Z,2028-03-01T00:00:03Z,purchase,p1,7\n",
            "e3,u0,2028-03-01T00:00:03Z,2028-03-01T00:00:04Z,view,p1,ignored\n",
            "e4,u0,2028-03-01T00:00:04Z,2028-02-29T18:26:44Z,view,p1,ignored\n",
            "e4,u9,2028-03-01T00:00:04Z,2028-03-01T00:00:05Z,view,p1,ignored\n",
            "e5,u9,2028-03-01T00:00:05Z,2028-02-29T18:26:45Z,purchase,p2,11\n",
            "e5,u0,2028-03-01T00:00:05Z,2028-03-01T00:00:06Z,purchase,p1,99\n",
            "ebad,u0,bad,2028-03-01T00:00:00Z,view,p1,ignored\n",
            "ebad,u0,2028-03-01T00:00:01Z,2028-03-01T00:00:01Z,purchase,p1,99\n",
            "e000000001,u0,bad,2028-03-01T00:00:00Z,view,p1,ignored\n",
            "e000000001,u900000000,2028-03-01T00:00:01Z,2028-03-01T00:00:01Z,purchase,p1,99\n",
        ];
        if scalar { lines.reverse(); }
        let mut inputs = [String::new(), String::new()];
        for (i, line) in lines.iter().enumerate() { inputs[i & 1].push_str(line); }
        let mut arena = Arena::new();
        let mut copies = [Copies::new(&ctx), Copies::new(&ctx)];
        let mut accepted = 0;
        for producer in 0..2 {
            accepted += if scalar {
                unsafe { parse_events_k::<Scalar>(&ctx, inputs[producer].as_bytes(), &mut arena, &mut copies[producer]) }
            } else {
                parse_events(&ctx, inputs[producer].as_bytes(), &mut arena, &mut copies[producer])
            };
            copies[producer].finish(&mut arena);
        }
        assert_eq!(accepted, 16);
        let mut lanes = [0usize; 3];
        for sink in &copies {
            for p in 0..1 << ctx.p1_bits {
                lanes[0] += sink.a.len(p);
                lanes[1] += sink.middle.len(p);
                lanes[2] += sink.b.len(p);
            }
        }
        assert_eq!(lanes, [6, 7, 3]);
        let mut output: Persons = Pair::new(1 << ctx.p2_bits, ctx.p2_block * 2, ctx.p2_block * 2 / 3);
        let (mut once, mut twice, mut candidates, mut table) = (Vec::new(), Vec::new(), Vec::new(), Vec::new());
        let mut winners = 0;
        for p in 0..1 << ctx.p1_bits {
            winners += dedup(&ctx, &people, &[&copies[0], &copies[1]], p,
                &mut once, &mut twice, &mut candidates, &mut table, &mut arena, &mut output);
        }
        output.finish(&mut arena);
        assert_eq!(winners, 6);
        assert_eq!(output.a.block_bytes(), 16 * ctx.p2_block);
        assert_eq!(output.b.block_bytes(), output.a.block_bytes());
        let parts = 1 << ctx.p2_bits;
        assert_eq!((0..parts).map(|p| output.a.len(p)).sum::<usize>(), 3);
        assert_eq!((0..parts).map(|p| output.b.len(p)).sum::<usize>(), 3);
        let layout = PersonLayout::new(ctx.p2_bits).unwrap();
        let mut rows = Vec::new();
        for p in 0..parts {
            for rec in output.a.slices(p).flatten() {
                let key = rec.identity(p, &layout).to_key();
                rows.push((key.hi, key.lo, rec.ts(&layout), 0));
            }
            for rec in output.b.slices(p).flatten() {
                rows.push((rec.person.hi, rec.person.lo, rec.ts, rec.payload));
            }
        }
        let t = WEEK_MS as u32;
        let mut expected = vec![
            (root.hi, root.lo, t, 0), (root.hi, root.lo, t + 2000, 0), (root.hi, root.lo, t + 4000, 0),
            (wide_root.hi, wide_root.lo, t + 1000, 0), (wide_root.hi, wide_root.lo, t + 3000, (1 << 24) | 7),
            (wide_root.hi, wide_root.lo, t + 5000, (2 << 24) | 11),
        ];
        expected.sort_unstable();rows.sort_unstable();
        assert_eq!(rows, expected, "canonical identity must be derived after each exact winning raw user");
        let clicks_text = concat!(
            "k9,u0,c0,2028-03-01T00:00:00Z\n",
            "k000000000,u900000000,c1,2028-03-01T00:00:00Z\n",
            "K0,uabcdef0123456789abcdef0123456789,c2,2028-03-01T00:00:00Z\n",
            "k2,u000000001,c0,2028-03-01T00:00:01Z\n",
            "k3,u9,c1,2028-03-01T00:00:01Z\n",
            "korphan,U-no-events,c2,2028-03-01T00:00:00Z\n",
        );
        let mut clicks: Clicks = Pair::new(parts, ctx.click_block, ctx.click_block / 2);
        let click_count = if scalar {
            unsafe { parse_clicks_k::<Scalar>(&ctx, &people, clicks_text.as_bytes(), &mut arena, &mut clicks) }
        } else {
            parse_clicks(&ctx, &people, clicks_text.as_bytes(), &mut arena, &mut clicks)
        };
        clicks.finish(&mut arena);
        assert_eq!(click_count, 6);
        let mut worker = Worker::new(&ctx);
        let mut names = BTreeSet::new();
        for p in 0..parts {
            if output.len(p) == 0 { continue; }
            worker.partition(&ctx, &[&output], &[&clicks], p);
            for &person in &worker.persons {
                let mut bytes = Vec::new();ctx.users.bytes_of(person, &mut bytes);names.insert(bytes);
            }
        }
        assert_eq!(names, [b"u0".to_vec(), b"u000000001".to_vec()].into_iter().collect::<BTreeSet<_>>());
        assert_eq!(worker.rows.totals(), [2, 2, 6, 18]);
        assert_eq!(&worker.credit[..4], &[[1, 1, 18], [0; 3], [1, 0, 0], [0; 3]]);
        assert_eq!(&worker.assist[..4], &[2, 2, 1, 0]);
        arena.release();
    }
}
