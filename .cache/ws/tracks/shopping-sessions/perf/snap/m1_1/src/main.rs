mod clicks;
mod csv;
mod events;
mod hash;
mod input;
mod links;
mod manifest;
mod output;
mod sessions;
mod time;

use std::env;
use std::path::PathBuf;
use std::time::Instant;

use rayon::prelude::*;

use clicks::{Click, ClickRules};
use events::{EventCopy, EventRules, PersonEvent};
use hash::bucket_of;
use input::{Campaigns, Files, Products, Result, Window};
use links::People;
use output::{dates, integers, optional_strings, strings, Table};
use sessions::{CampaignTotals, Worker};
use time::day_of;

struct Config {
    data_dir: PathBuf,
    output_dir: PathBuf,
    threads: usize,
}

impl Config {
    fn from_env() -> Config {
        let dir = |name: &str, default: &str| PathBuf::from(env::var(name).unwrap_or_else(|_| default.to_string()));
        let threads = env::var("NCPU")
            .ok()
            .and_then(|value| value.trim().parse::<usize>().ok())
            .filter(|&n| n > 0)
            .unwrap_or_else(|| std::thread::available_parallelism().map_or(1, |n| n.get()));
        Config {
            data_dir: dir("DATA_DIR", "/data"),
            output_dir: dir("OUTPUT_DIR", "/output"),
            threads,
        }
    }
}

struct Clock {
    started: Instant,
    lap: Instant,
}

impl Clock {
    fn new() -> Clock {
        let now = Instant::now();
        Clock { started: now, lap: now }
    }

    fn lap(&mut self, phase: &str) {
        let now = Instant::now();
        eprintln!(
            "{phase:<10} {:>8.1} ms  (total {:>8.1} ms)",
            (now - self.lap).as_secs_f64() * 1e3,
            (now - self.started).as_secs_f64() * 1e3
        );
        self.lap = now;
    }
}

fn main() {
    let config = Config::from_env();
    if let Err(error) = rayon::ThreadPoolBuilder::new()
        .num_threads(config.threads)
        .build_global()
    {
        eprintln!("error: thread pool: {error}");
        std::process::exit(1);
    }
    match run(&config) {
        Ok(()) => std::process::exit(0),
        Err(error) => {
            eprintln!("error: {error}");
            std::process::exit(1);
        }
    }
}

fn run(config: &Config) -> Result<()> {
    let mut clock = Clock::new();
    let files = Files::read(&config.data_dir)?;
    clock.lap("read");

    let window = Window::from_manifest(&files.manifest)?;
    let products = Products::parse(&files.products);
    let campaigns = Campaigns::parse(&files.campaigns);
    let people = People::from_link_files(&files.links);
    clock.lap("links");

    let event_bytes: usize = files.events.iter().map(Vec::len).sum();
    let click_bytes: usize = files.clicks.iter().map(Vec::len).sum();
    let bits = bucket_bits(event_bytes);
    let chunk_bytes = chunk_target(event_bytes + click_bytes, config.threads);

    let event_rules = EventRules {
        window: &window,
        products: &products,
    };
    let parsed_events: Vec<Vec<Vec<EventCopy>>> = work_units(&files.events, chunk_bytes)
        .par_iter()
        .map(|chunk| {
            let mut buckets = empty_buckets(bits);
            for line in csv::lines(chunk) {
                if let Some(copy) = event_rules.parse_line(line) {
                    buckets[bucket_of(copy.event_id, bits)].push(copy);
                }
            }
            buckets
        })
        .collect();
    let event_copies: usize = parsed_events.iter().flatten().map(Vec::len).sum();
    clock.lap("events");

    let routed_events: Vec<Vec<Vec<PersonEvent>>> = transpose(parsed_events, bits)
        .into_par_iter()
        .map(|parts| events::dedup_and_route(concat(parts), &people, bits))
        .collect();
    let events_by_person = transpose(routed_events, bits);
    clock.lap("dedup");

    let click_rules = ClickRules {
        window: &window,
        campaigns: &campaigns,
        people: &people,
    };
    let parsed_clicks: Vec<Vec<Vec<Click>>> = work_units(&files.clicks, chunk_bytes)
        .par_iter()
        .map(|chunk| {
            let mut buckets = empty_buckets(bits);
            for line in csv::lines(chunk) {
                if let Some(click) = click_rules.parse_line(line) {
                    buckets[bucket_of(click.person, bits)].push(click);
                }
            }
            buckets
        })
        .collect();
    let clicks_by_person = transpose(parsed_clicks, bits);
    clock.lap("clicks");

    let first_day = day_of(window.start);
    let days = usize::try_from(day_of(window.end - 1) - first_day + 1).unwrap_or(0);
    let campaign_slots = campaigns.count_with_organic();
    let min_buckets_per_task = ((1usize << bits) / (config.threads * 4)).max(1);
    let workers: Vec<Worker> = events_by_person
        .into_par_iter()
        .zip(clicks_by_person)
        .with_min_len(min_buckets_per_task)
        .fold(
            || Worker::new(first_day, days, campaign_slots),
            |mut worker, (event_parts, click_parts)| {
                worker.process_bucket(concat(event_parts), concat(click_parts));
                worker
            },
        )
        .collect();
    clock.lap("sessions");

    let mut totals = CampaignTotals::new(first_day, days, campaign_slots);
    for worker in &workers {
        totals.add(&worker.totals);
    }
    write_outputs(config, &workers, &totals, &products, &campaigns)?;
    clock.lap("write");

    report(&workers, &totals, event_copies, people.linked_ids());
    Ok(())
}

fn write_outputs(
    config: &Config,
    workers: &[Worker],
    totals: &CampaignTotals,
    products: &Products,
    campaigns: &Campaigns,
) -> Result<()> {
    output::create_table_dir(&config.output_dir, "user_daily")?;
    output::create_table_dir(&config.output_dir, "campaign_daily")?;

    let user_dir = config.output_dir.join("user_daily");
    let parts: Vec<(usize, &Worker)> = workers
        .iter()
        .enumerate()
        .filter(|(index, worker)| *index == 0 || !worker.user_days.is_empty())
        .collect();
    let written: Vec<Result<()>> = parts
        .par_iter()
        .map(|&(index, worker)| {
            let rows = &worker.user_days;
            let columns = vec![
                strings(rows.iter().map(|row| row.person)),
                dates(rows.iter().map(|row| row.day)),
                integers(rows.iter().map(|row| row.sessions)),
                integers(rows.iter().map(|row| row.events)),
                integers(rows.iter().map(|row| row.revenue)),
                optional_strings(
                    rows.iter()
                        .map(|row| row.top_category.map(|c| products.categories[c as usize])),
                ),
            ];
            output::write_table(
                &user_dir.join(format!("part-{index:05}.parquet")),
                Table::UserDaily,
                columns,
            )
        })
        .collect();
    if parts.is_empty() {
        let columns = vec![
            strings(std::iter::empty()),
            dates(std::iter::empty()),
            integers(std::iter::empty()),
            integers(std::iter::empty()),
            integers(std::iter::empty()),
            optional_strings(std::iter::empty()),
        ];
        output::write_table(&user_dir.join("part-00000.parquet"), Table::UserDaily, columns)?;
    }
    for result in written {
        result?;
    }

    let mut rows = Vec::new();
    for campaign in 0..campaigns.count_with_organic() {
        for offset in 0..totals.days {
            let cell = totals.cells[campaign * totals.days + offset];
            if cell.sessions > 0 || cell.assisted_sessions > 0 {
                rows.push((campaign as u32, (totals.first_day + offset as i64) as i32, cell));
            }
        }
    }
    let columns = vec![
        strings(rows.iter().map(|(campaign, _, _)| campaigns.id(*campaign))),
        strings(rows.iter().map(|(campaign, _, _)| campaigns.channel(*campaign))),
        dates(rows.iter().map(|(_, day, _)| *day)),
        integers(rows.iter().map(|(_, _, cell)| cell.sessions)),
        integers(rows.iter().map(|(_, _, cell)| cell.purchasing_sessions)),
        integers(rows.iter().map(|(_, _, cell)| cell.revenue)),
        integers(rows.iter().map(|(_, _, cell)| cell.assisted_sessions)),
    ];
    output::write_table(
        &config.output_dir.join("campaign_daily").join("part-00000.parquet"),
        Table::CampaignDaily,
        columns,
    )
}

fn report(workers: &[Worker], totals: &CampaignTotals, event_copies: usize, linked_ids: usize) {
    let user_rows: usize = workers.iter().map(|w| w.user_days.len()).sum();
    let user_sessions: u64 = workers.iter().flat_map(|w| &w.user_days).map(|r| r.sessions).sum();
    let user_events: u64 = workers.iter().flat_map(|w| &w.user_days).map(|r| r.events).sum();
    let user_revenue: u64 = workers.iter().flat_map(|w| &w.user_days).map(|r| r.revenue).sum();
    let campaign_sessions: u64 = totals.cells.iter().map(|c| c.sessions).sum();
    let campaign_revenue: u64 = totals.cells.iter().map(|c| c.revenue).sum();
    let assisted: u64 = totals.cells.iter().map(|c| c.assisted_sessions).sum();
    let organic_start = totals.cells.len() - totals.days;
    let credited_non_organic: u64 = totals.cells[..organic_start].iter().map(|c| c.sessions).sum();
    eprintln!(
        "event copies {event_copies}, linked ids {linked_ids}, surviving events {user_events}, user_daily rows {user_rows}"
    );
    eprintln!(
        "sessions {user_sessions} / {campaign_sessions}, revenue {user_revenue} / {campaign_revenue}, assisted {assisted} >= {credited_non_organic}"
    );
    if user_sessions != campaign_sessions || user_revenue != campaign_revenue || assisted < credited_non_organic {
        eprintln!("warning: self-check failed");
    }
}

fn bucket_bits(event_bytes: usize) -> u32 {
    let wanted = (event_bytes / (4 << 20)).max(1).next_power_of_two();
    wanted.trailing_zeros().clamp(4, 10)
}

fn chunk_target(total_bytes: usize, threads: usize) -> usize {
    (total_bytes / (threads * 8).max(1)).clamp(64 << 10, 16 << 20)
}

fn work_units(files: &[Vec<u8>], target: usize) -> Vec<&[u8]> {
    files
        .iter()
        .flat_map(|file| {
            csv::data_chunks(file, target)
                .into_iter()
                .map(move |(start, end)| &file[start..end])
        })
        .collect()
}

fn empty_buckets<T>(bits: u32) -> Vec<Vec<T>> {
    (0..1usize << bits).map(|_| Vec::new()).collect()
}

fn transpose<T>(rows: Vec<Vec<Vec<T>>>, bits: u32) -> Vec<Vec<Vec<T>>> {
    let mut columns: Vec<Vec<Vec<T>>> = empty_buckets(bits);
    for row in rows {
        for (column, part) in columns.iter_mut().zip(row) {
            if !part.is_empty() {
                column.push(part);
            }
        }
    }
    columns
}

fn concat<T>(mut parts: Vec<Vec<T>>) -> Vec<T> {
    if parts.len() == 1 {
        return parts.pop().unwrap();
    }
    let mut all = Vec::with_capacity(parts.iter().map(Vec::len).sum());
    for part in parts {
        all.extend(part);
    }
    all
}
