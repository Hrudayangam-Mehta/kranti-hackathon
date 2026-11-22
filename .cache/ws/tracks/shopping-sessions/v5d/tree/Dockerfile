FROM rust:1.97.0-slim-bookworm@sha256:6d220bf85c74e842a79da63997af8d2e74455c0b8847d8bb3a5888572334991d AS build
WORKDIR /src
COPY Cargo.toml Cargo.lock ./
COPY src ./src
ENV CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_RUSTFLAGS="-C target-feature=+crt-static"
RUN cargo build --release --locked --target x86_64-unknown-linux-gnu \
 && mkdir -p /rootfs/tmp /rootfs/data /rootfs/output /rootfs/scratch \
 && chmod 1777 /rootfs/tmp \
 && cp target/x86_64-unknown-linux-gnu/release/sessions /rootfs/sessions

FROM scratch
COPY --from=build /rootfs/ /
ENV DATA_DIR=/data OUTPUT_DIR=/output
USER 1000:1000
CMD ["/sessions"]
