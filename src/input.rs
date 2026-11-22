use std::error::Error;
use std::fs;
use std::path::{Path, PathBuf};

use rayon::prelude::*;

use crate::csv;
use crate::hash::{new_map, FastMap};
use crate::time::{parse_timestamp, DAY_MS};

pub type Result<T> = std::result::Result<T, Box<dyn Error + Send + Sync>>;

pub const UNKNOWN_CATEGORY: &[u8] = b"unknown";
pub const ORGANIC: &[u8] = b"organic";

pub struct Files {
    pub events: Vec<Vec<u8>>,
    pub clicks: Vec<Vec<u8>>,
    pub links: Vec<Vec<u8>>,
    pub products: Vec<u8>,
    pub campaigns: Vec<u8>,
    pub manifest: Vec<u8>,
}

impl Files {
    pub fn read(data_dir: &Path) -> Result<Files> {
        let read_folder = |name: &str| -> Result<Vec<Vec<u8>>> {
            let paths = csv_files(&data_dir.join(name))?;
            paths
                .par_iter()
                .map(|path| fs::read(path).map_err(|e| format!("{}: {e}", path.display()).into()))
                .collect()
        };
        Ok(Files {
            events: read_folder("events")?,
            clicks: read_folder("clicks")?,
            links: read_folder("links")?,
            products: read_file(&data_dir.join("products.csv"))?,
            campaigns: read_file(&data_dir.join("campaigns.csv"))?,
            manifest: read_file(&data_dir.join("manifest.json"))?,
        })
    }
}

fn read_file(path: &Path) -> Result<Vec<u8>> {
    fs::read(path).map_err(|e| format!("{}: {e}", path.display()).into())
}

pub fn csv_files(folder: &Path) -> Result<Vec<PathBuf>> {
    let mut paths = Vec::new();
    let entries = match fs::read_dir(folder) {
        Ok(entries) => entries,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(paths),
        Err(e) => return Err(format!("{}: {e}", folder.display()).into()),
    };
    for entry in entries {
        let path = entry?.path();
        let Some(name) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };
        if name.ends_with(".csv") && path.is_file() {
            paths.push(path);
        }
    }
    paths.sort();
    Ok(paths)
}

pub struct Window {
    pub start: i64,
    pub end: i64,
}

impl Window {
    pub fn from_manifest(manifest: &[u8]) -> Result<Window> {
        let start = manifest_time(manifest, "window_start")?;
        let end = manifest_time(manifest, "window_end")?;
        Ok(Window { start, end })
    }

    pub fn contains_event(&self, ts: i64) -> bool {
        self.start <= ts && ts < self.end
    }

    pub fn contains_click(&self, ts: i64) -> bool {
        self.start - 7 * DAY_MS <= ts && ts < self.end
    }
}

fn manifest_time(manifest: &[u8], key: &str) -> Result<i64> {
    let missing = || format!("manifest.json: no valid {key}");
    let value = crate::manifest::top_level_string(manifest, key.as_bytes()).ok_or_else(missing)?;
    Ok(parse_timestamp(&value).ok_or_else(missing)?)
}

pub struct Products<'a> {
    pub categories: Vec<&'a [u8]>,
    pub unknown: u32,
    by_product: FastMap<&'a [u8], u32>,
}

impl<'a> Products<'a> {
    pub fn parse(file: &'a [u8]) -> Products<'a> {
        let rows: Vec<[&[u8]; 2]> = csv::rows(file).filter_map(csv::fields::<2>).collect();
        let mut categories: Vec<&[u8]> = rows.iter().map(|[_, category]| *category).collect();
        categories.push(UNKNOWN_CATEGORY);
        categories.sort_unstable();
        categories.dedup();
        let index_of = |name: &[u8]| categories.binary_search(&name).unwrap() as u32;
        let mut by_product = new_map(rows.len());
        for [product, category] in &rows {
            by_product.entry(*product).or_insert_with(|| index_of(category));
        }
        let unknown = index_of(UNKNOWN_CATEGORY);
        Products {
            categories,
            unknown,
            by_product,
        }
    }

    pub fn category_of(&self, product: &[u8]) -> u32 {
        self.by_product.get(product).copied().unwrap_or(self.unknown)
    }
}

pub struct Campaigns<'a> {
    pub ids: Vec<&'a [u8]>,
    pub channels: Vec<&'a [u8]>,
    by_id: FastMap<&'a [u8], u32>,
}

impl<'a> Campaigns<'a> {
    pub fn parse(file: &'a [u8]) -> Campaigns<'a> {
        let mut campaigns = Campaigns {
            ids: Vec::new(),
            channels: Vec::new(),
            by_id: new_map(4096),
        };
        for [id, channel] in csv::rows(file).filter_map(csv::fields::<2>) {
            if !campaigns.by_id.contains_key(id) {
                campaigns.by_id.insert(id, campaigns.ids.len() as u32);
                campaigns.ids.push(id);
                campaigns.channels.push(channel);
            }
        }
        campaigns
    }

    pub fn index_of(&self, id: &[u8]) -> Option<u32> {
        self.by_id.get(id).copied()
    }

    pub fn count_with_organic(&self) -> usize {
        self.ids.len() + 1
    }

    pub fn id(&self, index: u32) -> &'a [u8] {
        self.ids.get(index as usize).copied().unwrap_or(ORGANIC)
    }

    pub fn channel(&self, index: u32) -> &'a [u8] {
        self.channels.get(index as usize).copied().unwrap_or(ORGANIC)
    }
}
