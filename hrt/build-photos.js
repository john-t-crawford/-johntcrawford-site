#!/usr/bin/env node
/* ================================================================
   build-photos.js  —  photograph ingest for the Woody Ornamentals
   trainer. No dependencies, no build tools.

   Three modes:

   1. LOCAL (recommended for a small photo set, keeps the tool offline)
      Drop images into ./photos/ named  <id>-<view>.jpg
        que-alb-foliage.jpg   que-alb-bark.jpg   ace-rub-habit.jpg
      Views: foliage | bark | habit | flower | fruit
      Credit and licence come from photos-manifest.json, matched by id.
      Run:  node build-photos.js
      Emits photos.js with every image base64-inlined.

   2. REMOTE (smaller file, needs a network at runtime)
      Fill only the src URLs in photos-manifest.json and run:
        node build-photos.js --remote
      Emits photos.js holding URLs instead of data. The trainer degrades
      to the drawn plate whenever an image fails to load.

   3. --local (same source directory as LOCAL, but not inlined)
      Same ./photos/ directory and <id>-<view>.jpg discovery as mode 1, but
      emits {src, credit, license} objects like --remote does, with src set
      to a same-origin relative path ("photos/<file>") instead of base64
      data or an external URL. Run:
        node build-photos.js --local
      Use this once the photo count grows past what's comfortable to
      base64-inline into one photos.js (the WARN_BYTES/WARN_TOTAL budget
      below) — you keep everything offline and same-origin, you just stop
      paying the inlining tax. Requires photos/ to actually be deployed
      alongside the HTML, same as mode 1 already implies.

   Then either inline photos.js into the trainer as one more <script>
   block, or ship it beside the HTML and add:
        <script src="photos.js"></script>   (before the app block)
   (Modes 2 and 3 only ever hold URLs/paths, not data — always ship
   photos.js as an external file for those, never inline it.)
   ================================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const REMOTE = process.argv.includes('--remote');
const LOCAL_REF = process.argv.includes('--local');
if (REMOTE && LOCAL_REF) {
  console.error('Choose one of --remote or --local, not both.');
  process.exit(1);
}
const DIR = path.join(__dirname, 'photos');
const MANIFEST = path.join(__dirname, 'photos-manifest.json');
const OUT = path.join(__dirname, 'photos.js');
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif' };
const VIEWS = ['foliage', 'bark', 'habit', 'flower', 'fruit'];
const WARN_BYTES = 220 * 1024;   // per image
const WARN_TOTAL = 12 * 1024 * 1024;

if (!fs.existsSync(MANIFEST)) {
  console.error('photos-manifest.json not found. It ships beside this script.');
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const meta = manifest.photos || {};
const out = {};
let count = 0, total = 0, warnings = [];

function creditFor(id, view) {
  const rows = meta[id] || [];
  return rows.find(r => r.view === view) || rows[0] || {};
}

if (REMOTE) {
  Object.keys(meta).forEach(id => {
    const rows = (meta[id] || []).filter(r => r.src && r.src.trim());
    rows.forEach(r => {
      if (!VIEWS.includes(r.view)) warnings.push(`${id}: unknown view "${r.view}"`);
      if (!r.credit) warnings.push(`${id}: src set with no credit — licence cannot be discharged`);
      (out[id] = out[id] || []).push({ src: r.src.trim(), view: r.view || 'foliage', credit: r.credit || '', license: r.license || '' });
      count++;
    });
  });
} else {
  if (!fs.existsSync(DIR)) {
    console.error('No ./photos directory. Create it and add <id>-<view>.jpg files, or use --remote.');
    process.exit(1);
  }
  fs.readdirSync(DIR).forEach(file => {
    const ext = path.extname(file).toLowerCase();
    if (!MIME[ext]) return;
    const stem = path.basename(file, ext);
    const cut = stem.lastIndexOf('-');
    const id = cut > -1 ? stem.slice(0, cut) : stem;
    const view = cut > -1 ? stem.slice(cut + 1) : 'foliage';

    if (!meta[id]) { warnings.push(`${file}: id "${id}" is not in the manifest — skipped`); return; }
    if (!VIEWS.includes(view)) { warnings.push(`${file}: unknown view "${view}" — skipped`); return; }

    const c = creditFor(id, view);
    if (!c.credit) warnings.push(`${file}: no credit in the manifest — licence cannot be discharged`);

    if (LOCAL_REF) {
      // Same discovery as default LOCAL, but reference the file by a
      // same-origin relative path instead of reading and inlining it.
      const size = fs.statSync(path.join(DIR, file)).size;
      (out[id] = out[id] || []).push({
        src: `photos/${file}`,
        view, credit: c.credit || '', license: c.license || ''
      });
      count++; total += size;
    } else {
      const buf = fs.readFileSync(path.join(DIR, file));
      if (buf.length > WARN_BYTES) warnings.push(`${file}: ${Math.round(buf.length / 1024)} KB — resize to ~800px before shipping`);

      (out[id] = out[id] || []).push({
        src: `data:${MIME[ext]};base64,${buf.toString('base64')}`,
        view, credit: c.credit || '', license: c.license || ''
      });
      count++; total += buf.length;
    }
  });
}

// deterministic ordering so the sidecar diffs cleanly
Object.keys(out).forEach(id => out[id].sort((a, b) => VIEWS.indexOf(a.view) - VIEWS.indexOf(b.view)));
const ordered = {};
Object.keys(out).sort().forEach(k => { ordered[k] = out[k]; });

fs.writeFileSync(OUT,
  '/* Generated by build-photos.js — do not edit by hand. */\n' +
  'window.WOODY = window.WOODY || {};\n' +
  'window.WOODY.PHOTOS = ' + JSON.stringify(ordered) + ';\n');

const covered = Object.keys(ordered).length;
console.log(`\nphotos.js written — ${count} image${count === 1 ? '' : 's'} across ${covered} of ${Object.keys(meta).length} specimens`);
if (!REMOTE && !LOCAL_REF) console.log(`payload: ${(total / 1024 / 1024).toFixed(2)} MB inlined`);
if (LOCAL_REF) console.log(`photos/ on disk: ${(total / 1024 / 1024).toFixed(2)} MB, referenced by path (not inlined)`);
if (!REMOTE && !LOCAL_REF && total > WARN_TOTAL) console.log('NOTE: over 12 MB. Ship photos.js beside the HTML rather than inlining it, or rebuild with --local.');
if (warnings.length) {
  console.log(`\n${warnings.length} warning${warnings.length === 1 ? '' : 's'}:`);
  warnings.forEach(w => console.log('  - ' + w));
}
const missing = Object.keys(meta).filter(id => !ordered[id]);
if (missing.length) console.log(`\n${missing.length} specimens have no photograph and will use the drawn plate:\n  ${missing.join(' ')}`);
console.log('');
