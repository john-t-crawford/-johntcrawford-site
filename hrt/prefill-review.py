#!/usr/bin/env python3
"""
prefill-review.py — embeds the top curriculum-matching candidate from
identify-candidates.csv into each review-inbox filename, so review.html's
own built-in guessFromName() (it substring-matches latin/common/synonym
names against the filename) auto-suggests and pre-selects a candidate the
moment the photo loads. No changes to review.html; this only renames files.

This does NOT decide anything. A photo still opens in review.html showing
"suggested" candidates and the drawn plates to compare against — a human
still has to look and click Confirm. Files with no curriculum match in
their top 3 (i.e. PlantNet's guess isn't one of the 121 species) are left
alone; there's nothing honest to suggest for those.

Idempotent: safe to re-run. Skips files that no longer exist under their
original name (already renamed by a prior run).

USAGE
  python prefill-review.py
  python prefill-review.py --dir review-inbox --csv identify-candidates.csv
"""
import argparse
import csv
import json
import os
import re
import sys


def slug(name):
    """Turn a common name into a filename fragment that review.html's
    guessFromName() will reconstruct back into the same substring (it
    lowercases and collapses runs of _-. into single spaces). Common
    names are plain ASCII with no hybrid marker, unlike Latin names
    (e.g. 'Prunus × cistena'), which don't round-trip through a
    filename-safe slug back to an exact substring match."""
    s = name.lower()
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dir', default='review-inbox')
    ap.add_argument('--csv', default='identify-candidates.csv')
    ap.add_argument('--species-index', default='species-index.json')
    args = ap.parse_args()

    if not os.path.exists(args.csv):
        print(f'{args.csv} not found. Run identify-candidates.py first.')
        sys.exit(1)
    if not os.path.exists(args.species_index):
        print(f'{args.species_index} not found.')
        sys.exit(1)

    species_by_id = {s['id']: s for s in json.load(open(args.species_index, encoding='utf-8'))}
    rows = list(csv.DictReader(open(args.csv, encoding='utf-8')))

    renamed, skipped_no_match, skipped_missing, skipped_already = 0, 0, 0, 0

    for row in rows:
        orig_name = row['file']
        orig_path = os.path.join(args.dir, orig_name)

        curriculum_id = ''
        for rank in (1, 2, 3):
            cid = row.get(f'candidate_{rank}_curriculum_id', '')
            if cid:
                curriculum_id = cid
                break

        if not curriculum_id:
            skipped_no_match += 1
            continue

        if not os.path.exists(orig_path):
            # either already renamed, or genuinely missing
            stem = os.path.splitext(orig_name)[0]
            already = any(f.startswith(stem + '__') for f in os.listdir(args.dir))
            if already:
                skipped_already += 1
            else:
                skipped_missing += 1
            continue

        species = species_by_id.get(curriculum_id)
        if not species:
            skipped_no_match += 1
            continue

        stem, ext = os.path.splitext(orig_name)
        new_name = f'{stem}__{slug(species["common"])}{ext}'
        new_path = os.path.join(args.dir, new_name)
        os.rename(orig_path, new_path)
        renamed += 1

    print(f'{renamed} file(s) renamed with a curriculum-match hint.')
    print(f'{skipped_no_match} had no curriculum match in their top 3 — left as-is (search manually).')
    if skipped_already:
        print(f'{skipped_already} already renamed by a previous run — left as-is.')
    if skipped_missing:
        print(f'{skipped_missing} listed in the CSV but not found in {args.dir} — check for manual moves.')
    print(f'\nOpen review.html and load the whole {args.dir}/ folder — renamed files will show '
          f'a pre-selected suggestion and drawn plates automatically. You still confirm each one.')


if __name__ == '__main__':
    main()
