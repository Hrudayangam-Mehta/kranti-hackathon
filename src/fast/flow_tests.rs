use super::*;
use std::collections::BTreeSet;

#[test]
fn packed_alias_flow_matches_explicit_rows_with_local_and_radix_click_orders() {
    for heavy in [0usize, 2048] {
        for scalar in [false, true] {
            let mut ctx = raw48_tests::context();
            ctx.p2_bits = 5;
            ctx.organic = 3;
            ctx.products = SmallMap::new(&[
                (keys::intern(b"p0"), 0), (keys::intern(b"p1"), 1), (keys::intern(b"p2"), 2),
            ]);
            ctx.campaigns = SmallMap::new(&[
                (keys::intern(b"g0"), 0), (keys::intern(b"g1"), 1), (keys::intern(b"g2"), 2),
            ]);
            let user_names: [&[u8]; 4] = [b"u0", b"u1", b"u2", b"u9"];
            let users: Vec<_> = user_names.iter().map(|name| ctx.users.encode(name)).collect();
            let people = People::build(&[(users[0], users[1]), (users[1], users[2])], &ctx.users);
            let t = WEEK_MS as u32 + 1000;
            let next_day = (WEEK_MS + DAY_MS + 50) as u32;
            // These seven independent winners define the semantic oracle.
            // Later duplicates deliberately change both user and price.
            let winners = [
                (0usize, t, 1u32, 7u32), (1, t + GAP_MS, 0, 0),
                (1, t + 2 * GAP_MS + 1, 2, 3), (0, next_day, 2, 9),
                (3, WEEK_MS as u32, 0, 0),
                (3, WEEK_MS as u32 + GAP_MS + 1, 1, 5), (3, next_day, 0, 0),
            ];
            let mut lines = Vec::new();
            for (id, &(raw, ts, category, price)) in winners.iter().enumerate() {
                let name = std::str::from_utf8(user_names[raw]).unwrap();
                let kind = if price == 0 { "view" } else { "purchase" };
                lines.push(format!("e{id},{name},{},2028-03-01T01:00:00Z,{kind},p{category},{price}\n",
                    ctx.cws + i64::from(ts)));
            }
            lines.push(format!("e0,u9,{},2028-03-01T01:00:01Z,view,p0,ignored\n", ctx.cws + i64::from(t)));
            lines.push(format!("e1,u9,{},2028-03-01T01:00:02Z,purchase,p1,999\n", ctx.cws + i64::from(t + GAP_MS)));
            lines.push(format!("e3,u9,{},2028-03-02T01:00:00Z,purchase,p1,999\n", ctx.cws + i64::from(next_day)));
            lines.push("ebad,u9,invalid,2028-03-01T00:00:00Z,view,p0,ignored\n".to_owned());
            lines.push(format!("ebad,u9,{},2028-03-01T01:00:00Z,purchase,p1,999\n", ctx.ws));
            assert_eq!(lines.len(), 12);
            if scalar { lines.reverse(); }
            let mut input = [String::new(), String::new()];
            for (i, line) in lines.iter().enumerate() { input[i & 1].push_str(line); }
            let mut arena = Arena::new();
            let mut copies = [Copies::new(&ctx), Copies::new(&ctx)];
            for i in 0..2 {
                let count = if scalar {
                    unsafe { parse_events_k::<Scalar>(&ctx, input[i].as_bytes(), &mut arena, &mut copies[i]) }
                } else {
                    parse_events(&ctx, input[i].as_bytes(), &mut arena, &mut copies[i])
                };
                assert_eq!(count, 6);
                copies[i].finish(&mut arena);
            }
            let mut lanes = [0usize; 3];
            for source in &copies {
                for p in 0..1 << ctx.p1_bits {
                    lanes[0] += source.a.len(p);
                    lanes[1] += source.middle.len(p);
                    lanes[2] += source.b.len(p);
                }
            }
            assert_eq!(lanes, [4, 6, 2]);
            let parts = 1 << ctx.p2_bits;
            let mut events: Persons = Pair::new(parts, ctx.p2_block * 2, ctx.p2_block * 2 / 3);
            let (mut once, mut twice, mut candidates, mut table) = (Vec::new(), Vec::new(), Vec::new(), Vec::new());
            let mut selected = 0;
            for p in 0..1 << ctx.p1_bits {
                selected += dedup(&ctx, &[&copies[0], &copies[1]], p, &mut once, &mut twice,
                    &mut candidates, &mut table, &mut arena, &mut events);
            }
            events.finish(&mut arena);
            assert_eq!(selected, 7);
            assert_eq!((0..parts).map(|p| events.a.len(p)).sum::<usize>(), 2);
            assert_eq!((0..parts).map(|p| events.b.len(p)).sum::<usize>(), 5);

            // Original click bytes and manually known components are retained
            // for an oracle that does not call production hash/comparison code.
            let mut clicks: Vec<(usize, u32, Vec<u8>, u32)> = vec![
                (0, t - WEEK_MS as u32, b"kold".to_vec(), 0),
                (2, t, b" A".to_vec(), 1), (2, t, b" A".to_vec(), 1),
                (1, t, b"kZ".to_vec(), 2), (0, t, b"k0000000".to_vec(), 0),
                (0, t + 1, b"kfuture".to_vec(), 2),
                (0, next_day, b"k0".to_vec(), 2), (1, next_day, b"k00".to_vec(), 0),
                (3, t + 500, b"kdirect0".to_vec(), 0), (3, t + 501, b"kdirect1".to_vec(), 1),
            ];
            for i in 0..heavy {
                clicks.push((i % 3, t - (i % 1000) as u32,
                    format!("kheavy{i:06}").into_bytes(), (i % 3) as u32));
            }
            let mut click_input = Vec::new();
            for (raw, ts, name, campaign) in clicks.iter().rev() {
                click_input.extend_from_slice(name);
                click_input.push(b',');
                click_input.extend_from_slice(user_names[*raw]);
                click_input.extend_from_slice(format!(",g{campaign},{}\n", ctx.cws + i64::from(*ts)).as_bytes());
            }
            let mut click_sink = new_clicks(&ctx);
            let accepted = if scalar {
                unsafe { parse_clicks_k::<Scalar>(&ctx, &people, &click_input, &mut arena, &mut click_sink) }
            } else {
                parse_clicks(&ctx, &people, &click_input, &mut arena, &mut click_sink)
            };
            assert_eq!(accepted, clicks.len());
            click_sink.finish(&mut arena);
            assert_eq!((0..parts).map(|p| click_sink.len(p)).sum::<usize>(), 2);
            assert_eq!((parts..2 * parts).map(|p| click_sink.len(p)).sum::<usize>(), 8 + heavy);
            let mut worker = Worker::new(&ctx);
            let mut store = alias::Store::new(ctx.p2_bits);
            for p in 0..parts { worker.compress_aliases(&ctx, &[&events], &[&click_sink], p, &people, &mut store); }
            assert_eq!((store.direct_users, store.direct_events, store.aliases), (1, 3, 2));
            assert_eq!((store.plain.len(), store.paid.len()), (1, 3));
            assert_eq!(worker.rows.totals(), [2, 3, 3, 5]);
            for p in 0..parts { worker.partition_aliases(&ctx, &[&store], &[&click_sink], p); }
            let mut expected_rows = write::Part::default();
            expected_rows.push(users[3], 0, [2, 2, 5], 1);
            expected_rows.push(users[3], 1, [1, 1, 0], u8::MAX);
            expected_rows.push(users[0], 0, [2, 3, 10], 1);
            expected_rows.push(users[0], 1, [1, 1, 9], 2);
            assert_eq!(worker.rows, expected_rows);
            assert_eq!(worker.rows.totals(), [4, 6, 7, 24]);

            let mut credit = vec![[0u64; 3]; ctx.days * 4];
            let mut assist = vec![0u32; ctx.days * 4];
            let sessions = [
                (true, 0usize, WEEK_MS as u32, 0u64),
                (true, 0, WEEK_MS as u32 + GAP_MS + 1, 5), (true, 1, next_day, 0),
                (false, 0, t, 7), (false, 0, t + 2 * GAP_MS + 1, 3), (false, 1, next_day, 9),
            ];
            for (direct, day, start, revenue) in sessions {
                let qualifying: Vec<_> = clicks.iter().filter(|row| (row.0 == 3) == direct
                    && row.1 <= start && start - row.1 <= WEEK_MS as u32).collect();
                let winner = qualifying.iter().min_by(|a, b| b.1.cmp(&a.1).then_with(|| a.2.cmp(&b.2)));
                let campaign = winner.map_or(ctx.organic, |row| row.3) as usize;
                credit[day * 4 + campaign][0] += 1;
                if revenue > 0 {
                    credit[day * 4 + campaign][1] += 1;
                    credit[day * 4 + campaign][2] += revenue;
                }
                let seen: BTreeSet<_> = qualifying.iter().map(|row| row.3).collect();
                for campaign in seen { assist[day * 4 + campaign as usize] += 1; }
            }
            assert_eq!(worker.credit, credit);
            assert_eq!(worker.assist, assist);
            assert_eq!(worker.click_spare.is_empty(), heavy == 0,
                "combined oracle must exercise both local and radix click paths");
            assert!(worker.bins.sessions.is_empty(), "both short-person phases should use streaming completion");
            assert!(worker.category_sums.is_empty());
            assert!(worker.active.is_empty());
            assert!(worker.in_window.iter().all(|&n| n == 0));
            arena.release();
        }
    }
}
