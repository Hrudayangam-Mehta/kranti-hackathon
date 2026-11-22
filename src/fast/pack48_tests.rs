use super::*;
use super::raw48_tests::context;
use std::collections::BTreeSet;

#[test]
fn mixed_event_and_person_lanes_preserve_links_click_ties_and_recycled_memory() {
    let mut ctx = context();
    ctx.p2_bits = 5;
    ctx.organic = 3;
    ctx.campaigns = SmallMap::new(&[
        (keys::intern(b"c0"), 0), (keys::intern(b"c1"), 1), (keys::intern(b"c2"), 2),
    ]);
    let links = [
        ("u0", "u9"),
        ("u9", "u900000000"),
        ("u0", "u7"), // This alias has clicks but no events.
        ("u0", "uabcdef0123456789abcdef0123456789"),
        ("u8", "u000000001"),
    ];
    let pairs: Vec<_> = links.iter().map(|(a, b)|
        (ctx.users.encode(a.as_bytes()), ctx.users.encode(b.as_bytes()))).collect();
    let people = People::build(&pairs, &ctx.users);
    let mut event_names = Vec::new();
    for i in 0..100_000u32 {
        let name = format!("e{i:x}");
        let key = ctx.event_ids.encode(name.as_bytes());
        if event_hash(key) >> (64 - ctx.p1_bits) == 0 {
            event_names.push(name);
            if event_names.len() == 601 { break; }
        }
    }
    assert_eq!(event_names.len(), 601);
    let mut input = String::new();
    for (i, name) in event_names[..600].iter().enumerate() {
        let second_ms = ctx.ws + (i / 4) as i64 * 1000;
        let (user, ts, kind, price) = match i % 4 {
            0 => ("u9", second_ms, "view", "ignored"),
            1 => ("u900000000", second_ms, "purchase", "5"),
            2 => ("u8", second_ms, "view", "ignored"),
            _ => ("U-unlinked", second_ms + 1, "purchase", "3"),
        };
        input.push_str(&format!("{name},{user},{ts},2028-03-01T01:00:00Z,{kind},p,{price}\n"));
        // Each event has one16-byte and one32-byte copy. The earlier winner
        // alternates between the lanes, independent of its eventual P2 lane.
        if i % 2 == 0 {
            input.push_str(&format!("{name},u900000000,{second_ms},2028-03-01T01:00:01Z,purchase,p,99\n"));
        } else {
            input.push_str(&format!("{name},u9,{second_ms},2028-03-01T01:00:01Z,view,p,ignored\n"));
        }
    }
    let suppressed = &event_names[600];
    input.push_str(&format!("{suppressed},u9,bad,2028-03-01T00:59:59Z,view,p,ignored\n"));
    input.push_str(&format!("{suppressed},u9,{},2028-03-01T01:00:01Z,purchase,p,99\n", ctx.ws));

    let mut arena = Arena::new();
    let mut copies = Copies::new(&ctx);
    assert_eq!(parse_events(&ctx, input.as_bytes(), &mut arena, &mut copies), 1202);
    copies.finish(&mut arena);
    assert_eq!(copies.a.len(0), 601);
    assert_eq!(copies.middle.len(0), 601);
    assert_eq!(copies.b.len(0), 0);
    assert!((1..1 << ctx.p1_bits).all(|p| copies.len(p) == 0));
    assert_eq!(copies.a.block_bytes(), 32 * ctx.p1_block);
    assert_eq!(copies.a.block_bytes(), copies.middle.block_bytes());
    assert_eq!(copies.a.block_bytes(), copies.b.block_bytes());
    let mut ranges: Vec<_> = copies.a.blocks(0).map(|ptr|
        (ptr as usize, ptr as usize + copies.a.block_bytes())).collect();
    ranges.extend(copies.middle.blocks(0).map(|ptr|
        (ptr as usize, ptr as usize + copies.middle.block_bytes())));
    ranges.extend(copies.b.blocks(0).map(|ptr|
        (ptr as usize, ptr as usize + copies.b.block_bytes())));
    assert!(ranges.len() >= 20);

    let mut events: Persons = Pair::new(1 << ctx.p2_bits, ctx.p2_block * 2, ctx.p2_block * 2 / 3);
    let (mut once, mut twice, mut candidates, mut table) = (Vec::new(), Vec::new(), Vec::new(), Vec::new());
    assert_eq!(dedup(&ctx, &people, &[&copies], 0, &mut once, &mut twice, &mut candidates,
        &mut table, &mut arena, &mut events), 600);
    events.finish(&mut arena);
    let parts = 1 << ctx.p2_bits;
    assert_eq!((0..parts).map(|p| events.a.len(p)).sum::<usize>(), 150);
    assert_eq!((0..parts).map(|p| events.b.len(p)).sum::<usize>(), 450);
    let piece = 16 * ctx.p2_block;
    assert_eq!(events.a.block_bytes(), piece);
    assert_eq!(events.b.block_bytes(), piece);
    let mut reused_blocks = 0;
    for p in 0..parts {
        for ptr in events.a.blocks(p).chain(events.b.blocks(p)) {
            let address = ptr as usize;
            assert!(ranges.iter().any(|&(start, end)| start <= address && address + piece <= end),
                "all P2 output must come from fully copied P1 candidate blocks");
            reused_blocks += 1;
        }
    }
    assert!(reused_blocks > 10);

    let click_input = [
        ("k0", "u7", "c0"),
        ("k000000000", "u900000000", "c1"),
        ("K0", "uabcdef0123456789abcdef0123456789", "c2"),
        ("k1", "u8", "c1"),
        ("k2", "U-unlinked", "c0"),
        ("k3", "U-click-only", "c2"),
    ].iter().map(|(click, user, campaign)|
        format!("{click},{user},{campaign},{}\n", ctx.ws)).collect::<String>();
    let mut clicks: Clicks = Pair::new(parts, ctx.click_block, ctx.click_block / 2);
    assert_eq!(parse_clicks(&ctx, &people, click_input.as_bytes(), &mut arena, &mut clicks), 6);
    clicks.finish(&mut arena);
    assert_eq!((0..parts).map(|p| clicks.a.len(p)).sum::<usize>(), 1);
    assert_eq!((0..parts).map(|p| clicks.b.len(p)).sum::<usize>(), 5);
    let mut worker = Worker::new(&ctx);
    let mut names = BTreeSet::new();
    for p in 0..parts {
        if events.len(p) == 0 { continue; }
        worker.partition(&ctx, &[&events], &[&clicks], p);
        for &key in &worker.persons {
            let mut name = Vec::new();
            ctx.users.bytes_of(key, &mut name);
            names.insert(name);
        }
    }
    assert_eq!(names, [b"u0".to_vec(), b"u000000001".to_vec(), b"U-unlinked".to_vec()].into_iter().collect::<BTreeSet<_>>());
    assert_eq!(worker.rows.totals(), [3, 3, 600, 1200]);
    assert_eq!(&worker.credit[..4], &[[1, 1, 450], [1, 0, 0], [1, 1, 750], [0, 0, 0]]);
    assert_eq!(&worker.assist[..4], &[2, 2, 1, 0]);
    arena.release();
}
