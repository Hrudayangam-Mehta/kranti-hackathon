    let people: OnceLock<People> = OnceLock::new();
    let links_done = AtomicBool::new(false);
    let queue = AtomicUsize::new(0);
    let p1_ready = AtomicUsize::new(0);
    let person_queue = AtomicUsize::new(0);
    let file_counter = AtomicUsize::new(0);
    let barrier = Barrier::new(threads);
    let p1_sinks: Vec<OnceLock<Sink<EventRec>>> = (0..threads).map(|_| OnceLock::new()).collect();
    let click_sinks: Vec<OnceLock<Sink<ClickRec>>> = (0..threads).map(|_| OnceLock::new()).collect();
    let p2_sinks: Vec<OnceLock<Sink<PersonRec>>> = (0..threads).map(|_| OnceLock::new()).collect();
    let finals: Mutex<Finals> = Mutex::new(Finals {
        results: Vec::new(),
        jobs: Vec::new(),
        pushed: 0,
    });
    let cells_all: OnceLock<Vec<(Vec<[u64; 4]>, [u64; 4])>> = OnceLock::new();
    let campaign_sums: Mutex<[u64; 4]> = Mutex::new([0; 4]);
    let stats = Stats {
        event_copies: AtomicUsize::new(0),
        winners: AtomicUsize::new(0),
        lane_f: AtomicUsize::new(0),
        clicks: AtomicUsize::new(0),
    };
    let user_dir = config.output_dir.join("user_daily");
    let campaign_dir = config.output_dir.join("campaign_daily");
    crate::output::create_table_dir(config.output_dir, "user_daily")?;
    crate::output::create_table_dir(config.output_dir, "campaign_daily")?;
    let failure: Mutex<Option<String>> = Mutex::new(None);
    let traces: Mutex<Vec<(usize, trace::Trace)>> = Mutex::new(Vec::new());
    let parse_units = ctx.units.len();
    let dedup_units = 1usize << ctx.p1_bits;
    let pieces = threads.clamp(1, 4);
    mark("dirs");

    std::thread::scope(|scope| {
        for id in 0..threads {
            let ctx = &ctx;
            let people = &people;
            let links_done = &links_done;
            let queue = &queue;
            let p1_ready = &p1_ready;
            let person_queue = &person_queue;
            let file_counter = &file_counter;
            let barrier = &barrier;
            let p1_sinks = &p1_sinks;
            let click_sinks = &click_sinks;
            let p2_sinks = &p2_sinks;
            let finals = &finals;
            let cells_all = &cells_all;
            let campaign_sums = &campaign_sums;
            let stats = &stats;
            let lap = &lap;
            let user_dir = &user_dir;
            let campaign_dir = &campaign_dir;
            let campaign_ids = &campaign_ids;
            let campaign_channels = &campaign_channels;
            let failure = &failure;
            let categories = &categories;
            let traces = &traces;
            scope.spawn(move || {
                let mut tr = trace::Trace::new(tracing, started);
                let mut arena = Arena::new();
                let mut scratch = Scratch::new();
                let mut p1: Option<Sink<EventRec>> = Some(Sink::new(1 << ctx.p1_bits, ctx.p1_block));
                let mut clicks: Option<Sink<ClickRec>> = Some(Sink::new(1 << ctx.p2_bits, ctx.click_block));
                let mut copies = 0usize;
                let mut click_count = 0usize;
                let mut p2: Sink<PersonRec> = Sink::new(1 << ctx.p2_bits, ctx.p2_block);
                let mut buf: Vec<EventRec> = Vec::new();
                let mut table: Vec<(u64, u32)> = Vec::new();
                let mut winners = 0usize;
                let mut lane_f = 0usize;
                loop {
                    let i = queue.fetch_add(1, Ordering::Relaxed);
                    if i >= ctx.first_click {
                        if let Some(mut sink) = p1.take() {
                            sink.finish(&mut arena);
                            let _ = p1_sinks[id].set(sink);
                            p1_ready.fetch_add(1, Ordering::Release);
                        }
                    }
                    if i >= parse_units {
                        if let Some(mut sink) = clicks.take() {
                            sink.finish(&mut arena);
                            let _ = click_sinks[id].set(sink);
                        }
                    }
                    let t = tr.now();
                    if let Some(&unit) = ctx.units.get(i) {
                        match unit {
                            Unit::Links => {
                                let t0 = Instant::now();
                                let built = build_people(&ctx.link_files, ctx.decoder);
                                let _ = people.set(built);
                                links_done.store(true, Ordering::Release);
                                eprintln!("links    {:>8.1} ms on one thread", t0.elapsed().as_secs_f64() * 1e3);
                                for file in ctx.link_files.iter().filter(|f| !f.is_empty()) {
                                    unsafe { libc::munmap(file.as_ptr() as *mut libc::c_void, file.len()) };
                                }
                                tr.add(trace::LINKS, t);
                            }
                            Unit::Events(f, s, e) => {
                                let file = ctx.files[f];
                                let chunk = line_range(file, s, e);
                                if !chunk.is_empty() {
                                    copies += parse_events(ctx, chunk, &mut scratch, &mut arena, p1.as_mut().unwrap());
                                }
                                tr.add(trace::EVENTS, t);
                                release_chunk(ctx, f, &mut tr);
                            }
                            Unit::Clicks(f, s, e) => {
                                let file = ctx.files[f];
                                let chunk = line_range(file, s, e);
                                if !links_done.load(Ordering::Acquire) {
                                    let w = tr.now();
                                    while !links_done.load(Ordering::Acquire) {
                                        std::thread::yield_now();
                                    }
                                    tr.add(trace::WAIT_LINKS, w);
                                }
                                let t = tr.now();
                                let people = people.get().unwrap();
                                if !chunk.is_empty() {
                                    click_count +=
                                        parse_clicks(ctx, people, chunk, &mut scratch, &mut arena, clicks.as_mut().unwrap());
                                }
                                tr.add(trace::CLICKS, t);
                                release_chunk(ctx, f, &mut tr);
                            }
                        }
                        continue;
                    }
                    let q = i - parse_units;
                    if q >= dedup_units {
                        break;
                    }
                    if p1_ready.load(Ordering::Acquire) < threads {
                        let w = tr.now();
                        while p1_ready.load(Ordering::Acquire) < threads {
                            std::thread::yield_now();
                        }
                        tr.add(trace::BAR_PARSE, w);
                    }
                    let t = tr.now();
                    let all_p1: Vec<&Sink<EventRec>> = p1_sinks.iter().map(|s| s.get().unwrap()).collect();
                    let people = people.get().unwrap();
                    let (w, f) = dedup(ctx, people, &all_p1, q, &mut buf, &mut table, &mut arena, &mut p2);
                    winners += w;
                    lane_f += f;
                    tr.add(trace::DEDUP, t);
                }
                if id == 0 {
                    lap("dedup0");
                }
                drop(buf);
                drop(table);
                stats.event_copies.fetch_add(copies, Ordering::Relaxed);
                stats.clicks.fetch_add(click_count, Ordering::Relaxed);
                stats.winners.fetch_add(winners, Ordering::Relaxed);
                stats.lane_f.fetch_add(lane_f, Ordering::Relaxed);
                p2.finish(&mut arena);
                let _ = p2_sinks[id].set(p2);
                let t = tr.now();
                if barrier.wait().is_leader() {
                    lap("dedup");
                }
                tr.add(trace::BAR_DEDUP, t);
                let t = tr.now();
                let people = people.get().unwrap();
                let all_p2: Vec<&Sink<PersonRec>> = p2_sinks.iter().map(|s| s.get().unwrap()).collect();
                let all_clicks: Vec<&Sink<ClickRec>> = click_sinks.iter().map(|s| s.get().unwrap()).collect();
                let order = person_order(ctx, &all_p2, &all_clicks);
                tr.add(trace::ORDER, t);
                let mut worker = Worker::new(ctx);
                let mut flushed = [0u64; 4];
                loop {
                    let i = person_queue.fetch_add(1, Ordering::Relaxed);
                    let Some(&p) = order.get(i) else { break };
                    let t = tr.now();
                    worker.partition(ctx, people, &all_p2, &all_clicks, p);
                    tr.add(trace::PEOPLE, t);
                    if worker.rows.len() >= FLUSH_ROWS {
                        let tw = tr.now();
                        let file = file_counter.fetch_add(1, Ordering::Relaxed);
                        if let Err(e) =
                            write::user_part(user_dir, file, &worker.rows, 0..worker.rows.len(), categories, ctx.first_day)
                        {
                            *failure.lock().unwrap() = Some(e.to_string());
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
                    let mut state = finals.lock().unwrap();
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
                        let _ = cells_all.set(std::mem::take(&mut state.results));
                        for k in 0..pieces {
                            state.jobs.push(Job::Campaign(k));
                        }
                    }
                }
                drop(part);
                tr.add(trace::PEOPLE, t);
                loop {
                    let job = {
                        let mut state = finals.lock().unwrap();
                        match state.jobs.pop() {
                            Some(job) => job,
                            None if state.pushed == threads => break,
                            None => {
                                drop(state);
                                let w = tr.now();
                                std::thread::yield_now();
                                tr.add(trace::BAR_END, w);
                                continue;
                            }
                        }
                    };
                    match job {
                        Job::User(part, a, b) => {
                            let t = tr.now();
                            let file = file_counter.fetch_add(1, Ordering::Relaxed);
                            if let Err(e) = write::user_part(user_dir, file, &part, a..b, categories, ctx.first_day) {
                                *failure.lock().unwrap() = Some(e.to_string());
                            }
                            tr.add(trace::LAST_WRITE, t);
                        }
                        Job::Campaign(k) => {
                            let t = tr.now();
                            let all = cells_all.get().unwrap();
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
                                    let mut total = campaign_sums.lock().unwrap();
                                    for j in 0..4 {
                                        total[j] += sums[j];
                                    }
                                }
                                Err(e) => *failure.lock().unwrap() = Some(e.to_string()),
                            }
                            tr.add(trace::CAMPAIGN, t);
                        }
                    }
                }
                let t = tr.now();
                arena.release();
                tr.add(trace::RELEASE, t);
                trace::collect(traces, id, tr);
            });
        }
    });
    lap("people");
    if let Some(e) = failure.into_inner().unwrap() {
        return Err(e.into());
    }
    if let Some(all) = cells_all.get() {
        let mut users = [0u64; 4];
        for (_, t) in all.iter() {
            for k in 0..4 {
                users[k] += t[k];
            }
        }
        write::report(users, *campaign_sums.lock().unwrap());
    }
