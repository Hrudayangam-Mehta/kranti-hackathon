PYTHON ?= python3
IMAGE ?= blast-radius-rust
KIT ?= $(CURDIR)/.starter-kit
OUTPUT ?= $(CURDIR)/output
PLATFORM ?= linux/amd64
DATA := $(abspath $(KIT))/sample

.PHONY: export native test fetch-kit build sample check-package

export:
	$(PYTHON) tools/export_single_file.py

native: export
	cargo build --release --locked --offline

test:
	cargo test --locked --offline
	$(PYTHON) -m unittest discover -s tests -v

fetch-kit:
	$(PYTHON) tools/fetch_starter.py --destination "$(KIT)"

build: export
	docker build --platform $(PLATFORM) --tag $(IMAGE) .

sample: build
	mkdir -p "$(OUTPUT)"
	docker run --rm --platform $(PLATFORM) --network none --cpus 2 \
		--memory 4096m --memory-swap 4096m --pids-limit 256 --read-only \
		--tmpfs /tmp:rw,size=64m,mode=1777 --cap-drop ALL \
		--security-opt no-new-privileges --user 65534:65534 --env HOME=/tmp \
		--volume "$(DATA)/commits:/data/commits:ro" \
		--volume "$(DATA)/tests.json:/data/tests.json:ro" \
		$(IMAGE) > "$(OUTPUT)/sample.jsonl"
	$(PYTHON) "$(KIT)/score.py" "$(DATA)" "$(DATA)/answers.json" "$(OUTPUT)/sample.jsonl"

check-package:
	$(PYTHON) tools/check_package.py
