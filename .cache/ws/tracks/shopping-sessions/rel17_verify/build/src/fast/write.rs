use std::path::Path;

use super::keys;
use super::parquet::{self, put_i32, put_i64, put_str, Column, Kind};
use crate::input::Result;

#[derive(Default)]
pub struct Part {
    persons: Vec<u64>,
    days: Vec<u32>,
    sessions: Vec<u64>,
    events: Vec<u64>,
    revenue: Vec<u64>,
    top: Vec<u8>,
    pub cells: Vec<[u64; 4]>,
}

impl Part {
    pub fn len(&self) -> usize {
        self.persons.len()
    }

    pub fn clear(&mut self) {
        self.persons.clear();
        self.days.clear();
        self.sessions.clear();
        self.events.clear();
        self.revenue.clear();
        self.top.clear();
    }

    pub fn totals(&self) -> [u64; 4] {
        [
            self.persons.len() as u64,
            self.sessions.iter().sum(),
            self.events.iter().sum(),
            self.revenue.iter().sum(),
        ]
    }

    #[inline]
    pub fn push(&mut self, person: u64, day: u32, row: [u64; 3], top: u8) {
        self.persons.push(person);
        self.days.push(day);
        self.sessions.push(row[0]);
        self.events.push(row[1]);
        self.revenue.push(row[2]);
        self.top.push(top);
    }
}

pub fn user_part(
    dir: &Path,
    id: usize,
    part: &Part,
    range: std::ops::Range<usize>,
    categories: &[&[u8]],
    first_day: i64,
) -> Result<()> {
    let base = range.start;
    let rows = range.len();
    let names = |a: usize, b: usize, out: &mut Vec<u8>, _: &mut Vec<u8>| {
        for &person in &part.persons[base + a..base + b] {
            let at = out.len();
            out.extend_from_slice(&[0; 4]);
            keys::bytes_of(person, out);
            let len = (out.len() - at - 4) as u32;
            out[at..at + 4].copy_from_slice(&len.to_le_bytes());
        }
    };
    let days = |a: usize, b: usize, out: &mut Vec<u8>, _: &mut Vec<u8>| {
        for &d in &part.days[base + a..base + b] {
            put_i32(out, (first_day + i64::from(d)) as i32);
        }
    };
    let sessions = |a: usize, b: usize, out: &mut Vec<u8>, _: &mut Vec<u8>| {
        for &v in &part.sessions[base + a..base + b] {
            put_i32(out, v as i32);
        }
    };
    let events = |a: usize, b: usize, out: &mut Vec<u8>, _: &mut Vec<u8>| {
        for &v in &part.events[base + a..base + b] {
            put_i32(out, v as i32);
        }
    };
    let revenue = |a: usize, b: usize, out: &mut Vec<u8>, _: &mut Vec<u8>| {
        for &v in &part.revenue[base + a..base + b] {
            put_i64(out, v as i64);
        }
    };
    let top = |a: usize, b: usize, out: &mut Vec<u8>, defs: &mut Vec<u8>| {
        for &t in &part.top[base + a..base + b] {
            if t == u8::MAX {
                defs.push(0);
            } else {
                defs.push(1);
                put_str(out, categories[t as usize]);
            }
        }
    };
    let columns = [
        Column { name: "user_id", kind: Kind::Str, fill: &names },
        Column { name: "day", kind: Kind::Date, fill: &days },
        Column { name: "sessions", kind: Kind::I32, fill: &sessions },
        Column { name: "events", kind: Kind::I32, fill: &events },
        Column { name: "revenue_cents", kind: Kind::I64, fill: &revenue },
        Column { name: "top_category", kind: Kind::OptStr, fill: &top },
    ];
    parquet::write(&dir.join(format!("part-{id:05}.parquet")), &columns, rows)
}

#[allow(clippy::too_many_arguments)]
pub fn campaign_table(
    dir: &Path,
    file: usize,
    parts: &[&[[u64; 4]]],
    campaigns: std::ops::Range<usize>,
    ids: &[&[u8]],
    channels: &[&[u8]],
    organic: &[u8],
    first_day: i64,
    days: usize,
) -> Result<[u64; 4]> {
    let from = campaigns.start * days;
    let to = campaigns.end * days;
    let mut total = vec![[0u64; 4]; to - from];
    for part in parts {
        for (t, c) in total.iter_mut().zip(part[from..to].iter()) {
            for k in 0..4 {
                t[k] += c[k];
            }
        }
    }
    let mut sums = [0u64; 4];
    for (i, cell) in total.iter().enumerate() {
        sums[0] += cell[0];
        sums[1] += cell[2];
        sums[2] += cell[3];
        if campaigns.start + i / days.max(1) != ids.len() {
            sums[3] += cell[0];
        }
    }
    let mut rows: Vec<(usize, usize, [u64; 4])> = Vec::new();
    for campaign in campaigns.clone() {
        for day in 0..days {
            let cell = total[(campaign - campaigns.start) * days + day];
            if cell[0] > 0 || cell[3] > 0 {
                rows.push((campaign, day, cell));
            }
        }
    }
    if rows.is_empty() && file > 0 {
        return Ok(sums);
    }
    let rows = &rows;
    let id = |c: usize| if c < ids.len() { ids[c] } else { organic };
    let channel = |c: usize| if c < ids.len() { channels[c] } else { organic };
    let ids_col = |a: usize, b: usize, out: &mut Vec<u8>, _: &mut Vec<u8>| {
        for r in &rows[a..b] {
            put_str(out, id(r.0));
        }
    };
    let channel_col = |a: usize, b: usize, out: &mut Vec<u8>, _: &mut Vec<u8>| {
        for r in &rows[a..b] {
            put_str(out, channel(r.0));
        }
    };
    let day_col = |a: usize, b: usize, out: &mut Vec<u8>, _: &mut Vec<u8>| {
        for r in &rows[a..b] {
            put_i32(out, (first_day + r.1 as i64) as i32);
        }
    };
    let count = |k: usize| {
        move |a: usize, b: usize, out: &mut Vec<u8>, _: &mut Vec<u8>| {
            for r in &rows[a..b] {
                put_i32(out, r.2[k] as i32);
            }
        }
    };
    let sessions = count(0);
    let purchasing = count(1);
    let assisted = count(3);
    let revenue = |a: usize, b: usize, out: &mut Vec<u8>, _: &mut Vec<u8>| {
        for r in &rows[a..b] {
            put_i64(out, r.2[2] as i64);
        }
    };
    let columns = [
        Column { name: "campaign_id", kind: Kind::Str, fill: &ids_col },
        Column { name: "channel", kind: Kind::Str, fill: &channel_col },
        Column { name: "day", kind: Kind::Date, fill: &day_col },
        Column { name: "sessions", kind: Kind::I32, fill: &sessions },
        Column { name: "purchasing_sessions", kind: Kind::I32, fill: &purchasing },
        Column { name: "revenue_cents", kind: Kind::I64, fill: &revenue },
        Column { name: "assisted_sessions", kind: Kind::I32, fill: &assisted },
    ];
    parquet::write(&dir.join(format!("part-{file:05}.parquet")), &columns, rows.len())?;
    Ok(sums)
}

pub fn report(users: [u64; 4], campaigns: [u64; 4]) {
    let [rows, user_sessions, user_events, user_revenue] = users;
    let [sessions, revenue, assisted, credited] = campaigns;
    eprintln!("surviving events {user_events}, user_daily rows {rows}");
    eprintln!("sessions {user_sessions} / {sessions}, revenue {user_revenue} / {revenue}, assisted {assisted} >= {credited}");
    if user_sessions != sessions || user_revenue != revenue || assisted < credited {
        eprintln!("warning: self-check failed");
    }
}
