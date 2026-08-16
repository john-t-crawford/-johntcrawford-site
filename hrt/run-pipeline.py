#!/usr/bin/env python3
"""
run-pipeline.py — chains the three mechanical steps for a new HEIC photo
dump into one command:

  1. convert-heic.py     images/*.heic        -> review-inbox/*.jpg
  2. identify-candidates.py review-inbox/*.jpg -> identify-candidates.csv
  3. prefill-review.py   identify-candidates.csv -> renames review-inbox
                          files with a curriculum-match hint

None of this assigns a species. Step 3 only changes what review.html's
existing guessFromName() feature can read off a filename; you still open
review.html, look at each photo next to the suggested drawn plates, and
click Confirm yourself. See CLAUDE.md, "the one step that cannot be
automated" — that step is unchanged by this script.

Requires PLANTNET_API_KEY to be set (checked up front, before wasting
time on conversion, if it's missing).

USAGE
  python run-pipeline.py
"""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def run(script, *args):
    print(f'\n{"=" * 60}\n{script} {" ".join(args)}\n{"=" * 60}')
    result = subprocess.run([sys.executable, os.path.join(HERE, script), *args])
    if result.returncode != 0:
        print(f'\n{script} failed (exit {result.returncode}). Stopping pipeline.')
        sys.exit(result.returncode)


def main():
    if not os.environ.get('PLANTNET_API_KEY'):
        print('PLANTNET_API_KEY is not set. Get a free key at https://my.plantnet.org, '
              'set the environment variable, and re-run. (Checked first so we don\'t '
              'waste time converting HEIC files only to fail at step 2.)')
        sys.exit(1)

    run('convert-heic.py')
    run('identify-candidates.py')
    run('prefill-review.py')

    print('\nPipeline complete. Open review.html and load the review-inbox/ folder.')


if __name__ == '__main__':
    main()
