use crate::csv;
use crate::input::{Campaigns, Window};
use crate::links::People;
use crate::time::parse_timestamp;

#[derive(Clone, Copy)]
pub struct Click<'a> {
    pub person: &'a [u8],
    pub ts: i64,
    pub click_id: &'a [u8],
    pub campaign: u32,
}

pub struct ClickRules<'a> {
    pub window: &'a Window,
    pub campaigns: &'a Campaigns<'a>,
    pub people: &'a People<'a>,
}

impl<'a> ClickRules<'a> {
    pub fn parse_line(&self, line: &'a [u8]) -> Option<Click<'a>> {
        let [click_id, user, campaign, ts] = csv::fields::<4>(line)?;
        if click_id.is_empty() || user.is_empty() {
            return None;
        }
        let ts = parse_timestamp(ts)?;
        if !self.window.contains_click(ts) {
            return None;
        }
        let campaign = self.campaigns.index_of(campaign)?;
        Some(Click {
            person: self.people.name_of(user),
            ts,
            click_id,
            campaign,
        })
    }
}
