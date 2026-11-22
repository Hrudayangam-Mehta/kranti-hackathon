# Only Docker Hub images are fetched; no Cargo dependencies or network at run time.
FROM rust:1.85.1-slim-bookworm@sha256:9f841bbe9e7d8e37ceb96ed907265a3a0df7f44e3737d0b100e7907a679acb36 AS compiler
WORKDIR /build
COPY submission.rs .
RUN rustc --edition=2021 -C opt-level=3 -C lto=true -C codegen-units=1 \
    -C panic=abort -C strip=symbols submission.rs -o blast-radius-selector

# Organizer's pinned Python/SQLite environment, for Python syntax semantics.
FROM python:3.13-slim@sha256:e48f59cdba69a3cbd9ed2cf0f348d90d45a8d350d98134cf1070bc106ee9ed90
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 HOME=/tmp
WORKDIR /app
COPY --from=compiler /build/blast-radius-selector /app/blast-radius-selector
COPY tools/analyze_changes.py tools/entrypoint.py tools/observed_equivalence.py tools/metadata_equivalence.py /app/
COPY maps/impact-map.json /opt/impact-map.json
COPY maps/comparison-observations.json maps/metadata-observations.json /opt/
COPY LICENSE THIRD_PARTY_NOTICES.md /app/
USER 65534:65534
ENTRYPOINT ["python", "/app/entrypoint.py"]
