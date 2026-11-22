use crate::clicks::Click;
use crate::events::PersonEvent;
use crate::time::{day_of, DAY_MS, MINUTE_MS};

pub const SESSION_GAP_MS: i64 = 30 * MINUTE_MS;
pub const ATTRIBUTION_MS: i64 = 7 * DAY_MS;

pub struct UserDay<'a> {
    pub person: &'a [u8],
    pub day: i32,
    pub sessions: u64,
    pub events: u64,
    pub revenue: u64,
    pub top_category: Option<u32>,
}

#[derive(Default, Clone, Copy)]
pub struct CampaignDay {
    pub sessions: u64,
    pub purchasing_sessions: u64,
    pub revenue: u64,
    pub assisted_sessions: u64,
}

pub struct CampaignTotals {
    pub first_day: i64,
    pub days: usize,
    pub cells: Vec<CampaignDay>,
}

impl CampaignTotals {
    pub fn new(first_day: i64, days: usize, campaigns: usize) -> CampaignTotals {
        CampaignTotals {
            first_day,
            days,
            cells: vec![CampaignDay::default(); days * campaigns],
        }
    }

    fn cell(&mut self, campaign: u32, day: i64) -> &mut CampaignDay {
        let offset = usize::try_from(day - self.first_day).expect("session day before the window");
        assert!(offset < self.days, "session day after the window");
        &mut self.cells[campaign as usize * self.days + offset]
    }

    pub fn add(&mut self, other: &CampaignTotals) {
        for (mine, theirs) in self.cells.iter_mut().zip(&other.cells) {
            mine.sessions += theirs.sessions;
            mine.purchasing_sessions += theirs.purchasing_sessions;
            mine.revenue += theirs.revenue;
            mine.assisted_sessions += theirs.assisted_sessions;
        }
    }
}

pub struct Worker<'a> {
    pub user_days: Vec<UserDay<'a>>,
    pub totals: CampaignTotals,
    organic: u32,
    clicks_in_window: Vec<u32>,
    active_position: Vec<u32>,
    active: Vec<u32>,
    category_sums: Vec<(u32, u64)>,
}

struct Session {
    start: i64,
    events: u64,
    revenue: u64,
}

impl<'a> Worker<'a> {
    pub fn new(first_day: i64, days: usize, campaigns_with_organic: usize) -> Worker<'a> {
        Worker {
            user_days: Vec::new(),
            totals: CampaignTotals::new(first_day, days, campaigns_with_organic),
            organic: (campaigns_with_organic - 1) as u32,
            clicks_in_window: vec![0; campaigns_with_organic],
            active_position: vec![0; campaigns_with_organic],
            active: Vec::new(),
            category_sums: Vec::new(),
        }
    }

    pub fn process_bucket(&mut self, mut events: Vec<PersonEvent<'a>>, mut clicks: Vec<Click<'a>>) {
        events.sort_unstable_by(|a, b| a.person.cmp(b.person).then(a.ts.cmp(&b.ts)));
        clicks.sort_unstable_by(|a, b| {
            a.person
                .cmp(b.person)
                .then(a.ts.cmp(&b.ts))
                .then(a.click_id.cmp(b.click_id))
        });
        let mut next_click = 0;
        for person_events in events.chunk_by(|a, b| a.person == b.person) {
            let person = person_events[0].person;
            while next_click < clicks.len() && clicks[next_click].person < person {
                next_click += 1;
            }
            let first_click = next_click;
            while next_click < clicks.len() && clicks[next_click].person == person {
                next_click += 1;
            }
            self.process_person(person, person_events, &clicks[first_click..next_click]);
        }
    }

    fn process_person(&mut self, person: &'a [u8], events: &[PersonEvent<'a>], clicks: &[Click<'a>]) {
        let mut window = ClickWindow { low: 0, high: 0 };
        let mut current: Option<UserDay<'a>> = None;
        let mut index = 0;
        while index < events.len() {
            let start = events[index].ts;
            let day = day_of(start);
            if let Some(row) = current.take_if(|row| i64::from(row.day) != day) {
                self.finish_day(row);
            }
            let mut session = Session {
                start,
                events: 0,
                revenue: 0,
            };
            let mut last_ts = start;
            while index < events.len() && events[index].ts - last_ts <= SESSION_GAP_MS {
                let event = &events[index];
                session.events += 1;
                if event.price > 0 {
                    session.revenue += u64::from(event.price);
                    self.add_category(event.category, u64::from(event.price));
                }
                last_ts = event.ts;
                index += 1;
            }
            self.attribute(&session, day, clicks, &mut window);
            let row = current.get_or_insert_with(|| UserDay {
                person,
                day: i32::try_from(day).expect("day out of range"),
                sessions: 0,
                events: 0,
                revenue: 0,
                top_category: None,
            });
            row.sessions += 1;
            row.events += session.events;
            row.revenue += session.revenue;
        }
        if let Some(row) = current {
            self.finish_day(row);
        }
        self.clear_window();
    }

    fn add_category(&mut self, category: u32, amount: u64) {
        match self.category_sums.iter_mut().find(|(c, _)| *c == category) {
            Some((_, sum)) => *sum += amount,
            None => self.category_sums.push((category, amount)),
        }
    }

    fn finish_day(&mut self, mut row: UserDay<'a>) {
        row.top_category = self
            .category_sums
            .iter()
            .max_by(|(ca, sa), (cb, sb)| sa.cmp(sb).then(cb.cmp(ca)))
            .map(|&(category, _)| category);
        self.category_sums.clear();
        self.user_days.push(row);
    }

    fn attribute(&mut self, session: &Session, day: i64, clicks: &[Click<'a>], window: &mut ClickWindow) {
        let start = session.start;
        while window.high < clicks.len() && clicks[window.high].ts <= start {
            self.enter(clicks[window.high].campaign);
            window.high += 1;
        }
        while window.low < window.high && start - clicks[window.low].ts > ATTRIBUTION_MS {
            self.leave(clicks[window.low].campaign);
            window.low += 1;
        }
        let qualifying = &clicks[window.low..window.high];
        let credited = match qualifying.last() {
            Some(latest) => {
                let first_at_latest = qualifying.partition_point(|click| click.ts < latest.ts);
                qualifying[first_at_latest].campaign
            }
            None => self.organic,
        };
        let purchased = session.revenue > 0;
        let cell = self.totals.cell(credited, day);
        cell.sessions += 1;
        if purchased {
            cell.purchasing_sessions += 1;
            cell.revenue += session.revenue;
        }
        for position in 0..self.active.len() {
            let campaign = self.active[position];
            self.totals.cell(campaign, day).assisted_sessions += 1;
        }
    }

    fn enter(&mut self, campaign: u32) {
        let count = &mut self.clicks_in_window[campaign as usize];
        *count += 1;
        if *count == 1 {
            self.active_position[campaign as usize] = self.active.len() as u32;
            self.active.push(campaign);
        }
    }

    fn leave(&mut self, campaign: u32) {
        let count = &mut self.clicks_in_window[campaign as usize];
        *count -= 1;
        if *count == 0 {
            let position = self.active_position[campaign as usize] as usize;
            self.active.swap_remove(position);
            if let Some(&moved) = self.active.get(position) {
                self.active_position[moved as usize] = position as u32;
            }
        }
    }

    fn clear_window(&mut self) {
        for &campaign in &self.active {
            self.clicks_in_window[campaign as usize] = 0;
        }
        self.active.clear();
    }
}

struct ClickWindow {
    low: usize,
    high: usize,
}
