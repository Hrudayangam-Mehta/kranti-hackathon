# sessions

A command-line program that turns raw clickstream CSV files into daily per-user and per-campaign Parquet tables.

## Build

With Docker (the image runs the program on `/data` and writes to `/output`):

```sh
docker build -t sessions .
docker run --rm -v "$PWD/data":/data:ro -v "$PWD/out":/output sessions
```

Without Docker (Rust 1.97.0):

```sh
RUSTFLAGS="-C target-feature=+crt-static" cargo build --release --locked --target x86_64-unknown-linux-gnu
DATA_DIR=./data OUTPUT_DIR=./out ./target/x86_64-unknown-linux-gnu/release/sessions
```

`DATA_DIR`, `OUTPUT_DIR` and `NCPU` (worker threads) are read from the environment.

The binary targets baseline x86-64. Its parsing kernels use AVX2 and BMI2 when the CPU reports them at run time and fall back to portable code otherwise.

## Libraries

- [libc](https://crates.io/crates/libc) 0.2.191 (MIT or Apache-2.0)
- [parquet](https://crates.io/crates/parquet) 60.1.0 (Apache-2.0), with default features off
- [rayon](https://crates.io/crates/rayon) 1.12.0 (MIT or Apache-2.0)

Their transitive dependencies are pinned in `Cargo.lock`. The build image is `rust:1.97.0-slim-bookworm`, pinned by digest.

Built with AI assistance.

## License

MIT, see [LICENSE](LICENSE).
