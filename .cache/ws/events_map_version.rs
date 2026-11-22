use crate::csv;
use crate::hash::{bucket_of, new_map, FastMap};
use crate::input::{Products, Window};
use crate::links::People;
use crate::time::{parse_timestamp, DAY_MS};

pub const MAX_PRICE_CENTS: u32 = 10_000_000;

pub struct EventCopy<'a> {
    pub event_id: &'a [u8],
    pub ingest: i64,
    pub valid: Option<Event<'a>>,
}

#[derive(Clone, Copy)]
pub struct Event<'a> {
    pub user: &'a [u8],
    pub ts: i64,
    pub price: u32,
    pub category: u32,
}

#[derive(Clone, Copy)]
pub struct PersonEvent<'a> {
    pub person: &'a [u8],
    pub ts: i64,
    pub price: u32,
    pub category: u32,
}

pub struct EventRules<'a> {
    pub window: &'a Window,
    pub products: &'a Products<'a>,
}

impl EventRules<'_> {
    pub fn parse_line<'l>(&self, line: &'l [u8]) -> Option<EventCopy<'l>> {
        let [event_id, user, ts, ingest, event_type, product, price] = csv::fields::<7>(line)?;
        if event_id.is_empty() {
            return None;
        }
        let ingest = parse_timestamp(ingest);
        let valid = ingest.and_then(|ingest| self.validate(user, ts, ingest, event_type, product, price));
        Some(EventCopy { event_id, ingest: ingest.unwrap_or(i64::MAX), valid })
    }

    fn validate<'l>(
        &self,
        user: &'l [u8],
        ts: &[u8],
        ingest: i64,
        event_type: &[u8],
        product: &[u8],
        price: &[u8],
    ) -> Option<Event<'l>> {
        if user.is_empty() || product.is_empty() {
            return None;
        }
        let ts = parse_timestamp(ts)?;
        if !self.window.contains_event(ts) {
            return None;
        }
        let price = match event_type {
            b"view" | b"cart" => 0,
            b"purchase" => parse_price(price)?,
            _ => return None,
        };
        if ingest - ts > DAY_MS {
            return None;
        }
        let category = if price > 0 { self.products.category_of(product) } else { 0 };
        Some(Event { user, ts, price, category })
    }
}

pub fn parse_price(text: &[u8]) -> Option<u32> {
    if text.is_empty() {
        return None;
    }
    let mut value: u32 = 0;
    for &byte in text {
        if !byte.is_ascii_digit() {
            return None;
        }
        value = value * 10 + u32::from(byte - b'0');
        if value > MAX_PRICE_CENTS {
            return None;
        }
    }
    (value >= 1).then_some(value)
}

pub fn dedup_and_route<'a>(
    copies: Vec<EventCopy<'a>>,
    people: &People<'a>,
    person_bits: u32,
) -> Vec<Vec<PersonEvent<'a>>> {
    let mut earliest: FastMap<&[u8], usize> = new_map(copies.len());
    for (index, copy) in copies.iter().enumerate() {
        earliest
            .entry(copy.event_id)
            .and_modify(|kept| {
                if copy.ingest < copies[*kept].ingest {
                    *kept = index;
                }
            })
            .or_insert(index);
    }
    let mut routed: Vec<Vec<PersonEvent>> = (0..1usize << person_bits).map(|_| Vec::new()).collect();
    for &index in earliest.values() {
        if let Some(event) = copies[index].valid {
            let person = people.name_of(event.user);
            routed[bucket_of(person, person_bits)].push(PersonEvent {
                person,
                ts: event.ts,
                price: event.price,
                category: event.category,
            });
        }
    }
    routed
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn prices() {
        assert_eq!(parse_price(b"1"), Some(1));
        assert_eq!(parse_price(b"0250"), Some(250));
        assert_eq!(parse_price(b"10000000"), Some(10_000_000));
        assert_eq!(parse_price(b"000000000000000000000010000000"), Some(10_000_000));
        assert_eq!(parse_price(b"10000001"), None);
        assert_eq!(parse_price(b"99999999999999999999999"), None);
        assert_eq!(parse_price(b"0"), None);
        assert_eq!(parse_price(b"000"), None);
        assert_eq!(parse_price(b""), None);
        assert_eq!(parse_price(b"19.99"), None);
        assert_eq!(parse_price(b"-5"), None);
        assert_eq!(parse_price(b"+5"), None);
        assert_eq!(parse_price(b"1000\r"), None);
        assert_eq!(parse_price(" 250".as_bytes()), None);
        assert_eq!(parse_price("２５０".as_bytes()), None);
        assert_eq!(parse_price("٢٥٠".as_bytes()), None);
    }
}
