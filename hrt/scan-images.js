#!/usr/bin/env node
/* ================================================================
   scan-images.js — finds images on your own drives that might be
   usable in the Woody Ornamentals trainer.

   No dependencies. Runs entirely on your machine; nothing is
   uploaded anywhere.

   WHAT IT CAN DO
     - walk any set of directories, including mounted external drives
     - read JPEG EXIF without a library: capture date, GPS, camera
     - score each file against the 121-species list using the filename,
       the folder path, and any Latin or common name appearing in either
     - flag images too small to be useful, and duplicates by size+name
     - write a triage CSV you can sort, plus a JSON report

   WHAT IT CANNOT DO
     It cannot look at a photograph and tell you what species it is.
     Nothing here identifies plants from pixels. Every match below is a
     guess from text and metadata, and every one needs your eyes on it
     before it goes near the manifest. A misidentified photo in an ID
     trainer teaches the error.

   USAGE
     node scan-images.js <dir> [<dir> ...] [options]

     node scan-images.js ~/Pictures
     node scan-images.js /mnt/d/Photos /mnt/e/Archive --since 2015
     node scan-images.js ~/Pictures --min-score 2 --copy ./candidates

   OPTIONS
     --since YYYY     ignore images captured before this year
     --min-score N    only report files scoring at least N (default 1)
     --min-px N       ignore images whose longest side is under N (default 900)
     --all            report every image found, scored or not
     --copy DIR       copy matches into DIR for review
     --out NAME       output basename (default image-scan)
   ================================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

/* ---------------- arguments ---------------- */
const argv = process.argv.slice(2);
const dirs = argv.filter(a => !a.startsWith('--') && !isOptionValue(a));
function isOptionValue(a) {
  const i = argv.indexOf(a);
  return i > 0 && /^--(since|min-score|min-px|copy|out)$/.test(argv[i - 1]);
}
function opt(name, dflt) {
  const i = argv.indexOf('--' + name);
  return i > -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt;
}
const SINCE = parseInt(opt('since', '0'), 10);
const MIN_SCORE = parseInt(opt('min-score', '1'), 10);
const MIN_PX = parseInt(opt('min-px', '900'), 10);
const COPY_TO = opt('copy', null);
const OUT = opt('out', 'image-scan');
const REPORT_ALL = argv.includes('--all');

if (!dirs.length) {
  console.error('Usage: node scan-images.js <dir> [<dir> ...] [--since YYYY] [--copy DIR]');
  console.error('Example: node scan-images.js ~/Pictures /mnt/d/Photos --since 2015');
  process.exit(1);
}

/* ---------------- species index ---------------- */
const MANIFEST = path.join(__dirname, 'photos-manifest.json');
if (!fs.existsSync(MANIFEST)) {
  console.error('photos-manifest.json not found. Run this from the /hrt folder.');
  process.exit(1);
}
const meta = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')).photos || {};
const SPECIES = Object.keys(meta).map(id => {
  const row = (meta[id] && meta[id][0]) || {};
  const latin = (row.latin || '').toLowerCase();
  const common = (row.common || '').toLowerCase();
  const parts = latin.split(/\s+/).filter(Boolean);
  return {
    id,
    latin, common,
    genus: parts[0] || '',
    epithet: parts[1] || '',
    commonWords: common.split(/\s+/).filter(w => w.length > 3)
  };
});

const VIEW_WORDS = {
  bark: /\bbark|trunk|stem\b/i,
  foliage: /\bleaf|leaves|foliage|needle|frond|twig\b/i,
  habit: /\bhabit|form|silhouette|whole ?tree|canopy\b/i,
  flower: /\bflower|bloom|blossom|catkin|inflor/i,
  fruit: /\bfruit|cone|acorn|berry|berries|samara|pod|seed|drupe/i
};

const PLANTY = /\b(plant|tree|shrub|garden|arboretum|botan|hort|nursery|nature|hike|park|trail|leaf|leaves|bark|bloom|flower|forest|woods)\b/i;
const EXT = /\.(jpe?g|png|heic|heif|webp|tiff?)$/i;
const SKIP_DIR = /^(node_modules|\.git|\.cache|AppData|Library|Windows|Program Files|\$Recycle|System Volume|\.Trash|Caches?)$/i;

/* ---------------- minimal EXIF reader ---------------- */
function readExif(file) {
  let fd;
  try { fd = fs.openSync(file, 'r'); } catch (e) { return {}; }
  const buf = Buffer.alloc(Math.min(262144, fs.statSync(file).size));
  try { fs.readSync(fd, buf, 0, buf.length, 0); } finally { fs.closeSync(fd); }
  if (buf[0] !== 0xFF || buf[1] !== 0xD8) return dimensionsOnly(buf);

  // locate the APP1/Exif segment
  let p = 2, app1 = -1;
  while (p < buf.length - 4) {
    if (buf[p] !== 0xFF) break;
    const marker = buf[p + 1], len = buf.readUInt16BE(p + 2);
    if (marker === 0xE1 && buf.slice(p + 4, p + 8).toString('ascii') === 'Exif') { app1 = p + 10; break; }
    if (marker === 0xDA) break;
    p += 2 + len;
  }
  const out = dimensionsOnly(buf);
  if (app1 < 0) return out;

  const tiff = app1;
  const le = buf.slice(tiff, tiff + 2).toString('ascii') === 'II';
  const u16 = o => le ? buf.readUInt16LE(o) : buf.readUInt16BE(o);
  const u32 = o => le ? buf.readUInt32LE(o) : buf.readUInt32BE(o);

  function entries(ifd, visit) {
    if (ifd + 2 > buf.length) return 0;
    const n = u16(ifd);
    for (let i = 0; i < n; i++) {
      const e = ifd + 2 + i * 12;
      if (e + 12 > buf.length) break;
      visit(u16(e), u16(e + 2), u32(e + 4), e + 8);
    }
    return (ifd + 2 + n * 12 + 4 <= buf.length) ? u32(ifd + 2 + n * 12) : 0;
  }
  function ascii(off, count) {
    try { return buf.slice(tiff + off, tiff + off + count).toString('ascii').replace(/\0.*$/, '').trim(); }
    catch (e) { return ''; }
  }
  function rationals(off, count) {
    const r = [];
    for (let i = 0; i < count; i++) {
      const o = tiff + off + i * 8;
      if (o + 8 > buf.length) break;
      const num = u32(o), den = u32(o + 4);
      r.push(den ? num / den : 0);
    }
    return r;
  }

  let exifIfd = 0, gpsIfd = 0, gpsRefLat = 'N', gpsRefLon = 'E', lat = null, lon = null;
  try {
    entries(tiff + u32(tiff + 4), (tag, type, count, valOff) => {
      const off = (type === 2 && count > 4) || count * 4 > 4 ? u32(valOff) : valOff - tiff;
      if (tag === 0x010F) out.make = ascii(off, count);
      if (tag === 0x0110) out.model = ascii(off, count);
      if (tag === 0x0132 && !out.date) out.date = ascii(off, count);
      if (tag === 0x8769) exifIfd = u32(valOff);
      if (tag === 0x8825) gpsIfd = u32(valOff);
    });
    if (exifIfd) entries(tiff + exifIfd, (tag, type, count, valOff) => {
      const off = count * 4 > 4 ? u32(valOff) : valOff - tiff;
      if (tag === 0x9003) out.date = ascii(off, count);
      if (tag === 0xA002 && !out.w) out.w = type === 3 ? u16(valOff) : u32(valOff);
      if (tag === 0xA003 && !out.hgt) out.hgt = type === 3 ? u16(valOff) : u32(valOff);
    });
    if (gpsIfd) entries(tiff + gpsIfd, (tag, type, count, valOff) => {
      const off = u32(valOff);
      if (tag === 1) gpsRefLat = ascii(valOff - tiff, 2);
      if (tag === 3) gpsRefLon = ascii(valOff - tiff, 2);
      if (tag === 2) { const d = rationals(off, 3); if (d.length === 3) lat = d[0] + d[1] / 60 + d[2] / 3600; }
      if (tag === 4) { const d = rationals(off, 3); if (d.length === 3) lon = d[0] + d[1] / 60 + d[2] / 3600; }
    });
  } catch (e) { /* malformed EXIF is common; take what we got */ }

  if (lat != null && lon != null) {
    out.lat = +((/S/i.test(gpsRefLat) ? -lat : lat).toFixed(5));
    out.lon = +((/W/i.test(gpsRefLon) ? -lon : lon).toFixed(5));
  }
  return out;
}

// SOF scan for pixel dimensions when EXIF has none
function dimensionsOnly(buf) {
  const out = {};
  let p = 2;
  while (p < buf.length - 9) {
    if (buf[p] !== 0xFF) { p++; continue; }
    const m = buf[p + 1];
    if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {
      out.hgt = buf.readUInt16BE(p + 5);
      out.w = buf.readUInt16BE(p + 7);
      return out;
    }
    if (p + 4 > buf.length) break;
    p += 2 + buf.readUInt16BE(p + 2);
  }
  return out;
}

/* ---------------- scoring ---------------- */
function score(file, dir) {
  const hay = (dir + ' ' + file).toLowerCase().replace(/[_\-.]+/g, ' ');
  let best = null, points = 0, why = [];

  for (const s of SPECIES) {
    let pts = 0, reasons = [];
    if (s.latin && hay.includes(s.latin)) { pts += 6; reasons.push('full binomial'); }
    else if (s.genus && s.epithet && hay.includes(s.genus) && hay.includes(s.epithet)) { pts += 5; reasons.push('genus + epithet'); }
    else if (s.genus && s.genus.length > 4 && hay.includes(s.genus)) { pts += 2; reasons.push('genus'); }
    if (s.common && hay.includes(s.common)) { pts += 5; reasons.push('common name'); }
    else if (s.commonWords.length > 1 && s.commonWords.every(w => hay.includes(w))) { pts += 3; reasons.push('common name words'); }
    if (pts > points) { points = pts; best = s; why = reasons; }
  }
  if (!points && PLANTY.test(hay)) { points = 1; why = ['plant-related path']; }

  let view = null;
  for (const v of Object.keys(VIEW_WORDS)) if (VIEW_WORDS[v].test(hay)) { view = v; break; }
  return { species: best ? best.id : '', latin: best ? best.latin : '', points, why, view };
}

/* ---------------- walk ---------------- */
const rows = [];
let seen = 0, skipped = 0;
const dupe = new Map();

function walk(dir, depth) {
  if (depth > 12) return;
  let list;
  try { list = fs.readdirSync(dir, { withFileTypes: true }); }
  catch (e) { return; }
  for (const ent of list) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIR.test(ent.name) || ent.name.startsWith('.')) continue;
      walk(full, depth + 1);
      continue;
    }
    if (!EXT.test(ent.name)) continue;
    seen++;
    if (seen % 2000 === 0) process.stderr.write(`  scanned ${seen} images\r`);

    let st;
    try { st = fs.statSync(full); } catch (e) { continue; }

    const sc = score(ent.name, dir);
    if (!REPORT_ALL && sc.points < MIN_SCORE) { skipped++; continue; }

    const ex = /\.jpe?g$/i.test(ent.name) ? readExif(full) : {};
    const longest = Math.max(ex.w || 0, ex.hgt || 0);
    if (longest && longest < MIN_PX) { skipped++; continue; }

    const year = ex.date ? parseInt(String(ex.date).slice(0, 4), 10) : new Date(st.mtime).getFullYear();
    if (SINCE && year && year < SINCE) { skipped++; continue; }

    // normalise the usual copy suffixes so "photo copy.jpg" matches "photo.jpg"
    const stem = ent.name.toLowerCase()
      .replace(/\.[a-z0-9]+$/, '')
      .replace(/[ _-]*(copy(\s*\d+)?|\(\d+\))$/, '').trim();
    const key = stem + ':' + st.size;
    const isDupe = dupe.has(key);
    if (!isDupe) dupe.set(key, full);

    rows.push({
      path: full, file: ent.name, kb: Math.round(st.size / 1024),
      px: longest ? `${ex.w}x${ex.hgt}` : '', year: year || '',
      camera: [ex.make, ex.model].filter(Boolean).join(' '),
      gps: (ex.lat != null) ? `${ex.lat},${ex.lon}` : '',
      species: sc.species, latin: sc.latin, view: sc.view || '',
      score: sc.points, why: sc.why.join(' + '),
      duplicateOf: isDupe ? dupe.get(key) : ''
    });
  }
}

console.log('');
dirs.forEach(d => {
  const abs = path.resolve(d.replace(/^~/, process.env.HOME || process.env.USERPROFILE || '~'));
  if (!fs.existsSync(abs)) { console.log(`  skipping ${abs} — not found`); return; }
  console.log(`  walking ${abs}`);
  walk(abs, 0);
});
process.stderr.write('                                        \r');

rows.sort((a, b) => b.score - a.score || String(a.species).localeCompare(String(b.species)));

/* ---------------- output ---------------- */
const cols = ['score', 'species', 'latin', 'view', 'year', 'px', 'kb', 'gps', 'camera', 'why', 'duplicateOf', 'path'];
const csv = [cols.join(',')].concat(rows.map(r =>
  cols.map(c => {
    const v = r[c] == null ? '' : String(r[c]);
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }).join(','))).join('\n');
fs.writeFileSync(OUT + '.csv', csv);
fs.writeFileSync(OUT + '.json', JSON.stringify(rows, null, 2));

if (COPY_TO) {
  fs.mkdirSync(COPY_TO, { recursive: true });
  let n = 0;
  rows.filter(r => r.species && !r.duplicateOf).forEach(r => {
    const name = `${r.species}-${r.view || 'unsorted'}-${n}${path.extname(r.file)}`;
    try { fs.copyFileSync(r.path, path.join(COPY_TO, name)); n++; } catch (e) {}
  });
  console.log(`  copied ${n} named candidates into ${COPY_TO}`);
}

/* ---------------- summary ---------------- */
const named = rows.filter(r => r.species);
const strong = rows.filter(r => r.score >= 5);
const withGps = rows.filter(r => r.gps);
const bySpecies = {};
named.forEach(r => { bySpecies[r.species] = (bySpecies[r.species] || 0) + 1; });
const covered = Object.keys(bySpecies).length;

console.log(`
  ${seen} images seen, ${skipped} filtered out, ${rows.length} reported
  ${named.length} matched a species name in the path; ${strong.length} of those on a full binomial or common name
  ${covered} of ${SPECIES.length} species have at least one candidate
  ${withGps.length} carry GPS coordinates
  ${rows.filter(r => r.duplicateOf).length} look like duplicates

  written: ${OUT}.csv  ${OUT}.json
`);

if (covered) {
  const top = Object.keys(bySpecies).sort((a, b) => bySpecies[b] - bySpecies[a]).slice(0, 12);
  console.log('  best-covered species: ' + top.map(k => `${k} (${bySpecies[k]})`).join(', ') + '\n');
}

console.log(`  NEXT — open ${OUT}.csv, sort by score, and look at the images themselves.
  Nothing here has verified a species from the picture. When a file is confirmed,
  rename it <id>-<view>.jpg, drop it in ./photos/, credit yourself in
  photos-manifest.json, then run verify-photos.js and build-photos.js.

  If any of these were shot in your own yard, strip the GPS before publishing.
`);
