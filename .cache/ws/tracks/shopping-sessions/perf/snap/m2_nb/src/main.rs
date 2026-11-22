mod clicks;
mod csv;
mod events;
mod fast;
mod hash;
mod input;
mod links;
mod manifest;
mod output;
mod sessions;
mod slow;
mod time;

use std::env;
use std::path::PathBuf;

pub struct Config {
    pub data_dir: PathBuf,
    pub output_dir: PathBuf,
    pub threads: usize,
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

fn main() {
    let config = Config::from_env();
    let mode = env::var("SESSIONS_PATH").unwrap_or_default();
    if mode != "slow" {
        let fast_config = fast::Config {
            data_dir: &config.data_dir,
            output_dir: &config.output_dir,
            threads: config.threads,
        };
        match fast::run(&fast_config) {
            Ok(fast::Outcome::Done) => std::process::exit(0),
            Ok(fast::Outcome::Fallback(reason)) => eprintln!("general path: {reason}"),
            Err(error) => {
                eprintln!("error: {error}");
                std::process::exit(1);
            }
        }
    }
    if let Err(error) = rayon::ThreadPoolBuilder::new()
        .num_threads(config.threads)
        .build_global()
    {
        eprintln!("error: thread pool: {error}");
        std::process::exit(1);
    }
    match slow::run(&config) {
        Ok(()) => std::process::exit(0),
        Err(error) => {
            eprintln!("error: {error}");
            std::process::exit(1);
        }
    }
}
