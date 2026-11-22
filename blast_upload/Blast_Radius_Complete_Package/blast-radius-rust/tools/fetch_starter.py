#!/usr/bin/env python3
"""Fetch the organizer's public sample for local validation, outside the image."""
import argparse
import hashlib
import io
from pathlib import Path
import tarfile
import urllib.request

URL = "https://www.joinbuilders.org/buildathon/tracks/blast-radius/files/blast-radius-sample.tar.gz"
EXPECTED_SHA256 = "81efabbc69c3c4367d928f2dba0f33ce9dccccbd080b54721b2636e5d8afab9d"

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--destination", type=Path, default=Path(".starter-kit"))
    args = parser.parse_args()
    data = urllib.request.urlopen(URL, timeout=60).read()
    actual = hashlib.sha256(data).hexdigest()
    if actual != EXPECTED_SHA256:
        raise SystemExit("Organizer archive changed; review its updated rules before replacing the expected hash.")
    destination = args.destination.resolve()
    destination.mkdir(parents=True, exist_ok=True)
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as archive:
        for member in archive.getmembers():
            target = (destination / member.name).resolve()
            if not target.is_relative_to(destination) or member.issym() or member.islnk():
                raise SystemExit("Unexpected unsafe archive member")
        archive.extractall(destination, filter="data")
    print(f"Starter available at {destination}; sha256={actual}")
