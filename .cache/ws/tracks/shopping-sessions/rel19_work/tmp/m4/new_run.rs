#[allow(clippy::too_many_arguments)]
pub(super) fn run_f2(
    config: &Config,
    ctx: &Ctx,
    f2: &Lane2,
    categories: &[&'static [u8]],
    campaign_ids: &[&'static [u8]],
    campaign_channels: &[&'static [u8]],
    started: Instant,
    est_events: usize,
    click_bytes: usize,
) -> Result<Outcome> {
    let lap = |name: &str| eprintln!("{name:<8} {:>8.1} ms", started.elapsed().as_secs_f64() * 1e3);
    let tracing = trace::enabled();
    let threads = config.threads.max(1);
    let decoder = ctx.decoder.unwrap();
    let gcap = decoder.gcap as usize;
    let shared = Shared {
        people: OnceLock::new(),
        links_done: AtomicBool::new(false),
        queue: AtomicUsize::new(0),
        events_ready: AtomicUsize::new(0),
        clicks_ready: AtomicUsize::new(0),
        multi_queue: AtomicUsize::new(0),
        final_queue: AtomicUsize::new(0),
        file_counter: AtomicUsize::new(0),
        barrier: Barrier::new(threads),
        bucket_sinks: (0..threads).map(|_| OnceLock::new()).collect(),
        p1_sinks: (0..threads).map(|_| OnceLock::new()).collect(),
        fclick_sinks: (0..threads).map(|_| OnceLock::new()).collect(),
        gclick_sinks: (0..threads).map(|_| OnceLock::new()).collect(),
        sides: (0..threads).map(|_| OnceLock::new()).collect(),
        p2_sinks: (0..threads).map(|_| OnceLock::new()).collect(),
        late_sinks: (0..threads).map(|_| OnceLock::new()).collect(),
        extras: (0..threads).map(|_| OnceLock::new()).collect(),
        outs: (0..f2.buckets).map(|_| OnceLock::new()).collect(),
        click_parts: (0..f2.click_parts).map(|_| OnceLock::new()).collect(),
        counts: zeroed_counts(gcap),
        entries: Mutex::new(Vec::new()),
        plan: OnceLock::new(),
        finals: Mutex::new(Finals {
            results: Vec::new(),
            jobs: Vec::new(),
            pushed: 0,
        }),
        finals_cv: Condvar::new(),
        cells_all: OnceLock::new(),
        campaign_sums: Mutex::new([0; 4]),
        failure: Mutex::new(None),
        tallies: Mutex::new([0; 6]),
        traces: Mutex::new(Vec::new()),
    };
    let user_dir = config.output_dir.join("user_daily");
    let campaign_dir = config.output_dir.join("campaign_daily");
    crate::output::create_table_dir(config.output_dir, "user_daily")?;
    crate::output::create_table_dir(config.output_dir, "campaign_daily")?;
    let used_buckets = (est_events >> f2.bits).max(1);
    let bucket_block = block_for(est_events, used_buckets, threads, 64);
    let used_parts = (est_events / 30 / (1 << f2.cb)).max(1);
    let fclick_block = block_for(click_bytes / 47, used_parts, threads, 32);
    let parse_units = ctx.units.len();
    let parts = f2.click_parts;
    let nb = f2.buckets;
    let general = 1usize << ctx.p1_bits;
    let pieces = threads.clamp(1, 4);
    lap("plan");

    std::thread::scope(|scope| {
        for id in 0..threads {
            let shared = &shared;
            let lap = &lap;
            let user_dir = &user_dir;
            let campaign_dir = &campaign_dir;
            scope.spawn(move || {
                warm_heap();
                let mut tr = trace::Trace::new(tracing, started);
                let mut arena = Arena::new();
                let mut buckets: Option<Sink<FRec>> = Some(Sink::new(f2.buckets, bucket_block));
                let mut p1: Option<Sink<EventRec>> = Some(Sink::new(1 << ctx.p1_bits, ctx.p1_block));
                let mut fclicks: Option<Sink<ClickRec>> = Some(Sink::new(f2.click_parts, fclick_block));
                let mut gclicks: Option<Sink<ClickRec>> = Some(Sink::new(1 << ctx.p2_bits, ctx.click_block));
                let mut side: Vec<SideRec> = Vec::new();
                let mut side_count = 0usize;
                let mut copies = 0usize;
                let mut click_count = 0usize;
                let mut p2: Sink<PersonRec> = Sink::new(1 << ctx.p2_bits, ctx.p2_block);
                let mut late: Sink<ClickRec> = Sink::new(1 << ctx.p2_bits, ctx.click_block);
                let mut extras: Vec<FW> = Vec::new();
                let mut table: Vec<FRec> = Vec::new();
                let mut occ: Vec<u64> = Vec::new();
                let mut buf: Vec<EventRec> = Vec::new();
                let mut htable: Vec<(u64, u32)> = Vec::new();
                let mut cbuf: Vec<ClickRec> = Vec::new();
                let mut tally = [0usize; 2];
                let mut all_buckets: Vec<&Sink<FRec>> = Vec::new();
                let mut all_p1: Vec<&Sink<EventRec>> = Vec::new();
                let mut sides: Vec<&[SideRec]> = Vec::new();
                let mut all_fclicks: Vec<&Sink<ClickRec>> = Vec::new();
                loop {
                    let i = shared.queue.fetch_add(1, Ordering::Relaxed);
                    if i >= ctx.first_click {
                        if let Some(mut sink) = buckets.take() {
                            sink.finish(&mut arena);
                            let _ = shared.bucket_sinks[id].set(sink);
                            if let Some(mut sink) = p1.take() {
                                sink.finish(&mut arena);
                                let _ = shared.p1_sinks[id].set(sink);
                            }
                            side_count = side.len();
                            let _ = shared.sides[id].set(std::mem::take(&mut side));
                            shared.events_ready.fetch_add(1, Ordering::Release);
                        }
                    }
                    if i >= parse_units {
                        if let Some(mut sink) = fclicks.take() {
                            sink.finish(&mut arena);
                            let _ = shared.fclick_sinks[id].set(sink);
                            if let Some(mut sink) = gclicks.take() {
                                sink.finish(&mut arena);
                                let _ = shared.gclick_sinks[id].set(sink);
                            }
                            shared.clicks_ready.fetch_add(1, Ordering::Release);
                        }
                    }
                    let t = tr.now();
                    if let Some(&unit) = ctx.units.get(i) {
                        match unit {
                            Unit::Links => {
                                let t0 = Instant::now();
                                let built = build_people(&ctx.link_files, ctx.decoder);
                                let _ = shared.people.set(built);
                                shared.links_done.store(true, Ordering::Release);
                                eprintln!("links    {:>8.1} ms on one thread", t0.elapsed().as_secs_f64() * 1e3);
                                for file in ctx.link_files.iter().filter(|f| !f.is_empty()) {
                                    unsafe { libc::munmap(file.as_ptr() as *mut libc::c_void, file.len()) };
                                }
                                tr.add(trace::LINKS, t);
                            }
                            Unit::Events(f, s, e) => {
                                let chunk = line_range(ctx.files[f], s, e);
                                if !chunk.is_empty() {
                                    copies += parse_events_f2(
                                        ctx,
                                        f2,
                                        chunk,
                                        &mut arena,
                                        buckets.as_mut().unwrap(),
                                        p1.as_mut().unwrap(),
                                        &mut side,
                                        id as u64,
                                    );
                                }
                                tr.add(trace::EVENTS, t);
                                release_chunk(ctx, f, &mut tr);
                            }
                            Unit::Clicks(f, s, e) => {
                                let chunk = line_range(ctx.files[f], s, e);
                                if !shared.links_done.load(Ordering::Acquire) {
                                    let w = tr.now();
                                    while !shared.links_done.load(Ordering::Acquire) {
                                        std::thread::yield_now();
                                    }
                                    tr.add(trace::WAIT_LINKS, w);
                                }
                                let t = tr.now();
                                let people = shared.people.get().unwrap();
                                if !chunk.is_empty() {
                                    click_count += parse_clicks_f2(
                                        ctx,
                                        f2,
                                        people,
                                        chunk,
                                        &mut arena,
                                        fclicks.as_mut().unwrap(),
                                        gclicks.as_mut().unwrap(),
                                    );
                                }
                                tr.add(trace::CLICKS, t);
                                release_chunk(ctx, f, &mut tr);
                            }
                        }
                        continue;
                    }
                    let q = i - parse_units;
                    if q >= nb + general + parts {
                        break;
                    }
                    if q < nb + general {
                        if all_buckets.is_empty() {
                            let w = tr.now();
                            wait_ready(&shared.events_ready, threads);
                            tr.add(trace::BAR_PARSE, w);
                            all_buckets = shared.bucket_sinks.iter().map(|s| s.get().unwrap()).collect();
                            all_p1 = shared.p1_sinks.iter().map(|s| s.get().unwrap()).collect();
                            sides = shared.sides.iter().map(|s| s.get().unwrap().as_slice()).collect();
                        }
                    } else if all_fclicks.is_empty() {
                        let w = tr.now();
                        wait_ready(&shared.clicks_ready, threads);
                        tr.add(trace::BAR_PARSE, w);
                        all_fclicks = shared.fclick_sinks.iter().map(|s| s.get().unwrap()).collect();
                    }
                    let t = tr.now();
                    let people = shared.people.get().unwrap();
                    if q < nb {
                        let out = pass1_bucket(
                            ctx,
                            f2,
                            people,
                            &all_buckets,
                            &sides,
                            q,
                            &mut table,
                            &mut occ,
                            &mut arena,
                            &mut p2,
                            &shared.counts,
                            &mut tally,
                        );
                        let _ = shared.outs[q].set(out);
                    } else if q < nb + general {
                        pass1_general(
                            ctx,
                            people,
                            &all_p1,
                            q - nb,
                            &mut buf,
                            &mut htable,
                            &mut arena,
                            &mut p2,
                            &mut extras,
                            &shared.counts,
                            &mut tally,
                        );
                    } else {
                        let c = q - nb - general;
                        let part = click_part(ctx, f2, people, &all_fclicks, c, &mut arena, &mut late, &mut cbuf);
                        let _ = shared.click_parts[c].set(part);
                    }
                    tr.add(trace::DEDUP, t);
                }
                drop(all_buckets);
                drop(all_p1);
                drop(sides);
                drop(all_fclicks);
                drop(table);
                drop(occ);
                drop(buf);
                drop(htable);
                drop(cbuf);
                p2.finish(&mut arena);
                late.finish(&mut arena);
                {
                    let mut t = shared.tallies.lock().unwrap();
                    t[0] += copies;
                    t[1] += click_count;
                    t[2] += tally[0];
                    t[3] += tally[1];
                    t[4] += side_count;
                    t[5] += extras.len();
                }
                let _ = shared.p2_sinks[id].set(p2);
                let _ = shared.late_sinks[id].set(late);
                let _ = shared.extras[id].set(extras);
                let t = tr.now();
                if shared.barrier.wait().is_leader() {
                    lap("pass 1");
                }
                tr.add(trace::BAR_DEDUP, t);

                let t = tr.now();
                let mut mine: Vec<Entry> = Vec::new();
                loop {
                    let b = shared.multi_queue.fetch_add(1, Ordering::Relaxed);
                    if b >= nb {
                        break;
                    }
                    let out = shared.outs[b].get().unwrap();
                    for run in &out.runs {
                        if multi(shared.counts[run.g as usize].load(Ordering::Relaxed)) {
                            mine.push(Entry {
                                g: run.g,
                                src: b as u32,
                                start: run.start,
                                end: run.end,
                            });
                        }
                    }
                }
                for (i, e) in shared.extras[id].get().unwrap().iter().enumerate() {
                    mine.push(Entry {
                        g: e.ga >> 4,
                        src: (nb + id) as u32,
                        start: i as u32,
                        end: i as u32 + 1,
                    });
                }
                shared.entries.lock().unwrap().extend(mine);
                if shared.barrier.wait().is_leader() {
                    let mut entries = std::mem::take(&mut *shared.entries.lock().unwrap());
                    entries.sort_unstable_by_key(|e| (e.g, e.src, e.start));
                    let mut units: Vec<(usize, usize, usize)> = Vec::new();
                    let mut i = 0;
                    while i < entries.len() {
                        let mut j = i;
                        let mut size = 0usize;
                        while j < entries.len() && entries[j].g == entries[i].g {
                            size += (entries[j].end - entries[j].start) as usize;
                            j += 1;
                        }
                        units.push((size, i, j));
                        i = j;
                    }
                    units.sort_unstable_by(|a, b| b.cmp(a));
                    let all_p2: Vec<&Sink<PersonRec>> = shared.p2_sinks.iter().map(|s| s.get().unwrap()).collect();
                    let mut sizes: Vec<(usize, usize)> = (0..1usize << ctx.p2_bits)
                        .map(|p| {
                            let n: usize = all_p2.iter().map(|s| s.len(p)).sum::<usize>();
                            (n, p)
                        })
                        .filter(|&(n, _)| n > 0)
                        .collect();
                    sizes.sort_unstable_by(|a, b| b.cmp(a));
                    eprintln!(
                        "multi    {} persons, {} entries, {} events; general partitions {}",
                        units.len(),
                        entries.len(),
                        units.iter().map(|u| u.0).sum::<usize>(),
                        sizes.len()
                    );
                    let _ = shared.plan.set((
                        entries,
                        units.into_iter().map(|(_, a, b)| (a, b)).collect(),
                        sizes.into_iter().map(|(_, p)| p).collect(),
                    ));
                    lap("pass 1.5");
                }
                shared.barrier.wait();
                tr.add(trace::ORDER, t);

                let (entries, units, gorder) = shared.plan.get().unwrap();
                let people = shared.people.get().unwrap();
                let all_p2: Vec<&Sink<PersonRec>> = shared.p2_sinks.iter().map(|s| s.get().unwrap()).collect();
                let all_gclicks: Vec<&Sink<ClickRec>> = shared
                    .gclick_sinks
                    .iter()
                    .chain(shared.late_sinks.iter())
                    .map(|s| s.get().unwrap())
                    .collect();
                let extras: Vec<&[FW]> = shared.extras.iter().map(|s| s.get().unwrap().as_slice()).collect();
                let info = &people.info;
                let mut worker = Worker::new(ctx);
                let mut flushed = [0u64; 4];
                let mut slices: Vec<&[FW]> = Vec::new();
                let total = units.len() + gorder.len() + nb;
                loop {
                    let i = shared.final_queue.fetch_add(1, Ordering::Relaxed);
                    if i >= total {
                        break;
                    }
                    let t = tr.now();
                    if i < units.len() {
                        let (a, b) = units[i];
                        let g = entries[a].g;
                        slices.clear();
                        for e in &entries[a..b] {
                            let src = e.src as usize;
                            let w: &[FW] = if src < nb {
                                &shared.outs[src].get().unwrap().w
                            } else {
                                extras[src - nb]
                            };
                            slices.push(&w[e.start as usize..e.end as usize]);
                        }
                        worker.f_group(&decoder, info, u64::from(g), &slices, clicks_of(&shared.click_parts, f2.cb, u64::from(g)));
                    } else if i < units.len() + gorder.len() {
                        worker.partition(ctx, people, &all_p2, &all_gclicks, gorder[i - units.len()]);
                    } else {
                        let b = i - units.len() - gorder.len();
                        let out = shared.outs[b].get().unwrap();
                        for run in &out.runs {
                            if multi(shared.counts[run.g as usize].load(Ordering::Relaxed)) {
                                continue;
                            }
                            let g = u64::from(run.g);
                            worker.f_group(
                                &decoder,
                                info,
                                g,
                                &[&out.w[run.start as usize..run.end as usize]],
                                clicks_of(&shared.click_parts, f2.cb, g),
                            );
                        }
                    }
                    tr.add(trace::PEOPLE, t);
                    if worker.rows.len() >= FLUSH_ROWS {
                        let tw = tr.now();
                        let file = shared.file_counter.fetch_add(1, Ordering::Relaxed);
                        if let Err(e) =
                            write::user_part(user_dir, file, &worker.rows, 0..worker.rows.len(), categories, ctx.first_day)
                        {
                            *shared.failure.lock().unwrap() = Some(e.to_string());
                        }
                        let t = worker.rows.totals();
                        for k in 0..4 {
                            flushed[k] += t[k];
                        }
                        worker.rows.clear();
                        tr.add(trace::USER_WRITE, tw);
                    }
                }
                let t = tr.now();
                let mut part = worker.finish();
                let cells = std::mem::take(&mut part.cells);
                let mut totals = part.totals();
                for k in 0..4 {
                    totals[k] += flushed[k];
                }
                let part = std::sync::Arc::new(part);
                {
                    let mut state = shared.finals.lock().unwrap();
                    let rows = part.len();
                    if rows > 0 || id == 0 {
                        let step = FINAL_ROWS.max(rows.div_ceil(threads));
                        let mut at = 0;
                        loop {
                            let end = (at + step).min(rows);
                            state.jobs.push(Job::User(part.clone(), at, end));
                            at = end;
                            if at >= rows {
                                break;
                            }
                        }
                    }
                    state.results.push((cells, totals));
                    state.pushed += 1;
                    if state.pushed == threads {
                        let _ = shared.cells_all.set(std::mem::take(&mut state.results));
                        for k in 0..pieces {
                            state.jobs.push(Job::Campaign(k));
                        }
                    }
                }
                shared.finals_cv.notify_all();
                drop(part);
                tr.add(trace::PEOPLE, t);
                loop {
                    let job = {
                        let mut state = shared.finals.lock().unwrap();
                        loop {
                            if let Some(job) = state.jobs.pop() {
                                break Some(job);
                            }
                            if state.pushed == threads {
                                break None;
                            }
                            let w = tr.now();
                            state = shared.finals_cv.wait(state).unwrap();
                            tr.add(trace::BAR_END, w);
                        }
                    };
                    let Some(job) = job else { break };
                    match job {
                        Job::User(part, a, b) => {
                            let t = tr.now();
                            let file = shared.file_counter.fetch_add(1, Ordering::Relaxed);
                            if let Err(e) = write::user_part(user_dir, file, &part, a..b, categories, ctx.first_day) {
                                *shared.failure.lock().unwrap() = Some(e.to_string());
                            }
                            tr.add(trace::LAST_WRITE, t);
                        }
                        Job::Campaign(k) => {
                            let t = tr.now();
                            let all = shared.cells_all.get().unwrap();
                            let cells: Vec<&[[u64; 4]]> = all.iter().map(|(c, _)| c.as_slice()).collect();
                            let campaigns = campaign_ids.len() + 1;
                            let per = campaigns.div_ceil(pieces);
                            let range = (k * per).min(campaigns)..((k + 1) * per).min(campaigns);
                            match write::campaign_table(
                                campaign_dir,
                                k,
                                &cells,
                                range,
                                campaign_ids,
                                campaign_channels,
                                ORGANIC,
                                ctx.first_day,
                                ctx.days,
                            ) {
                                Ok(sums) => {
                                    let mut total = shared.campaign_sums.lock().unwrap();
                                    for j in 0..4 {
                                        total[j] += sums[j];
                                    }
                                }
                                Err(e) => *shared.failure.lock().unwrap() = Some(e.to_string()),
                            }
                            tr.add(trace::CAMPAIGN, t);
                        }
                    }
                }
                let t = tr.now();
                arena.release();
                tr.add(trace::RELEASE, t);
                trace::collect(&shared.traces, id, tr);
            });
        }
    });
    lap("people");
    if let Some(e) = shared.failure.into_inner().unwrap() {
        return Err(e.into());
    }
    if let Some(all) = shared.cells_all.get() {
        let mut users = [0u64; 4];
        for (_, t) in all.iter() {
            for k in 0..4 {
                users[k] += t[k];
            }
        }
        write::report(users, *shared.campaign_sums.lock().unwrap());
    }
    let t = *shared.tallies.lock().unwrap();
    let winners = t[2];
    let lane_f = t[3];
    let lane_g_share = if winners == 0 { 0.0 } else { 100.0 * (winners - lane_f) as f64 / winners as f64 };
    eprintln!(
        "buckets  winners {winners}, lane F {lane_f}, lane G share {lane_g_share:.2}%{}, side records {}, general-ID lane F winners {}",
        if lane_g_share > 10.0 { " (above 10%)" } else { "" },
        t[4],
        t[5]
    );
    eprintln!(
        "event copies {}, clicks {}, linked {}, exotic {}",
        t[0],
        t[1],
        shared.people.get().map_or(0, |p| p.linked()),
        keys::exotic_count()
    );
    lap("write");
    if tracing {
        for (id, t) in shared.traces.into_inner().unwrap().iter() {
            t.print(&format!("t{id}"));
        }
        let at = started.elapsed().as_secs_f64() * 1e3;
        let now = std::time::SystemTime::now();
        let since = |t: std::time::SystemTime| t.duration_since(std::time::UNIX_EPOCH).map_or(0.0, |d| d.as_secs_f64());
        eprintln!(
            "trace m clock start {:.6} exit {:.6} at {at:.3}",
            since(now - started.elapsed()),
            since(now)
        );
    }
    unsafe { libc::_exit(0) }
}

