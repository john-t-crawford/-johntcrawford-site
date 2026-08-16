#!/usr/bin/env python3
"""
identify-candidates.py — first-pass species suggestions for the Woody
Ornamentals photo review bench. NOT an identification, a shortlist.

Sends every JPEG in .\review-inbox\ to the Pl@ntNet API (one image per
request — Pl@ntNet's multi-image requests are for several angles of a
SINGLE plant, not batching unrelated specimens, so there's no way to
combine unrelated photos into one call) and writes a CSV of the top
candidate species per photo, cross-checked against this project's own
121-species list (species-index.json, dumped from index.html).

This does not touch photos-manifest.json, review-inbox/, or photos/.
It only writes identify-candidates.csv. Confirming a species is still a
human decision made in review.html against USDA PLANTS / the Maryland
Plant Atlas — see CLAUDE.md's "Deliberate non-features": "Nothing
identifies plants from pixels... a misidentified image in an ID trainer
teaches the error." This script exists to make that human pass faster,
not to skip it.

SETUP
  1. Get a free API key: https://my.plantnet.org  (Register > My apps).
     Free tier: 500 identifications/day — 94 photos fits with room to spare.
  2. set PLANTNET_API_KEY=your-key-here      (Windows cmd)
     $env:PLANTNET_API_KEY = "your-key-here" (PowerShell)
     export PLANTNET_API_KEY=your-key-here   (bash)

USAGE
  python identify-candidates.py
  python identify-candidates.py --dir review-inbox --out identify-candidates.csv
"""
import argparse
import csv
import os
import sys
import time
import json
import ssl
import urllib.request
import urllib.error

try:
    import certifi
    SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    SSL_CONTEXT = ssl.create_default_context()

API_URL = 'https://my-api.plantnet.org/v2/identify/all'
TOP_N = 3
REQUEST_DELAY_S = 0.35  # be polite; 94 requests well under 500/day either way


def load_species_index(path):
    if not os.path.exists(path):
        print(f'note: {path} not found — candidate matches to the curriculum '
              f'list will be skipped (run the species-index dump first).')
        return []
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def build_lookup(species):
    """genus+species (lowercase, no author) -> curriculum record"""
    lut = {}
    for s in species:
        key = ' '.join(s['latin'].lower().split()[:2])
        lut[key] = s
    return lut


def curriculum_match(scientific_name, lut):
    key = ' '.join(scientific_name.lower().split()[:2])
    hit = lut.get(key)
    return hit['id'] if hit else ''


def identify_one(path, api_key):
    boundary = '----plantid-boundary'
    with open(path, 'rb') as f:
        img_bytes = f.read()

    parts = []
    parts.append(f'--{boundary}\r\n'
                 f'Content-Disposition: form-data; name="organs"\r\n\r\nauto\r\n'.encode())
    parts.append(
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="images"; filename="{os.path.basename(path)}"\r\n'
        f'Content-Type: image/jpeg\r\n\r\n'.encode() + img_bytes + b'\r\n'
    )
    parts.append(f'--{boundary}--\r\n'.encode())
    body = b''.join(parts)

    url = f'{API_URL}?api-key={api_key}'
    req = urllib.request.Request(url, data=body, method='POST')
    req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')

    try:
        with urllib.request.urlopen(req, timeout=30, context=SSL_CONTEXT) as resp:
            return json.loads(resp.read().decode('utf-8')), None
    except urllib.error.HTTPError as e:
        detail = e.read().decode('utf-8', errors='replace')[:200]
        return None, f'HTTP {e.code}: {detail}'
    except Exception as e:
        return None, str(e)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dir', default='review-inbox')
    ap.add_argument('--out', default='identify-candidates.csv')
    ap.add_argument('--species-index', default='species-index.json')
    args = ap.parse_args()

    api_key = os.environ.get('PLANTNET_API_KEY')
    if not api_key:
        print('PLANTNET_API_KEY is not set. Get a free key at https://my.plantnet.org '
              'then set the environment variable and re-run.')
        sys.exit(1)

    if not os.path.isdir(args.dir):
        print(f'{args.dir} not found. Run convert-heic.py first.')
        sys.exit(1)

    files = sorted(f for f in os.listdir(args.dir) if f.lower().endswith(('.jpg', '.jpeg')))
    if not files:
        print(f'No JPEGs in {args.dir}.')
        sys.exit(1)

    lut = build_lookup(load_species_index(args.species_index))

    rows = []
    failures = []
    print(f'Identifying {len(files)} photos via Pl@ntNet (one request each)...')
    for i, fname in enumerate(files, 1):
        result, err = identify_one(os.path.join(args.dir, fname), api_key)
        row = {'file': fname}
        if err:
            failures.append((fname, err))
            row['error'] = err
        else:
            candidates = (result or {}).get('results', [])[:TOP_N]
            for rank, c in enumerate(candidates, 1):
                sci = c.get('species', {}).get('scientificNameWithoutAuthor', '')
                common = (c.get('species', {}).get('commonNames') or [''])[0]
                score = c.get('score', 0)
                row[f'candidate_{rank}_latin'] = sci
                row[f'candidate_{rank}_common'] = common
                row[f'candidate_{rank}_score'] = f'{score:.3f}'
                row[f'candidate_{rank}_curriculum_id'] = curriculum_match(sci, lut)
        rows.append(row)
        print(f'  [{i}/{len(files)}] {fname}' + (f'  FAILED: {err}' if err else ''))
        time.sleep(REQUEST_DELAY_S)

    fieldnames = ['file', 'error']
    for rank in range(1, TOP_N + 1):
        fieldnames += [f'candidate_{rank}_latin', f'candidate_{rank}_common',
                       f'candidate_{rank}_score', f'candidate_{rank}_curriculum_id']

    with open(args.out, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, restval='')
        w.writeheader()
        w.writerows(rows)

    ok = len(rows) - len(failures)
    print(f'\n{args.out} written — {ok}/{len(files)} identified, {len(failures)} failed.')
    if failures:
        print('Failures:')
        for fname, err in failures:
            print(f'  {fname}: {err}')
    print('\nThese are candidate suggestions only. Confirm each one against USDA '
          'PLANTS or the Maryland Plant Atlas before it goes into review.html — '
          'see CLAUDE.md, "the one step that cannot be automated."')


if __name__ == '__main__':
    main()
