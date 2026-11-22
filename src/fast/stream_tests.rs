use super::*;

fn context() -> Ctx<'static> {
    let mut ctx = raw48_tests::context();
    ctx.organic = 4;
    ctx
}

fn event(ts: u32, category: u32, cents: u32) -> u64 {
    u64::from(ts) << 32 | u64::from(category << 24 | cents)
}

fn compare(ctx: &Ctx, events: &[u64], clicks: &[LocalClick]) {
    let person = ctx.users.encode(b"u-stream-person");
    let mut reference = Worker::new(ctx);
    reference.local_clicks = clicks.to_vec();
    reference.bins.build_sorted(events);
    reference.person_summaries(person, 0..clicks.len());

    let mut actual = Worker::new(ctx);
    // Nonzero slice bounds ensure neighboring people's values never leak in.
    actual.sorted.extend([u64::MAX, u64::MAX]);
    actual.sorted.extend_from_slice(events);
    actual.sorted.push(0);
    actual.local_clicks = clicks.to_vec();
    actual.person_sorted(person, 2..2 + events.len(), 0..clicks.len());
    assert_eq!(actual.rows, reference.rows);
    assert_eq!(actual.credit, reference.credit);
    assert_eq!(actual.assist, reference.assist);
    assert_eq!(actual.in_window, reference.in_window);
    assert!(actual.active.is_empty());
    assert!(actual.category_sums.is_empty());
}

#[test]
fn streaming_sessions_preserve_midnight_gap_boundaries_and_daily_category_ties() {
    let ctx = context();
    let t = WEEK_MS as u32;
    let midnight = t + DAY_MS as u32;
    let events = [
        event(midnight - 1000, 1, 5),
        event(midnight + 1000, 0, 5),
        event(midnight + 1000 + GAP_MS, 0, 0),
        event(midnight + 1001 + 2 * GAP_MS, 2, 7),
    ];
    compare(&ctx, &events, &[]);
    let mut actual = Worker::new(&ctx);
    actual.sorted = events.to_vec();
    let person = ctx.users.encode(b"u1");
    actual.person_sorted(person, 0..events.len(), 0..0);
    let mut expected = write::Part::default();
    expected.push(person, 0, [1, 3, 10], 0);
    expected.push(person, 1, [1, 1, 7], 2);
    assert_eq!(actual.rows, expected);
    assert_eq!(actual.credit[4], [1, 1, 10]);
    assert_eq!(actual.credit[9], [1, 1, 7]);
}

#[test]
fn streaming_sessions_match_reference_with_ties_week_limits_and_reused_people() {
    let ctx = context();
    let t = WEEK_MS as u32;
    let clicks = [
        LocalClick { ts: 0, campaign: 0, click: ctx.click_ids.encode(b"k0") },
        LocalClick { ts: t, campaign: 2, click: ctx.click_ids.encode(b"kz") },
        LocalClick { ts: t, campaign: 1, click: ctx.click_ids.encode(b"ka") },
        LocalClick { ts: t + 1, campaign: 3, click: ctx.click_ids.encode(b"k1") },
    ];
    let events = [event(t, 0, 1), event(t + GAP_MS + 1, 1, 3)];
    compare(&ctx, &events, &clicks);
    let mut actual = Worker::new(&ctx);
    actual.sorted = events.to_vec();
    actual.local_clicks = clicks.to_vec();
    actual.person_sorted(ctx.users.encode(b"u1"), 0..2, 0..clicks.len());
    actual.sorted = vec![event(t + 1, 2, 9)];
    actual.person_sorted(ctx.users.encode(b"u2"), 0..1, 0..0);
    assert_eq!(actual.credit[1], [1, 1, 1]);
    assert_eq!(actual.credit[3], [1, 1, 3]);
    assert_eq!(actual.credit[4], [1, 1, 9]);
    assert_eq!(actual.assist[..4], [1, 2, 2, 1]);
    assert!(actual.in_window.iter().all(|&n| n == 0));
}

#[test]
fn streaming_empty_single_dense_and_random_people_match_summary_oracle() {
    let ctx = context();
    let t = WEEK_MS as u32;
    let mut seed = 0x35b9_f08e_471c_a263u64;
    for trial in 0..160usize {
        let n = match trial { 0 => 0, 1 => 1, 2 => 8, 3 => 1023, 4 => 4096, _ => trial * 7 % 1300 };
        let mut events = Vec::with_capacity(n);
        for i in 0..n {
            seed ^= seed << 13; seed ^= seed >> 7; seed ^= seed << 17;
            let offset = if trial == 4 { 1 } else { (seed % (3 * DAY_MS as u64)) as u32 };
            let cents = if i % 3 == 0 { (seed % 10_000_000 + 1) as u32 } else { 0 };
            events.push(event(t + offset, (seed >> 24) as u32 % 17, cents));
        }
        events.sort_unstable();
        let mut clicks = Vec::new();
        for i in 0..trial % 23 {
            seed ^= seed << 13; seed ^= seed >> 7; seed ^= seed << 17;
            clicks.push(LocalClick { ts: (seed % (4 * DAY_MS as u64)) as u32 + t - DAY_MS as u32,
                campaign: i as u32 % 4, click: ctx.click_ids.encode(format!("k{i}").as_bytes()) });
        }
        clicks.sort_unstable_by(|a, b| a.ts.cmp(&b.ts).then_with(|| ctx.click_ids.cmp(b.click, a.click)));
        compare(&ctx, &events, &clicks);
    }
}
