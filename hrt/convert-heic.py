#!/usr/bin/env python3
"""
convert-heic.py — HEIC-to-JPEG staging step for the Woody Ornamentals
photo pipeline. Build-time tool only, not part of the deployed single-file
HTML app (same category as build-photos.js / scan-images.js).

Why this exists: iPhones shoot HEIC by default and browsers cannot read it,
so review.html's file picker only accepts JPEG/PNG/WebP. This script
converts everything in ./images/ from HEIC to JPEG and drops the results in
./review-inbox/ — a pending-identification holding area, distinct from
./photos/ (which is reserved for files already named <id>-<view>.jpg
against a *confirmed* species; see build-photos.js). Species ID itself is
a separate manual step done later via review.html — this script does not
attempt it.

What it does, in order, per file:
  1. Open the HEIC via pillow_heif's registered opener.
  2. Auto-orient using EXIF orientation (ImageOps.exif_transpose) — this has
     to happen before the EXIF block is dropped, since the orientation tag
     lives in that EXIF data.
  3. Downscale only (never upscale) so the long edge is at most 1600px,
     preserving aspect ratio.
  4. Re-encode as JPEG, quality 85, WITHOUT re-attaching the original EXIF
     block (Pillow's .save() already omits EXIF unless you pass exif=...,
     so this is just "don't pass it"). That deliberately strips GPS/location
     data along with everything else — see FIELD-PLAN.md's "Before you
     publish" note: home-shot photos should not carry exact coordinates.

Usage:
    python -m pip install pillow-heif      # one-time, build-time only
    python convert-heic.py
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:
    print("Pillow is required (it should already be installed system-wide). "
          "Try: python -m pip install pillow", file=sys.stderr)
    sys.exit(1)

try:
    import pillow_heif
except ImportError:
    print("pillow-heif is required. Install it with:\n"
          "    python -m pip install pillow-heif", file=sys.stderr)
    sys.exit(1)

pillow_heif.register_heif_opener()

HERE = Path(__file__).resolve().parent
SRC_DIR = HERE / "images"
OUT_DIR = HERE / "review-inbox"
MAX_EDGE = 1600
JPEG_QUALITY = 85


def convert_one(src: Path, dst: Path) -> int:
    """Convert a single HEIC file to JPEG. Returns the output file size in bytes."""
    with Image.open(src) as im:
        # Auto-orient using EXIF before we drop the EXIF block entirely.
        im = ImageOps.exif_transpose(im)

        # Downscale only — never upscale — preserving aspect ratio.
        w, h = im.size
        long_edge = max(w, h)
        if long_edge > MAX_EDGE:
            scale = MAX_EDGE / long_edge
            new_size = (max(1, round(w * scale)), max(1, round(h * scale)))
            im = im.resize(new_size, Image.LANCZOS)

        # Flatten to RGB (JPEG has no alpha channel; HEIC can carry one).
        if im.mode not in ("RGB", "L"):
            im = im.convert("RGB")

        # Save as JPEG, quality 85. No exif= kwarg passed, so no EXIF/GPS
        # survives — this is deliberate (see FIELD-PLAN.md privacy note).
        im.save(dst, format="JPEG", quality=JPEG_QUALITY)

    return dst.stat().st_size


def main() -> int:
    if not SRC_DIR.is_dir():
        print(f"No {SRC_DIR} directory found - nothing to convert.", file=sys.stderr)
        return 1

    heic_files = sorted(
        p for p in SRC_DIR.iterdir()
        if p.is_file() and p.suffix.lower() == ".heic"
    )

    if not heic_files:
        print(f"No .heic files found in {SRC_DIR}.")
        return 0

    OUT_DIR.mkdir(exist_ok=True)

    converted = 0
    failures: list[tuple[str, str]] = []
    total_before = 0
    total_after = 0

    start = time.time()

    for src in heic_files:
        dst = OUT_DIR / (src.stem + ".jpg")
        try:
            before = src.stat().st_size
            after = convert_one(src, dst)
            total_before += before
            total_after += after
            converted += 1
        except Exception as e:  # noqa: BLE001 - one bad file must not kill the run
            failures.append((src.name, f"{type(e).__name__}: {e}"))
            # Clean up a partially-written output file, if any.
            if dst.exists():
                try:
                    dst.unlink()
                except OSError:
                    pass

    elapsed = time.time() - start

    def mb(n: int) -> str:
        return f"{n / 1024 / 1024:.2f} MB"

    print()
    print(f"convert-heic.py - {SRC_DIR.name} -> {OUT_DIR.name}")
    print(f"  found:      {len(heic_files)} .heic file(s)")
    print(f"  converted:  {converted}")
    print(f"  failed:     {len(failures)}")
    print(f"  size before: {mb(total_before)}")
    print(f"  size after:  {mb(total_after)}")
    if total_before:
        pct = 100 * (1 - (total_after / total_before)) if total_before else 0
        print(f"  reduction:   {pct:.1f}%")
    print(f"  elapsed:    {elapsed:.1f}s")

    if failures:
        print(f"\n{len(failures)} failure(s):")
        for name, err in failures:
            print(f"  - {name}: {err}")

    print()
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
