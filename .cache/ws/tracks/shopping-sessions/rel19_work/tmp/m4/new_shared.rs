struct Shared {
    people: OnceLock<People>,
    links_done: AtomicBool,
    queue: AtomicUsize,
    events_ready: AtomicUsize,
    clicks_ready: AtomicUsize,
    multi_queue: AtomicUsize,
    final_queue: AtomicUsize,
    file_counter: AtomicUsize,
    barrier: Barrier,
    bucket_sinks: Vec<OnceLock<Sink<FRec>>>,
    p1_sinks: Vec<OnceLock<Sink<EventRec>>>,
    fclick_sinks: Vec<OnceLock<Sink<ClickRec>>>,
    gclick_sinks: Vec<OnceLock<Sink<ClickRec>>>,
    sides: Vec<OnceLock<Vec<SideRec>>>,
    p2_sinks: Vec<OnceLock<Sink<PersonRec>>>,
    late_sinks: Vec<OnceLock<Sink<ClickRec>>>,
    extras: Vec<OnceLock<Vec<FW>>>,
    outs: Vec<OnceLock<BucketOut>>,
    click_parts: Vec<OnceLock<ClickPart>>,
    counts: Vec<AtomicU32>,
    entries: Mutex<Vec<Entry>>,
    plan: OnceLock<(Vec<Entry>, Vec<(usize, usize)>, Vec<usize>)>,
    finals: Mutex<Finals>,
    finals_cv: Condvar,
    cells_all: OnceLock<Vec<(Vec<[u64; 4]>, [u64; 4])>>,
    campaign_sums: Mutex<[u64; 4]>,
    failure: Mutex<Option<String>>,
    tallies: Mutex<[usize; 6]>,
    traces: Mutex<Vec<(usize, trace::Trace)>>,
}

fn wait_ready(ready: &AtomicUsize, threads: usize) {
    while ready.load(Ordering::Acquire) < threads {
        for _ in 0..64 {
            std::hint::spin_loop();
        }
        std::thread::yield_now();
    }
}

